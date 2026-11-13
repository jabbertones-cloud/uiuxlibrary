#!/usr/bin/env python3
"""LocalizeShots — universal capture engine.

Drives a built `.app` through every locale × every device size for the
target platform(s) and writes PNGs at exact ASC dimensions.

Successor to `capture_ios_sim.py`. Adds:
  * iPhone, iPad, Apple TV, Apple Watch, Mac Catalyst (tvOS/watchOS via xcrun simctl)
  * lipo -info preflight against device-only .app
  * Dynamic sim fallback per ASC family band
  * Per-locale state DB writes (resume + selective re-run)
  * Optional headline overlay per locale
  * Optional translation via xcstrings or LLM
  * Quality QA on every capture (blank detection, dimension check)

Usage:
  python3 capture_sim.py \\
    --app-path /path/to/MyApp.app \\
    --bundle-id com.example.MyApp \\
    --out-dir /path/to/MyApp/fastlane/screenshots \\
    --platforms ios,ipad \\
    --locales en-US,fr-FR \\
    --run-id 20260502-1200 \\
    --app-id com.example.MyApp
"""

from __future__ import annotations
import argparse, fcntl, json, os, plistlib, re, subprocess, sys, time
from pathlib import Path

# Make scripts/lib/ importable regardless of cwd.
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from lib.sims import all_sizes_for, SimSpec  # noqa: E402
from lib.locales import LOCALES, matches      # noqa: E402
from lib import state, quality                 # noqa: E402
from lib import capture_plan                   # noqa: E402
from lib.sim_target_proof import (canonical_platforms, check_bundle_platform,
                                   simulator_candidates, verify_native_frame)  # noqa: E402
from lib import plan_yaml                      # noqa: E402


def run(cmd, check=True):
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def find_udid_from(names: list[str]) -> tuple[str, str] | None:
    candidates = find_udid_candidates_from(names)
    return candidates[0] if candidates else None


def find_udid_candidates_from(names: list[str]) -> list[tuple[str, str]]:
    out = run(["/usr/bin/xcrun", "simctl", "list", "-j", "devices"]).stdout
    devices = json.loads(out)["devices"]
    candidates = []
    for runtime, lst in devices.items():
        for d in lst:
            if d.get("name") in names and d.get("isAvailable", True):
                # higher-numbered runtimes sort later → newest first
                candidates.append((runtime, d["name"], d["udid"]))
    if not candidates:
        return []
    # Try requested fallback order; for each name pick the newest runtime.
    ordered = []
    for wanted in names:
        winners = [c for c in candidates if c[1] == wanted]
        winners.sort()
        ordered.extend((name, udid) for _, name, udid in winners)
    return ordered


def find_candidates_for_platform(spec: SimSpec) -> list[tuple[str, str]]:
    """Validate the runtime family before selecting a Watch/TV simulator.

    If the newest Apple TV/Watch model was not in the baked-in list, discover
    it from an actual same-platform runtime instead of falling back to iOS.
    """
    raw = run(["/usr/bin/xcrun", "simctl", "list", "-j", "devices"]).stdout
    return simulator_candidates(json.loads(raw), spec.platform, spec.fallbacks)


def _platform_missing_action(platform: str) -> str:
    if platform == "watchos":
        return ("Install watchOS Simulator in Xcode > Settings > Platforms "
                "(or xcodebuild -downloadPlatform watchOS), then create "
                "a Watch simulator. Watch tests require a real watchOS app target.")
    if platform == "tvos":
        return ("Install tvOS Simulator (xcodebuild -downloadPlatform tvOS), "
                "then create an Apple TV 4K simulator from Xcode > Devices.")
    return "Create a matching simulator in Xcode > Devices and Simulators."


def _capture_platform_proof(out: Path, platform: str, spec: SimSpec):
    """No geometric enlargement of Watch or TV screenshots.

    The final rendered frame from a 1080p Apple TV sim is 1920x1080,
    *not* a fictitious 3840x2160 capture from a 4K device.
    """
    if platform in ("tvos", "watchos"):
        return verify_native_frame(out, platform)
    normalize(out, spec.width, spec.height)
    from lib.quality import get_dimensions
    width, height = get_dimensions(out)
    return {"width": width, "height": height}


def boot(udid: str) -> bool:
    subprocess.run(["/usr/bin/xcrun", "simctl", "boot", udid],
                    capture_output=True, text=True)
    deadline = time.time() + 90
    while time.time() < deadline:
        try:
            out = run(["/usr/bin/xcrun", "simctl", "list", "-j", "devices"], check=False).stdout
            devices = json.loads(out).get("devices", {})
            for lst in devices.values():
                for device in lst:
                    if device.get("udid") == udid and device.get("state") == "Booted":
                        return True
        except Exception:
            pass
        time.sleep(2)
    subprocess.run(["/usr/bin/xcrun", "simctl", "shutdown", udid],
                   capture_output=True, text=True, check=False)
    return False


class SimulatorLocaleMismatchError(RuntimeError):
    """Requested screenshot locale differs from the simulator's actual preferences."""


def _simulator_read_preference(udid: str, key: str) -> str:
    """Read global simulator locale preferences from the device, not process args."""
    return run(["/usr/bin/xcrun", "simctl", "spawn", udid, "defaults",
                "read", "-g", key]).stdout.strip()


def _first_simulator_language(value: str) -> str:
    """Handle the normal 'defaults read' AppleLanguages array representation."""
    matches = re.findall(r"[A-Za-z][A-Za-z0-9_-]*", value)
    return matches[0] if matches else ""


def _normalized_locale(value: str) -> str:
    return value.strip().strip('"\'').replace("-", "_").casefold()


