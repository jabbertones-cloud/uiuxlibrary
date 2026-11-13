"""LocalizeShots — sim catalogs for every Apple platform.

ASC family band → ordered fallback list of sim names. Largest/newest first;
the script picks the first one that's actually installed via `simctl list`.

Discovered 2026-05-02 during fleet test: a single hardcoded sim per family
silently dropped 6.5"/5.5" iPhone screenshots when those sims weren't
installed. Fallbacks fix this; if none are installed, the script logs the
exact `xcodebuild -downloadPlatform iOS` command to install one.
"""

from __future__ import annotations
import json
import re
import subprocess
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SimSpec:
    label: str        # ASC family band, e.g. "6.9"
    fallbacks: list[str]
    width: int        # ASC required pixel width
    height: int       # ASC required pixel height
    platform: str     # "ios" | "ipados" | "tvos" | "watchos" | "catalyst"


# ---------------------------------------------------------------------
# iPhone — App Store Connect APP_IPHONE_67 / APP_IPHONE_65 / APP_IPHONE_55
# ---------------------------------------------------------------------
IPHONE_SIZES: list[SimSpec] = [
    # Apple requires large-display screenshots (Dynamic Island or Face ID fallback).
    # all_sizes_for(["ios"]) selects this first family; medium-display shots alone
    # cannot satisfy that requirement. Keep medium capture available in the catalog.
    # https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
    SimSpec("6.9", ["iPhone 18 Pro Max", "iPhone 17 Pro Max", "iPhone 16 Pro Max", "iPhone 15 Pro Max"], 1320, 2868, "ios"),
    SimSpec("6.7", ["iPhone 16 Pro Max", "iPhone 16 Plus", "iPhone 15 Plus", "iPhone 14 Plus"], 1290, 2796, "ios"),
    SimSpec("6.5", ["iPhone 11 Pro Max", "iPhone 11", "iPhone XS Max"], 1242, 2688, "ios"),
    SimSpec("6.3", ["iPhone 18 Pro", "iPhone 17 Pro", "iPhone 17", "iPhone 16 Pro", "iPhone 16", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro"], 1206, 2622, "ios"),
    SimSpec("5.5", ["iPhone 8 Plus", "iPhone 7 Plus", "iPhone 6s Plus"], 1242, 2208, "ios"),
]

# ---------------------------------------------------------------------
# iPad — APP_IPAD_PRO_3GEN_129 (13") + APP_IPAD_PRO_129 (12.9 legacy)
# ---------------------------------------------------------------------
IPAD_SIZES: list[SimSpec] = [
    SimSpec("13",   ["iPad Pro 13-inch (M4)", "iPad Pro 13-inch (M2)", "iPad Pro (12.9-inch) (6th generation)"], 2064, 2752, "ipados"),
    SimSpec("12.9", ["iPad Pro (12.9-inch) (6th generation)", "iPad Pro (12.9-inch) (5th generation)"], 2048, 2732, "ipados"),
    SimSpec("11",   ["iPad Pro 11-inch (M4)", "iPad Pro 11-inch (M2)", "iPad Pro (11-inch) (4th generation)"], 1668, 2388, "ipados"),
]

# ---------------------------------------------------------------------
# Apple TV — APP_APPLE_TV (1920×1080)
# ---------------------------------------------------------------------
TVOS_SIZES: list[SimSpec] = [
    SimSpec("appletv", ["Apple TV 4K (3rd generation)", "Apple TV 4K (3rd generation) (at 1080p)",
                           "Apple TV 4K (2nd generation)", "Apple TV 4K (2nd generation) (at 1080p)", "Apple TV"], 3840, 2160, "tvos"),
]

# ---------------------------------------------------------------------
# Apple Watch — APP_WATCH_ULTRA / APP_WATCH_SERIES_7
# ---------------------------------------------------------------------
WATCHOS_SIZES: list[SimSpec] = [
    SimSpec("ultra2", ["Apple Watch Ultra 4 (49mm)", "Apple Watch Ultra 3 (49mm)",
                              "Apple Watch Ultra 2 (49mm)", "Apple Watch Ultra (49mm)"], 410, 502, "watchos"),
    SimSpec("series10", ["Apple Watch Series 12 (46mm)", "Apple Watch Series 11 (46mm)",
                                "Apple Watch Series 10 (46mm)", "Apple Watch Series 9 (45mm)",
                                "Apple Watch Series 7 (45mm)"], 396, 484, "watchos"),
]

# ---------------------------------------------------------------------
# Mac (native + Catalyst) — APP_DESKTOP (16:10, varies)
# ---------------------------------------------------------------------
MAC_SIZES: list[SimSpec] = [
    SimSpec("mac-2880", ["Mac"], 2880, 1800, "catalyst"),
    SimSpec("mac-2560", ["Mac"], 2560, 1600, "catalyst"),
    SimSpec("mac-1440", ["Mac"], 1440, 900, "catalyst"),
    SimSpec("mac-1280", ["Mac"], 1280, 800, "catalyst"),
]


_DIAG_PATTERNS: list[tuple[re.Pattern, float]] = [
    (re.compile(r"iPhone.18.Pro.Max|iPhone.17.Pro.Max|iPhone.16.Pro.Max|iPhone.15.Pro.Max"),  6.9),
    (re.compile(r"iPhone.16.Plus|iPhone.15.Plus|iPhone.14.Plus"),           6.7),
    # App Store Connect's current Dynamic Island medium display family.
    (re.compile(r"iPhone.18.Pro$|iPhone.17.Pro$|iPhone.17$|iPhone.16.Pro$|iPhone.16$|iPhone.15.Pro$|iPhone.15$|iPhone.14.Pro$"), 6.3),
    # Face ID medium display family retained for optional/scaled capture support.
    (re.compile(r"iPhone.17e$|iPhone.16e$|iPhone.14$|iPhone.13.Pro$|iPhone.13$|iPhone.13.mini$|iPhone.12.Pro$|iPhone.12$|iPhone.12.mini$|iPhone.11.Pro$|iPhone.XS$|iPhone.X$"), 6.1),
    (re.compile(r"iPhone.11.Pro.Max|iPhone.XS.Max"),                        6.5),
    (re.compile(r"iPhone.11$|iPhone.XR"),                                   6.5),
    (re.compile(r"iPhone.8.Plus|iPhone.7.Plus|iPhone.6s.Plus"),             5.5),
    (re.compile(r"iPhone.SE"),                                               4.7),
    (re.compile(r"iPad.Pro.13|iPad.Pro.12.9"),                              12.9),
    (re.compile(r"iPad.Pro.11"),                                            11.0),
]

def _diagonal_for(name: str) -> Optional[float]:
    slug = name.replace(" ", ".").replace("-", ".")
    for pat, diag in _DIAG_PATTERNS:
        if pat.search(slug):
            return diag
    return None


def query_installed_sims() -> dict[float, list[tuple[str, str]]]:
    """
    Query xcrun simctl at runtime. Returns {diagonal: [(name, udid), ...]}
    for all available installed iPhone/iPad simulators, newest runtime first.
    Falls back to empty dict on error (xcrun not found, Xcode not installed).
    """
    try:
        raw = subprocess.run(
            ["/usr/bin/xcrun", "simctl", "list", "devices", "--json"],
            capture_output=True, text=True, timeout=15, check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return {}

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    result: dict[float, list[tuple[str, str]]] = {}
    # Sort runtimes descending so newest runtime is processed first
    for runtime in sorted(data.get("devices", {}).keys(), reverse=True):
        if "iOS" not in runtime and "iPadOS" not in runtime:
            continue
        for d in data["devices"][runtime]:
            if not d.get("isAvailable", False):
                continue
            diag = _diagonal_for(d.get("name", ""))
            if diag is None:
                continue
            entry = (d["name"], d["udid"])
            if entry not in result.get(diag, []):
                result.setdefault(diag, []).append(entry)

    return result


def dynamic_iphone_sizes() -> list[SimSpec]:
    """
    Build IPHONE_SIZES dynamically from installed simulators.
    Falls back to the static IPHONE_SIZES if xcrun fails or returns nothing.
    Each SimSpec.fallbacks is populated from installed sim names (newest first),
    with the original static fallbacks appended so names not yet catalogued still work.
    """
    installed = query_installed_sims()
    if not installed:
        return IPHONE_SIZES  # static fallback

    result: list[SimSpec] = []
    for spec in IPHONE_SIZES:
        band = float(spec.label)
        dynamic_names = [name for name, _ in installed.get(band, [])]
        # Merge: dynamic first (runtime-fresh), then static (catches names we missed)
        merged = dynamic_names + [n for n in spec.fallbacks if n not in dynamic_names]
        result.append(SimSpec(
            label=spec.label,
            fallbacks=merged,
            width=spec.width,
            height=spec.height,
            platform=spec.platform,
        ))
    return result


def all_sizes_for(platforms: list[str]) -> list[SimSpec]:
    """Resolve a list of platform tags to the sim catalog."""
    out: list[SimSpec] = []
    for p in platforms:
        p = p.lower().strip()
        if p in ("ios", "iphone"):
            out.extend(dynamic_iphone_sizes()[:1])
        elif p in ("ipad", "ipados"):
            out.extend(IPAD_SIZES)
        elif p in ("tvos", "appletv", "tv", "appletvos"):
            out.extend(TVOS_SIZES)
        elif p in ("watchos", "watch"):
            out.extend(WATCHOS_SIZES)
        elif p in ("mac", "macos", "catalyst", "osx"):
            out.extend(MAC_SIZES)
    return out
