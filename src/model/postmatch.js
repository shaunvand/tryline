// Post-match (full-time) analysis. Pure functions: no DOM, no I/O, no AI. Every sentence comes from fixed rules.
// Clock: clockSec is cumulative match time (2nd half starts at 2400), as in sinbin.js. Feed clocks can be approximate.
// Win-chance numbers are TryLine model estimates (winprob.js), rebuilt from the score and cards at each moment.
import { live, FULL_TIME_SEC, HALF_SEC } from "./winprob.js";
import { YELLOW_SEC, RED20_SEC } from "./sinbin.js";
import { topPerformers } from "./rating.js";
import { namesMatch } from "../linker.js";

export const APP_URL = "https://shaunvand.github.io/tryline/";
export const LATE_SEC = 70 * 60; // "the last 10 minutes"

const PTS = { try: 5, penalty_try: 7, conversion: 2, penalty_goal: 3, drop_goal: 3 };
const CARD = new Set(["yellow_card", "red_card"]);
const KEY_TYPES = new Set(["try", "penalty_try", "penalty_goal", "drop_goal", "yellow_card", "red_card"]);
const TITLE = { try: "try", penalty_try: "penalty try", conversion: "conversion", penalty_goal: "penalty goal",
  drop_goal: "drop goal", yellow_card: "yellow card", red_card: "red card" };

const fin = v => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const secOf = e => (fin(e?.clockSec) ? Number(e.clockSec) : 0);
const periodOf = e => (fin(e?.period) && Number(e.period) > 0 ? Number(e.period) : secOf(e) >= HALF_SEC ? 2 : 1);
const other = s => (s === "home" ? "away" : "home");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const minLabel = sec => `${Math.floor(Math.max(0, sec) / 60)}'`;
/** Minute label for an event: the feed's own label when it has one. */
export const minuteOf = e => (e?.clockLabel ? String(e.clockLabel) : minLabel(secOf(e)));
/** Percent for text. Never shows 0% or 100% for a model number that is not certain. */
export function pctText(p) {
  const r = Math.round((Number(p) || 0) * 100);
  if (r >= 100 && p < 1) return "99%";
  if (r <= 0 && p > 0) return "1%";
  return `${r}%`;
}

export function sideOf(match, teamId) {
  if (teamId === null || teamId === undefined) return null;
  const t = String(teamId);
  if (String(match?.home?.id) === t) return "home";
  if (String(match?.away?.id) === t) return "away";
  return null;
}
export const teamName = (match, side) => match?.[side]?.name || match?.[side]?.abbr || (side === "home" ? "Home" : "Away");
export const teamAbbr = (match, side) => match?.[side]?.abbr || match?.[side]?.name || (side === "home" ? "Home" : "Away");

/** {home, away} final score, or null when the feed has no score. */
export function finalScore(match) {
  if (!match?.home || !match?.away || !fin(match.home.score) || !fin(match.away.score)) return null;
  return { home: Number(match.home.score), away: Number(match.away.score) };
}

/** Events in match order: half, clock, feed order. */
export function sortedEvents(match) {
  return (match?.events || []).filter(Boolean).map((e, i) => ({ e, i }))
    .sort((x, y) => periodOf(x.e) - periodOf(y.e) || secOf(x.e) - secOf(y.e) || (x.e.seq ?? x.i) - (y.e.seq ?? y.i) || x.i - y.i)
    .map(x => x.e);
}

/**
 * Running score after each scoring event -> [{event, sec, period, side, dh, da, points, home, away}].
 * Uses the event's homeScore/awayScore when the feed gives them (a score that does not go up is skipped as
 * already counted or a correction), else adds the usual points for the type to the event's team.
 */
export function scoreTimeline(match) {
  const out = [];
  let h = 0, a = 0;
  for (const e of sortedEvents(match)) {
    if (!(e.type in PTS)) continue;
    let side = sideOf(match, e.teamId), dh = 0, da = 0;
    if (fin(e.homeScore) && fin(e.awayScore)) {
      const H = Number(e.homeScore), A = Number(e.awayScore);
      if (H < h || A < a || H + A <= h + a) continue;
      dh = H - h; da = A - a;
      if (!side) side = dh > 0 && da === 0 ? "home" : da > 0 && dh === 0 ? "away" : null;
    } else {
      if (!side) continue;
      if (side === "home") dh = PTS[e.type]; else da = PTS[e.type];
    }
    h += dh; a += da;
    out.push({ event: e, sec: secOf(e), period: periodOf(e), side, dh, da, points: dh + da, home: h, away: a });
  }
  return out;
}

