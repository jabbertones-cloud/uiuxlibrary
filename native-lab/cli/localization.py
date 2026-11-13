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
from babelfish_translate_catalog import ask as ollama_ask  # noqa: E402
from urllib.error import HTTPError, URLError


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


def ollama_translation(input_path: str, model: str, timeout: int) -> dict:
    payload = json.loads(Path(input_path).read_text())
    if payload.get("source_locale", "en").split("-")[0] != "en":
        raise ValueError("BabelFish donor only supports English source strings")
    locale = payload["target_locale"]
    texts = payload["texts"]
    if not isinstance(texts, dict) or not texts or len(texts) > 5:
        raise ValueError("Local translation requires 1 to 5 source strings per request")
    items = [(key, locale, source) for key, source in texts.items()]
    try:
        results = ollama_ask("http://127.0.0.1:11434", model, locale, items, timeout)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        return {"status": "unavailable", "engine": "ollama_local",
                "model": model, "target_locale": locale, "approved": False,
                "translations": {}, "error": str(exc)[:300]}
    terms = payload.get("protected_terms") or []
    accepted, rejected = {}, {}
    for key, source in texts.items():
        candidate = results.get(source) or results.get(key)
        if not isinstance(candidate, str) or not candidate.strip():
            rejected[key] = "no_candidate"
        elif xcstrings.check_placeholder_parity(source, candidate):
            rejected[key] = "placeholder_mismatch"
        elif any(t in source and t not in candidate for t in terms):
            rejected[key] = "protected_term_mismatch"
        else:
            accepted[key] = candidate.strip()
    return {"status": "candidate" if len(accepted) == len(texts) else "partial",
            "engine": "ollama_local", "model": model, "target_locale": locale,
            "approved": False, "translations": accepted, "rejected": rejected}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("action", choices=["status", "manifest", "gate", "pseudo", "translate", "ollama", "apply"])
    p.add_argument("--catalog")
    p.add_argument("--config", default=str(ROOT / "localization.json"))
    p.add_argument("--locale")
    p.add_argument("--input")
    p.add_argument("--confirm", action="store_true")
    p.add_argument("--model", default="qwen3.5:4b")
    p.add_argument("--timeout", type=int, default=60)
    args = p.parse_args()
    try:
        xcstrings._CONFIG_PATH = Path(args.config).resolve()
        if args.action == "pseudo":
            result = pseudolocalization.plan()
        elif args.action in ("translate", "ollama"):
            if not args.input:
                raise ValueError("translation requires --input JSON")
            result = translation(args.input) if args.action == "translate" else ollama_translation(args.input, args.model, args.timeout)
        else:
            if not args.catalog or not Path(args.catalog).is_file():
                raise ValueError("provide a real .xcstrings catalog file")
            if Path(args.catalog).suffix != ".xcstrings":
                raise ValueError("only .xcstrings catalogs are permitted")
            if args.action == "status":
                result = xcstrings.localize_status(args.catalog)
            elif args.action == "manifest":
                cfg = json.loads(Path(args.config).read_text())
                canonical = cfg.get("asc_to_xcode", {}).get(args.locale, args.locale)
                result = xcstrings.localize_manifest(args.catalog,
                           locales=[canonical] if args.locale else None)
                result["requested_locale"] = args.locale
            elif args.action == "gate":
                result = xcstrings.localize_release_gate(args.catalog,
                           locales=[args.locale] if args.locale else None)
            else:
                if not args.confirm or not args.input:
                    raise ValueError("apply requires --confirm and a keyed JSON input")
                changes = json.loads(Path(args.input).read_text())
                cfg = json.loads(Path(args.config).read_text())
                aliases = cfg.get("asc_to_xcode", {})
                allowed = set(xcstrings._xcode_locales(cfg))
                mapped = {}
                for requested, values in changes.items():
                    locale = aliases.get(requested, requested)
                    if locale not in allowed or locale == cfg["source_language"]:
                        raise ValueError("Unsupported translation target locale: " + requested)
                    mapped.setdefault(locale, {}).update(values)
                result = xcstrings.localize_apply(args.catalog, mapped, review_required=True)
                result["status"] = ("HOLD_REJECTED" if result.get("rejected_placeholder_mismatch")
                                    else "NEEDS_NATIVE_REVIEW" if result.get("written")
                                    else "HOLD_NO_CHANGES")
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "HOLD", "error": str(exc)[:700]}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
