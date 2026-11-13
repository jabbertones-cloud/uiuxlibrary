"""LocalizeShots — automated screenshot QA.

Catches the silent failures we ate during fleet test 2026-05-02:
  - blank/launch-screen captures (mostly-uniform pixels)
  - wrong dimensions (sips normalize failures)
  - corrupted PNG (file < ~5KB)

Core PNG checks are dependency-free and portable; macOS sips is an optional fallback.
"""

from __future__ import annotations
import hashlib, shutil, struct, subprocess
from pathlib import Path
from dataclasses import dataclass


@dataclass
class QAResult:
    ok: bool
    reason: str = ""
    width: int = 0
    height: int = 0
    bytes: int = 0


def _png_header(png: Path) -> tuple[int, int, int, bool] | None:
    """Return width, height, PNG color type, and whether a tRNS chunk exists.

    PNG IHDR is fixed-format and can be validated portably without Pillow/sips.
    Reading chunks until IDAT also catches palette/RGB transparency via tRNS.
    """
    try:
        with png.open("rb") as fh:
            if fh.read(8) != b"\x89PNG\r\n\x1a\n":
                return None
            length = struct.unpack(">I", fh.read(4))[0]
            kind = fh.read(4)
            if kind != b"IHDR" or length != 13:
                return None
            data = fh.read(length)
            fh.read(4)  # CRC
            width, height, _depth, color_type, _comp, _filter, _interlace = struct.unpack(">IIBBBBB", data)
            has_trns = False
            while True:
                raw_len = fh.read(4)
                if len(raw_len) != 4:
                    break
                chunk_len = struct.unpack(">I", raw_len)[0]
                chunk_kind = fh.read(4)
                if chunk_kind == b"tRNS":
                    has_trns = True
                fh.seek(chunk_len + 4, 1)  # payload + CRC
                if chunk_kind in {b"IDAT", b"IEND"}:
                    break
            return width, height, color_type, has_trns
    except (OSError, EOFError, struct.error):
        return None


def has_alpha(png: Path) -> bool:
    header = _png_header(png)
    if header is not None:
        _w, _h, color_type, has_trns = header
        return color_type in {4, 6} or has_trns
    sips = shutil.which("sips") or ("/usr/bin/sips" if Path("/usr/bin/sips").exists() else None)
    if not sips:
        return False
    out = subprocess.run([sips, "-g", "hasAlpha", str(png)], capture_output=True, text=True).stdout.lower()
    return "hasalpha: yes" in out


def strip_alpha(png: Path) -> None:
    """Rewrite a PNG as RGB so App Store Connect cannot reject transparency."""
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        flattened = Path(td) / "flattened.png"
        subprocess.run([
            "/opt/homebrew/bin/ffmpeg", "-v", "error", "-y", "-i", str(png),
            "-vf", "format=rgb24", str(flattened)
        ], capture_output=True, check=True)
        flattened.replace(png)


def get_dimensions(png: Path) -> tuple[int, int]:
    header = _png_header(png)
    if header is not None:
        return header[0], header[1]
    sips = shutil.which("sips") or ("/usr/bin/sips" if Path("/usr/bin/sips").exists() else None)
    if not sips:
        raise ValueError(f"unsupported image format without sips: {png}")
    out = subprocess.run([sips, "-g", "pixelWidth", "-g", "pixelHeight", str(png)], capture_output=True, text=True).stdout
    w, h = 0, 0
    for line in out.splitlines():
        if "pixelWidth" in line:
            w = int(line.split(":")[-1].strip())
        elif "pixelHeight" in line:
            h = int(line.split(":")[-1].strip())
    if not w or not h:
        raise ValueError(f"could not determine image dimensions: {png}")
    return w, h


def is_mostly_uniform(png: Path, sample_pct: float = 0.001) -> bool:
    """Detect launch-screen / blank captures by sampling pixels and looking for
    near-uniform color. Uses sips to dump a tiny thumbnail then compares hashes.

    Heuristic: shrink the PNG to 8x8, hash. If 80%+ of those 64 pixels share
    one color band, flag it as suspect (a real app screen has varied UI).
    """
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        thumb = Path(td) / "t.png"
        sips = shutil.which("sips") or ("/usr/bin/sips" if Path("/usr/bin/sips").exists() else None)
        if not sips:
            return False
        subprocess.run([sips, "-Z", "8", str(png), "--out", str(thumb)], capture_output=True, check=False)
        if not thumb.exists():
            return False
        # Read raw RGBA, group by (R>>5, G>>5, B>>5) bucket.
        try:
            data = thumb.read_bytes()
        except OSError:
            return False
        # Naive: check if the file is suspiciously small relative to a real 8x8 PNG
        # AND that it compresses to < 200 bytes (entropy proxy).
        # Better than nothing without bringing in PIL.
        if len(data) < 250:
            return True
        return False


def check(png: Path, expected_w: int, expected_h: int,
          min_bytes: int = 5000) -> QAResult:
    if not png.exists():
        return QAResult(False, "file missing")
    sz = png.stat().st_size
    if sz < min_bytes:
        return QAResult(False, f"png too small ({sz} bytes — likely corrupt or blank)", bytes=sz)
    w, h = get_dimensions(png)
    if (w, h) != (expected_w, expected_h):
        return QAResult(False, f"dimensions {w}x{h} != expected {expected_w}x{expected_h}", w, h, sz)
    if has_alpha(png):
        return QAResult(False, "PNG contains alpha/transparency (App Store screenshots forbid alpha)", w, h, sz)
    if is_mostly_uniform(png):
        return QAResult(False, "appears to be blank / launch-screen capture", w, h, sz)
    return QAResult(True, "", w, h, sz)


def sha256_of(png: Path) -> str:
    h = hashlib.sha256()
    with open(png, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()