def set_locale(udid: str, lang: str, locale: str):
    """Fail closed if system UI locale would disagree with the screenshot label.

    Passing -AppleLanguages/-AppleLocale to the app alone localizes only the
    app: an iPad screenshot can still show a date in the old OS language.
    Check both system preferences after setting them, before *any* capture.
    """
    run(["/usr/bin/xcrun", "simctl", "spawn", udid, "defaults",
          "write", "-g", "AppleLanguages", "-array", lang])
    run(["/usr/bin/xcrun", "simctl", "spawn", udid, "defaults",
          "write", "-g", "AppleLocale", "-string", locale])
    actual_language = _first_simulator_language(_simulator_read_preference(udid, "AppleLanguages"))
    actual_locale = _simulator_read_preference(udid, "AppleLocale")
    if (actual_language.replace("_", "-").casefold() != lang.replace("_", "-").casefold()
            or _normalized_locale(actual_locale) != _normalized_locale(locale)):
        raise SimulatorLocaleMismatchError(
            "simulator system locale mismatch: "
            f"requested {lang}/{locale}, read back "
            f"{actual_language}/{actual_locale}; "
            "no screenshot can be approved until device and app locales match"
        )


def install_app(udid: str, app_path: Path):
    subprocess.run(["/usr/bin/xcrun", "simctl", "install", udid, str(app_path)],
                   capture_output=True, text=True, check=True, timeout=180)


def launch_app(udid: str, bundle_id: str, extra_simctl_env: dict[str, str] | None = None):
    env = os.environ.copy()
    env["SIMCTL_CHILD_FASTLANE_SNAPSHOT"] = "1"
    env["SIMCTL_CHILD_LOCALIZESHOTS"] = "1"
    if extra_simctl_env:
        for k, v in extra_simctl_env.items():
            env[k] = v
    subprocess.run(
        ["/usr/bin/xcrun", "simctl", "launch", udid, bundle_id],
        capture_output=True, text=True, check=True, timeout=90, env=env,
    )


def terminate_app(udid: str, bundle_id: str):
    try:
        subprocess.run(["/usr/bin/xcrun", "simctl", "terminate", udid, bundle_id],
                       capture_output=True, text=True, check=False, timeout=15)
    except subprocess.TimeoutExpired:
        pass


def status_bar(udid: str):
    subprocess.run([
        "/usr/bin/xcrun", "simctl", "status_bar", udid, "override",
        "--time", "9:41", "--dataNetwork", "wifi",
        "--wifiMode", "active", "--wifiBars", "3",
        "--cellularMode", "active", "--cellularBars", "4",
        "--batteryState", "charged", "--batteryLevel", "100",
    ], capture_output=True, check=False)


def screencap(udid: str, out: Path, retries: int = 3) -> bool:
    """Capture simulator screenshot with retry on transient simctl failure.

    simctl io screenshot can fail with returncode=1 if the simulator framebuffer
    is momentarily unavailable (e.g. immediately after app launch or rotation).
    Retry up to `retries` times with 1-second backoff before giving up.
    wwdc2020-10647: Become a Simulator expert — use simctl io for screenshot capture.
    """
    import time
    out.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(retries):
        r = subprocess.run(["/usr/bin/xcrun", "simctl", "io", udid, "screenshot", str(out)],
                            capture_output=True, text=True)
        if r.returncode == 0 and out.exists():
            return True
        if attempt < retries - 1:
            time.sleep(1)
    return False


