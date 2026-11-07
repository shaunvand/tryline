"""Pull historical rugby results from ESPN's public scoreboard (year query) into data/history.json.
Usage: python tools/fetch_history.py  (safe to re-run; ~1 request per league-year)
"""
import json, urllib.request, pathlib, time, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAGUES = {"270557": "URC", "267979": "Premiership", "270559": "Top 14", "242041": "Super Rugby Pacific",
           "180659": "Six Nations", "244293": "Rugby Championship", "164205": "Rugby World Cup",
           "289234": "International Test", "17567": "Nations Championship", "268565": "Lions Tour",
           "271937": "Champions Cup", "272073": "Challenge Cup", "270555": "Currie Cup", "270563": "NPC"}
YEARS = [2022, 2023, 2024, 2025, 2026]
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 rugby-companion"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))
out = []
for L, name in LEAGUES.items():
    for y in YEARS:
        try:
            d = get(f"https://site.api.espn.com/apis/site/v2/sports/rugby/{L}/scoreboard?dates={y}&limit=1000")
        except Exception as ex:
            print(L, y, "err", ex); time.sleep(1); continue
        n = 0
        for e in d.get("events", []):
            if e["status"]["type"]["state"] != "post":
                continue
            c = e["competitions"][0]
            comps = c["competitors"]
            home = next((x for x in comps if x.get("homeAway") == "home"), comps[0])
            away = next((x for x in comps if x.get("homeAway") == "away"), comps[-1])
            try:
                hs, as_ = int(home.get("score")), int(away.get("score"))
            except (TypeError, ValueError):
                continue
            out.append({"league": L, "leagueName": name, "date": e["date"], "id": e["id"], "neutral": bool(c.get("neutralSite")),
                        "home": home["team"]["id"], "homeName": home["team"]["displayName"], "away": away["team"]["id"],
                        "awayName": away["team"]["displayName"], "hs": hs, "as": as_})
            n += 1
        print(L, name, y, "results", n, flush=True)
        time.sleep(0.5)
out.sort(key=lambda r: r["date"])
(ROOT / "data" / "history.json").write_text(json.dumps(out), encoding="utf-8")
print("total", len(out))
