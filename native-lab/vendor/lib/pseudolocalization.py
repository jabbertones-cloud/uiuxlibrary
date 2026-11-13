"""Deterministic Apple pseudolanguage QA planning for AiSCent/LocalizeShots.

This module intentionally does not invent locale identifiers. Xcode exposes
pseudolanguages by human-readable App Language names in the Run scheme. The
plan tells an agent what to exercise and what evidence to capture before a
localized release is called visually proven.
"""
from __future__ import annotations

SUPPORTED_PLATFORMS = ("ios", "macos", "tvos", "watchos", "visionos")
DEFAULT_PLATFORMS = ("ios", "macos")

MODES = (
    {
        "id": "double_length",
        "apple_name": "Double-Length Pseudolanguage",
        "priority": "core",
        "targets": ["horizontal expansion", "line wrapping", "adaptive layout", "truncation"],
    },
    {
        "id": "bounded_string",
        "apple_name": "Bounded String Pseudolanguage",
        "priority": "core",
        "targets": ["truncated localized strings", "clipping", "fixed-width controls"],
    },
    {
        "id": "tall",
        "apple_name": "Tall Pseudolanguage",
        "priority": "core",
        "targets": ["vertical clipping", "line height", "tall-script spacing"],
    },
    {
        "id": "right_to_left",
        "apple_name": "Right-to-Left Pseudolanguage",
        "priority": "core",
        "targets": ["layout mirroring", "absolute-direction mistakes", "navigation order"],
    },
    {
        "id": "rtl_strings",
        "apple_name": "Right-to-Left Pseudolanguage With Right-to-Left Strings",
        "priority": "core",
        "targets": ["RTL text flow", "mixed-direction technical text", "numerals and punctuation"],
    },
    {
        "id": "accented",
        "apple_name": "Accented Pseudolanguage",
        "priority": "optional",
        "targets": ["high and low ascenders", "font metrics", "diacritic clipping"],
    },
    {
        "id": "emotional",
        "apple_name": "Emotional Pseudolanguage",
        "priority": "optional",
        "targets": ["symbol-heavy strings", "unexpected glyph width", "emoji rendering"],
    },
)


def plan(platforms: list[str] | None = None, include_optional: bool = False) -> dict:
    selected = list(platforms or DEFAULT_PLATFORMS)
    unknown = sorted(set(selected) - set(SUPPORTED_PLATFORMS))
    if unknown:
        raise ValueError("unsupported platform(s): " + ", ".join(unknown))
    modes = [m for m in MODES if include_optional or m["priority"] == "core"]
    matrix = []
    for platform in selected:
        for mode in modes:
            matrix.append({
                "platform": platform,
                "mode": mode["id"],
                "apple_name": mode["apple_name"],
                "targets": list(mode["targets"]),
                "evidence": ["launch succeeds", "representative screen capture", "no clipping/truncation", "navigation remains usable"],
            })
    return {
        "read_only": True,
        "platforms": selected,
        "modes": modes,
        "matrix": matrix,
        "required_core_modes": [m["id"] for m in MODES if m["priority"] == "core"],
        "xcode_path": "Product > Scheme > Edit Scheme > Run > Options > App Language",
        "execution": "Select the named Xcode pseudolanguage; do not substitute a guessed BCP-47 locale identifier.",
        "release_rule": "Pseudolanguage checks are layout stress evidence only; they do not replace real locale review or rendered Arabic/Hebrew validation.",
    }
