#!/usr/bin/env python3
"""xcstrings — in-app string localization engine (xcstrings catalog).

Ported from scripts/aiscent_mcp.py (the unregistered sidecar server) so the
live MCP can finally touch in-app UI strings, not just store metadata.

Pipeline (agentic by design — the MCP builds worklists and writes; the
calling agent supplies the translations):
  localize_status(repo)                  → per-locale completion
  localize_manifest(repo, locales, status)→ worklist {locale: {key: source}} (+needs_review triage)
  localize_apply(repo, translations)      → persist, KEY-MAPPED (orphan-safe),
                                           with placeholder parity enforcement
  localize_port_region(repo, region, base)→ copy reviewed region cells into
                                           empty base cells (PR #83 procedure)

Placeholder parity (G3): a translation whose placeholder sequence does not
match the source is REJECTED, not written — a dropped %@ or %lld→%d ships
as a runtime crash or garbage string. Exact ordered match required, except
that fully-positional reordering (%1$@, %2$d) is accepted.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
try:
    from .placeholders import reason as _placeholder_reason
except ImportError:  # legacy top-level import used by standalone tests/tools
    from placeholders import reason as _placeholder_reason

# ---------------------------------------------------------------------------
# Config + catalog access (same semantics as aiscent_mcp.py)
# ---------------------------------------------------------------------------

_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "aiscent.localization.json"


def _config() -> dict:
    return json.loads(_CONFIG_PATH.read_text())


def _catalog_path(repo: str | None) -> Path:
    cfg = _config()
    if repo:
        p = Path(repo)
        cand = p / cfg["catalog"] if (p / cfg["catalog"]).exists() else p
        if cand.is_dir():
            hits = sorted(p.rglob("Localizable.xcstrings"))
            if hits:
                return hits[0]
            raise FileNotFoundError(f"No Localizable.xcstrings found under app repo: {p}")
        return cand
    return Path(__file__).resolve().parent.parent.parent / cfg["catalog"]


def _load(path: Path) -> dict:
    return json.loads(path.read_text())


def _save(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def _xcode_locales(cfg: dict) -> list[str]:
    m = cfg.get("asc_to_xcode", {})
    seen, out = set(), []
    for loc in cfg["asc_locales"]:
        x = m.get(loc, loc)
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _en(v: dict, key: str, src: str) -> str:
    return ((v.get("localizations", {}).get(src, {}).get("stringUnit", {})).get("value")) or key


def _state(v: dict, loc: str):
    state=(v.get("localizations", {}).get(loc, {})).get("stringUnit", {}).get("state")
    return "needs_review" if state in ("needsReview","needs_review") else state


def _value(v: dict, loc: str):
    return (v.get("localizations", {}).get(loc, {})).get("stringUnit", {}).get("value")


# ---------------------------------------------------------------------------
# Placeholder parity (G3)
# ---------------------------------------------------------------------------

# Matches: %@, %d, %lld, %ld, %f, %s, %1$@, %2$d, and Swift \(interpolation).
_INTERP = re.compile(r"%(?:\d+\$)?[@dfsu]|%l+[du]|\\\([^)]*\)")


def _placeholder_class(ph: str) -> str:
    """Normalized conversion class: %@→'@', %d/%ld/%lld→'d', %f→'f', etc."""
    if ph.startswith("\\("):
        return "interp"
    m = re.match(r"%(?:\d+\$)?(l*)([@dfsu])", ph)
    if not m:
        return ph
    conv = m.group(2)
    return "d" if conv in "du" else conv


def _is_positional(ph: str) -> bool:
    return bool(re.match(r"%\d+\$", ph))


def placeholders(s: str) -> list[str]:
    """Ordered placeholder list as they appear in the string."""
    return _INTERP.findall(s or "")


def check_placeholder_parity(source: str, translation: str) -> str | None:
    """Return None when argument identity/types are safe for Foundation formatting."""
    return _placeholder_reason(source, translation)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_MISSING = {"missing", "new", "empty"}


def localize_status(repo: str = "") -> dict:
    """Per-locale translation completion across all configured locales."""
    cfg = _config()
    src = cfg.get("source_language", "en")
    path = _catalog_path(repo or None)
    strings = _load(path).get("strings", {})
    total = len(strings)
    eligible = {k: v for k, v in strings.items() if isinstance(v, dict) and v.get("shouldTranslate") is not False}
    excluded = total - len(eligible)
    # Audit even cells labelled 'translated': identical English can be an
    # unreviewed fallback. Exempt only known technical literals and protected
    # brand/product names; ambiguous English remains a review blocker.
    candidate_source_copies = localize_manifest(repo, status="source_copy")["manifest"]
    rows = {}
    for loc in _xcode_locales(cfg):
        if loc == src:
            continue
        tr = sum(1 for v in eligible.values() if _state(v, loc) == "translated")
        nr = sum(1 for v in eligible.values() if _state(v, loc) == "needs_review")
        stale = sum(1 for v in eligible.values() if _state(v, loc) == "stale")
        new_cells = sum(1 for v in eligible.values() if _state(v, loc) in (None, "new"))
        covered = tr + nr
        suspicious = sum(k in eligible for k in candidate_source_copies.get(loc, {}))
        missing = max(len(eligible) - covered, 0)
        rows[loc] = {
            "translated": tr,
            "needs_review": nr,
            "source_copy_candidates": suspicious,
            "stale": stale,
            "new_or_absent": new_cells,
            "missing": missing,
            "total": len(eligible),
            # Backward-compatible coverage metric: translated + needsReview.
            "pct": round(100 * covered / len(eligible), 1) if eligible else 0,
            "coverage_pct": round(100 * covered / len(eligible), 1) if eligible else 0,
            "reviewed_pct": round(100 * max(tr - suspicious, 0) / len(eligible), 1) if eligible else 0,
            "complete": bool(eligible and tr == len(eligible) and nr == 0 and suspicious == 0),
        }
    done = sum(1 for r in rows.values() if r["complete"])
    return {
        "catalog": str(path),
        "keys": total,
        "translatable_keys": len(eligible),
        "excluded_keys": excluded,
        "catalog_diagnostics": {"catalog_count": 1, "source": str(path), "excluded_nontranslatable": excluded},
        "locales_done": done,
        "locales_total": len(rows),
        "per_locale": rows,
    }


def localize_release_gate(repo: str = "", locales: list[str] | None = None) -> dict:
    """Fail closed unless every requested locale is fully reviewed.

    Coverage includes needsReview so an agent can measure translation progress.
    Release readiness does not: needsReview, stale, new, absent, or unknown locale
    state is a blocker.
    """
    status = localize_status(repo)
    rows = status["per_locale"]
    cfg = _config()
    aliases = cfg.get("asc_to_xcode", {})
    requested = list(locales) if locales else list(rows)
    blockers = []
    per_locale = {}
    source = cfg.get("source_language", "en")
    catalog = _load(Path(status["catalog"]))
    eligible = [
        (key, entry) for key, entry in catalog.get("strings", {}).items()
        if isinstance(entry, dict) and entry.get("shouldTranslate") is not False
    ]
    source_is_valid = catalog.get("sourceLanguage") == source and bool(eligible)
    source_is_valid = source_is_valid and all(
        (isinstance(_value(entry, source), str) and bool(_value(entry, source).strip()))
        or (_value(entry, source) is None and isinstance(key, str) and bool(key.strip())
            and (key[0].isupper() or any(char.isspace() for char in key)))
        for key, entry in eligible
    )
    for requested_loc in requested:
        catalog_loc = aliases.get(requested_loc, requested_loc)
        row = rows.get(catalog_loc)
        if row is None and catalog_loc == source:
            if not source_is_valid:
                code = "source_language_mismatch" if catalog.get("sourceLanguage") != source else "source_language_missing"
                blockers.append({"locale": requested_loc, "code": code, "count": 1})
                continue
            total = status["translatable_keys"]
            row = {
                "translated": total, "needs_review": 0, "source_copy_candidates": 0,
                "stale": 0, "new_or_absent": 0, "missing": 0, "total": total,
                "pct": 100.0, "coverage_pct": 100.0, "reviewed_pct": 100.0,
                "complete": True,
            }
        if row is None:
            blockers.append({"locale": requested_loc, "code": "unknown_locale", "count": 1})
            continue
        per_locale[requested_loc] = {**row, "catalog_locale": catalog_loc}
        extra = {"catalog_locale": catalog_loc} if catalog_loc != requested_loc else {}
        if row["needs_review"]:
            blockers.append({"locale": requested_loc, "code": "needs_review", "count": row["needs_review"], **extra})
        if row["source_copy_candidates"]:
            blockers.append({"locale": requested_loc, "code": "unchanged_english", "count": row["source_copy_candidates"], **extra})
        if row["stale"]:
            blockers.append({"locale": requested_loc, "code": "stale", "count": row["stale"], **extra})
        untranslated = max(row["missing"] - row["stale"], 0)
        if untranslated:
            blockers.append({"locale": requested_loc, "code": "untranslated", "count": untranslated, **extra})
    return {
        "catalog": status["catalog"],
        "release_ready": not blockers,
        "requested_locales": requested,
        "blocked_locales": sorted({b["locale"] for b in blockers}),
        "blockers": blockers,
        "per_locale": per_locale,
        "rule": "Only reviewed localized cells count as complete; needsReview/stale/new/absent and suspicious unchanged-English cells block release. Protected technical and product terms remain exempt.",
    }


def localize_manifest(repo: str = "", locales: list[str] | None = None,
                      status: str = "all") -> dict:
    """Worklist of cells needing translation: {locale: {key: source}}.

    status: "new" (only cells without localized strings),
            "needs_review" (cells flagged for review, including source copies),
            "source_copy" (also catches suspicious English values marked translated),
            "all" (DEFAULT: new, review-required and translated English-copy candidates).
    Exact English values are review candidates, not automatic proof of bad copy:
    protected brand names and regional English may legitimately remain unchanged.
    Excludes placeholders, brand-only, and identifier-key strings from the
    "new" worklist (same as the original pipeline).
    """
    if status not in ("new", "needs_review", "source_copy", "all"):
        raise ValueError(f"status must be new|needs_review|source_copy|all, got {status!r}")
    cfg = _config()
    src = cfg.get("source_language", "en")
    brand = sorted(cfg.get("brand_terms_do_not_translate", []), key=len, reverse=True)
    deny = [re.compile(p) for p in cfg.get("placeholder_denylist_patterns", [])]
    ident = re.compile(r"^[a-z][a-z0-9]*([._][a-z0-9]+)+$")
    path = _catalog_path(repo or None)
    strings = _load(path).get("strings", {})
    targets = [loc for loc in _xcode_locales(cfg) if loc != src]
    if locales:
        targets = [loc for loc in targets if loc in locales]
    work: dict = {}
    def _is_intentional_technical_literal(key: str, source: str, loc: str) -> bool:
        # Intentionally identical copy must be narrow and reviewable by locale.
        # Proper contributor credits are not translatable user-interface text.
        if re.fullmatch(r"about\.ack\.\d+", key):
            return True
        # Some UI nouns really are identical natural words or accepted official
        # terminology in the indicated region. Do not manufacture translations
        # just to satisfy an identical-English heuristic.
        identical_ui_words = {
            "App": {"de", "pt-PT", "nl", "sv", "nb", "da", "ca", "it"},
            "Apps": {"de", "nl", "da", "es", "pt-BR"},
            "Agent": {"fr", "fr-CA", "de", "nl", "nb", "sv", "da", "pl", "cs", "hr", "ca", "sk", "ro"},
            "Privacy": {"nl", "it"},
            "password": {"it"},  # Apple-style Italian loanword, often capitalized in UI.
            "Label": {"nl"},
            "Metadata": {"nb"},
            "Screenshots": {"de"},
            "Simulators": {"nl"},
            "Project": {"nl"},
            "Timing": {"nl"},
            "DEMO": {"de", "pt-PT", "es", "pt-BR", "it", "sk", "ro", "id", "es-MX", "nb"},
            "MANUAL": {"pt-PT", "es", "pt-BR", "ro", "id", "es-MX"},
            "App Store Connect API": {"ko", "zh-Hans", "zh-Hant"},
            "%lld apps": {"nl", "da", "de"},
        }
        if loc in identical_ui_words.get(source, set()):
            return True
        if source.startswith("Version ") and source.endswith(" · SMAT Design LLC"):
            if loc in {"fr", "fr-CA", "de", "da", "sv"}:
                return True
        # Stable device identifiers, model names, hardware measurements and
        # format-only values are not natural-language UI copy.
        if key in ("(remove)", "(empty)", "selftest.running_fmt"):
            return True
        if key.startswith("platform."):
            return True
        if key.startswith("device.") and (
            key.endswith(".size") or
            (key.endswith(".name") and key != "device.macHost.name")
        ):
            return True
        if re.fullmatch(r"[0-9a-f]{8}-…", source):
            return True
        return False

    for key, v in strings.items():
        if not isinstance(v, dict) or v.get("shouldTranslate") is False:
            continue
        source = _en(v, key, src)

        def _is_placeholder(s: str) -> bool:
            t = (s or "").strip()
            if not t or not re.search(r"[A-Za-zÀ-ÿ]{2,}", t):
                return True
            return any(p.search(t) for p in deny)

        def _is_brand_only(s: str) -> bool:
            t = s
            for b in brand:
                left = r"(?<![A-Za-z0-9])" if b[:1].isalnum() else ""
                right = r"(?![A-Za-z0-9])" if b[-1:].isalnum() else ""
                t = re.sub(left + re.escape(b) + right, "", t)
            return not re.search(r"[A-Za-zÀ-ÿ]{2,}", t)

        for loc in targets:
            st = _state(v, loc)
            if status in ("new", "all") and st in (None, "new"):
                if _is_placeholder(source) or _is_brand_only(source) or ident.match(source):
                    continue
                work.setdefault(loc, {})[key] = source
            if status in ("needs_review", "all") and st == "needs_review":
                current = _value(v, loc)
                source_copy = not current or current.strip().casefold() == source.strip().casefold()
                protected = source_copy and (
                    loc.startswith("en-")
                    or _is_brand_only(source)
                    or _is_intentional_technical_literal(key, source, loc)
                )
                work.setdefault(loc, {})[key] = {
                    "source": source,
                    "current": current,
                    "state": "needsReview",
                    "why": ("intentionally identical English candidate; review region-specific wording"
                            if protected and loc.startswith("en-") else
                            "protected or locale-native technical terminology; obtain native review"
                            if protected else
                            "untranslated source-language fallback; supply actual localized copy"
                            if source_copy else
                            "flagged needsReview — verify placeholders and locale quality"),
                    "is_source_copy": source_copy,
                    "is_intentional_english_candidate": protected,
                }
            if (status in ("source_copy", "all") and st == "translated"
                    and not loc.startswith("en")
                    and not _is_placeholder(source) and not _is_brand_only(source)
                    and not _is_intentional_technical_literal(key, source, loc)
                    and not ident.match(source)):
                current = _value(v, loc)
                if current and current.strip().casefold() == source.strip().casefold():
                    work.setdefault(loc, {})[key] = {
                        "source": source,
                        "current": current,
                        "state": "translated",
                        "why": ("unchanged English despite translated state; check UI use "
                                "and local terminology before accepting"),
                        "is_source_copy": True,
                        "is_intentional_english_candidate": False,
                    }
    cells = sum(len(x) for x in work.values())
    return {"catalog": str(path), "brand_terms": brand, "status": status,
            "cells": cells, "manifest": work}


def localize_apply(repo: str, translations: dict[str, dict[str, str]],
                   review_required: bool = False) -> dict:
    """Persist {locale: {key: value}} into the catalog, KEY-MAPPED (orphan-safe).

    Placeholder parity (G3): each translation's placeholder sequence is checked
    against the source. Mismatches are REJECTED (not written) and reported in
    "rejected" — a dropped %@ or %lld→%d would otherwise ship as a runtime
    crash. Unknown keys are skipped (never created — avoids orphans).
    """
    cfg = _config()
    src = cfg.get("source_language", "en")
    path = _catalog_path(repo or None)
    cat = _load(path)
    strings = cat.get("strings", {})
    wrote = skipped = 0
    rejected: dict[str, list[str]] = {}
    for loc, kv in translations.items():
        for key, val in kv.items():
            e = strings.get(key)
            if not e or e.get("shouldTranslate") is False:
                skipped += 1
                continue  # never create a new key — avoids orphans
            reason = check_placeholder_parity(_en(e, key, src), val or "")
            if reason:
                rejected.setdefault(loc, []).append(f"{key}: {reason}")
                continue
            st = "needsReview" if review_required or _INTERP.search(val or "") else "translated"
            locs=e.setdefault("localizations", {})
            locale_obj=locs.setdefault(loc, {})
            unit=locale_obj.setdefault("stringUnit", {})
            unit["state"]=st; unit["value"]=val
            wrote += 1
    _save(path, cat)
    return {
        "catalog": str(path),
        "written": wrote,
        "review_required": bool(review_required),
        "skipped_unknown_keys": skipped,
        "rejected_placeholder_mismatch": rejected,
        "total_keys": len(strings),
    }


def localize_memory(repo: str, locale: str, query: str = "", limit: int = 12) -> dict:
    """Return approved translation-memory examples from the shipping catalog.

    Only cells in state=translated are eligible. This deliberately excludes
    new/needsReview/stale candidates so weak output cannot train the next pass.
    Ranking is deterministic lexical overlap over source text + key.
    """
    path = _catalog_path(repo or None)
    cat = _load(path)
    strings = cat.get("strings", {})
    cfg = _config()
    src = cfg.get("source_language", "en")
    alias = cfg.get("asc_to_xcode", {})
    xcode_locale = alias.get(locale, locale)

    def tokens(value: str) -> set[str]:
        return {
            token.lower()
            for token in re.findall(r"[A-Za-z0-9][A-Za-z0-9+._-]*", value or "")
            if len(token) >= 2
        }

    qtokens = tokens(query)
    # Regional lexicon data lives server-side now (hosted copy judge); the
    # local memory lookup no longer carries or consults it.
    forbidden: list = []
    protected = {
        "App Store Connect", "App Store", "TestFlight", "Xcode", "SwiftUI",
        "StoreKit", "AiSCent", "LocalizeShots", "MCP", "Claude Code",
        "Codex", "Cursor", "ChatGPT",
    }

    def memory_rejection(source: str, target: str) -> str | None:
        lowered = target.casefold()
        for term in forbidden:
            if str(term).casefold() in lowered:
                return f"regional_lexicon:{term}"
        if check_placeholder_parity(source, target):
            return "placeholder_parity"
        if locale.split("-",1)[0] != "en":
            words = re.findall(r"[A-Za-z]{3,}", source)
            protected_only = bool(source.strip()) and all(
                any(word.lower() in term.lower() for term in protected)
                for word in words
            )
            if len(source) >= 20 and source.casefold() in target.casefold() and target != source:
                return "source_copy_fragment"
            if source == target and len(words) >= 3 and not protected_only:
                return "source_copy"
        return None

    rows = []
    eligible_count = 0
    excluded = {}
    for key, entry in strings.items():
        source = _en(entry, key, src)
        unit = (
            entry.get("localizations", {})
            .get(xcode_locale, {})
            .get("stringUnit", {})
        )
        raw_state = unit.get("state")
        state = "needs_review" if raw_state in {"needsReview", "needs_review"} else raw_state
        target = (unit.get("value") or "").strip()
        if state != "translated" or not target:
            continue
        rejection = memory_rejection(source, target)
        if rejection:
            excluded[rejection] = excluded.get(rejection, 0) + 1
            continue
        eligible_count += 1
        haystack = tokens(source) | tokens(key)
        overlap = len(qtokens & haystack) if qtokens else 0
        coverage = (overlap / max(1, len(qtokens))) if qtokens else 0.0
        rows.append({
            "key": key,
            "source": source,
            "target": target,
            "score": round(coverage, 3),
        })

    if qtokens:
        rows.sort(key=lambda row: (-row["score"], row["key"]))
        rows = [row for row in rows if row["score"] > 0][: max(1, min(int(limit or 12), 50))]
    else:
        rows.sort(key=lambda row: row["key"])
        rows = rows[: max(1, min(int(limit or 12), 50))]

    return {
        "catalog": str(path),
        "locale": locale,
        "xcode_locale": xcode_locale,
        "query": query,
        "approved_state_count": sum(
            1
            for entry in strings.values()
            if (
                entry.get("localizations", {})
                .get(xcode_locale, {})
                .get("stringUnit", {})
                .get("state")
                == "translated"
            )
        ),
        "eligible_memory_count": eligible_count,
        "excluded_memory": excluded,
        "matches": rows,
        "rule": "Memory requires state=translated plus regional, source-copy and placeholder safety filters.",
    }


def localize_promote_reviewed(repo: str, approvals: dict[str, dict[str, str]]) -> dict:
    """Promote exact reviewed needsReview cells to translated without changing text.

    approvals maps locale -> {key: expected_current_value}. The expected value
    is an optimistic-lock guard: if the catalog value changed after review, the
    promotion is rejected. Placeholder parity is rechecked before promotion.
    Only needsReview cells are eligible; new/stale/translated cells are never
    silently altered.
    """
    path = _catalog_path(repo or None)
    cat = _load(path)
    strings = cat.get("strings", {})
    cfg = _config()
    src = cfg.get("source_language", "en")
    promoted = 0
    rejected: dict[str, list[str]] = {}
    for loc, kv in approvals.items():
        if not isinstance(kv, dict):
            rejected.setdefault(loc, []).append("approval payload must be {key: expected_current_value}")
            continue
        for key, expected in kv.items():
            e = strings.get(key)
            if not e:
                rejected.setdefault(loc, []).append(f"{key}: unknown key")
                continue
            unit = e.get("localizations", {}).get(loc, {}).get("stringUnit", {})
            state = unit.get("state")
            current = unit.get("value")
            if state not in ("needsReview", "needs_review"):
                rejected.setdefault(loc, []).append(f"{key}: state is {state!r}, expected needsReview")
                continue
            if current != expected:
                rejected.setdefault(loc, []).append(f"{key}: current value changed after review")
                continue
            reason = check_placeholder_parity(_en(e, key, src), current or "")
            if reason:
                rejected.setdefault(loc, []).append(f"{key}: {reason}")
                continue
            unit["state"] = "translated"
            promoted += 1
    if promoted:
        _save(path, cat)
    return {
        "catalog": str(path),
        "promoted": promoted,
        "rejected": rejected,
        "rule": "Only exact, unchanged needsReview values with placeholder parity can be promoted.",
    }


def localize_port_region(repo: str, region: str, base: str) -> dict:
    """Copy reviewed region cells into empty base cells (PR #83 procedure).

    For each key: if the base cell is empty (state None/"new") and the region
    cell is "translated" (reviewed), the region's value+state is copied into
    the base. NEVER overwrites an existing base value — not even needsReview.
    Region cells flagged needsReview are skipped (unreviewed).
    """
    path = _catalog_path(repo or None)
    cat = _load(path)
    strings = cat.get("strings", {})
    ported = skipped_distinct = skipped_unreviewed = 0
    for key, v in strings.items():
        base_st = _state(v, base)
        if base_st not in (None, "new"):
            skipped_distinct += 1
            continue
        region_unit = (v.get("localizations", {}).get(region, {}).get("stringUnit", {}))
        if region_unit.get("state") != "translated":
            skipped_unreviewed += 1
            continue
        v.setdefault("localizations", {})[base] = {
            "stringUnit": {"state": "translated", "value": region_unit.get("value")}
        }
        ported += 1
    _save(path, cat)
    return {
        "catalog": str(path),
        "region": region,
        "base": base,
        "ported": ported,
        "skipped_base_has_value": skipped_distinct,
        "skipped_region_unreviewed": skipped_unreviewed,
    }