/** Score at half time from the 1st-half events, or null when the feed has no 1st-half events at all. */
export function halfTimeScore(match) {
  const evs = sortedEvents(match);
  if (!evs.some(e => periodOf(e) === 1 || e.type === "half_time")) return null;
  let ht = { home: 0, away: 0 };
  for (const s of scoreTimeline(match)) if (s.period === 1) ht = { home: s.home, away: s.away };
  return ht;
}

/** Short description of an event, e.g. "South Africa's try by Kolisi". `side` overrides the event's team. */
export function describeEvent(e, match, side = null) {
  const s = side || sideOf(match, e?.teamId);
  const team = s ? `${teamName(match, s)}'s ` : "a ";
  const what = TITLE[e?.type] || "score";
  const who = e?.players?.[0]?.name;
  if (CARD.has(e?.type)) return `${team}${what}${who ? ` (${who})` : ""}`;
  return `${team}${what}${who ? ` by ${who}` : ""}`;
}

/**
 * Game shape from the score timeline.
 * -> {key, keys, text, winner, margin, leadChanges, maxDeficit, ledThroughout, decidedSec, decidedEvent, decidedLate, complete} | null
 */
export function gameShape(match) {
  const fs = finalScore(match);
  if (!fs) return null;
  const tl = scoreTimeline(match);
  const winner = fs.home > fs.away ? "home" : fs.away > fs.home ? "away" : null;
  const margin = Math.abs(fs.home - fs.away);
  const last = tl[tl.length - 1];
  const complete = last ? last.home === fs.home && last.away === fs.away : fs.home + fs.away === 0;
  const base = { winner, margin, leadChanges: 0, maxDeficit: 0, ledThroughout: false, decidedSec: null, decidedEvent: null,
    decidedLate: false, complete };
  if (!tl.length) {
    if (fs.home + fs.away === 0) return { ...base, key: "scoreless", keys: ["scoreless"], text: "No points were scored." };
    return null; // a final score but no scoring events: the shape is unknown
  }
  let leadChanges = 0, lastLeader = null;
  const def = { home: 0, away: 0 };
  for (const s of tl) {
    const d = s.home - s.away, leader = d > 0 ? "home" : d < 0 ? "away" : null;
    if (leader && lastLeader && leader !== lastLeader) leadChanges++;
    if (leader) lastLeader = leader;
    if (d < 0) def.home = Math.max(def.home, -d);
    if (d > 0) def.away = Math.max(def.away, d);
  }
  const ahead = (s, side) => (side === "home" ? s.home > s.away : s.away > s.home);
  let decidedIdx = null;
  if (winner) for (let i = tl.length - 1; i >= 0 && ahead(tl[i], winner); i--) decidedIdx = i;
  const decided = decidedIdx === null ? null : tl[decidedIdx];
  const ledThroughout = decidedIdx === 0;
  const decidedLate = !!decided && !ledThroughout && decided.sec >= LATE_SEC;
  const maxDeficit = winner ? def[winner] : Math.max(def.home, def.away);
  const parts = [], keys = [];
  if (!winner) {
    keys.push("draw");
    const back = def.home > 0 && def.away === 0 ? "home" : def.away > 0 && def.home === 0 ? "away" : null;
    parts.push(back ? `${teamName(match, back)} came back from ${plural(def[back], "point")} down to draw` : `Finished level at ${fs.home}-${fs.away}`);
  } else {
    const W = teamName(match, winner);
    if (ledThroughout) { keys.push("wire-to-wire"); parts.push(`${W} led from start to finish`); }
    else if (maxDeficit > 0) { keys.push("comeback"); parts.push(`${W} came back from ${plural(maxDeficit, "point")} down`); }
    else { keys.push("never-behind"); parts.push(`${W} were never behind`); }
    if (decidedLate) { keys.push("decided-late"); parts.push("decided in the last 10 minutes"); }
  }
  if (leadChanges > 0) { keys.push("lead-changes"); parts.push(`the lead changed ${leadChanges === 1 ? "once" : `${leadChanges} times`}`); }
  return { ...base, key: keys[0], keys, text: parts.join("; ") + ".", leadChanges, maxDeficit, ledThroughout,
    decidedSec: decided ? decided.sec : null, decidedEvent: decided ? decided.event : null, decidedLate };
}

