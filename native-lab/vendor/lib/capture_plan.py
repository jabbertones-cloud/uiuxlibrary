"""Capture-plan model for AiSCent (LocalizeShots).

Declarative shot lists ("capture plans"): the user names the screens to
capture and how to reach each; the engine cycles through them like a
slideshow across the locale x device matrix.

Pure logic — no simctl, no Xcode — so it is fully unit-testable on any
machine. See capture-plan.example.yaml at the repo root.

v1 format sketch (from the donor benchmark):
  version: 1
  app: {bundle_id}
  matrix: {locales: [BCP47...] | auto, devices: [sim names...]}
  seed: {launch_args: [...], reset_between: screens|locales|none,
         content: {<locale>: {seed_arg: ...}}}
  shots: [{name: NN-kebab-case,
           reach: {deep_link} | {steps: [{tap: {id}}]},
           wait_for: <accessibility-id anchor>, timeout_s: N}]
  output: {path_template, status_bar, completeness_gate}
  modes: {dry_run}
"""
from __future__ import annotations
import json
import re
from pathlib import Path

from . import plan_yaml

PLAN_VERSION = 1

SHOT_NAME_RE = re.compile(r"^[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$")
BCP47_RE = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$")
BUNDLE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_.-]*\.[A-Za-z0-9_.-]+$")
RESET_MODES = ("none", "screens", "locales")

# VERIFY (donor benchmark #12): the exact `fastlane deliver` filename contract
# is unverified — do not claim drop-in deliver compatibility.
VERIFY_NOTES = (
    "fastlane-deliver filename contract",
    "xcparse vs current attachment extraction",
    "iOS 26.5 'Open in App?' dialog on cold deep links",
)


def load_text(text: str) -> dict:
    data = plan_yaml.loads(text)
    if not isinstance(data, dict):
        raise plan_yaml.PlanYAMLError("plan document must be a mapping at the top level")
    return data


def load_file(path: str | Path) -> dict:
    return plan_yaml.load(str(path))


def _err(prefix: str, msg: str) -> str:
    return f"{prefix}: {msg}"


def discover_app_locales(app_path: str | Path) -> list[str]:
    """Discover locales shipped directly by an app bundle.

    Only top-level app resources are considered. Nested frameworks/package
    bundles are intentionally excluded because their locale coverage does not
    imply the host app supports the same storefront language.
    """
    app=Path(app_path)
    roots=[app]
    mac_resources=app/"Contents"/"Resources"
    if mac_resources.is_dir():
        roots.append(mac_resources)
    locales=set()
    for root in roots:
        if not root.is_dir():
            continue
        for child in root.iterdir():
            if not child.is_dir() or not child.name.endswith(".lproj"):
                continue
            locale=child.name[:-6].replace("_","-")
            if locale=="Base":
                continue
            if BCP47_RE.match(locale):
                locales.add(locale)
    return sorted(locales)


def expand_auto_locales(plan: dict, app_path: str | Path) -> dict:
    """Return a copy of *plan* with matrix.locales=auto expanded."""
    matrix=plan.get("matrix") if isinstance(plan,dict) else None
    if not isinstance(matrix,dict):
        return plan
    locales=matrix.get("locales")
    auto = locales == "auto" or locales == ["auto"]
    if not auto:
        return plan
    found=discover_app_locales(app_path)
    if not found:
        raise ValueError("matrix.locales=auto found no top-level .lproj locales in app bundle")
    clone=json.loads(json.dumps(plan))
    clone["matrix"]["locales"]=found
    clone.setdefault("resolved",{})["locales_source"]="app_bundle"
    return clone


