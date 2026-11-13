"""Minimal YAML-subset parser for capture-plan.yaml v1.

The LocalizeShots MCP runtime ships only the stdlib (no PyYAML on stock
macOS python3), and the feature contract forbids new runtime dependencies —
so plans are parsed with this focused subset reader instead.

Supported constructs (everything capture-plan v1 needs, nothing more):
  * `#` comments (full-line and trailing, outside quotes)
  * nested mappings via space indentation (tabs rejected)
  * sequences via `- ` items (scalars, or `key: value` maps)
  * scalars: null/~, true/false, ints, floats, single/double-quoted strings,
    bare strings, inline lists `[a, b]`, inline maps `{k: v}`
  * JSON documents (JSON is valid YAML): parsed with the stdlib json module

Anything outside the subset raises PlanYAMLError with a line number.
"""
from __future__ import annotations
import json
import re


class PlanYAMLError(ValueError):
    pass


def _strip_comment(line: str) -> str:
    out: list[str] = []
    quote: str | None = None
    for ch in line:
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
        elif ch in "'\"":
            quote = ch
            out.append(ch)
        elif ch == "#":
            break
        else:
            out.append(ch)
    return "".join(out).rstrip()


def _split_top(s: str, sep: str = ",") -> list[str]:
    """Split on sep, ignoring separators inside quotes/brackets."""
    parts: list[str] = []
    cur: list[str] = []
    quote: str | None = None
    depth = 0
    for ch in s:
        if quote:
            cur.append(ch)
            if ch == quote:
                quote = None
        elif ch in "'\"":
            quote = ch
            cur.append(ch)
        elif ch in "[{":
            depth += 1
            cur.append(ch)
        elif ch in "]}":
            depth -= 1
            cur.append(ch)
        elif ch == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return parts


def _parse_scalar(tok: str):
    tok = tok.strip()
    if tok in ("", "~", "null", "Null", "NULL"):
        return None
    if tok in ("true", "True", "TRUE"):
        return True
    if tok in ("false", "False", "FALSE"):
        return False
    if len(tok) >= 2 and tok[0] == tok[-1] and tok[0] in "'\"":
        inner = tok[1:-1]
        if tok[0] == '"':
            inner = (inner.replace("\\\\", "\\").replace('\\"', '"')
                          .replace("\\n", "\n").replace("\\t", "\t"))
        else:
            inner = inner.replace("''", "'")
        return inner
    if tok.startswith("[") and tok.endswith("]"):
        return [_parse_scalar(p) for p in _split_top(tok[1:-1]) if p.strip() != ""]
    if tok.startswith("{") and tok.endswith("}"):
        d: dict = {}
        for part in _split_top(tok[1:-1]):
            if not part.strip():
                continue
            k, sep, v = part.partition(":")
            if not sep:
                raise PlanYAMLError(f"bad inline map entry: {part.strip()!r}")
            d[k.strip().strip("'\"")] = _parse_scalar(v)
        return d
    try:
        return int(tok)
    except ValueError:
        pass
    try:
        return float(tok)
    except ValueError:
        pass
    return tok


def _is_map_item(rest: str) -> bool:
    """True if `- ...` remainder (or any line) is a `key: value` mapping entry.

    A colon only starts a mapping if followed by space/end — so bare URIs
    like `myapp://home` stay scalars.
    """
    ci = rest.find(":")
    return ci != -1 and (ci + 1 == len(rest) or rest[ci + 1] in " \t")


def _parse_map(lines: list[tuple[int, str, int]], i: int, indent: int):
    d: dict = {}
    n = len(lines)
    while i < n:
        ind, content, ln = lines[i]
        if ind < indent:
            break
        if ind > indent:
            raise PlanYAMLError(f"line {ln}: unexpected indent")
        if content == "-" or content.startswith("- "):
            raise PlanYAMLError(f"line {ln}: sequence item inside mapping")
        if not _is_map_item(content):
            raise PlanYAMLError(f"line {ln}: expected 'key: value', got {content!r}")
        key, _, rest = content.partition(":")
        key = key.strip().strip("'\"")
        if not key:
            raise PlanYAMLError(f"line {ln}: empty key")
        if key in d:
            raise PlanYAMLError(f"line {ln}: duplicate key {key!r}")
        rest = rest.strip()
        if rest:
            d[key] = _parse_scalar(rest)
            i += 1
        else:
            if i + 1 < n and lines[i + 1][0] > indent:
                val, i = _parse_block(lines, i + 1, lines[i + 1][0])
                d[key] = val
            else:
                d[key] = None
                i += 1
    return d, i


def _parse_seq(lines: list[tuple[int, str, int]], i: int, indent: int):
    items: list = []
    n = len(lines)
    while i < n:
        ind, content, ln = lines[i]
        if ind < indent:
            break
        if ind > indent:
            raise PlanYAMLError(f"line {ln}: unexpected indent in sequence")
        if not (content == "-" or content.startswith("- ")):
            break  # a following map key at the same level ends the sequence
        rest = content[1:].strip()
        i += 1
        if not rest:
            if i < n and lines[i][0] > indent:
                val, i = _parse_block(lines, i, lines[i][0])
                items.append(val)
            else:
                items.append(None)
        elif rest[0] in "\"'[{" or not _is_map_item(rest):
            items.append(_parse_scalar(rest))
        else:
            # `- key: value` — the dash line opens a map; following deeper
            # lines continue it.
            sub = [(indent + 2, rest, ln)]
            while i < n and lines[i][0] > indent:
                sub.append(lines[i])
                i += 1
            val, nxt = _parse_map(sub, 0, indent + 2)
            assert nxt == len(sub), "map parser must consume its sub-block"
            items.append(val)
    return items, i


def _parse_block(lines: list[tuple[int, str, int]], i: int, indent: int):
    content = lines[i][1]
    if content == "-" or content.startswith("- "):
        return _parse_seq(lines, i, indent)
    return _parse_map(lines, i, indent)


def loads(text: str):
    """Parse a capture-plan document (YAML subset, or JSON)."""
    stripped = text.strip()
    if not stripped:
        raise PlanYAMLError("empty plan document")
    if stripped[0] == "{":
        try:
            return json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise PlanYAMLError(f"invalid JSON plan: {exc}") from exc
    lines: list[tuple[int, str, int]] = []
    for ln, raw in enumerate(text.splitlines(), 1):
        if "\t" in raw:
            raise PlanYAMLError(f"line {ln}: tabs are not allowed (use spaces)")
        code = _strip_comment(raw)
        if not code.strip():
            continue
        indent = len(code) - len(code.lstrip(" "))
        lines.append((indent, code.strip(), ln))
    if not lines:
        raise PlanYAMLError("empty plan document")
    value, nxt = _parse_block(lines, 0, lines[0][0])
    if nxt != len(lines):
        raise PlanYAMLError(f"line {lines[nxt][2]}: unexpected content after document")
    return value


def load(path) -> dict:
    from pathlib import Path as _Path
    data = loads(_Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise PlanYAMLError("plan document must be a mapping at the top level")
    return data