/**
 * Win-chance story: rebuilds winprob.live() at every minute and just before/after every score and card.
 * -> {points:[{sec,pHome,pAway,pDraw,kind,swing?}], swings, biggest, turning, alwaysAhead, winner, endSec} | null
 * swing: {event, sec, side (who it helped), from, to (that side's win chance), size, pointIndex}
 * turning: the last time the eventual winner's win chance went above 50% (null for a draw or if never below).
 */
export function winProbStory(match, ratings = null) {
  if (!match?.home || !match?.away) return null;
  const fs = finalScore(match);
  const tl = scoreTimeline(match);
  const scored = new Map(tl.map(s => [s.event, s]));
  const rel = [];
  for (const e of sortedEvents(match)) {
    if (scored.has(e)) rel.push({ event: e, sec: secOf(e), period: periodOf(e), score: scored.get(e) });
    else if (CARD.has(e.type) && sideOf(match, e.teamId)) rel.push({ event: e, sec: secOf(e), period: periodOf(e), card: true });
  }
  if (!rel.length) return null;
  const base = { league: match.league, neutral: match.neutral, home: { ...match.home }, away: { ...match.away } };
  const at = (sec, period, sc, cards) => live({ ratings, match: { ...base, home: { ...base.home, score: sc.home },
    away: { ...base.away, score: sc.away }, status: { state: "in", period, clockSec: sec }, events: cards } });
  const endSec = Math.max(FULL_TIME_SEC, ...rel.map(r => r.sec));
  const points = [], swings = [];
  const pt = (sec, p, extra) => points.push({ sec, pHome: p.pHome, pAway: p.pAway, pDraw: p.pDraw, ...extra });
  let sc = { home: 0, away: 0 }, cards = [], j = 0;
  for (let s = 0; ; s += 60) {
    const sec = Math.min(s, endSec);
    while (j < rel.length && rel[j].sec <= sec) {
      const r = rel[j++];
      const before = at(r.sec, r.period, sc, cards);
      if (r.card) cards = [...cards, { ...r.event, period: r.period, clockSec: r.sec }];
      else sc = { home: r.score.home, away: r.score.away };
      const after = at(r.sec, r.period, sc, cards);
      const dH = after.pHome - before.pHome, dA = after.pAway - before.pAway;
      const side = dH - dA >= 0 ? "home" : "away";
      const key = side === "home" ? "pHome" : "pAway";
      pt(r.sec, before, { kind: "before" });
      swings.push({ event: r.event, sec: r.sec, side, eventSide: r.card ? sideOf(match, r.event.teamId) : r.score.side,
        from: before[key], to: after[key], size: Math.max(Math.abs(dH), Math.abs(dA)), pointIndex: points.length });
      pt(r.sec, after, { kind: "event", swing: swings.length - 1 });
    }
    pt(sec, at(sec, sec < HALF_SEC ? 1 : 2, sc, cards), { kind: "time" });
    if (sec >= endSec) break;
  }
  let biggest = null;
  for (const s of swings) if (s.size >= 0.01 && (!biggest || s.size > biggest.size)) biggest = s;
  const winner = fs && fs.home !== fs.away ? (fs.home > fs.away ? "home" : "away") : null;
  let turning = null, alwaysAhead = false;
  if (winner) {
    const pw = p => (winner === "home" ? p.pHome : p.pAway);
    let k = -1;
    for (let i = 1; i < points.length; i++) if (pw(points[i - 1]) <= 0.5 && pw(points[i]) > 0.5) k = i;
    if (k < 0) alwaysAhead = points.every(p => pw(p) > 0.5);
    else {
      const p = points[k];
      let sw = null;
      for (let i = k; i >= 0; i--) if (points[i].kind === "event") { sw = swings[points[i].swing]; break; }
      turning = { sec: p.sec, side: winner, from: pw(points[k - 1]), to: pw(p), byEvent: p.kind === "event",
        event: sw ? sw.event : null, swing: sw, pointIndex: k };
    }
  }
  return { points, swings, biggest, turning, alwaysAhead, winner, endSec };
}