def validate(plan: object) -> list[str]:
    """Return a list of human-readable errors; [] means the plan is valid."""
    errs: list[str] = []
    if not isinstance(plan, dict):
        return ["plan: top level must be a mapping"]
    if plan.get("version") != PLAN_VERSION:
        errs.append(_err("version", f"must be {PLAN_VERSION}"))
    app = plan.get("app")
    if not isinstance(app, dict) or not app.get("bundle_id"):
        errs.append(_err("app.bundle_id", "is required"))
    elif not BUNDLE_RE.match(str(app["bundle_id"])):
        errs.append(_err("app.bundle_id", f"not a bundle id: {app['bundle_id']!r}"))

    matrix = plan.get("matrix")
    if not isinstance(matrix, dict):
        errs.append(_err("matrix", "is required"))
    else:
        locales = matrix.get("locales")
        if locales == "auto" or locales == ["auto"]:
            pass
        elif not isinstance(locales, list) or not locales:
            errs.append(_err("matrix.locales", "must be 'auto' or a non-empty list of BCP47 tags"))
        else:
            for loc in locales:
                if not isinstance(loc, str) or not BCP47_RE.match(loc):
                    errs.append(_err("matrix.locales", f"not BCP47: {loc!r}"))
        devices = matrix.get("devices")
        if not isinstance(devices, list) or not devices or not all(
            isinstance(d, str) and d.strip() for d in devices
        ):
            errs.append(_err("matrix.devices", "must be a non-empty list of device names"))

    seed = plan.get("seed") or {}
    if not isinstance(seed, dict):
        errs.append(_err("seed", "must be a mapping"))
    else:
        la = seed.get("launch_args", [])
        if not isinstance(la, list) or not all(isinstance(a, str) for a in la):
            errs.append(_err("seed.launch_args", "must be a list of strings"))
        rb = seed.get("reset_between", "screens")
        if rb not in RESET_MODES:
            errs.append(_err("seed.reset_between", f"must be one of {RESET_MODES}"))
        content = seed.get("content", {})
        if not isinstance(content, dict):
            errs.append(_err("seed.content", "must be a mapping of locale -> seams"))

    shots = plan.get("shots")
    if not isinstance(shots, list) or not shots:
        errs.append(_err("shots", "must be a non-empty list"))
    else:
        seen: set[str] = set()
        for idx, shot in enumerate(shots):
            p = f"shots[{idx}]"
            if not isinstance(shot, dict):
                errs.append(_err(p, "must be a mapping"))
                continue
            name = shot.get("name")
            if not isinstance(name, str) or not SHOT_NAME_RE.match(name):
                errs.append(_err(f"{p}.name", f"must be NN-kebab-case, got {name!r}"))
            elif name in seen:
                errs.append(_err(f"{p}.name", f"duplicate shot name {name!r}"))
            else:
                seen.add(name)
            reach = shot.get("reach")
            if not isinstance(reach, dict):
                errs.append(_err(f"{p}.reach", "must be a mapping with deep_link or steps"))
            else:
                dl = reach.get("deep_link")
                steps = reach.get("steps")
                if dl is not None and not isinstance(dl, str):
                    errs.append(_err(f"{p}.reach.deep_link", "must be a string"))
                if steps is not None:
                    if not isinstance(steps, list) or not steps:
                        errs.append(_err(f"{p}.reach.steps", "must be a non-empty list"))
                    else:
                        for sidx, step in enumerate(steps):
                            tap = step.get("tap") if isinstance(step, dict) else None
                            if not isinstance(tap, dict) or not tap.get("id"):
                                errs.append(
                                    _err(f"{p}.reach.steps[{sidx}]", "only tap-by-id steps in v1")
                                )
                if dl is None and steps is None:
                    errs.append(_err(f"{p}.reach", "needs deep_link or steps"))
            wf = shot.get("wait_for")
            if not isinstance(wf, str) or not wf.strip():
                errs.append(_err(f"{p}.wait_for", "accessibility-id anchor is required"))
            to = shot.get("timeout_s", 10)
            if not isinstance(to, (int, float)) or isinstance(to, bool) or to <= 0:
                errs.append(_err(f"{p}.timeout_s", f"must be a positive number, got {to!r}"))

    output = plan.get("output") or {}
    if not isinstance(output, dict):
        errs.append(_err("output", "must be a mapping"))
    else:
        pt = output.get("path_template", "{locale}/{device}")
        if not isinstance(pt, str) or not pt.strip():
            errs.append(_err("output.path_template", "must be a non-empty string"))

    modes = plan.get("modes") or {}
    if not isinstance(modes, dict):
        errs.append(_err("modes", "must be a mapping"))
    elif not isinstance(modes.get("dry_run", False), bool):
        errs.append(_err("modes.dry_run", "must be a boolean"))

    return errs


def warnings(plan: object) -> list[str]:
    """Return non-fatal advisories; the plan is still usable.

    Dogfood 2026-10-07: seed.content is silently ignored unless the app
    implements the fixture seam (see capture-plan.example.yaml). Users
    discovered this only after shipping byte-identical screenshots. Surfacing
    it here turns a silent no-op into an explicit checklist item.
    """
    adv: list[str] = []
    if not isinstance(plan, dict):
        return adv
    seed = plan.get("seed") or {}
    content = seed.get("content") if isinstance(seed, dict) else None
    if isinstance(content, dict) and content:
        adv.append(
            "seed.content is set for locales "
            f"{sorted(content)} but requires an app-side fixture seam "
            "(read the seed launch argument and inject localized fixture data "
            "before the first view appears). Without the seam it is silently "
            "ignored and captures go byte-identical across locales — flag, don't ship."
        )
    shots = plan.get("shots")
    if isinstance(shots, list):
        for idx, shot in enumerate(shots):
            if not isinstance(shot, dict):
                continue
            reach = shot.get("reach") or {}
            if isinstance(reach, dict) and reach.get("steps") and not reach.get("deep_link"):
                adv.append(
                    f"shots[{idx}] ({shot.get('name')}): steps-only reach is a "
                    "validated fallback; prefer a cold deep_link where possible."
                )
    return adv


