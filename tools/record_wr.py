"""Record World Rugby (Pulselive) feeds for live matches -> recordings/raw/wr_<matchId>.jsonl"""
import json, time, urllib.request, datetime, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "recordings" / "raw"; OUT.mkdir(parents=True, exist_ok=True)
B = "https://api.wr-rims-prod.pulselive.com/rugby/v3"
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 rugby-companion-recorder"})
    with urllib.request.urlopen(req, timeout=20) as r: return json.loads(r.read().decode("utf-8"))
last_summary = {}
while True:
    now = datetime.datetime.utcnow(); d = now.strftime("%Y-%m-%d"); d2 = (now + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    try:
        lst = get(f"{B}/match?startDate={d}&endDate={d2}&pageSize=50")
    except Exception as ex:
        print("list err", ex, flush=True); time.sleep(20); continue
    for m in lst.get("content", []):
        st = m.get("status")
        if st not in ("L1", "L2", "LHT", "LET") and not (st == "C" and m["matchId"] in last_summary):
            continue
        mid = m["matchId"]; f = OUT / f"wr_{mid}.jsonl"
        recs = [{"t": now.isoformat() + "Z", "kind": "list", "data": m}]
        for k in ("stats", "timeline"):
            try: recs.append({"t": now.isoformat() + "Z", "kind": k, "data": get(f"{B}/match/{mid}/{k}")})
            except Exception as ex: recs.append({"t": now.isoformat() + "Z", "kind": k + "_err", "err": str(ex)})
        if time.time() - last_summary.get(mid, 0) > 300:
            try: recs.append({"t": now.isoformat() + "Z", "kind": "summary", "data": get(f"{B}/match/{mid}/summary")}); last_summary[mid] = time.time()
            except Exception as ex: print("summary err", ex)
        with f.open("a", encoding="utf-8") as fh:
            for r in recs: fh.write(json.dumps(r) + "\n")
        print(now.strftime("%H:%M:%S"), mid[:8], st, m.get("clock", {}).get("label"), [t["name"] for t in m["teams"]], m.get("scores"), flush=True)
        if st == "C": last_summary.pop(mid, None)
    time.sleep(20)