/** Tries, penalty tries, penalty goals, drop goals and cards in match order. */
export function keyMoments(match) {
  const scored = new Map(scoreTimeline(match).map(s => [s.event, s]));
  return sortedEvents(match).filter(e => KEY_TYPES.has(e.type)).map(e => {
    const s = scored.get(e);
    const side = sideOf(match, e.teamId) || (s ? s.side : null);
    return { event: e, type: e.type, sec: secOf(e), minute: minuteOf(e), side, team: side ? teamName(match, side) : "",
      abbr: side ? teamAbbr(match, side) : "", player: e.players?.[0]?.name || "", score: s ? { home: s.home, away: s.away } : null };
  });
}

/** Length of a card's spell in seconds, null = rest of the match (straight red). Same rule as sinbin.js. */
export function cardSpellSec(e) {
  if (e?.type === "yellow_card") return YELLOW_SEC;
  if (e?.type === "red_card") return /20|bunker/i.test(String(e.text || "")) ? RED20_SEC : null;
  return null;
}

/**
 * Points scored by each side while a team was a player short.
 * -> [{event, type, side, team, player, startSec, endSec, permanent, cutShort, carded, opponent, net, text}]
 */
export function sinBinImpact(match) {
  const evs = sortedEvents(match);
  if (!evs.length) return [];
  const tl = scoreTimeline(match);
  const pos = new Map(evs.map((e, i) => [e, i]));
  const matchEnd = Math.max(FULL_TIME_SEC, ...evs.map(secOf));
  const out = [];
  evs.forEach((e, idx) => {
    if (!CARD.has(e.type)) return;
    const side = sideOf(match, e.teamId);
    if (!side) return;
    const start = secOf(e), len = cardSpellSec(e);
    const end = len === null ? null : start + len;
    const pts = { home: 0, away: 0 };
    for (const s of tl) {
      if (pos.get(s.event) <= idx) continue; // scores after the card (a penalty kicked at the same minute counts)
      if (end !== null && s.sec >= end) continue;
      pts.home += s.dh; pts.away += s.da;
    }
    const opp = other(side), team = teamName(match, side);
    const A = teamAbbr(match, side), B = teamAbbr(match, opp);
    const tally = `${A} ${pts[side]}, ${B} ${pts[opp]}`;
    const cutShort = end !== null && end > matchEnd;
    let text;
    if (len === null) text = `After ${team}'s red card (${minuteOf(e)}): ${tally}`;
    else text = `While ${team} was down to 14 (${minuteOf(e)} to ${cutShort ? "full time" : minLabel(end)}${len === RED20_SEC ? ", 20-minute red" : ""}): ${tally}`;
    out.push({ event: e, type: e.type, side, team, player: e.players?.[0]?.name || "", startSec: start, endSec: end,
      permanent: len === null, cutShort, carded: pts[side], opponent: pts[opp], net: pts[opp] - pts[side], text });
  });
  return out;
}

const pctOf = v => (fin(v) ? Math.round(Number(v) <= 1 ? Number(v) * 100 : Number(v)) : null);
const numOf = v => (fin(v) ? Number(v) : null);

/**
 * Discipline and set piece rows. Cards come from the event feed; everything else only when the feed has it.
 * -> {rows:[{key,label,home,away,display:{home,away},pct}], fromFeed} | null when there are no events and no stats.
 */
