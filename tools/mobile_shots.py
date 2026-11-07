"""Phone-size screenshots + overflow/tap-target checks against a URL (default: the deployed site).
Usage: python tools/mobile_shots.py [base_url] [out_dir]
"""
import sys, time, io, json, pathlib
from playwright.sync_api import sync_playwright
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://shaunvand.github.io/tryline/").rstrip("/") + "/"
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "shots/mobile"); OUT.mkdir(parents=True, exist_ok=True)
DEVICES = [("iphone-se", 375, 667, 2), ("iphone-15", 393, 852, 3), ("iphone-15-pro-max", 430, 932, 3),
           ("android-360", 360, 800, 3), ("pixel-8", 412, 915, 2.6), ("iphone-15-landscape", 852, 393, 3)]
ROUTES = [("fixtures", "#/"), ("match", "#/match/17567/603994"), ("glossary", "#/glossary"), ("coverage", "#/coverage"), ("settings", "#/settings")]
CHECK = """() => { const w = innerWidth; const sw = document.scrollingElement.scrollWidth;
 const els=[...document.querySelectorAll('button,a,input,select,[role=button],label.tl-row')].filter(e=>e.offsetParent!==null);
 const small=els.map(e=>{const r=e.getBoundingClientRect();return {t:(e.id||e.className||e.tagName).toString().slice(0,40),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w>0&&x.h>0&&(x.w<44||x.h<44));
 const zoom=[...document.querySelectorAll('input,select,textarea')].filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).length;
 return {innerWidth:w, scrollWidth:sw, overflow: sw>w, small, zoomInputs: zoom}; }"""
summary = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h, dpr in DEVICES:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        for rname, route in ROUTES:
            if name.endswith("landscape") and rname not in ("fixtures", "match"): continue
            pg.goto(BASE + route, wait_until="networkidle"); time.sleep(3 if rname != "match" else 6)
            if rname == "match":
                for tab in ("pitch", "stats"):
                    try: pg.click(f"button[data-tab={tab}]", timeout=2000); time.sleep(1); pg.screenshot(path=str(OUT / f"{name}-match-{tab}.png"))
                    except Exception as ex: print(name, tab, "tab err", ex)
                try: pg.click("button[data-tab=timeline]", timeout=2000); time.sleep(0.5)
                except Exception: pass
            pg.screenshot(path=str(OUT / f"{name}-{rname}.png"))
            r = pg.evaluate(CHECK)
            summary[f"{name}/{rname}"] = {"overflow": r["overflow"], "scrollWidth": r["scrollWidth"], "innerWidth": r["innerWidth"], "small": r["small"][:8], "zoomInputs": r["zoomInputs"]}
        summary[f"{name}/console_errors"] = errs[:5]
        ctx.close()
    b.close()
bad = {k: v for k, v in summary.items() if isinstance(v, dict) and (v["overflow"] or v["small"] or v["zoomInputs"])}
print(json.dumps(bad, indent=1) if bad else "OK: no overflow, no tap targets < 44px, no inputs < 16px")
print("console errors:", {k: v for k, v in summary.items() if k.endswith("console_errors") and v})
(OUT / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
