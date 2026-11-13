#!/usr/bin/env python3
"""Independent, single-screen CoreSimulator adapter over Apple's simctl.
Source donors: LocalizeShots capture_sim.py, capture_plan.py, sim_target_proof.py.
Never installs apps, changes OS permissions, or calls AiSCent/ASC.
"""
from __future__ import annotations
import argparse, json, plistlib, re, shutil, subprocess, sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "vendor"))
from lib import capture_plan, locales, quality, sim_target_proof  # noqa: E402
from capture_sim import wait_for_settle  # noqa: E402


def cmd(*args: str, timeout: int = 30) -> str:
    p = subprocess.run(["/usr/bin/xcrun", "simctl", *args], text=True,
                       capture_output=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError((p.stderr or p.stdout or f"simctl exited {p.returncode}").strip()[:500])
    return p.stdout.strip()


def inventory() -> list[dict]:
    data = json.loads(cmd("list", "--json", "devices"))
    return [{**d, "runtime": runtime} for runtime, ds in data["devices"].items()
            for d in ds if d.get("isAvailable", True)]


def selected_device(device: str) -> dict:
    options = [d for d in inventory() if device in (d.get("udid"), d.get("name"))]
    if len(options) != 1:
        raise ValueError(f"simulator selection must match exactly one device, got {len(options)}")
    return options[0]


def display_ports(udid: str) -> list[dict]:
    blocks = cmd("io", udid, "enumerate").split("Port:")[1:]
    displays = []
    for block in blocks:
        fields = dict(line.split(":", 1) for row in block.splitlines()
                      if ":" in (line := row.strip()))
        if (fields.get("Class", "").strip() == "Display" and
            fields.get("Power state", "").strip() == "On" and
            fields.get("Display class", "").strip() == "0"):
            displays.append({"uuid": fields["UUID"].strip(),
                             "width": int(fields["Default width"].strip()),
                             "height": int(fields["Default height"].strip())})
    return displays


def active_ports(udid: str) -> list[str]:
    return [port["uuid"] for port in display_ports(udid)]


def screen_config(file: str, screen: str) -> tuple[dict, dict]:
    config = json.loads(Path(file).read_text())
    if config.get("schema") != "smat-interface-lab/screens-v1":
        raise ValueError("invalid Interface Lab screens catalog")
    matches = [s for s in config.get("screens", []) if s.get("id") == screen]
    if len(matches) != 1:
        raise ValueError(f"unknown or ambiguous screen {screen!r}")
    shot = matches[0]
    link = shot.get("deepLink", "")
    args = shot.get("launchArgs")
    has_args = isinstance(args, list) and bool(args) and all(isinstance(x, str) and x.startswith("--") for x in args)
    has_link = bool(link) and urlsplit(link).scheme == config.get("urlScheme")
    if not (has_args or has_link):
        raise ValueError("screen requires launchArgs or an app-owned deepLink")
    return config, shot


def checked_screen(config: dict, shot: dict, device: str, locale: str) -> None:
    plan = {"version": 1, "app": {"bundle_id": config["bundleId"]},
            "matrix": {"locales": [locale], "devices": [device]},
            "shots": [{"name": "01-" + shot["id"], "reach": {"deep_link": shot["deepLink"]},
                       "wait_for": shot.get("anchor", "screen.root"), "timeout_s": 12}],
            "seed": {}, "modes": {"dry_run": False}}
    problems = capture_plan.validate(plan) if shot.get("deepLink") else []
    if not capture_plan.BUNDLE_RE.fullmatch(config["bundleId"]):
        problems.append("Invalid application bundle identifier")
    if not capture_plan.SHOT_NAME_RE.fullmatch("01-" + shot["id"]):
        problems.append("Invalid screen id")
    if problems:
        raise ValueError("; ".join(problems))


def capture(args: argparse.Namespace) -> dict:
    config, shot = screen_config(args.screens_file, args.screen)
    target = selected_device(args.device)
    locale_tuple = next((t for t in locales.LOCALES if args.locale in (t[0], t[3])), None)
    if locale_tuple is None:
        raise ValueError(f"unsupported locale {args.locale}; select a catalogued locale")
    checked_screen(config, shot, target["name"], args.locale)
    if target.get("state") != "Booted":
        if args.dry_run:
            raise ValueError("simulator is shut down; start it before preflight or run capture")
        cmd("boot", target["udid"])
        cmd("bootstatus", target["udid"], "-b", timeout=110)
    app_path = Path(cmd("get_app_container", target["udid"], config["bundleId"], "app"))
    sim_target_proof.check_bundle_platform(app_path, "ipados" if
        "iPad" in target.get("deviceTypeIdentifier", "") else "ios")
    info = plistlib.loads((app_path / "Info.plist").read_bytes())
    if info.get("CFBundleIdentifier") != config["bundleId"]:
        raise ValueError("installed app identity differs from requested bundle")
    ports = active_ports(target["udid"])
    if len(ports) != 1 and not args.display:
        raise ValueError(f"multi-display simulator: select one of {ports}; no display guessed")
    if args.display and args.display not in ports:
        raise ValueError(f"selected display is not powered-on in {ports}")
    if args.dry_run:
        return {"status": "READY_TO_CAPTURE", "app": config["bundleId"],
                "screen": shot["id"], "locale": args.locale,
                "device": target["name"], "displays": ports}
    _, language, apple_locale, _, _, _ = locale_tuple
    launch_args = shot.get("launchArgs", [])
    cmd("launch", "--terminate-running-process", target["udid"], config["bundleId"],
        "-AppleLanguages", f"({language})", "-AppleLocale", apple_locale,
        *launch_args, timeout=45)
    if not launch_args:
        cmd("openurl", target["udid"], shot["deepLink"].replace("{locale}", args.locale))
    settled, wait_ms = wait_for_settle(target["udid"], 12)
    out = Path(args.output).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    io = ["io", target["udid"], "screenshot"]
    if args.display:
        io += ["--display=" + args.display]
    cmd(*io, str(out), timeout=35)
    width, height = quality.get_dimensions(out)
    raw = None
    if quality.has_alpha(out):
        raw = out.with_name(out.stem + ".raw.png")
        shutil.copyfile(out, raw)
        quality.strip_alpha(out)
    qa = quality.check(out, width, height)
    return {"status": "CAPTURED_SCREEN_IDENTITY_UNVERIFIED" if qa.ok else "FAIL_CAPTURE_QA",
            "app": config["bundleId"], "appVersion": info.get("CFBundleShortVersionString"),
            "build": info.get("CFBundleVersion"), "requestedScreen": shot["id"],
            "requestedAnchor": shot.get("anchor"), "screenIdentityVerified": False,
            "navigationMethod": "launch_arguments" if launch_args else "deep_link",
            "dataMode": "review_demo" if "--review-demo" in launch_args else "unverified",
            "locale": args.locale, "localeScope": "app_launch_arguments_only",
            "device": target["name"], "udid": target["udid"], "display": args.display or ports[0],
            "settled": settled, "settleMs": wait_ms, "png": str(out),
            "sha256": quality.sha256_of(out), "size": [width, height],
            "originalAlphaPng": str(raw) if raw else None,
            "originalSha256": quality.sha256_of(raw) if raw else None,
            "qa": {"ok": qa.ok, "reason": qa.reason},
            "note": "A route and PNG do not prove that the requested view is visible; confirm with accessibility/XCUITest."}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("action", choices=["list", "screens", "displays", "capture"])
    p.add_argument("--screens-file")
    p.add_argument("--screen")
    p.add_argument("--locale", default="en-US")
    p.add_argument("--device")
    p.add_argument("--display")
    p.add_argument("--output")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()
    try:
        if a.action == "list":
            result = {"status": "OK", "devices": inventory()}
        elif a.action == "displays":
            if not a.device:
                raise ValueError("specify --device to discover live display ports")
            dev = selected_device(a.device)
            if dev.get("state") != "Booted":
                raise ValueError("simulator must be booted for display enumeration")
            result = {"status": "OK", "simulator": dev["name"],
                      "displays": display_ports(dev["udid"])}
        elif a.action == "screens":
            cat = json.loads(Path(a.screens_file).read_text())
            result = {"status": "OK", "bundleId": cat["bundleId"], "screens": cat["screens"]}
        else:
            if not all([a.screens_file, a.screen, a.device, a.output]):
                raise ValueError("capture requires screens-file, screen, device, output")
            result = capture(a)
        print(json.dumps(result, ensure_ascii=False))
        return 1 if result["status"].startswith("FAIL") else 0
    except Exception as exc:
        print(json.dumps({"status": "HOLD", "error": str(exc)[:750]}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
