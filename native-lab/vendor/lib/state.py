"""LocalizeShots — state DB (sqlite).

One row per app × platform × locale × size cell. Status: pending|capturing|
captured|uploading|uploaded|failed|skipped. Persists at
~/.localizeshots/state.db so a fleet run that crashes on app 7/10 can
resume from app 8 (or just the failed cells from earlier apps).

Also doubles as analytics: how many cells captured this month, average
capture time per app, biggest cost driver.
"""

from __future__ import annotations
import sqlite3, time, hashlib, json, os, socket, subprocess, datetime, atexit
from pathlib import Path
from contextlib import contextmanager
from typing import Iterator

DB_PATH = Path.home() / ".localizeshots" / "state.db"


def _table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {str(row[1]) for row in conn.execute(f'PRAGMA table_info("{table}")')}


def _archive_incompatible_table(
    conn: sqlite3.Connection,
    table: str,
    required_columns: set[str],
    *,
    current_indexes: tuple[str, ...] = (),
) -> str | None:
    columns = _table_columns(conn, table)
    if not columns or required_columns.issubset(columns):
        return None
    for index in current_indexes:
        conn.execute(f'DROP INDEX IF EXISTS "{index}"')
    suffix = 1
    while True:
        backup = f"{table}_legacy_v2" if suffix == 1 else f"{table}_legacy_v2_{suffix}"
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (backup,)
        ).fetchone()
        if not exists:
            break
        suffix += 1
    conn.execute(f'ALTER TABLE "{table}" RENAME TO "{backup}"')
    return backup


def _migrate_legacy_tf_items(conn: sqlite3.Connection, table: str | None) -> None:
    if not table:
        return
    cols = _table_columns(conn, table)
    legacy = {
        "work_key", "run_id", "app_id", "asc_app_id", "bundle_id", "platform",
        "marketing_version", "build_number", "artifact_sha256", "state",
        "failure_class", "repair_count", "last_error", "created_at", "updated_at",
    }
    if not legacy.issubset(cols):
        return
    conn.execute(f"""
        INSERT OR IGNORE INTO tf_items (
            item_id, identity_key, run_id, app_name, repo_path, asc_app_id,
            bundle_id, platform, marketing_version, build_number, artifact_path,
            artifact_sha256, state, failure_code, last_error, next_retry_at,
            repair_count, max_repairs, created_at, updated_at
        )
        SELECT
            work_key, NULL, COALESCE(run_id, ''), COALESCE(app_id, ''), '', asc_app_id,
            bundle_id, platform, marketing_version, build_number, NULL,
            artifact_sha256, state, failure_class, last_error, NULL,
            repair_count, 2, created_at, updated_at
        FROM "{table}"
    """)


def _migrate_legacy_tf_attempts(conn: sqlite3.Connection, table: str | None) -> None:
    if not table:
        return
    cols = _table_columns(conn, table)
    legacy = {
        "id", "work_key", "started_at", "ended_at", "return_code",
        "failure_class", "output_sha256", "created_at",
    }
    if not legacy.issubset(cols):
        return
    counters: dict[str, int] = {}
    rows = conn.execute(f"""
        SELECT work_key, started_at, ended_at, return_code, failure_class,
               output_sha256, created_at
        FROM "{table}" ORDER BY id
    """).fetchall()
    for work_key, started_at, ended_at, return_code, failure_class, output_sha256, created_at in rows:
        item_id = str(work_key)
        counters[item_id] = counters.get(item_id, 0) + 1
        created = float(created_at or time.time())
        conn.execute("""
            INSERT OR IGNORE INTO tf_attempts (
                item_id, attempt_no, started_at, ended_at, fastlane_exit_code,
                log_path, log_sha256, failure_code, retryable,
                reconcile_required, created_at
            ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 0, 1, ?)
        """, (
            item_id, counters[item_id], float(started_at or created), ended_at,
            return_code, output_sha256, failure_class, created,
        ))


def _migrate_legacy_tf_evidence(conn: sqlite3.Connection, table: str | None) -> None:
    if not table:
        return
    cols = _table_columns(conn, table)
    legacy = {"work_key", "kind", "observed_at", "payload_sha256", "payload_json"}
    if not legacy.issubset(cols):
        return
    conn.execute(f"""
        INSERT INTO tf_evidence (
            item_id, attempt_id, kind, captured_at, payload_json, payload_sha256
        )
        SELECT work_key, NULL, kind, observed_at, payload_json, payload_sha256
        FROM "{table}"
    """)


