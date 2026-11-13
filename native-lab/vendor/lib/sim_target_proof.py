"""Cross-platform CoreSimulator capture contracts for Apple TV and Apple Watch.

No simulator is considered eligible merely because its *name* matches: the
runtime family must match the target app binary. Screenshots retain native
pixels and carry provenance, never get resized into a fake ASC device size.
"""
from __future__ import annotations

import hashlib
import json
import plistlib
from pathlib import Path

FAMILIES = {
    "ios": ("iOS", "iPhoneSimulator"),
    "ipados": ("iOS", "iPhoneSimulator"),
    "tvos": ("tvOS", "AppleTVSimulator"),
    "watchos": ("watchOS", "WatchSimulator"),
}
ALIASES = {
    "ios": "ios", "iphone": "ios",
    "ipad": "ipados", "ipados": "ipados",
    "tvos": "tvos", "tv": "tvos", "appletv": "tvos", "appletvos": "tvos",
    "watchos": "watchos", "watch": "watchos",
    "mac": "catalyst", "macos": "catalyst", "catalyst": "catalyst", "osx": "catalyst",
}


def canonical_platforms(raw: str) -> list[str]:
    parts = [p.strip().lower() for p in raw.split(",")]
    if not parts or any(p not in ALIASES for p in parts):
        raise ValueError("unknown/empty platform selection: " + repr(raw))
    found = []
    for p in parts:
        target = ALIASES[p]
        if target not in found:
            found.append(target)
    return found


def app_supported_platforms(app_path: str | Path) -> list[str]:
    path = Path(app_path)
    info = path / "Info.plist"
    if not info.is_file():
        info = path / "Contents" / "Info.plist"
    if not info.is_file():
        raise ValueError("app has no readable Info.plist")
    with info.open("rb") as fp:
        data = plistlib.load(fp)
    supported = data.get("CFBundleSupportedPlatforms")
    if not isinstance(supported, list) or not all(isinstance(v, str) for v in supported):
        raise ValueError("app does not declare CFBundleSupportedPlatforms")
    return supported


def check_bundle_platform(app_path: str | Path, platform: str) -> list[str]:
    supported = app_supported_platforms(app_path)
    if platform == "catalyst":
        # Different native Mac path; this simctl capture CLI does not take
        # responsibility for capturing macOS windows.
        raise ValueError("macOS/Catalyst requires the native Mac capture runner, not simctl")
    if platform not in FAMILIES:
        raise ValueError("unsupported simulator family " + platform)
    expected = FAMILIES[platform][1]
    if expected not in supported:
        raise ValueError(
            f"wrong application platform for {platform}: requires {expected}, "
            f"bundle declares {supported}. Build the actual platform target first."
        )
    return supported


def simulator_candidates(inventory: dict, platform: str,
                         preferred_names: list[str] | None = None) -> list[tuple[str, str]]:
    if platform not in FAMILIES:
        raise ValueError("invalid simulator platform")
    runtime_key = FAMILIES[platform][0]
    options = []
    for runtime, devices in inventory.get("devices", {}).items():
        if f"SimRuntime.{runtime_key}-" not in runtime:
            continue
        for d in devices:
            if d.get("isAvailable", True) and d.get("udid") and d.get("name"):
                options.append((runtime, d["name"], d["udid"]))
    # Prefer exact requested names if available, else a new-model device
    # from the right runtime family. Name-only probing can accidentally
    # resolve a different device family on developer machines.
    if preferred_names:
        found = [(runtime, name, udid) for runtime, name, udid in options if name in preferred_names]
        if found:
            options = found
        elif platform in ("ios", "ipados"):
            return []  # do not choose arbitrary iPhone instead of required iPad
    if platform in ("ios", "ipados"):
        wanted = "iPhone" if platform == "ios" else "iPad"
        options = [x for x in options if wanted in x[1]]
    options.sort(reverse=True)
    return [(name, udid) for _, name, udid in options]


def verify_native_frame(path: str | Path, platform: str) -> dict:
    """Validate *native* PNG geometry for Watch/TV, plus readable nonblank bytes."""
    import struct
    p = Path(path)
    if not p.is_file():
        raise ValueError("screenshot file missing")
    data = p.read_bytes()
    if len(data) < 5000 or data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("missing, tiny or invalid PNG screenshot")
    if data[12:16] != b"IHDR":
        raise ValueError("PNG missing IHDR header")
    width, height = struct.unpack(">II", data[16:24])
    if platform == "tvos":
        if width < 1200 or height < 675 or abs(width / height - 16 / 9) > .025:
            raise ValueError(f"tvOS screenshot geometry wrong: {width}x{height}")
    elif platform == "watchos":
        if not (300 <= width <= 600 and 300 <= height <= 650):
            raise ValueError(f"watchOS screenshot geometry wrong: {width}x{height}")
    if width < 1 or height < 1:
        raise ValueError("invalid image dimensions")
    # Image entropy/content QA remains separately mandatory.
    return {
        "width": width, "height": height,
        "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
        "native_pixels_preserved": True,
    }
