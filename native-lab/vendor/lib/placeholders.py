"""Shared printf/Swift placeholder contract for localization safety."""
from __future__ import annotations
import re

# Conservative superset of Apple/Foundation printf tokens used by the project.
# Deliberately exclude printf's space flag. In localized prose, constructs like
# "100% guaranteed" or "% numérique" are far more common than intentional "% d",
# and treating the following word initial as a conversion specifier creates false
# ABI failures. Sign/zero/alternate flags remain supported.
_PRINTF = re.compile(r"%(?:(\d+)\$)?(?:\(([^)]+)\))?[-+#0']*\d*(?:\.\d+)?(?:hh|h|ll|l|L|z|t|j)?([a-zA-Z@])")
_SUBSTITUTION = re.compile(r"%(?:(\d+)\$)?#@([^@]+)@")
_SWIFT = re.compile(r"\\\([^)]*\)")


def _type(conv: str) -> str:
    if conv in "diuoxX": return "int"
    if conv in "fFeEgGaA": return "float"
    if conv in "s@": return "object"
    if conv in "cC": return "char"
    return conv


def parse(value: str) -> list[dict]:
    hits=[]
    raw=value or ""
    # Foundation printf uses %% for a literal percent. Mask escaped pairs while
    # preserving offsets so %%u/%%@ are never misread as runtime arguments, and
    # sequences like %%%d still expose the final %d placeholder correctly.
    scan=re.sub(r"%%","  ",raw)
    substitution_spans=[]
    for m in _SUBSTITUTION.finditer(scan):
        substitution_spans.append((m.start(),m.end()))
        hits.append((m.start(),{
            "raw":m.group(0),
            "explicit":m.group(1) is not None,
            "index":int(m.group(1)) if m.group(1) else None,
            "name":m.group(2),
            "type":"substitution",
        }))
    for m in _PRINTF.finditer(scan):
        if any(start <= m.start() < end for start,end in substitution_spans):
            continue
        # Reject the donor-proven prose shape "100%-osan" / "%-tal" without
        # breaking legitimate adjacent placeholders such as "%@に" or "%2$@krát".
        token=m.group(0)
        if (
            m.group(1) is None
            and token.startswith("%-")
            and not re.search(r"\d", token)
            and m.end() < len(scan)
            and scan[m.end()].isalpha()
        ):
            continue
        hits.append((m.start(),{"raw":token,"explicit":m.group(1) is not None,"index":int(m.group(1)) if m.group(1) else None,"name":m.group(2),"type":_type(m.group(3))}))
    for m in _SWIFT.finditer(raw):
        hits.append((m.start(),{"raw":m.group(0),"explicit":False,"index":None,"name":None,"type":"swift_interp"}))
    hits.sort(key=lambda x:x[0]); out=[]; implicit=0
    for _,item in hits:
        if item["index"] is None:
            implicit += 1; item["index"]=implicit
        out.append(item)
    return out


def _mixed(items: list[dict]) -> bool:
    if not items: return False
    # Named plural substitutions are keyed contracts, not printf positions.
    # They can safely coexist with positional printf arguments.
    printf_items=[x for x in items if x.get("type") not in {"substitution","swift_interp"}]
    flags={x["explicit"] for x in printf_items}
    return len(flags)>1


def signature(value: str) -> list[tuple[int,str|None,str]]:
    return sorted(
        ((x["index"],x.get("name"),x["type"]) for x in parse(value)),
        key=lambda x:(x[0],x[1] or "",x[2]),
    )


def compatible(source: str, target: str) -> bool:
    src=parse(source); dst=parse(target)
    if len(src)!=len(dst): return False
    # Mixing numbered and unnumbered printf arguments is ambiguous and unsafe.
    if _mixed(dst): return False
    # Sequential source arguments may become fully positional in translation;
    # this is the safe way to reorder for another language.
    return signature(source)==signature(target)


def reason(source: str, target: str) -> str | None:
    src=parse(source); dst=parse(target)
    if len(dst)<len(src): return f"dropped placeholder(s): source={signature(source)} target={signature(target)}"
    if len(dst)>len(src): return f"added placeholder(s): source={signature(source)} target={signature(target)}"
    if _mixed(dst): return "mixed positional and non-positional placeholders in translation"
    if compatible(source,target): return None
    return f"placeholder argument/type mismatch: source={signature(source)} target={signature(target)}"


def raw_tokens(value: str) -> list[str]:
    return [x["raw"] for x in parse(value)]
