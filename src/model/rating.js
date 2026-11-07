// TryLine rating and fantasy-style points. Own formulas, NOT official World Rugby fantasy points. Pure.
const n = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

/** TryLine rating 0-10 (1 dp). Start 5.0 plus/minus weighted actions. Null stats count as 0. */
export function playerRating(l = {}) {
  const r = 5 + n(l.metres) / 20 + n(l.carries) / 8 + n(l.defendersBeaten) * 0.4 + n(l.cleanBreaks) * 0.6
    + n(l.offloads) * 0.3 + n(l.tackles) / 6 - n(l.missedTackles) * 0.3 + n(l.turnoversWon) * 0.7
    - n(l.penaltiesConceded) * 0.4 + n(l.tries) * 1.5 + n(l.lineoutsWon) * 0.2;
  // soft cap: a hard clamp tied most busy players at 10.0 by the 50th minute (seen live 2026-11-07)
  const d = r - 5, soft = 5 + Math.sign(d) * 5 * (1 - Math.exp(-Math.abs(d) / 4));
  return Math.round(Math.min(10, Math.max(0, soft)) * 10) / 10;
}

/** TryLine formula (not official): try 10, 1 per 10 m run, 1 per 2 tackles, 2 per defender beaten, 3 per clean break,
 *  2 per turnover won, 1 per offload, 1 per lineout won, -1 per missed tackle, -2 per penalty conceded. Integer. */
export function fantasyPoints(l = {}) {
  return Math.round(n(l.tries) * 10 + Math.floor(n(l.metres) / 10) + Math.floor(n(l.tackles) / 2) + n(l.defendersBeaten) * 2
    + n(l.cleanBreaks) * 3 + n(l.turnoversWon) * 2 + n(l.offloads) + n(l.lineoutsWon) - n(l.missedTackles) - n(l.penaltiesConceded) * 2);
}

/** Top n across both teams, desc by rating. Input {home:[],away:[]}; returns [{...line, side, rating, fantasy}]. */
export function topPerformers(players, nTop = 5) {
  const all = [];
  for (const side of ["home", "away"]) for (const p of players?.[side] || []) all.push({ ...p, side, rating: playerRating(p), fantasy: fantasyPoints(p) });
  return all.sort((a, b) => b.rating - a.rating || b.fantasy - a.fantasy).slice(0, nTop);
}
