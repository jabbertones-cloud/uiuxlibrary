#!/usr/bin/env python3
"""Standalone String Catalog status, review worklist, local translation preview.
LocalizeShots xcstrings/placeholder/Apple Translation donors, with no AiSCent calls.
"""
from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "vendor"))
from lib import xcstrings, pseudolocalization  # noqa: E402


def translation(input_path: str) -> dict:
    payload = json.loads(Path(input_path).read_text())
    source = ROOT / "vendor" / "apple-translate-json.swift"
    binary = ROOT / ".bin" / "apple-translate-json"
    binary.parent.mkdir(exist_ok=True)
    if not binary.exists() or source.stat().st_mtime > binary.stat().st_mtime:
        p = subprocess.run(["/usr/bin/swiftc", "-parse-as-library", str(source),
                            "-o", str(binary)], capture_output=True, text=True, timeout=120)
        if p.returncode:
            raise RuntimeError("Apple Translation compiler unavailable: " + p.stderr[:600])
    p = subprocess.run([str(binary)], input=json.dumps(payload), text=True,
                       capture_output=True, timeout=90)
    if p.returncode:
        raise RuntimeError("Apple Translation failed: " + p.stderr[:600])
    result = json.loads(p.stdout)
    result["engine"] = "apple_translation_local"
    result["approved"] = False
    return result


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("action", choices=["status", "manifest", "gate", "pseudo", "translate", "apply"])
    p.add_argument("--catalog")
    p.add_argument("--config", default=str(ROOT / "localization.json"))
    p.add_argument("--locale")
    p.add_argument("--input")
    p.add_argument("--confirm", action="store_true")
    args = p.parse_args()
    try:
        xcstrings._CONFIG_PATH = Path(args.config).resolve()
        if args.action == "pseudo":
            result = pseudolocalization.plan()
        elif args.action == "translate":
            if not args.input:
                raise ValueError("translation requires --input JSON (no remote LLM used)")
            result = translation(args.input)
        else:
            if not args.catalog or not Path(args.catalog).is_file():
                raise ValueError("provide a real .xcstrings catalog file")
            if Path(args.catalog).suffix != ".xcstrings":
                raise ValueError("only .xcstrings catalogs are permitted")
            if args.action == "status":
                result = xcstrings.localize_status(args.catalog)
            elif args.action == "manifest":
                result = xcstrings.localize_manifest(args.catalog,
                           locales=[args.locale] if args.locale else None)
            elif args.action == "gate":
                result = xcstrings.localize_release_gate(args.catalog,
                           locales=[args.locale] if args.locale else None)
            else:
                if not args.confirm or not args.input:
                    raise ValueError("apply requires --confirm and a keyed JSON input")
                changes = json.loads(Path(args.input).read_text())
                result = xcstrings.localize_apply(args.catalog, changes, review_required=True)
                result["status"] = "NEEDS_NATIVE_REVIEW"
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "HOLD", "error": str(exc)[:700]}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
