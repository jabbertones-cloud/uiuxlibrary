#!/usr/bin/env python3
"""BabelFish catalog runner.

Resumable catalog translation using local Ollama. Writes only validated JSON
responses; app and MCP consume same Localizable.xcstrings file.
"""
import argparse, json, re, sys, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

LIMITS = {"name": 30, "subtitle": 30, "keywords": 100, "promotional_text": 170,
          "description": 4000, "release_notes": 4000}
FIELDS = ("name", "subtitle", "description", "keywords", "release_notes", "promotional_text")
PH = re.compile(r"%(?:\d+\$)?[-.0-9]*(?:h{1,2}|l{1,2})?[dDiuUxXoOfFeEgGcCsSaApn@]")

def specs(s): return sorted(PH.findall(s or ""))
def text(v): return v if isinstance(v, str) else None
def source(entry): return text(entry.get("localizations", {}).get("en", {}).get("stringUnit", {}).get("value"))
def pending(cat, locales):
    out=[]
    for key, entry in cat.get("strings", {}).items():
        en=source(entry) or key
        if not en.strip(): continue
        for loc in locales:
            cell=entry.get("localizations", {}).get(loc, {}).get("stringUnit", {})
            if cell.get("state") in ("translated",) and text(cell.get("value")): continue
            if cell.get("value") == en and len(en) < 5: continue
            out.append((key, loc, en))
    return out
def json_from(s):
    s=(s or "").strip().replace("```json", "").replace("```", "")
    a,b=s.find("{"),s.rfind("}")
    if a<0 or b<a: return None
    try: return json.loads(s[a:b+1])
    except Exception: return None
def ask(base, model, locale, items, timeout):
    prompt="Translate English UI strings to %s. Return JSON object keyed by exact source strings. Preserve %% placeholders, newlines, URLs, brand names. JSON only.\n" % locale
    prompt += "\n".join(json.dumps({"source": s, "text": s}, ensure_ascii=False) for _,_,s in items)
    body=json.dumps({"model":model,"prompt":prompt,"stream":False,"format":"json","think":False,"options":{"temperature":0.1,"num_predict":256}}).encode()
    req=Request(base.rstrip("/")+"/api/generate", data=body, headers={"Content-Type":"application/json"})
    with urlopen(req, timeout=timeout) as r: env=json.loads(r.read())
    raw=env.get("response") or env.get("thinking")
    return json_from(raw) or {}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("catalog", nargs="?", default="Sources/LocalizeShotsApp/Localizable.xcstrings"); ap.add_argument("--locales"); ap.add_argument("--model", default="qwen3:4b-64k"); ap.add_argument("--base", default="http://127.0.0.1:11434"); ap.add_argument("--batch", type=int, default=5); ap.add_argument("--timeout", type=int, default=45); args=ap.parse_args()
    path=Path(args.catalog); cat=json.loads(path.read_text()); locales=args.locales.split(",") if args.locales else sorted({l for e in cat["strings"].values() for l in e.get("localizations",{}) if not l.startswith("en")})
    work=pending(cat, locales); print(f"BabelFish pending cells: {len(work)}")
    for i in range(0,len(work),args.batch):
        batch=work[i:i+args.batch]; loc=batch[0][1]
        try: result=ask(args.base,args.model,loc,batch,args.timeout)
        except (TimeoutError, URLError, HTTPError, OSError) as e: print(f"{loc}: provider failed: {e}",file=sys.stderr); continue
        changed=0
        for key, target, en in batch:
            value=text(result.get(en)) or text(result.get(key))
            if not value or specs(value)!=specs(en) or len(value)>4000: continue
            cell=cat["strings"][key].setdefault("localizations",{}).setdefault(target,{"stringUnit":{}})["stringUnit"]
            cell.update(value=value,state="translated"); changed+=1
        if changed: path.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+"\n")
        print(f"{i+len(batch)}/{len(work)} {loc}: accepted {changed}/{len(batch)}")
        time.sleep(.1)
if __name__=="__main__": main()