def _ensure_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY,
            started_at REAL NOT NULL,
            ended_at REAL,
            status TEXT NOT NULL,
            manifest_sha TEXT,
            note TEXT
        )
    """)
    # Add lifecycle metadata in place; preserve every historical run and cell.
    run_columns = _table_columns(conn, "runs")
    for name, sql_type in (
        ("heartbeat_at", "REAL"), ("owner_pid", "INTEGER"),
        ("owner_host", "TEXT"), ("owner_birth_at", "REAL"),
        ("status_reason", "TEXT"),
    ):
        if name not in run_columns:
            try:
                conn.execute(f'ALTER TABLE runs ADD COLUMN "{name}" {sql_type}')
            except sqlite3.OperationalError as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise
    conn.execute("""
        CREATE TABLE IF NOT EXISTS run_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            at REAL NOT NULL,
            event TEXT NOT NULL,
            reason TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id, id)")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cells (
            run_id TEXT NOT NULL,
            app_id TEXT NOT NULL,
            bundle_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            size_label TEXT NOT NULL,
            locale TEXT NOT NULL,
            status TEXT NOT NULL,
            png_path TEXT,
            png_sha256 TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            captured_at REAL,
            uploaded_at REAL,
            PRIMARY KEY (run_id, app_id, platform, size_label, locale)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cells_status ON cells(status)")

    legacy_items = _archive_incompatible_table(
        conn,
        "tf_items",
        {"item_id", "app_name", "repo_path", "state", "created_at", "updated_at"},
        current_indexes=("idx_tf_items_run_state",),
    )
    legacy_attempts = _archive_incompatible_table(
        conn,
        "tf_attempts",
        {"item_id", "attempt_no", "fastlane_exit_code", "created_at"},
        current_indexes=("idx_tf_attempts_item",),
    )
    legacy_evidence = _archive_incompatible_table(
        conn,
        "tf_evidence",
        {"item_id", "attempt_id", "captured_at", "payload_json"},
        current_indexes=("idx_tf_evidence_item",),
    )

    conn.execute("""
        CREATE TABLE IF NOT EXISTS tf_items (
            item_id TEXT PRIMARY KEY,
            identity_key TEXT UNIQUE,
            run_id TEXT NOT NULL,
            app_name TEXT NOT NULL,
            repo_path TEXT NOT NULL,
            asc_app_id TEXT,
            bundle_id TEXT,
            platform TEXT,
            marketing_version TEXT,
            build_number TEXT,
            artifact_path TEXT,
            artifact_sha256 TEXT,
            state TEXT NOT NULL,
            failure_code TEXT,
            last_error TEXT,
            next_retry_at REAL,
            repair_count INTEGER NOT NULL DEFAULT 0,
            max_repairs INTEGER NOT NULL DEFAULT 2,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tf_items_run_state ON tf_items(run_id, state)")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tf_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT NOT NULL,
            attempt_no INTEGER NOT NULL,
            started_at REAL NOT NULL,
            ended_at REAL,
            fastlane_exit_code INTEGER,
            log_path TEXT,
            log_sha256 TEXT,
            failure_code TEXT,
            retryable INTEGER NOT NULL DEFAULT 0,
            reconcile_required INTEGER NOT NULL DEFAULT 1,
            created_at REAL NOT NULL,
            UNIQUE(item_id, attempt_no)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tf_attempts_item ON tf_attempts(item_id, attempt_no)")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tf_evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT NOT NULL,
            attempt_id INTEGER,
            kind TEXT NOT NULL,
            captured_at REAL NOT NULL,
            payload_json TEXT NOT NULL,
            payload_sha256 TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tf_evidence_item ON tf_evidence(item_id, id)")

    _migrate_legacy_tf_items(conn, legacy_items)
    _migrate_legacy_tf_attempts(conn, legacy_attempts)
    _migrate_legacy_tf_evidence(conn, legacy_evidence)
    conn.commit()
    return conn

@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = _ensure_db()
    try:
        yield conn
    finally:
        conn.commit()
        conn.close()


def _process_birth(pid: int) -> float | None:
    """Verify process birth time so recycled PIDs cannot impersonate a run."""
    try:
        p = subprocess.run(
            ["/bin/ps", "-p", str(int(pid)), "-o", "lstart="],
            capture_output=True, text=True, timeout=3, check=False,
        )
        if p.returncode or not p.stdout.strip():
            return None
        return datetime.datetime.strptime(
            " ".join(p.stdout.split()), "%a %b %d %H:%M:%S %Y"
        ).timestamp()
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def _owner_alive(pid: int | None, host: str | None,
                 birth: float | None) -> bool | None:
    """True verified alive, False verified gone/recycled, None unprovable."""
    if not pid or not host or host != socket.gethostname():
        return None
    try:
        os.kill(int(pid), 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return None
    except (OSError, ValueError):
        return None
    observed = _process_birth(int(pid))
    if observed is None or birth is None:
        return None
    return abs(observed - float(birth)) <= 5.0


def _exit_unfinished_run(run_id: str, pid: int, birth: float | None) -> None:
    """Finalize premature normal interpreter exits, never overwrite other owners."""
    try:
        now = time.time()
        with db() as c:
            cur = c.execute("""
                UPDATE runs SET status='interrupted', ended_at=?,
                    status_reason='PROCESS_EXITED_WITHOUT_END_RUN'
                WHERE run_id=? AND status='running' AND owner_pid=?
                  AND owner_birth_at IS ?
            """, (now, run_id, pid, birth))
            if cur.rowcount:
                c.execute(
                    "INSERT INTO run_events(run_id, at, event, reason) VALUES (?, ?, ?, ?)",
                    (run_id, now, "interrupted", "PROCESS_EXITED_WITHOUT_END_RUN"),
                )
    except Exception:
        pass  # Process shutdown must never corrupt/replace the original error.


def start_run(run_id: str, manifest_sha: str = "", note: str = "") -> None:
    now = time.time()
    pid = os.getpid()
    born = _process_birth(pid)
    with db() as c:
        c.execute("""
            INSERT INTO runs (
                run_id, started_at, ended_at, status, manifest_sha, note,
                heartbeat_at, owner_pid, owner_host, owner_birth_at, status_reason
            ) VALUES (?, ?, NULL, 'running', ?, ?, ?, ?, ?, ?, NULL)
            ON CONFLICT(run_id) DO UPDATE SET
                started_at=excluded.started_at, ended_at=NULL, status='running',
                manifest_sha=excluded.manifest_sha, note=excluded.note,
                heartbeat_at=excluded.heartbeat_at, owner_pid=excluded.owner_pid,
                owner_host=excluded.owner_host, owner_birth_at=excluded.owner_birth_at,
                status_reason=NULL
        """, (run_id, now, manifest_sha, note, now, pid, socket.gethostname(), born))
        c.execute(
            "INSERT INTO run_events(run_id, at, event, reason) VALUES (?, ?, ?, ?)",
            (run_id, now, "started", note[:500]),
        )
    atexit.register(_exit_unfinished_run, run_id, pid, born)


def end_run(run_id: str, status: str = "complete") -> None:
    if status not in ("complete", "failed", "interrupted"):
        raise ValueError("invalid terminal run status")
    now = time.time()
    with db() as c:
        cur = c.execute("""
            UPDATE runs SET ended_at=?, status=?, heartbeat_at=?,
                status_reason=NULL
            WHERE run_id=? AND status='running'
        """, (now, status, now, run_id))
        if cur.rowcount:
            c.execute(
                "INSERT INTO run_events(run_id, at, event, reason) VALUES (?, ?, ?, ?)",
                (run_id, now, status, "EXPLICIT_END_RUN"),
            )


def upsert_cell(run_id: str, app_id: str, bundle_id: str, platform: str,
                size_label: str, locale: str, status: str,
                png_path: str | None = None, png_sha256: str | None = None,
                error: str | None = None) -> None:
    now = time.time()
    with db() as c:
        existing = c.execute(
            "SELECT attempts FROM cells WHERE run_id=? AND app_id=? AND platform=? AND size_label=? AND locale=?",
            (run_id, app_id, platform, size_label, locale)
        ).fetchone()
        attempts = (existing[0] if existing else 0) + (1 if status in ("captured", "failed") else 0)
        captured_at = now if status == "captured" else None
        uploaded_at = now if status == "uploaded" else None
        c.execute("""
            INSERT INTO cells (run_id, app_id, bundle_id, platform, size_label, locale,
                              status, png_path, png_sha256, attempts, last_error,
                              captured_at, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(run_id, app_id, platform, size_label, locale) DO UPDATE SET
                status=excluded.status,
                png_path=COALESCE(excluded.png_path, png_path),
                png_sha256=COALESCE(excluded.png_sha256, png_sha256),
                attempts=excluded.attempts,
                last_error=excluded.last_error,
                captured_at=COALESCE(excluded.captured_at, captured_at),
                uploaded_at=COALESCE(excluded.uploaded_at, uploaded_at)
        """, (run_id, app_id, bundle_id, platform, size_label, locale, status,
              png_path, png_sha256, attempts, error, captured_at, uploaded_at))
        c.execute("""
            UPDATE runs SET heartbeat_at=? WHERE run_id=? AND status='running'
        """, (now, run_id))


def cells_for(run_id: str, status: str | None = None) -> list[dict]:
    with db() as c:
        sql = "SELECT * FROM cells WHERE run_id=?"
        args: tuple = (run_id,)
        if status:
            sql += " AND status=?"
            args = (run_id, status)
        cur = c.execute(sql, args)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def reconcile_abandoned_runs(*, stale_after_s: float = 6 * 3600,
                             now: float | None = None) -> list[dict]:
    """Persist honest terminal states, without ever treating expiry as success.

    An owned worker is eligible only if its exact PID/birth is gone; an owner
    with unprovable identity or a legacy run needs six hours without progress.
    Verified live processes and runs owned by another host are never killed.
    CAS protects against concurrent heartbeats and normal completion.
    """
    instant = time.time() if now is None else float(now)
    repaired: list[dict] = []
    with db() as c:
        c.row_factory = sqlite3.Row
        pending = c.execute("""
            SELECT run_id, started_at, heartbeat_at, owner_pid, owner_host,
                owner_birth_at FROM runs
            WHERE status='running' AND ended_at IS NULL
        """).fetchall()
        for row in pending:
            last_progress = float(row["heartbeat_at"] or row["started_at"])
            idle = instant - last_progress
            pid, host, birth = row["owner_pid"], row["owner_host"], row["owner_birth_at"]
            if pid and host and host != socket.gethostname():
                continue  # Cannot attest to a remote host's process lifecycle.
            live = _owner_alive(pid, host, birth)
            if live is True:
                continue  # A long-running genuine capture must not be terminated.
            if live is False:
                reason = "OWNER_PROCESS_GONE_OR_PID_RECYCLED"
            elif idle >= stale_after_s:
                reason = "LEGACY_OR_UNVERIFIABLE_OWNER_EXPIRED"
            else:
                continue
            cur = c.execute("""
                UPDATE runs SET status='interrupted', ended_at=?, status_reason=?
                WHERE run_id=? AND status='running' AND ended_at IS NULL
                  AND started_at=? AND COALESCE(heartbeat_at, started_at)=?
            """, (instant, reason, row["run_id"], row["started_at"], last_progress))
            if cur.rowcount:
                c.execute(
                    "INSERT INTO run_events(run_id, at, event, reason) VALUES (?, ?, ?, ?)",
                    (row["run_id"], instant, "interrupted", reason),
                )
                repaired.append({"run_id": row["run_id"], "reason": reason})
    return repaired


def runs_summary(limit: int = 20, *, stale_after_s: float = 6 * 3600) -> list[dict]:
    """Pure read. The separately scheduled reconciler persists stale terminals."""
    now = time.time()
    with db() as c:
        cur = c.execute("""
            SELECT r.run_id, r.started_at, r.ended_at, r.status,
                   r.heartbeat_at, r.owner_pid, r.owner_host, r.owner_birth_at,
                   r.status_reason,
                   COUNT(c.locale) AS total_cells,
                   SUM(CASE WHEN c.status='uploaded' THEN 1 ELSE 0 END) AS uploaded,
                   SUM(CASE WHEN c.status='failed' THEN 1 ELSE 0 END) AS failed
            FROM runs r LEFT JOIN cells c ON c.run_id = r.run_id
            GROUP BY r.run_id ORDER BY r.started_at DESC LIMIT ?
        """, (limit,))
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    for row in rows:
        age = max(0.0, now - float(row["started_at"]))
        idle = max(0.0, now - float(row["heartbeat_at"] or row["started_at"]))
        running = row["status"] == "running" and row["ended_at"] is None
        stale = running and idle >= stale_after_s
        verified_live = _owner_alive(
            row["owner_pid"], row["owner_host"], row["owner_birth_at"]
        ) if stale else None
        row["age_seconds"] = round(age, 3)
        row["idle_seconds"] = round(idle, 3)
        row["stale"] = bool(stale)
        row["effective_status"] = (
            "unresponsive" if verified_live is True else "stale"
        ) if stale else row["status"]
        row["owner_verified_alive"] = verified_live
    return rows


def sha256_of(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def tf_item_id(run_id: str, app_name: str, repo_path: str) -> str:
    raw = f"{run_id}\0{app_name}\0{repo_path}".encode()
    return "tf-" + hashlib.sha256(raw).hexdigest()[:24]


def tf_identity_key(*, run_id: str, asc_app_id: str, bundle_id: str, platform: str,
                    marketing_version: str, build_number: str, artifact_sha256: str) -> str:
    fields = [run_id, asc_app_id, bundle_id, platform, marketing_version,
              build_number, artifact_sha256]
    return hashlib.sha256("\0".join(fields).encode()).hexdigest()


def upsert_tf_item(item_id: str, *, run_id: str, app_name: str, repo_path: str,
                   status: str, identity_key: str | None = None,
                   asc_app_id: str | None = None, bundle_id: str | None = None,
                   platform: str | None = None, marketing_version: str | None = None,
                   build_number: str | None = None, artifact_path: str | None = None,
                   artifact_sha256: str | None = None, failure_code: str | None = None,
                   error: str | None = None, next_retry_at: float | None = None,
                   repair_count: int | None = None, max_repairs: int = 2) -> None:
    now = time.time()
    with db() as c:
        existing = c.execute(
            "SELECT repair_count, created_at FROM tf_items WHERE item_id=?", (item_id,)
        ).fetchone()
        repairs = repair_count if repair_count is not None else (existing[0] if existing else 0)
        created = existing[1] if existing else now
        c.execute("""
            INSERT INTO tf_items (
                item_id, identity_key, run_id, app_name, repo_path, asc_app_id,
                bundle_id, platform, marketing_version, build_number, artifact_path,
                artifact_sha256, state, failure_code, last_error, next_retry_at,
                repair_count, max_repairs, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(item_id) DO UPDATE SET
                identity_key=COALESCE(excluded.identity_key, identity_key),
                asc_app_id=COALESCE(excluded.asc_app_id, asc_app_id),
                bundle_id=COALESCE(excluded.bundle_id, bundle_id),
                platform=COALESCE(excluded.platform, platform),
                marketing_version=COALESCE(excluded.marketing_version, marketing_version),
                build_number=COALESCE(excluded.build_number, build_number),
                artifact_path=COALESCE(excluded.artifact_path, artifact_path),
                artifact_sha256=COALESCE(excluded.artifact_sha256, artifact_sha256),
                state=excluded.state,
                failure_code=excluded.failure_code,
                last_error=excluded.last_error,
                next_retry_at=excluded.next_retry_at,
                repair_count=excluded.repair_count,
                max_repairs=excluded.max_repairs,
                updated_at=excluded.updated_at
        """, (
            item_id, identity_key, run_id, app_name, repo_path, asc_app_id,
            bundle_id, platform, marketing_version, build_number, artifact_path,
            artifact_sha256, status, failure_code, error, next_retry_at, repairs,
            max_repairs, created, now,
        ))


def update_tf_item_state(item_id: str, status: str, *, failure_code: str | None = None,
                         error: str | None = None,
                         next_retry_at: float | None = None) -> None:
    with db() as c:
        c.execute("""
            UPDATE tf_items
            SET state=?, failure_code=?, last_error=?, next_retry_at=?, updated_at=?
            WHERE item_id=?
        """, (status, failure_code, error, next_retry_at, time.time(), item_id))


def begin_tf_repair(item_id: str) -> tuple[bool, int, int]:
    """Atomically consume one bounded repair slot for an authorized replay."""
    with db() as c:
        row = c.execute(
            "SELECT state, repair_count, max_repairs FROM tf_items WHERE item_id=?",
            (item_id,),
        ).fetchone()
        if row is None:
            return False, 0, 0
        status, repair_count, max_repairs = row
        repair_count = int(repair_count or 0)
        max_repairs = int(max_repairs or 0)
        if status != "REPAIRABLE":
            return False, repair_count, max_repairs
        if repair_count >= max_repairs:
            c.execute("""
                UPDATE tf_items
                SET state='QUARANTINED', failure_code='REPAIR_BUDGET_EXHAUSTED',
                    last_error='authorized replay budget exhausted',
                    next_retry_at=NULL, updated_at=?
                WHERE item_id=?
            """, (time.time(), item_id))
            return False, repair_count, max_repairs
        next_count = repair_count + 1
        c.execute("""
            UPDATE tf_items
            SET state='REPAIRING', repair_count=?, failure_code=NULL,
                last_error=NULL, next_retry_at=NULL, updated_at=?
            WHERE item_id=?
        """, (next_count, time.time(), item_id))
        return True, next_count, max_repairs


def record_tf_attempt(item_id: str, *, started_at: float, ended_at: float | None = None,
                      fastlane_exit_code: int | None = None, log_path: str | None = None,
                      log_sha256: str | None = None, failure_code: str | None = None,
                      retryable: bool = False, reconcile_required: bool = True) -> int:
    with db() as c:
        row = c.execute(
            "SELECT COALESCE(MAX(attempt_no), 0) + 1 FROM tf_attempts WHERE item_id=?",
            (item_id,),
        ).fetchone()
        attempt_no = int(row[0])
        cur = c.execute("""
            INSERT INTO tf_attempts (
                item_id, attempt_no, started_at, ended_at, fastlane_exit_code,
                log_path, log_sha256, failure_code, retryable, reconcile_required,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item_id, attempt_no, started_at, ended_at, fastlane_exit_code,
            log_path, log_sha256, failure_code, int(retryable),
            int(reconcile_required), time.time(),
        ))
        return int(cur.lastrowid)


def append_tf_evidence(item_id: str, kind: str, payload: object,
                       *, attempt_id: int | None = None) -> int:
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(body.encode()).hexdigest()
    with db() as c:
        cur = c.execute("""
            INSERT INTO tf_evidence (
                item_id, attempt_id, kind, captured_at, payload_json, payload_sha256
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (item_id, attempt_id, kind, time.time(), body, digest))
        return int(cur.lastrowid)


def get_tf_item(item_id: str) -> dict | None:
    with db() as c:
        cur = c.execute("SELECT * FROM tf_items WHERE item_id=?", (item_id,))
        row = cur.fetchone()
        if row is None:
            return None
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))


def tf_items_for_run(run_id: str) -> list[dict]:
    with db() as c:
        cur = c.execute(
            "SELECT * FROM tf_items WHERE run_id=? ORDER BY created_at, item_id", (run_id,)
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def tf_attempts_for_item(item_id: str) -> list[dict]:
    with db() as c:
        cur = c.execute(
            "SELECT * FROM tf_attempts WHERE item_id=? ORDER BY attempt_no", (item_id,)
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def tf_evidence_for_item(item_id: str) -> list[dict]:
    with db() as c:
        cur = c.execute(
            "SELECT * FROM tf_evidence WHERE item_id=? ORDER BY id", (item_id,)
        )
        cols = [d[0] for d in cur.description]
        rows = []
        for row in cur.fetchall():
            item = dict(zip(cols, row))
            try:
                item["payload"] = json.loads(item["payload_json"])
            except Exception:
                item["payload"] = None
            rows.append(item)
        return rows

def latest_tf_item(app_name: str, repo_path: str, statuses: tuple[str, ...] | None = None) -> dict | None:
    with db() as c:
        sql = "SELECT * FROM tf_items WHERE app_name=? AND repo_path=?"
        args: list[object] = [app_name, repo_path]
        if statuses:
            placeholders = ",".join("?" for _ in statuses)
            sql += f" AND state IN ({placeholders})"
            args.extend(statuses)
        sql += " ORDER BY updated_at DESC LIMIT 1"
        cur = c.execute(sql, tuple(args))
        row = cur.fetchone()
        if row is None:
            return None
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
