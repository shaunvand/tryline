// ESPN <-> World Rugby linking and merging. Pure functions, no I/O.
import { normTeamName } from "./adapters/wr.js";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" });
/** Calendar day "YYYY-MM-DD" in Africa/Johannesburg, or "" for a bad date. */
export const sastDay = ms => (Number.isFinite(ms) ? dayFmt.format(ms) : "");
const kickMs = f => (f.kickoffMs != null ? f.kickoffMs : Date.parse(f.kickoff));

/** Same team? Exact normalised name, else one contains the other (both >= 4 letters). */
export function namesMatch(a, b) {
  const x = normTeamName(a), y = normTeamName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x));
}

/** Find the WR list item for an ESPN fixture/match -> {wr, swapped} | null. Same SAST day + both names. */
export function findLink(espn, wrList, { allowSwapped = true, exclude = null } = {}) {
  const day = sastDay(kickMs(espn));
  if (!day) return null;
  const cands = (wrList || []).filter(w => sastDay(kickMs(w)) === day && !(exclude && exclude.has(w.id)));
  for (const w of cands) if (namesMatch(espn.home.name, w.home.name) && namesMatch(espn.away.name, w.away.name)) return { wr: w, swapped: false };
  if (allowSwapped) for (const w of cands) if (namesMatch(espn.home.name, w.away.name) && namesMatch(espn.away.name, w.home.name)) return { wr: w, swapped: true };
  return null;
}

