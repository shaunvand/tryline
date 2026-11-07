"""Record ESPN rugby feeds for live events into JSONL snapshots (for replay mode + tests).
Usage: python record_live.py <league_id> [<league_id>...]  (polls every 20 s until Ctrl-C)
"""
import json, sys, time, urllib.request, datetime, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "recordings" / "raw"
OUT.mkdir(parents=True, exist_ok=True)
SB = "https://site.api.espn.com/apis/site/v2/sports/rugby/{L}/scoreboard?dates={D}"
PL = "https://sports.core.api.espn.com/v2/sports/rugby/leagues/{L}/events/{E}/competitions/{E}/plays?limit=500"
SM = "https://site.web.api.espn.com/apis/site/v2/sports/rugby/{L}/summary?event={E}"
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 rugby-companion-recorder"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))
leagues = sys.argv[1:] or ["17567", "270559"]
seen_summary = {}
while True:
    now = datetime.datetime.utcnow()
    day = now.strftime("%Y%m%d")
    for L in leagues:
        try:
            sb = get(SB.format(L=L, D=day))
        except Exception as ex:
            print(now.isoformat(), L, "scoreboard err", ex); continue
        for ev in sb.get("events", []):
            st = ev["status"]["type"]["state"]
            eid = ev["id"]
            if st == "pre":
                continue
            f = OUT / f"{L}_{eid}.jsonl"
            rec = {"t": now.isoformat() + "Z", "kind": "scoreboard", "event": ev}
            try:
                rec_pl = {"t": now.isoformat() + "Z", "kind": "plays", "data": get(PL.format(L=L, E=eid))}
            except Exception as ex:
                rec_pl = {"t": now.isoformat() + "Z", "kind": "plays_err", "err": str(ex)}
            with f.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(rec) + "\n"); fh.write(json.dumps(rec_pl) + "\n")
                # summary (rosters etc.) every 5 min
                last = seen_summary.get(eid, 0)
                if time.time() - last > 300:
                    try:
                        fh.write(json.dumps({"t": now.isoformat() + "Z", "kind": "summary", "data": get(SM.format(L=L, E=eid))}) + "\n")
                        seen_summary[eid] = time.time()
                    except Exception as ex:
                        print("summary err", ex)
            c = ev["competitions"][0]["competitors"]
            print(now.strftime("%H:%M:%S"), L, eid, ev["shortName"], st, ev["status"]["displayClock"], [(x["team"]["abbreviation"], x.get("score")) for x in c], flush=True)
    time.sleep(20)