export function disciplineRows(match) {
  const st = match?.stats && match.stats.home && match.stats.away ? match.stats : null;
  const evs = match?.events || [];
  if (!st && !evs.length) return null;
  const rows = [];
  const add = (key, label, h, a, opts = {}) => {
    if (h === null && a === null) return;
    rows.push({ key, label, home: h, away: a, pct: !!opts.pct,
      display: { home: opts.disp ? opts.disp.home : h, away: opts.disp ? opts.disp.away : a } });
  };
  const H = st ? st.home : {}, A = st ? st.away : {};
  add("penaltiesConceded", "Penalties conceded", numOf(H.penaltiesConceded), numOf(A.penaltiesConceded));
  const c = { home: { y: 0, r: 0 }, away: { y: 0, r: 0 } };
  for (const e of evs) {
    const s = CARD.has(e?.type) ? sideOf(match, e.teamId) : null;
    if (s) c[s][e.type === "yellow_card" ? "y" : "r"]++;
  }
  if (evs.length) {
    add("yellow", "Yellow cards", c.home.y, c.away.y);
    if (c.home.r || c.away.r) add("red", "Red cards", c.home.r, c.away.r);
  }
  const lw = { home: numOf(H.lineoutsWon), away: numOf(A.lineoutsWon) };
  const lt = { home: numOf(H.lineoutsTotal), away: numOf(A.lineoutsTotal) };
  const lineDisp = s => (lw[s] === null ? null : lt[s] === null ? lw[s] : `${lw[s]}/${lt[s]}`);
  add("lineoutsWon", "Lineouts won", lw.home, lw.away, { disp: { home: lineDisp("home"), away: lineDisp("away") } });
  add("scrumsWon", "Scrums won", numOf(H.scrumsWon), numOf(A.scrumsWon));
  add("turnoversWon", "Turnovers won", numOf(H.turnoversWon), numOf(A.turnoversWon));
  add("turnoversConceded", "Turnovers conceded", numOf(H.turnoversConceded), numOf(A.turnoversConceded));
  add("possession", "Possession", pctOf(H.possession), pctOf(A.possession), { pct: true });
  add("territory", "Territory", pctOf(H.territory), pctOf(A.territory), { pct: true });
  if (!rows.length) return null;
  return { rows, fromFeed: !!st };
}

/** Top n per side by TryLine rating (own formula, rating.js). -> {home:[], away:[]} | null */
export function topBySide(match, n = 3) {
  const pl = match?.stats?.players;
  if (!pl || !((pl.home || []).length || (pl.away || []).length)) return null;
  const all = topPerformers(pl, Infinity);
  return { home: all.filter(p => p.side === "home").slice(0, n), away: all.filter(p => p.side === "away").slice(0, n) };
}

/**
 * "What decided it": 1-3 plain sentences from fixed rules, strongest first. -> [{rule, text}]
 * Rules: late winning score / biggest model swing / sin-bin damage / territory gap / penalty gap /
 * tries v kicks / late finish / big margin; fallback: the margin.
 */