const slug = s => String(s || "other").toLowerCase().replace(/\s*\d{4}$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A WR-only list item as a FixtureSummary (routes to #/match/wr/<matchId>). */
export function wrOnlyFixture(w) {
  const iso = Number.isFinite(w.kickoffMs) ? new Date(w.kickoffMs).toISOString().replace(/:\d\d\.\d+Z$/, "Z") : "";
  return { id: `wr:${w.id}`, wrId: w.id, leagueId: `wr:${slug(w.leagueName)}`, leagueName: w.leagueName || "World Rugby",
    kickoff: iso, name: `${w.home.name} v ${w.away.name}`, shortName: `${w.home.abbr} v ${w.away.abbr}`, venue: w.venue || "",
    status: w.status, home: { ...w.home, logo: "", color: "" }, away: { ...w.away, logo: "", color: "" },
    href: `#/match/wr/${encodeURIComponent(w.id)}`, source: "wr" };
}

/** ESPN fixtures + WR list -> one list. A linked WR match adds wrId to the ESPN row; the rest become WR-only rows. */
export function mergeFixtures(espnList, wrList, { fromDay = "" } = {}) {
  const seen = new Set(), rows = [], used = new Set(), links = new Map();
  for (const f of espnList || []) {
    const k = `${f.leagueId}:${f.id}`;
    if (!seen.has(k)) { seen.add(k); rows.push(f); }
  }
  // each WR match links to at most one ESPN row: same-order matches first, swapped ones get what is left
  for (const allowSwapped of [false, true]) for (const f of rows) {
    if (links.has(f)) continue;
    const l = findLink(f, wrList, { allowSwapped, exclude: used });
    if (l && (allowSwapped || !l.swapped)) { links.set(f, l); used.add(l.wr.id); }
  }
  // ESPN sometimes lists one match twice with different ids/team ids, e.g. Pau v Perpignan as 604421 and 604881
  // (teams swapped). Drop an unlinked copy when a WR-linked row of the same league has the same two teams within 3 h.
  const same = (a, b) => namesMatch(a?.name, b?.name) || (!!a?.abbr && a.abbr === b?.abbr);
  const dupOf = f => !links.has(f) && rows.some(g => g !== f && links.has(g) && g.leagueId === f.leagueId &&
    Math.abs((Date.parse(g.kickoff) || 0) - (Date.parse(f.kickoff) || 0)) <= 3 * 36e5 &&
    ((same(f.home, g.home) && same(f.away, g.away)) || (same(f.home, g.away) && same(f.away, g.home))));
  const out = rows.filter(f => !dupOf(f)).map(f => { const l = links.get(f); return l ? { ...f, wrId: l.wr.id, wrSwapped: l.swapped } : f; });
  for (const w of wrList || []) {
    if (used.has(w.id) || (fromDay && sastDay(w.kickoffMs) < fromDay)) continue;
    used.add(w.id);
    out.push(wrOnlyFixture(w));
  }
  return out.sort((a, b) => (Date.parse(a.kickoff) || 0) - (Date.parse(b.kickoff) || 0));
}

const RANK = { pre: 0, in: 1, post: 2 };

/** ESPN Match + linked WR Match -> merged Match. `swapped` = WR lists the teams the other way round. */
export function mergeMatch(espn, wr, swapped = false) {
  if (!wr) return espn;
  if (!espn) return wr;
  const toEspn = tid => {
    if (tid == null) return null;
    const wrHome = String(tid) === String(wr.home.id), wrAway = String(tid) === String(wr.away.id);
    if (!wrHome && !wrAway) return null;
    return wrHome !== swapped ? espn.home.id : espn.away.id;
  };
  const sw = o => (swapped && o ? { home: o.away, away: o.home } : o);
  const wrEvents = (wr.events || []).map(e => ({ ...e, teamId: toEspn(e.teamId),
    homeScore: swapped ? e.awayScore : e.homeScore, awayScore: swapped ? e.homeScore : e.awayScore }));
  const events = wrEvents.length && wrEvents.length >= (espn.events || []).length ? wrEvents : espn.events;
  const wrLu = sw(wr.lineups) || { home: [], away: [] };
  const len = lu => ((lu && lu.home) || []).length + ((lu && lu.away) || []).length;
  const lineups = len(wrLu) > len(espn.lineups) ? wrLu : espn.lineups;
  const ws = wr.status || {}, es = espn.status || {};
  let status = es;
  if ((RANK[ws.state] ?? 0) > (RANK[es.state] ?? 0)) status = { ...ws, clockSource: "feed" };
  else if (ws.state === "in" && es.state === "in") status = { ...es, period: ws.period || es.period, label: ws.label || es.label,
    clockSec: ws.clockSec, clockLabel: ws.clockLabel, clockSource: "feed" };
  // WR's match clock can freeze (seen 2026-11-07: stuck at 41' while events reached 50'): never trail the events
  if (status.state === "in" && !/half time/i.test(status.label || "")) {
    const evMax = Math.max(0, ...events.filter(e => e.period === status.period).map(e => +e.clockSec || 0));
    if (evMax > (+status.clockSec || 0)) status = { ...status, clockSec: evMax, clockLabel: `${Math.floor(evMax / 60)}'`, clockSource: "estimated" };
  }
  const wsc = sw({ home: Number(wr.home.score) || 0, away: Number(wr.away.score) || 0 });
  const useWrScore = ws.state !== "pre" && wsc.home + wsc.away >= (Number(espn.home.score) || 0) + (Number(espn.away.score) || 0);
  let hs = useWrScore ? wsc.home : espn.home.score, as = useWrScore ? wsc.away : espn.away.score;
  // events can run ahead of both scoreboards: take the highest running score (scores never go down)
  const top = events.reduce((b, e) => ((+e.homeScore || 0) + (+e.awayScore || 0) > b.h + b.a ? { h: +e.homeScore || 0, a: +e.awayScore || 0 } : b), { h: 0, a: 0 });
  if (status.state !== "pre" && top.h + top.a > (+hs || 0) + (+as || 0) && top.h >= (+hs || 0) && top.a >= (+as || 0)) { hs = top.h; as = top.a; }
  return { ...espn, status,
    home: { ...espn.home, score: hs },
    away: { ...espn.away, score: as },
    events, lineups, stats: sw(wr.stats) || espn.stats,
    source: { name: "espn+wr", fetchedAt: espn.source?.fetchedAt || wr.source?.fetchedAt, espnId: espn.id, wrId: wr.id,
      note: `ESPN (ids, logos, kickoff) + World Rugby (clock, stats${events === wrEvents ? ", events" : ""}); ESPN ~20-40 s behind TV` } };
}

const PCT_KEYS = ["possession", "territory", "possessionLast10", "territoryLast10", "tackleSuccess", "kickSuccess"];
const TOP = [["Tackles", "tackles"], ["Carries", "carries"], ["Metres", "metres"]];

/** Match.stats (fractions, per-side topPlayers arrays) -> the shape ui/stats.js renders (percent 0-100, stats.topPlayers). */
export function displayStats(stats) {
  if (!stats || !stats.home || !stats.away) return stats || null;
  const side = s => {
    const o = { ...s };
    delete o.raw; delete o.topPlayers;
    for (const k of PCT_KEYS) {
      if (typeof o[k] !== "number") continue;
      if (o[k] <= 1) o[k] = Math.round(o[k] * 100);
      else if (k === "kickSuccess") delete o[k]; // WR sends a count here, not a percent
    }
    return o;
  };
  const out = { home: side(stats.home), away: side(stats.away) };
  const tp = {};
  for (const k of ["home", "away"]) {
    const list = stats[k].topPlayers;
    if (!Array.isArray(list) || !list.length) continue;
    tp[k] = Object.fromEntries(TOP.map(([label, key]) => [label,
      [...list].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 3).filter(p => p[key]).map(p => ({ name: p.name, value: p[key] }))]));
  }
  if (stats.topPlayers) out.topPlayers = stats.topPlayers;
  else if (tp.home || tp.away) out.topPlayers = tp;
  return out;
}