def matrix_cells(plan: dict) -> list[tuple[str, str]]:
    """Expand the matrix into (locale, device) cells, locales outermost."""
    locales = plan["matrix"]["locales"]
    if locales == "auto" or locales == ["auto"]:
        raise ValueError("matrix.locales=auto must be expanded against an app bundle first")
    devices = plan["matrix"]["devices"]
    return [(loc, dev) for dev in devices for loc in locales]


def render_path_template(template: str, *, locale: str, device: str,
                          shot: str, out_dir: str | Path) -> Path:
    """Render {locale}/{device}/{shot}/{bcp47} placeholders into an output path."""
    rendered = (
        template.replace("{locale}", locale)
        .replace("{bcp47}", locale)
        .replace("{device}", device)
        .replace("{shot}", shot)
    )
    return Path(out_dir) / rendered / f"{shot}.png"


def shot_out_path(plan: dict, shot: dict, locale: str, device: str,
                  out_dir: str | Path) -> Path:
    template = (plan.get("output") or {}).get("path_template", "{locale}/{device}")
    return render_path_template(template, locale=locale, device=device,
                                shot=shot["name"], out_dir=out_dir)


def verify_matrix(plan: dict, results: list[dict], *, dry_run: bool = False) -> dict:
    """Require each planned locale/device/shot cell to be verified, not merely attempted."""
    expected = {(loc, dev, shot["name"]) for loc in plan["matrix"]["locales"]
                for dev in plan["matrix"]["devices"] for shot in plan["shots"]}
    passed = {(r["locale"], r["device"], r["name"]) for r in results
              if (r.get("qa_ok") is True and r.get("destination_verified") is True
                  and r.get("page_identity_verified") is True)
              or (r.get("skipped") and str(r.get("reason", "")).startswith("resume:")
                  and r.get("resume_verified") is True and r.get("destination_verified") is True
                  and r.get("page_identity_verified") is True)}
    missing = sorted(expected - passed)
    failures = [r for r in results if r.get("qa_ok") is False]
    return {"pass": bool(expected) and not missing and not failures and not dry_run, "missing_cells": [list(c) for c in missing],
            "reason": (f"{len(missing)} missing/unverified cells; {len(failures)} QA failures"
                       if missing else (f"{len(failures)} QA failures" if failures else ("empty matrix" if not expected else "")))}


def completeness_gate(results: list[dict]) -> dict:
    """reproit verifySignature: every locale must yield the same shot set.

    results: per-shot dicts with at least {name, locale, device, skipped}.
    Skipped stops still count as *attempted* — the gate compares the set of
    shots the run produced per locale (captured, not skipped).
    """
    per_locale: dict[str, set[str]] = {}
    for r in results:
        if r.get("skipped"):
            continue
        per_locale.setdefault(r["locale"], set()).add(r["name"])
    locales = sorted(per_locale)
    if not locales:
        return {"pass": False, "reason": "no shots captured in any locale",
                "per_locale": {}, "expected": []}
    expected = sorted(per_locale[locales[0]])
    mismatched = {loc: sorted(s) for loc, s in per_locale.items() if sorted(s) != expected}
    return {
        "pass": not mismatched,
        "reason": "" if not mismatched else f"shot-set mismatch in locales: {sorted(mismatched)}",
        "per_locale": {loc: sorted(s) for loc, s in per_locale.items()},
        "expected": expected,
    }


# -- Sidecar resume state -------------------------------------------------
# Plan cells are finer-grained than the shared state-DB cells
# (locale x device x shot), so plan mode keeps its own sidecar JSON next to
# the output dir instead of migrating the shared schema (additive only).

STATE_FILENAME = ".capture-plan-state.json"


def state_path(out_dir: str | Path) -> Path:
    return Path(out_dir) / STATE_FILENAME


def cell_key(locale: str, device: str, shot: str) -> str:
    return f"{locale} :: {device} :: {shot}"


def load_state(out_dir: str | Path) -> dict:
    p = state_path(out_dir)
    if not p.exists():
        return {"cells": {}}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"cells": {}}


def save_state(out_dir: str | Path, state: dict) -> None:
    p = state_path(out_dir)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def mark_cell(out_dir: str | Path, locale: str, device: str, shot: str,
              status: str, **extra) -> None:
    st = load_state(out_dir)
    st["cells"][cell_key(locale, device, shot)] = {"status": status, **extra}
    save_state(out_dir, st)


def cell_done(out_dir: str | Path, locale: str, device: str, shot: str) -> bool:
    st = load_state(out_dir)
    return st["cells"].get(cell_key(locale, device, shot), {}).get("status") == "captured"