def verify_cross_app_frame(png: Path, bundle_id: str, ledger: Path) -> tuple[bool, str]:
    """Fail closed if a different app has already produced the exact same frame.

    A screenshot's dimensions and PNG validity cannot establish app identity.
    Keep a per-output-root ledger so independent capture invocations are checked.
    The ledger is only a negative witness; a unique frame is NOT positive proof
    that the requested app is foregrounded.
    """
    import hashlib
    if not png.is_file():
        return False, "screenshot missing"
    digest = hashlib.sha256(png.read_bytes()).hexdigest()
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with open(ledger, "a+", encoding="utf-8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            handle.seek(0)
            for line in handle:
                try:
                    prior = json.loads(line)
                except (ValueError, TypeError):
                    continue
                if prior.get("sha256") == digest and prior.get("bundle_id") != bundle_id:
                    return False, ("identical screenshot from different app: "
                                   + str(prior.get("bundle_id")))
            handle.seek(0, os.SEEK_END)
            handle.write(json.dumps({"sha256": digest, "bundle_id": bundle_id,
                                     "path": str(png)}) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
            return True, ""
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def normalize(png: Path, w: int, h: int):
    if not png.exists():
        return
    out = subprocess.run(["/usr/bin/sips", "-g", "pixelWidth", "-g", "pixelHeight", str(png)],
                          capture_output=True, text=True).stdout
    cw = ch = 0
    for line in out.splitlines():
        if "pixelWidth" in line:
            cw = int(line.split(":")[-1].strip())
        elif "pixelHeight" in line:
            ch = int(line.split(":")[-1].strip())
    if (cw, ch) == (w, h):
        return
    # Match aspect ratio by cropping center, then resize.
    if cw and ch:
        target_ar = w / h
        cur_ar = cw / ch
        if cur_ar > target_ar:
            new_w = int(ch * target_ar)
            offset = (cw - new_w) // 2
            subprocess.run(["/usr/bin/sips", "-c", str(ch), str(new_w),
                            "--cropOffset", str(offset), "0", str(png)],
                            capture_output=True, check=False)
        elif cur_ar < target_ar:
            new_h = int(cw / target_ar)
            offset = (ch - new_h) // 2
            subprocess.run(["/usr/bin/sips", "-c", str(new_h), str(cw),
                            "--cropOffset", "0", str(offset), str(png)],
                            capture_output=True, check=False)
    subprocess.run(["/usr/bin/sips", "-z", str(h), str(w), str(png)],
                    capture_output=True, check=True)


def lipo_preflight(app_path: Path) -> str | None:
    """Reject device-only and Mac binaries without rejecting arm64 simulators.

    lipo -info prints only architecture, NOT the build platform. An arm64
    iphonesimulator binary looks identical to arm64 iphoneos to lipo.
    CFBundleSupportedPlatforms is authoritative for the app bundle's
    installation family; per-target validation runs later.
    """
    from lib.sim_target_proof import app_supported_platforms
    try:
        targets = app_supported_platforms(app_path)
    except ValueError as exc:
        return str(exc)
    sim_targets = {"iPhoneSimulator", "WatchSimulator", "AppleTVSimulator"}
    if not (set(targets) & sim_targets):
        return (f"bundle supports {targets} but not simulator installs. "
                "Build a target for iOS Simulator, watchOS Simulator, or "
                "tvOS Simulator rather than passing an iphoneos/watchos/"
                "appletvos device-only or macOS app.")
    return None


_LOCKFILE = Path.home() / ".localizeshots" / "build.lock"


def write_xctestrun(locale_tuple: tuple, app_path: Path, xctest_path: Path,
                    sim_udid: str, out_dir: Path) -> Path:
    """Write a per-locale .xctestrun plist for xcodebuild test-without-building.

    locale_tuple columns: (label, lang_code, apple_locale, fl_dir, bcp47_lang, cldr_region)
    Returns the path to the written .xctestrun file.
    """
    label, _lang, _apple_loc, fl_dir, bcp47_lang, cldr_region = locale_tuple
    plan = {
        "Version": 1,
        "TestConfigurations": [
            {
                "Name": fl_dir,
                "TestTargets": [
                    {
                        "BlueprintName": xctest_path.stem,
                        "TestHostPath": str(app_path),
                        "TestBundlePath": str(xctest_path),
                        "EnvironmentVariables": {
                            "SIMULATOR_LANGUAGE": bcp47_lang,
                            "SIMULATOR_REGION": cldr_region,
                        },
                        "TestingEnvironmentVariables": {
                            "LOCALIZESHOTS_CAPTURE": "1",
                            "LOCALIZESHOTS_OUT_DIR": str(out_dir),
                        },
                    }
                ],
            }
        ],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"Screenshots-{fl_dir}.xctestrun"
    path.write_bytes(plistlib.dumps(plan, fmt=plistlib.FMT_XML))
    return path


def run_testplan(xctestrun_path: Path, sim_udid: str, fl_dir: str,
                 out_dir: Path, ui_test_target: str) -> subprocess.CompletedProcess:
    """Invoke xcodebuild test-without-building under the shared build lockfile."""
    result_bundle = out_dir / f"result-{fl_dir}.xcresult"
    cmd = [
        "/usr/bin/xcodebuild", "test-without-building",
        "-xctestrun", str(xctestrun_path),
        "-destination", f"id={sim_udid}",
        f"-only-testing:{ui_test_target}/ScreenshotTests",
        "-resultBundlePath", str(result_bundle),
    ]
    _LOCKFILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_LOCKFILE, "a+") as lf:
        blocking = False
        try:
            fcntl.flock(lf, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(f"  [lock] another xcodebuild is running, waiting…", flush=True)
            fcntl.flock(lf, fcntl.LOCK_EX)
            blocking = True
        try:
            return subprocess.run(cmd, capture_output=True, text=True)
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


def wait_for_settle(udid: str, timeout_s: float, poll_interval: float = 0.5,
                    stable_frames: int = 2) -> tuple[bool, int]:
    """Wait until the simulator framebuffer stops changing (auto-settle).

    Captures frames and compares SHA-256 digests; returns once
    `stable_frames` consecutive identical frames are seen. This is a
    *sampling* loop, not a fixed sleep: capture proceeds the moment the
    screen settles. Returns (settled, wait_ms). On timeout returns
    (False, wait_ms) — the caller captures anyway and flags settled=false.

    Rationale (donor: reproit): auto-settle between actions, never sleeps.
    Caveat: screens with live content (clocks, animations) may never hash
    stable; they fall through to the timeout path by design.
    """
    import hashlib
    import tempfile
    start = time.monotonic()
    prev: str | None = None
    stable = 0
    with tempfile.TemporaryDirectory(prefix="ls-settle-") as tmpd:
        frame = Path(tmpd) / "frame.png"
        while True:
            r = subprocess.run(
                ["/usr/bin/xcrun", "simctl", "io", udid, "screenshot", str(frame)],
                capture_output=True, text=True)
            digest = None
            if r.returncode == 0 and frame.exists():
                digest = hashlib.sha256(frame.read_bytes()).hexdigest()
            elapsed_ms = int((time.monotonic() - start) * 1000)
            if digest is not None and digest == prev:
                stable += 1
                if stable >= stable_frames:
                    return True, elapsed_ms
            else:
                stable = 0
            prev = digest
            if elapsed_ms >= timeout_s * 1000:
                return False, elapsed_ms
            time.sleep(poll_interval)


def _locale_tuple_for(bcp47: str):
    """Map a plan BCP47 locale to a lib.locales LOCALES tuple."""
    for t in LOCALES:
        if t[3] == bcp47 or t[0] == bcp47:
            return t
    return None


def _seed_args_to_env(args_list: list[str]) -> dict[str, str]:
    """Convert plan seed.launch_args to SIMCTL_CHILD_ env vars.

    Entries look like ["-FLAG", "1"] or ["--KEY=VALUE"]; a bare flag means "1".
    """
    env: dict[str, str] = {}
    items = list(args_list)
    i = 0
    while i < len(items):
        tok = str(items[i]).strip()
        key = tok.lstrip("-")
        value = "1"
        if "=" in key:
            key, value = key.split("=", 1)
        elif i + 1 < len(items) and not str(items[i + 1]).strip().startswith("-"):
            i += 1
            value = str(items[i]).strip()
        key = key.strip()
        if key:
            if not key.startswith("SIMCTL_CHILD_"):
                key = "SIMCTL_CHILD_" + key
            env[key] = value.strip()
        i += 1
    return env


def run_plan(args) -> int:
    """Slideshow mode: cycle a capture plan's shots across the matrix.

    Per (device, locale, shot) cell: cold deep-link -> frame-stability settle
    (bounded by the shot's timeout_s; never fixed sleeps) -> capture -> next.
    A stop whose screen never settles is captured anyway and flagged
    settled=false; a stop with no deep_link reach is SKIPPED and reported,
    never fatal (pardis-kmp rule). Ends with the completeness-gate verdict.
    """
    try:
        plan = capture_plan.load_file(args.plan_path)
    except (plan_yaml.PlanYAMLError, OSError) as exc:
        sys.stderr.write(f"FATAL: bad plan file: {exc}\n")
        return 1
    try:
        plan = capture_plan.expand_auto_locales(plan, args.app_path)
    except ValueError as exc:
        sys.stderr.write(f"FATAL: {exc}\n")
        return 1
    errs = capture_plan.validate(plan)
    if errs:
        sys.stderr.write("FATAL: invalid capture plan:\n")
        for e in errs:
            sys.stderr.write(f"  - {e}\n")
        return 1
    for w in capture_plan.warnings(plan):
        sys.stderr.write(f"WARNING: {w}\n")

    bundle_id = args.bundle_id or plan["app"]["bundle_id"]
    app_path = Path(args.app_path).resolve()
    out_root = Path(args.out_dir).resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    # Resolve every plan locale to a simctl locale tuple up front (fail fast).
    locale_tuples: dict[str, tuple] = {}
    for loc in plan["matrix"]["locales"]:
        t = _locale_tuple_for(loc)
        if not t:
            sys.stderr.write(f"FATAL: plan locale {loc!r} not in lib.locales\n")
            return 1
        locale_tuples[loc] = t

    dry_run = bool((plan.get("modes") or {}).get("dry_run"))
    seed = plan.get("seed") or {}
    base_seed_env = _seed_args_to_env(seed.get("launch_args", []))
    reset_between = seed.get("reset_between", "screens")
    content_seams = seed.get("content", {}) or {}

    run_id = args.run_id or time.strftime("%Y%m%d-%H%M%S")
    app_id = args.app_id or bundle_id
    if not args.no_state:
        state.start_run(run_id, note=f"capture-plan {bundle_id}")

    results: list[dict] = []
    total = ok = 0

    try:
        simulator_inventory = json.loads(run(
            ["/usr/bin/xcrun", "simctl", "list", "-j", "devices"]
        ).stdout)
    except (ValueError, subprocess.CalledProcessError) as exc:
        sys.stderr.write(f"FATAL: unable to inspect simulator runtimes: {exc}\n")
        return 2

    for device in plan["matrix"]["devices"]:
        # The plan carries friendly device names, never a trusted platform.
        # Read the actual runtime and refuse a mismatched .app before boot.
        matching = [(runtime, item) for runtime, items in
                    simulator_inventory.get("devices", {}).items()
                    for item in items if item.get("name") == device
                    and item.get("isAvailable", True)]
        families = set()
        for runtime, item in matching:
            if "SimRuntime.watchOS-" in runtime:
                families.add("watchos")
            elif "SimRuntime.tvOS-" in runtime:
                families.add("tvos")
            elif "SimRuntime.iOS-" in runtime:
                families.add("ipados" if "iPad" in device else "ios")
        device_family = next(iter(families)) if len(families) == 1 else None
        if device_family is None:
            error = f"device {device!r} missing, ambiguous or not in an allowed runtime"
            print(f"[plan] {error}")
            for loc in plan["matrix"]["locales"]:
                for shot in plan["shots"]:
                    results.append({"name": shot["name"], "locale": loc,
                                    "device": device, "skipped": True, "reason": error})
            continue
        try:
            check_bundle_platform(app_path, device_family)
        except ValueError as exc:
            error = str(exc)
            print(f"[plan] incompatible target {device}: {error}")
            for loc in plan["matrix"]["locales"]:
                for shot in plan["shots"]:
                    results.append({"name": shot["name"], "locale": loc,
                                    "device": device, "skipped": True, "reason": error})
            continue
        candidates = simulator_candidates(
            simulator_inventory, device_family, [device]
        )
        udid = None
        for _name, candidate_udid in candidates:
            print(f"[plan {device}] trying {_name} ({candidate_udid[:8]}…)")
            if boot(candidate_udid):
                udid = candidate_udid
                break
        if not udid:
            msg = f"no bootable sim for device {device!r}"
            print(f"  ✗ {msg}")
            for loc in plan["matrix"]["locales"]:
                for shot in plan["shots"]:
                    results.append({"name": shot["name"], "locale": loc, "device": device,
                                    "skipped": True, "reason": msg})
            continue
        print(f"[plan {device}] using {udid[:8]}…")
        if device_family in ("ios", "ipados"):
            status_bar(udid)
        try:
            try:
                install_app(udid, app_path)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
                err_msg = (getattr(e, "stderr", None) or "").strip().splitlines()
                err_msg = err_msg[-1] if err_msg else str(e)
                print(f"  ✗ install failed: {err_msg}")
                for loc in plan["matrix"]["locales"]:
                    for shot in plan["shots"]:
                        results.append({"name": shot["name"], "locale": loc, "device": device,
                                        "skipped": True, "reason": f"install failed: {err_msg}"})
                continue
            subprocess.run(
                ["/usr/bin/xcrun", "simctl", "privacy", udid, "grant", "all", bundle_id],
                capture_output=True, text=True, check=False)

            for loc in plan["matrix"]["locales"]:
                label, lang, apple_loc, fl_dir, bcp47_lang, _cldr = locale_tuples[loc]
                # Per-locale content seams (pastura lesson): the seam arg joins
                # the launch args for this locale only.
                seam = (content_seams.get(loc) or {})
                locale_seed = list(seed.get("launch_args", []))
                if isinstance(seam, dict) and seam.get("seed_arg"):
                    locale_seed.append(str(seam["seed_arg"]))
                launch_env = _seed_args_to_env(locale_seed) or None

                terminate_app(udid, bundle_id)
                try:
                    set_locale(udid, lang, apple_loc)
                    launch_app(udid, bundle_id, extra_simctl_env=launch_env)
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
                        SimulatorLocaleMismatchError) as e:
                    err_msg = (getattr(e, "stderr", None) or "").strip() or str(e)
                    print(f"  ✗ [{loc}] launch failed: {err_msg}")
                    for shot in plan["shots"]:
                        results.append({"name": shot["name"], "locale": loc, "device": device,
                                        "skipped": True, "reason": f"launch failed: {err_msg}"})
                    continue

                for shot in plan["shots"]:
                    total += 1
                    name = shot["name"]
                    if args.resume and capture_plan.cell_done(out_root, loc, device, name):
                        print(f"  [{loc} / {device} / {name}] SKIP (already captured)")
                        saved = capture_plan.load_state(out_root)["cells"].get(capture_plan.cell_key(loc, device, name), {})
                        png = Path(saved.get("png_path", ""))
                        verified = (png.is_file() and bool(saved.get("png_sha256")) and
                                    quality.sha256_of(png) == saved["png_sha256"])
                        results.append({"name": name, "locale": loc, "device": device,
                                        "skipped": True, "reason": "resume: already captured",
                                        "resume_verified": verified, "destination_verified": verified})
                        ok += 1
                        continue
                    if dry_run:
                        print(f"  [{loc} / {device} / {name}] dry-run (navigate only)")
                        capture_plan.mark_cell(out_root, loc, device, name, "dry_run")
                        results.append({"name": name, "locale": loc, "device": device,
                                        "dry_run": True})
                        ok += 1
                        continue

                    reach = shot.get("reach") or {}
                    deep_link = reach.get("deep_link")
                    if not deep_link:
                        reason = ("tap-steps reach has no deep_link; v1 simctl mode "
                                  "supports deep_link reach only (tap fallback needs "
                                  "testplan/XCUITest enforcement)")
                        print(f"  [{loc} / {device} / {name}] SKIP ({reason})")
                        capture_plan.mark_cell(out_root, loc, device, name, "skipped",
                                               error=reason)
                        results.append({"name": name, "locale": loc, "device": device,
                                        "skipped": True, "reason": reason})
                        continue

                    url = (deep_link.replace("{locale}", fl_dir)
                                     .replace("{bcp47}", bcp47_lang))
                    # Cold deep link per shot (claude-rcode: prefer a cold
                    # deep-link per screen over navigating through the UI).
                    # VERIFY (donor benchmark #14): on iOS 26.5 a deep link
                    # fired after terminate can surface an "Open in <App>?"
                    # system dialog; v1 cannot dismiss it host-side.
                    if reset_between == "screens":
                        terminate_app(udid, bundle_id)
                    opened = subprocess.run(
                        ["/usr/bin/xcrun", "simctl", "openurl", udid, url],
                        capture_output=True, text=True, timeout=30)
                    if opened.returncode != 0:
                        reason = (opened.stderr or opened.stdout or "simctl openurl failed").strip()
                        capture_plan.mark_cell(out_root, loc, device, name, "failed",
                                               error=f"deep link failed: {reason}")
                        results.append({"name": name, "locale": loc, "device": device,
                                        "skipped": True, "reason": f"deep link failed: {reason}"})
                        continue
                    timeout_s = shot.get("timeout_s", 10)
                    settled, wait_ms = wait_for_settle(udid, timeout_s)

                    out = capture_plan.shot_out_path(plan, shot, loc, device, out_root)
                    print(f"  [{loc} / {device} / {name}] → {out.relative_to(out_root)}",
                          end="  ", flush=True)
                    if not screencap(udid, out):
                        print("✗ screencap failed")
                        capture_plan.mark_cell(out_root, loc, device, name, "failed",
                                               error="screencap failed")
                        results.append({"name": name, "locale": loc, "device": device,
                                        "skipped": True, "reason": "screencap failed"})
                        continue
                    spec = _plan_spec_for(device)
                    capture_proof = None
                    try:
                        if device_family in ("tvos", "watchos"):
                            capture_proof = verify_native_frame(out, device_family)
                        elif spec is not None:
                            normalize(out, spec.width, spec.height)
                        quality.strip_alpha(out)
                        qa_ok, qa_reason = True, ""
                    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
                        qa_ok, qa_reason = False, str(exc)
                    if not args.no_qa and qa_ok:
                        if spec is not None and device_family not in ("tvos", "watchos"):
                            qr = quality.check(out, spec.width, spec.height)
                        else:
                            qr = _plan_qa_nodims(out)
                        qa_ok, qa_reason = qr.ok, qr.reason
                    if qa_ok:
                        identity_ok, identity_reason = verify_cross_app_frame(
                            out, bundle_id, out_root / ".aiscent-cross-app-frames.jsonl")
                        if not identity_ok:
                            qa_ok, qa_reason = False, identity_reason
                    sha = quality.sha256_of(out)
                    wait_for = shot.get("wait_for")
                    if not settled:
                        qa_ok, qa_reason = False, "framebuffer did not settle before timeout"
                    if qa_ok:
                        print(f"✓ settled={settled} {wait_ms}ms {out.stat().st_size//1024} KB")
                        ok += 1
                        capture_plan.mark_cell(out_root, loc, device, name, "captured",
                                               png_path=str(out), png_sha256=sha)
                    else:
                        print(f"⚠ QA failed: {qa_reason}")
                        capture_plan.mark_cell(out_root, loc, device, name, "failed",
                                               png_path=str(out), error=f"qa: {qa_reason}")
                    results.append({
                        "name": name, "locale": loc, "device": device,
                        "path": str(out), "bytes_sha256": sha, "wait_ms": wait_ms,
                        "settled": settled, "wait_for": wait_for,
                        "page_identity_verified": False,
                        "verification_needed": "XCTest accessibility witness",
                        "native_geometry": capture_proof,
                        "skipped": False, "qa_ok": qa_ok,
                        "destination_verified": (qa_ok and out.is_file()
                                                 and quality.sha256_of(out) == sha),
                        "qa_reason": qa_reason,
                    })
        finally:
            try:
                terminate_app(udid, bundle_id)
            except Exception:
                pass

    gate_on = bool((plan.get("output") or {}).get("completeness_gate", True))
    gate = capture_plan.completeness_gate(results) if gate_on else {
        "pass": True, "reason": "completeness gate disabled in plan", "per_locale": {}, "expected": []}

    matrix_gate = capture_plan.verify_matrix(plan, results, dry_run=dry_run)
    if not matrix_gate["pass"] and not dry_run:
        gate = dict(gate)
        gate["pass"] = False
        gate["reason"] = matrix_gate["reason"]
    missing_cells = matrix_gate["missing_cells"]

    payload = {
        "run_id": run_id,
        "bundle_id": bundle_id,
        "dry_run": dry_run,
        "results": results,
        "captured": ok,
        "total": total,
        "completeness_gate": gate,
        # Legacy deep links + hash settle do NOT prove the requested page:
        # a URL may be ignored while Today remains visible.
        "page_identity_verified": False,
        "design_review_ready": False,
        "screen_identity_next_step": "run XCUITest and export passed screenshots",
        "missing_cells": missing_cells,
        "verify_open": list(capture_plan.VERIFY_NOTES),
    }
    print()
    print("###CAPTURE_PLAN_RESULTS###")
    print(json.dumps(payload))
    print("###END###")
    print(f"Plan captured {ok} / {total}; completeness gate: "
          f"{'PASS' if gate['pass'] else 'FAIL ' + gate['reason']}")
    print(f"Output:  {out_root}")

    if not args.no_state:
        state.end_run(run_id, "complete" if gate["pass"] and ok > 0 else "failed")
    if not gate["pass"]:
        return 2
    return 0 if ok > 0 else 2


def _plan_spec_for(device: str):
    """Resolve a plan device name to a lib.sims SimSpec (for ASC dimensions)."""
    for plat in ("ios", "ipad", "tvos", "watchos", "catalyst"):
        try:
            specs = all_sizes_for([plat])
        except Exception:
            continue
        for spec in specs:
            if device in spec.fallbacks:
                return spec
    return None


def _plan_qa_nodims(out: Path):
    """Dimension-agnostic QA for plan devices with no known SimSpec.

    Rejects missing/tiny/uniform captures; skips the exact-dimension and
    alpha assertions that need a known ASC size.
    """
    from lib.quality import QAResult, get_dimensions, is_mostly_uniform
    if not out.exists():
        return QAResult(False, "file missing")
    sz = out.stat().st_size
    if sz < 5000:
        return QAResult(False, f"png too small ({sz} bytes — likely corrupt or blank)", bytes=sz)
    if is_mostly_uniform(out):
        w, h = get_dimensions(out)
        return QAResult(False, "appears to be blank / launch-screen capture", w, h, sz)
    w, h = get_dimensions(out)
    return QAResult(True, "", w, h, sz)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--app-path", required=True)
    ap.add_argument("--bundle-id", required=False, default=None,
                    help="Defaults to the plan's app.bundle_id when --plan is given.")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--platforms", default="ios",
                    help="Comma-separated: ios,ipad,tvos,watchos,catalyst")
    ap.add_argument("--locales", default=None,
                    help="Comma-separated. Accepts label OR fl_dir.")
    ap.add_argument("--sizes", default=None,
                    help="Restrict to specific size labels (e.g. 6.9,11)")
    ap.add_argument("--settle", type=float, default=4.0)
    ap.add_argument("--launch-env", dest="launch_env", default=None,
                    help="Extra SIMCTL_CHILD_* env vars as KEY=VALUE pairs (comma-separated). "
                         "Keys are auto-prefixed with SIMCTL_CHILD_ if not already prefixed. "
                         "Example: SLIDETAC_SCREENSHOT_DEMO=1,SLIDETAC_UI_SCREEN=game_ai")
    ap.add_argument("--app-id", default=None,
                    help="Identifier for state DB (defaults to bundle id)")
    ap.add_argument("--run-id", default=None,
                    help="Reuse a state-DB run id (for resume)")
    ap.add_argument("--resume", action="store_true",
                    help="Skip cells already marked captured/uploaded for this run")
    ap.add_argument("--no-state", action="store_true",
                    help="Disable state DB writes")
    ap.add_argument("--no-qa", action="store_true",
                    help="Disable per-PNG QA checks")
    ap.add_argument("--deep-link", dest="deep_link", default=None,
                    help="URL to open via 'xcrun simctl openurl' after launch. "
                         "Supports {locale} and {bcp47} placeholders per locale.")
    ap.add_argument("--plan", dest="plan_path", default=None,
                    help="Path to a capture-plan.yaml (v1) declarative shot list. "
                         "Enables slideshow mode: each shot is reached by cold "
                         "deep-link, settled on frame stability (never fixed "
                         "sleeps), then captured, per locale x device cell. "
                         "When given, --bundle-id defaults to the plan's "
                         "app.bundle_id. v1 is simctl-only.")
    ap.add_argument("--locale-mode", choices=["simctl", "testplan"], default="simctl",
                    help="simctl: launch via xcrun simctl (default). "
                         "testplan: write .xctestrun per locale and use "
                         "xcodebuild test-without-building.")
    ap.add_argument("--xctest-bundle", default=None,
                    help="Abs path to .xctest bundle. Required when --locale-mode=testplan.")
    ap.add_argument("--ui-test-target", default=None,
                    help="UITest target name for -only-testing flag (e.g. MyAppUITests). "
                         "Required when --locale-mode=testplan.")
    args = ap.parse_args()

    # Parse --launch-env KEY=VALUE pairs into a dict with SIMCTL_CHILD_ prefix.
    extra_simctl_env: dict[str, str] = {}
    if args.launch_env:
        for pair in args.launch_env.split(","):
            pair = pair.strip()
            if "=" not in pair:
                continue
            k, v = pair.split("=", 1)
            k = k.strip()
            if not k.startswith("SIMCTL_CHILD_"):
                k = "SIMCTL_CHILD_" + k
            extra_simctl_env[k] = v.strip()

    # Resolve and validate platform families before any capture writes.
    # A bundle compiled for iPhoneSimulator must never be accepted for tvOS
    # or watchOS merely because simctl returned exit code 0.
    try:
        resolved_platforms = canonical_platforms(args.platforms)
    except ValueError as exc:
        sys.stderr.write(f"FATAL: {exc}\n")
        return 1
    if "catalyst" in resolved_platforms:
        sys.stderr.write("FATAL: native Mac capture requires capture_screenshots.py\n")
        return 2

    # Validate testplan-mode requirements early.
    xctest_path: Path | None = None
    if args.locale_mode == "testplan":
        if not args.xctest_bundle:
            sys.stderr.write("FATAL: --xctest-bundle is required when --locale-mode=testplan\n")
            return 1
        if not args.ui_test_target:
            sys.stderr.write("FATAL: --ui-test-target is required when --locale-mode=testplan\n")
            return 1
        xctest_path = Path(args.xctest_bundle).resolve()
        if not xctest_path.exists():
            sys.stderr.write(f"FATAL: xctest bundle not found: {xctest_path}\n")
            return 1

    app_path = Path(args.app_path).resolve()
    if not app_path.exists():
        sys.stderr.write(f"FATAL: app not found: {app_path}\n")
        return 1
    err = lipo_preflight(app_path)
    if err:
        sys.stderr.write(f"FATAL: {err}\n")
        return 2
    # A plan's actual device/runtime inventory determines its target family.
    # --platforms defaults to iOS for ordinary capture, but must not reject a
    # valid tvOS/watchOS plan before run_plan inspects the selected simulator.
    if not args.plan_path:
        for platform in resolved_platforms:
            try:
                check_bundle_platform(app_path, platform)
            except ValueError as exc:
                sys.stderr.write(f"FATAL: {exc}\n")
                return 2

    # Slideshow mode: declarative capture plan (v1 is simctl-only).
    if args.plan_path:
        if args.locale_mode != "simctl":
            sys.stderr.write("FATAL: --plan is simctl-only in v1 "
                             "(--locale-mode=testplan is not supported with --plan)\n")
            return 1
        return run_plan(args)
    if not args.bundle_id:
        sys.stderr.write("FATAL: --bundle-id is required (or pass --plan, which carries app.bundle_id)\n")
        return 1

    out_root = Path(args.out_dir).resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    locale_filter = set(args.locales.split(",")) if args.locales else None
    size_filter   = set(args.sizes.split(","))   if args.sizes   else None

    sizes = all_sizes_for(resolved_platforms)
    if size_filter:
        sizes = [s for s in sizes if s.label in size_filter]
    if not sizes:
        sys.stderr.write("FATAL: no matching device size targets\n")
        return 2

    active_locales = [l for l in LOCALES if matches(locale_filter, l[0], l[3])]
    work_total = len(sizes) * len(active_locales)
    work_done = 0

    run_id = args.run_id or time.strftime("%Y%m%d-%H%M%S")
    app_id = args.app_id or args.bundle_id
    if not args.no_state:
        state.start_run(run_id, note=f"capture {args.bundle_id}")

    total = 0
    ok = 0
    missing_device_cells = 0

    for spec in sizes:
        try:
            candidates = find_candidates_for_platform(spec)
        except (ValueError, subprocess.CalledProcessError) as exc:
            print(f"[skip {spec.label}] failed to enumerate target simulators: {exc}")
            candidates = []
        if not candidates:
            tried = ", ".join(spec.fallbacks)
            print(f"[skip {spec.label}] no installed compatible {spec.platform} sim from [{tried}]")
            print(f"        → {_platform_missing_action(spec.platform)}")
            missing_device_cells += len(active_locales)
            work_done += len(active_locales)
            for l in active_locales:
                if not args.no_state:
                    state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                       spec.label, l[3], "skipped",
                                       error=f"no sim installed: {tried}")
            continue
        sim_name = udid = None
        for candidate_name, candidate_udid in candidates:
            print(f"[{spec.platform} {spec.label}] trying {candidate_name} ({candidate_udid[:8]}…)")
            if boot(candidate_udid):
                sim_name, udid = candidate_name, candidate_udid
                break
            print(f"  ! boot timed out; trying next fallback")

        if not udid:
            missing_device_cells += len(active_locales)
            for l in active_locales:
                if not args.no_state:
                    state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                       spec.label, l[3], "failed",
                                       error="all matching sims failed to boot")
            work_done += len(active_locales)
            continue

        print(f"[{spec.platform} {spec.label}] using {sim_name} ({udid[:8]}…)")
        if spec.platform in ("ios", "ipados"):
            status_bar(udid)
        try:  # outer try — guarantee terminate_app even on exception or continue
            try:
                install_app(udid, app_path)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
                stderr = getattr(e, "stderr", None)
                err_msg = stderr.strip().splitlines()[-1] if stderr else str(e)
                print(f"  ✗ install failed: {err_msg}")
                if isinstance(e, subprocess.TimeoutExpired):
                    # Shut down sim so it isn't reused in bad state by later specs.
                    try:
                        subprocess.run(["/usr/bin/xcrun", "simctl", "shutdown", udid],
                                       capture_output=True, text=True, check=False, timeout=15)
                    except subprocess.TimeoutExpired:
                        pass  # sim service hung — continue anyway
                for l in active_locales:
                    if not args.no_state:
                        state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                           spec.label, l[3], "failed",
                                           error=f"install failed: {err_msg}")
                continue  # finally still runs, then next spec

            # Pre-grant all privacy permissions (ATT, location, etc.) to avoid
            # first-run consent dialogs blocking the screenshot.
            subprocess.run(
                ["/usr/bin/xcrun", "simctl", "privacy", udid, "grant", "all", args.bundle_id],
                capture_output=True, text=True, check=False,
            )

            for label, lang, apple_loc, fl_dir, bcp47_lang, cldr_region in active_locales:
                total += 1
                work_done += 1
                pct = int(100 * work_done / max(work_total, 1))

                # Resume: skip cells already done.
                if args.resume and not args.no_state:
                    existing = state.cells_for(run_id)
                    done = {(c["app_id"], c["platform"], c["size_label"], c["locale"])
                            for c in existing if c["status"] in ("captured", "uploaded")}
                    if (app_id, spec.platform, spec.label, fl_dir) in done:
                        print(f"  [{pct:3d}% {work_done}/{work_total}] [{label:>8}] SKIP (already done)")
                        ok += 1
                        continue

                if args.locale_mode == "testplan":
                    # testplan mode: write a per-locale .xctestrun and invoke
                    # xcodebuild test-without-building (more reliable than
                    # simctl defaults write for locale injection).
                    locale_out = out_root / fl_dir
                    locale_tuple = (label, lang, apple_loc, fl_dir, bcp47_lang, cldr_region)
                    xctestrun_path = write_xctestrun(locale_tuple, app_path, xctest_path,
                                                      udid, locale_out)
                    print(f"  [{pct:3d}% {work_done}/{work_total}] [{label:>8}] xctestrun → "
                          f"{xctestrun_path.name}", flush=True)
                    r = run_testplan(xctestrun_path, udid, fl_dir, locale_out,
                                      args.ui_test_target)
                    if r.returncode != 0:
                        err_lines = (r.stderr or r.stdout or "").strip().splitlines()
                        err_msg = err_lines[-1] if err_lines else "xcodebuild failed"
                        print(f"  ✗ xcodebuild failed: {err_msg}")
                        if not args.no_state:
                            state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                               spec.label, fl_dir, "failed",
                                               error=f"xcodebuild: {err_msg}")
                        continue
                    # In testplan mode the test target writes PNGs directly to
                    # LOCALIZESHOTS_OUT_DIR; scan for the expected file.
                    out = locale_out / f"{spec.platform}_{spec.label}.png"
                    print(f"  [{pct:3d}% {work_done}/{work_total}] [{label:>8}] → "
                          f"{out.relative_to(out_root)}", end="  ", flush=True)
                    if not out.exists():
                        print("✗ PNG not found (test target did not write it)")
                        if not args.no_state:
                            state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                               spec.label, fl_dir, "failed",
                                               error="png missing after xcodebuild")
                        continue
                else:
                    # simctl mode (default): set locale via defaults write, launch app,
                    # wait, then screencap.
                    terminate_app(udid, args.bundle_id)
                    time.sleep(0.4)
                    try:
                        set_locale(udid, lang, apple_loc)
                        launch_app(udid, args.bundle_id, extra_simctl_env=extra_simctl_env or None)
                    except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
                            SimulatorLocaleMismatchError) as e:
                        err_msg = (getattr(e, "stderr", None) or "").strip() or str(e)
                        print(f"  ✗ locale preflight / launch failed for {label}: {err_msg}")
                        if not args.no_state:
                            state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                               spec.label, fl_dir, "failed",
                                               error=str(e))
                        continue
                    # Optional deep link navigation (IAP / paywall / specific screen).
                    if args.deep_link:
                        time.sleep(1.0)  # brief pause before URL dispatch
                        deep_url = (args.deep_link
                                    .replace("{locale}", fl_dir)
                                    .replace("{bcp47}", bcp47_lang))
                        subprocess.run(
                            ["/usr/bin/xcrun", "simctl", "openurl", udid, deep_url],
                            capture_output=True, text=True,
                        )
                    time.sleep(args.settle)

                    out = out_root / fl_dir / f"{spec.platform}_{spec.label}.png"
                    print(f"  [{pct:3d}% {work_done}/{work_total}] [{label:>8}] → {out.relative_to(out_root)}",
                          end="  ", flush=True)
                    if not screencap(udid, out):
                        print("✗ screencap failed")
                        if not args.no_state:
                            state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                               spec.label, fl_dir, "failed",
                                               error="screencap failed")
                        continue

                # Watch and Apple TV must be judged at their real screen
                # dimensions; scaling 1080p into 4K creates false evidence.
                proof = None
                capture_error = None
                try:
                    proof = _capture_platform_proof(out, spec.platform, spec)
                    quality.strip_alpha(out)
                except (ValueError, OSError, subprocess.CalledProcessError) as exc:
                    capture_error = str(exc)

                qa_ok = capture_error is None
                qa_reason = capture_error or ""
                if not args.no_qa and qa_ok:
                    if spec.platform in ("tvos", "watchos"):
                        qr = _plan_qa_nodims(out)
                    else:
                        qr = quality.check(out, spec.width, spec.height)
                    qa_ok = qr.ok
                    qa_reason = qr.reason

                if qa_ok:
                    size_b = out.stat().st_size
                    print(f"✓ {proof['width']}×{proof['height']} {size_b//1024} KB")
                    ok += 1
                    if not args.no_state:
                        state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                           spec.label, fl_dir, "captured",
                                           png_path=str(out),
                                           png_sha256=quality.sha256_of(out))
                else:
                    print(f"⚠ QA failed: {qa_reason}")
                    if not args.no_state:
                        state.upsert_cell(run_id, app_id, args.bundle_id, spec.platform,
                                           spec.label, fl_dir, "failed",
                                           png_path=str(out),
                                           error=f"qa: {qa_reason}")

        finally:
            # Guarantee terminate even on exception, install failure, or early continue.
            try:
                terminate_app(udid, args.bundle_id)
            except Exception:
                pass

    complete = bool(work_total) and ok == work_total and missing_device_cells == 0
    if not args.no_state:
        state.end_run(run_id, "complete" if complete else "failed")

    print()
    print(f"Captured {ok} / {work_total} requested cells "
          f"({missing_device_cells} missing-device cells; attempted {total})")
    print(f"Completeness gate: {'PASS' if complete else 'FAIL'}")
    print(f"Output:  {out_root}")
    print(f"Run ID:  {run_id}")
    return 0 if complete else 2


if __name__ == "__main__":
    sys.exit(main())