export function whatDecidedIt(match, ctx = {}) {
  const fs = finalScore(match);
  if (!fs) return [];
  const shape = ctx.shape !== undefined ? ctx.shape : gameShape(match);
  const story = ctx.story !== undefined ? ctx.story : winProbStory(match, ctx.ratings ?? null);
  const bins = ctx.sinbin !== undefined ? ctx.sinbin : sinBinImpact(match);
  const winner = fs.home > fs.away ? "home" : fs.away > fs.home ? "away" : null;
  const loser = winner ? other(winner) : null;
  const W = winner ? teamName(match, winner) : "", L = loser ? teamName(match, loser) : "";
  const margin = Math.abs(fs.home - fs.away);
  const cands = [];
  const add = (rule, score, text) => cands.push({ rule, score, text, i: cands.length });

  const big = story && story.biggest && story.biggest.size >= 0.1 ? story.biggest : null;
  const decEv = shape && shape.decidedLate ? shape.decidedEvent : null;
  if (decEv && big && big.event === decEv) {
    add("late-swing", 60, `${W}'s winning score, ${describeEvent(decEv, match, winner).replace(/^.*?'s /, "a ")} at ${minuteOf(decEv)}, ` +
      `was also the biggest swing on TryLine's model: ${W}'s win chance went from ${pctText(big.from)} to ${pctText(big.to)}.`);
  } else {
    if (decEv) add("late", 50, `${W}'s winning score came at ${minuteOf(decEv)}: ${describeEvent(decEv, match, winner)}.`);
    if (big) add("swing", Math.round(big.size * 100), `The biggest swing on TryLine's model was ${describeEvent(big.event, match, big.eventSide)} ` +
      `at ${minuteOf(big.event)}: ${teamName(match, big.side)}'s win chance went from ${pctText(big.from)} to ${pctText(big.to)}.`);
  }

  let worst = null;
  for (const b of bins || []) if (b.net >= 5 && (!worst || b.net > worst.net)) worst = b;
  if (worst) {
    const what = worst.permanent ? `after the ${minuteOf(worst.event)} red card` : `while down to 14 after the ${minuteOf(worst.event)} ${TITLE[worst.type]}`;
    add("sinbin", worst.net * 4, `${worst.team} ${worst.team ? "were" : ""} outscored ${worst.carded}-${worst.opponent} ${what}.`.replace(/\s+/g, " "));
  }

  const st = match?.stats && match.stats.home && match.stats.away ? match.stats : null;
  if (st && winner) {
    const tw = pctOf(st[winner].territory), tlo = pctOf(st[loser].territory);
    if (tw !== null && tlo !== null && Math.abs(tw - tlo) >= 16) {
      add("territory", Math.abs(tw - tlo), tw > tlo
        ? `${W} played more of the game in the right areas: ${tw}% territory to ${tlo}%.`
        : `${L} had ${tlo}% territory but could not turn it into enough points.`);
    }
  }
  if (st) {
    const ph = numOf(st.home.penaltiesConceded), pa = numOf(st.away.penaltiesConceded);
    if (ph !== null && pa !== null && Math.abs(ph - pa) >= 4) {
      const x = ph > pa ? "home" : "away";
      add("penalties", Math.abs(ph - pa) * 4, `${teamName(match, x)} gave away ${st[x].penaltiesConceded} penalties to ${teamName(match, other(x))}'s ${st[other(x)].penaltiesConceded}.`);
    }
  }

  if (winner) {
    const cnt = { home: { t: 0, k: 0, d: 0 }, away: { t: 0, k: 0, d: 0 } };
    for (const m of keyMoments(match)) {
      if (!m.side) continue;
      if (m.type === "try" || m.type === "penalty_try") cnt[m.side].t++;
      if (m.type === "penalty_goal") cnt[m.side].k++;
      if (m.type === "drop_goal") cnt[m.side].d++;
    }
    const w = cnt[winner], l = cnt[loser];
    if (w.t < l.t && w.k + w.d > 0) {
      add("boot", 45, `${W} scored fewer tries (${w.t} to ${l.t}) but won with the boot: ${plural(w.k, "penalty goal")}${w.d ? ` and ${plural(w.d, "drop goal")}` : ""}.`);
    } else if (w.t - l.t >= 3) add("tries", 25, `${W} outscored ${L} by ${w.t} tries to ${l.t}.`);
  }

  if (winner && !decEv) {
    const late = { home: 0, away: 0 };
    for (const s of scoreTimeline(match)) if (s.sec >= LATE_SEC) { late.home += s.dh; late.away += s.da; }
    const d = late.home - late.away;
    if (Math.abs(d) >= 7) {
      const s = d > 0 ? "home" : "away";
      add("late-finish", 15 + Math.abs(d), `${teamName(match, s)} finished stronger, outscoring ${teamName(match, other(s))} ${late[s]}-${late[other(s)]} in the last 10 minutes.`);
    }
  }
  if (winner && margin >= 20) add("margin", 20, `${W} were well on top and won by ${plural(margin, "point")}.`);

  if (!cands.length) {
    if (winner) add("fallback", 0, `${W} won by ${plural(margin, "point")}.`);
    else add("fallback", 0, `Neither side could find a winner: it finished ${fs.home}-${fs.away}.`);
  }
  return cands.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 3).map(({ rule, text }) => ({ rule, text }));
}

function scorerList(moments, side) {
  const names = new Map();
  let total = 0;
  for (const m of moments) {
    if (m.side !== side || (m.type !== "try" && m.type !== "penalty_try")) continue;
    total++;
    const n = m.type === "penalty_try" ? "penalty try" : m.player;
    if (n) names.set(n, (names.get(n) || 0) + 1);
  }
  if (!total) return "";
  const list = [...names].sort((a, b) => b[1] - a[1]).map(([n, c]) => (c > 1 ? `${n} ${c}` : n)).join(", ");
  return `${total}${list ? ` (${list})` : ""}`;
}

