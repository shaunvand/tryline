import sys, json, time
from playwright.sync_api import sync_playwright
B = "http://127.0.0.1:8787/"
SH = "C:/Users/shaun/rugby_companion/shots/"
out = {}
with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, service_workers="allow")
    pg = ctx.new_page()
    errs = []
    pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.on("response", lambda r: errs.append(f"HTTP {r.status} {r.url}") if r.status >= 400 else None)
    pg.on("requestfailed", lambda r: errs.append(f"failed {r.url} {r.failure}"))
    def mark(name):
        out[name + "_errors"] = list(errs); errs.clear()
    pg.goto(B + "#/"); pg.wait_for_selector("#view-fixtures a, #view-fixtures .tl-banner", timeout=30000); time.sleep(4)
    out["fixtures_text"] = pg.inner_text("#view-fixtures")[:900]
    pg.screenshot(path=SH + "final-fixtures.png"); mark("fixtures")
    key = sys.argv[1]
    pg.goto(B + "#/match/" + key); pg.wait_for_selector(".tl-header", timeout=40000); time.sleep(5)
    out["header"] = pg.inner_text("#match-header")
    out["timeline_rows"] = pg.locator("#tab-timeline li, #tab-timeline .tl-ev").count()
    pg.screenshot(path=SH + "final-match.png")
    pg.click("#match-tabs button[data-tab=pitch]"); time.sleep(1)
    out["pitch"] = pg.inner_text("#tab-pitch"); pg.screenshot(path=SH + "final-pitch.png", full_page=False)
    pg.click("#match-tabs button[data-tab=stats]"); time.sleep(1)
    out["stats"] = pg.inner_text("#tab-stats")[:500]; pg.screenshot(path=SH + "final-stats.png")
    pg.click("#match-tabs button[data-tab=timeline]"); mark("match")
    pg.goto(B + "#/replay/ita-v-rsa-2026-11-07"); pg.wait_for_selector(".tl-header", timeout=20000); time.sleep(2)
    pg.click("#tl-replaybar [data-speed='20']"); time.sleep(6)
    out["replay_header"] = pg.inner_text("#match-header"); out["replay_bar"] = pg.inner_text("#tl-replaybar")
    sizes = pg.evaluate("""() => [...document.querySelectorAll('#tl-replaybar button, #tl-replaybar .tl-rp-track')].map(e => { const r = e.getBoundingClientRect(); return e.textContent.trim() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); })""")
    out["replay_targets"] = sizes
    tr = pg.locator("#tl-replaybar .tl-rp-track").bounding_box()
    pg.mouse.click(tr["x"] + tr["width"] * 0.97, tr["y"] + tr["height"] / 2); time.sleep(1)
    out["replay_seek97"] = pg.inner_text("#match-header").split("\n")[:8]
    pg.screenshot(path=SH + "final-replay.png"); mark("replay")
    pg.goto(B + "#/match"); time.sleep(1)
    out["match_nav"] = pg.inner_text("#match-header")
    out["sw"] = pg.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.scope + ' ' + (x.active && x.active.state)))")
    out["conn"] = pg.inner_text("#tl-conn-txt"); mark("nav")
    br.close()
print(json.dumps(out, indent=1, ensure_ascii=True))
