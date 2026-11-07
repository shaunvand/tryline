"""history.json -> src/model/ratings.json (points-based Elo-style ratings + league params). Fable 5.1."""
import json, math, pathlib, statistics, collections
ROOT = pathlib.Path(__file__).resolve().parent.parent
hist = json.loads((ROOT / "data" / "history.json").read_text(encoding="utf-8"))
K, CAP = 0.12, 35
R = collections.defaultdict(float)
names = {}
lg_margin, lg_total, resid = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
HFA_PRIOR = 4.0
for m in hist:
    hfa = 0.0 if m["neutral"] else HFA_PRIOR
    exp = R[m["home"]] - R[m["away"]] + hfa
    act = max(-CAP, min(CAP, m["hs"] - m["as"]))
    err = act - exp
    R[m["home"]] += K * err / 2
    R[m["away"]] -= K * err / 2
    names[m["home"]] = m["homeName"]; names[m["away"]] = m["awayName"]
    if not m["neutral"]:
        lg_margin[m["league"]].append(m["hs"] - m["as"])
    lg_total[m["league"]].append(m["hs"] + m["as"])
    resid[m["league"]].append(err)
leagues = {}
for L in set(lg_total):
    tot = lg_total[L]; rs = resid[L][-300:]
    leagues[L] = {"meanTotal": round(statistics.mean(tot), 1), "sdTotal": round(statistics.pstdev(tot), 1) if len(tot) > 1 else 20,
                  "hfa": round(statistics.mean(lg_margin[L]), 1) if lg_margin[L] else HFA_PRIOR,
                  "sdMargin": round(statistics.pstdev(rs), 1) if len(rs) > 10 else 16.0, "n": len(tot)}
all_resid = [e for L in resid for e in resid[L][-300:]]
out = {"builtFrom": len(hist), "asOf": max(m["date"] for m in hist) if hist else None,
       "global": {"meanTotal": round(statistics.mean([t for L in lg_total for t in lg_total[L]]), 1), "hfa": HFA_PRIOR,
                  "sdMargin": round(statistics.pstdev(all_resid), 1), "k": K, "cap": CAP},
       "leagues": leagues,
       "teams": {tid: {"name": names[tid], "rating": round(r, 2)} for tid, r in R.items()}}
(ROOT / "src" / "model").mkdir(parents=True, exist_ok=True)
(ROOT / "src" / "model" / "ratings.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
top = sorted(R.items(), key=lambda kv: -kv[1])[:12]
print("matches", len(hist), "teams", len(R)); print("global", out["global"])
for tid, r in top: print(f"  {names[tid]:<28} {r:6.1f}")
