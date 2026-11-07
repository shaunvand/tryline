// TryLine win-probability + projection model. Pure functions, no I/O. (Fable 5.1)
// Approach: final margin ~ Normal(mu, sigma). Pre-match mu0 = rating diff + home advantage.
// Live: mu = current margin + mu0 * f + card adjustment, sigma = sdMargin * sqrt(f) (+ floor),
// where f = fraction of regulation time remaining. Ratings come from ratings.json (points scale).

export const FULL_TIME_SEC = 80 * 60;
export const HALF_SEC = 40 * 60;

export function phi(z) { // standard normal CDF (Abramowitz-Stegun 7.1.26, |err| < 1.5e-7)
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

export function teamRating(ratings, teamId, fallback = 0) {
  const t = ratings && ratings.teams && ratings.teams[String(teamId)];
  return t ? t.rating : fallback;
}

/** Look up a rating by team name when the source's ids are not ESPN ids (e.g. World Rugby). */
export function teamRatingByName(ratings, name, fallback = 0) {
  if (!ratings || !ratings.teams || !name) return fallback;
  const norm = s => String(s).toLowerCase().replace(/[^a-z]/g, "");
  const n = norm(name);
  for (const t of Object.values(ratings.teams)) {
    const tn = norm(t.name);
    if (tn === n || tn.includes(n) || n.includes(tn)) return t.rating;
  }
  return fallback;
}

export function leagueParams(ratings, leagueId) {
  const g = (ratings && ratings.global) || { meanTotal: 46, hfa: 4, sdMargin: 16 };
  const l = (ratings && ratings.leagues && ratings.leagues[String(leagueId)]) || {};
  return {
    meanTotal: l.meanTotal || g.meanTotal,
    hfa: typeof l.hfa === "number" ? l.hfa : g.hfa,
    sdMargin: l.sdMargin && l.n > 30 ? l.sdMargin : g.sdMargin,
  };
}

function ratingFor(ratings, team) {
  if (!team) return 0;
  const byId = ratings && ratings.teams && ratings.teams[String(team.id)];
  if (byId) return byId.rating;
  return teamRatingByName(ratings, team.name, 0);
}

/** Pre-match expectation: { mu0, sigma, pHome, pAway, pDraw, homeRating, awayRating, meanTotal } */
export function preMatch({ ratings, leagueId, homeId, awayId, home, away, neutral = false }) {
  const lp = leagueParams(ratings, leagueId);
  const hr = home ? ratingFor(ratings, home) : teamRating(ratings, homeId);
  const ar = away ? ratingFor(ratings, away) : teamRating(ratings, awayId);
  const mu0 = hr - ar + (neutral ? 0 : lp.hfa);
  return { mu0, sigma: lp.sdMargin, ...outcome(mu0, lp.sdMargin), homeRating: hr, awayRating: ar, meanTotal: lp.meanTotal };
}

function outcome(mu, sigma) {
  const s = Math.max(sigma, 0.75);
  const pHome = 1 - phi((0.5 - mu) / s);
  const pAway = phi((-0.5 - mu) / s);
  const pDraw = Math.max(0, 1 - pHome - pAway);
  return { pHome, pAway, pDraw };
}

/** Regulation seconds remaining given status. Extra time treated as 0 remaining regulation. */
export function secondsRemaining(status) {
  if (!status || status.state === "pre") return FULL_TIME_SEC;
  if (status.state === "post") return 0;
  const clock = Math.max(0, Math.min(status.clockSec || 0, FULL_TIME_SEC));
  if (status.period === 1) return FULL_TIME_SEC - Math.min(clock, HALF_SEC);
  if (status.period === 2) return Math.max(0, FULL_TIME_SEC - Math.max(clock, HALF_SEC));
  if (status.period >= 3) return 0;
  return FULL_TIME_SEC - clock;
}

/** Expected points the *opponent* gains from cards over the remaining time. */
export function cardAdjustment(events, status, homeId) {
  // yellow: 10 min at ~0.9 pts/10min to opponent; red: rest of match at ~1.2 pts/10min
  const rem = secondsRemaining(status);
  const now = FULL_TIME_SEC - rem;
  let homeGain = 0, awayGain = 0;
  for (const e of events || []) {
    if (e.type !== "yellow_card" && e.type !== "red_card") continue;
    if (e.teamId === undefined || e.teamId === null) continue;
    const start = e.period === 2 ? Math.max(e.clockSec || HALF_SEC, HALF_SEC) : Math.min(e.clockSec || 0, HALF_SEC);
    const dur = e.type === "yellow_card" ? Math.max(0, Math.min(600, start + 600 - now)) : Math.max(0, rem);
    const rate = e.type === "yellow_card" ? 0.9 : 1.2;
    const gain = rate * dur / 600;
    if (String(e.teamId) === String(homeId)) awayGain += gain; else homeGain += gain;
  }
  return { homeGain, awayGain };
}

/**
 * Live estimate. Input: { ratings, match } where match follows the Match contract.
 * Returns { pHome, pAway, pDraw, mu, sigma, remainingSec, projected: {home, away}, mu0, basis }
 */
export function live({ ratings, match }) {
  const { league, home, away, status, events = [], neutral } = match;
  const pre = preMatch({ ratings, leagueId: league && league.id, home, away, neutral });
  const rem = secondsRemaining(status);
  const f = rem / FULL_TIME_SEC;
  const hs = Number(home.score) || 0, as = Number(away.score) || 0;
  const margin = hs - as;
  if (status && status.state === "post") {
    return { pHome: margin > 0 ? 1 : 0, pAway: margin < 0 ? 1 : 0, pDraw: margin === 0 ? 1 : 0, mu: margin, sigma: 0,
      remainingSec: 0, projected: { home: hs, away: as }, mu0: pre.mu0, basis: "final" };
  }
  const { homeGain, awayGain } = cardAdjustment(events, status, home.id);
  const cardShift = homeGain - awayGain;
  const mu = margin + pre.mu0 * f + cardShift;
  const sigma = Math.max(pre.sigma * Math.sqrt(f), f > 0 ? 1.5 : 0);
  // expected total: blend league mean with current pace once 20+ minutes played
  const played = FULL_TIME_SEC - rem;
  const pace = played > 0 ? (hs + as) * (FULL_TIME_SEC / played) : pre.meanTotal;
  const w = Math.min(0.6, played / FULL_TIME_SEC); // pace weight grows with time
  const expTotal = played >= 20 * 60 ? (1 - w) * pre.meanTotal + w * pace : pre.meanTotal;
  const remTotal = Math.max(0, expTotal * f);
  const shift = pre.mu0 * f + cardShift;
  const projHome = hs + Math.max(0, remTotal / 2 + shift / 2);
  const projAway = as + Math.max(0, remTotal / 2 - shift / 2);
  return { ...outcome(mu, sigma), mu, sigma, remainingSec: rem, mu0: pre.mu0,
    projected: { home: Math.round(projHome), away: Math.round(projAway) },
    basis: status && status.state === "pre" ? "pre-match ratings" : "ratings + live score" };
}

/** Rough kick success odds by zone (no real coordinates in the free feed). */
export function kickOdds({ kind = "conversion", zone = "unknown", kickerPct = null }) {
  const base = kind === "penalty_goal"
    ? { central: 0.86, wide: 0.7, long: 0.55, unknown: 0.76 }
    : { central: 0.93, wide: 0.66, long: 0.6, unknown: 0.76 };
  let p = base[zone] ?? base.unknown;
  if (typeof kickerPct === "number") p = 0.5 * p + 0.5 * kickerPct;
  return Math.max(0.05, Math.min(0.98, p));
}