/** Plain-text recap for sharing: score, try scorers, cards, biggest swing, app link. "" without a score. */
export function shareText(match, ctx = {}) {
  const fs = finalScore(match);
  if (!fs) return "";
  const ht = ctx.ht !== undefined ? ctx.ht : halfTimeScore(match);
  const moments = ctx.moments || keyMoments(match);
  const story = ctx.story !== undefined ? ctx.story : winProbStory(match, ctx.ratings ?? null);
  const lines = [`FT: ${teamName(match, "home")} ${fs.home}-${fs.away} ${teamName(match, "away")}${ht ? ` (HT ${ht.home}-${ht.away})` : ""}`];
  if (match.league?.name) lines.push(match.league.name);
  const tries = ["home", "away"].map(s => [s, scorerList(moments, s)]).filter(([, t]) => t).map(([s, t]) => `${teamAbbr(match, s)} ${t}`);
  if (tries.length) lines.push(`Tries: ${tries.join(" · ")}`);
  const cards = moments.filter(m => CARD.has(m.type)).map(m => `${m.type === "yellow_card" ? "yellow" : "red"} ${m.player ? m.player + " " : ""}(${m.abbr || "?"}) ${m.minute}`);
  if (cards.length) lines.push(`Cards: ${cards.join(", ")}`);
  const b = story && story.biggest && story.biggest.size >= 0.05 ? story.biggest : null;
  if (b) lines.push(`Biggest swing: ${describeEvent(b.event, match, b.eventSide)} at ${minuteOf(b.event)}, ${teamAbbr(match, b.side)} win chance ${pctText(b.from)} to ${pctText(b.to)} (TryLine model estimate)`);
  lines.push(`Free live rugby companion: ${APP_URL}`);
  return lines.join("\n");
}

const kickMs = f => (fin(f?.kickoffMs) ? Number(f.kickoffMs) : Date.parse(f?.kickoff));

/** A team's next fixture (not started) after afterMs from a fixtures list, or null. */
export function nextFixture(fixtures, team, { excludeId = null, afterMs = 0 } = {}) {
  if (!Array.isArray(fixtures) || !team?.name) return null;
  const same = t => !!t && namesMatch(t.name, team.name);
  const list = fixtures.filter(f => f && (excludeId === null || String(f.id) !== String(excludeId)) &&
    !["in", "post"].includes(f.status?.state) && (same(f.home) || same(f.away)) && kickMs(f) > afterMs);
  list.sort((a, b) => kickMs(a) - kickMs(b));
  if (!list.length) return null;
  const f = list[0];
  return { fixture: f, opponent: same(f.home) ? f.away : f.home, home: same(f.home), kickoffMs: kickMs(f) };
}

/** Everything the post-match screen needs. null unless the match is at full time. Each block is null/[] if its data is missing. */
export function buildPostMatch(match, { ratings = null, fixtures = null, nowMs = 0 } = {}) {
  if (!match || match.status?.state !== "post" || !match.home || !match.away) return null;
  const safe = fn => { try { return fn(); } catch { return null; } };
  const final = finalScore(match);
  const ht = safe(() => halfTimeScore(match));
  const shape = safe(() => gameShape(match));
  const story = safe(() => winProbStory(match, ratings));
  const moments = safe(() => keyMoments(match)) || [];
  const sinbin = safe(() => sinBinImpact(match)) || [];
  const discipline = safe(() => disciplineRows(match));
  const top = safe(() => topBySide(match, 3));
  const decided = safe(() => whatDecidedIt(match, { shape, story, sinbin })) || [];
  const share = safe(() => shareText(match, { ht, story, moments })) || "";
  // after this match and after "now" (a cached fixtures list can still call a finished match "pre")
  const afterMs = Math.max(Date.parse(match.kickoff) || 0, Number(nowMs) || 0);
  const next = Array.isArray(fixtures) ? {
    home: safe(() => nextFixture(fixtures, match.home, { excludeId: match.id, afterMs })),
    away: safe(() => nextFixture(fixtures, match.away, { excludeId: match.id, afterMs })),
  } : null;
  return { final, margin: final ? Math.abs(final.home - final.away) : null, ht, shape, story, moments, sinbin, discipline, top, decided, share, next };
}
