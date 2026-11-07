// ESPN public-feed adapter -> normalised Match (see ARCHITECTURE.md). No throws on partial data.
import { fixTeam } from "../teams.js";
import { LEAGUES } from "../leagues.js";

// site.web.api: site.api.espn.com scoreboard failed CORS in headless Chromium/Chrome on 2026-11-07 (fine in curl); site.web.api works in both.
const SB = (l, d) => `https://site.web.api.espn.com/apis/site/v2/sports/rugby/${l}/scoreboard?dates=${d}`;
const PLAYS = (l, e) => `https://sports.core.api.espn.com/v2/sports/rugby/leagues/${l}/events/${e}/competitions/${e}/plays?limit=500`;
const SUMMARY = (l, e) => `https://site.web.api.espn.com/apis/site/v2/sports/rugby/${l}/summary?event=${e}`;

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const idFromRef = (ref, re) => { const m = String(ref || "").match(re); return m ? m[1] : null; };
const teamIdOf = p => (p.team && (p.team.id ?? idFromRef(p.team.$ref, /\/teams\/(\d+)/))) ?? null;
const leagueNameOf = id => (LEAGUES.find(l => l.id === String(id)) || {}).name || String(id);

export function eventType(text) {
  const t = String(text || "").toLowerCase().trim();
  if (t === "try") return "try";
  if (t === "penalty try") return "penalty_try";
  if (t === "conversion") return "conversion";
  if (t === "penalty goal" || t === "penalty") return "penalty_goal";
  if (t === "drop goal") return "drop_goal";
  if (t.startsWith("missed")) return "missed_kick";
  if (t === "yellow card") return "yellow_card";
  if (t === "red card") return "red_card";
  if (t === "player substituted") return "sub_off";
  if (t === "substitute on") return "sub_on";
  return "other";
}

const comp = ev => (ev && ev.competitions && ev.competitions[0]) || {};
const statusOf = ev => (ev && ev.status) || comp(ev).status || {};
const stateOf = ev => statusOf(ev).type?.state || "pre";

function side(ev, ha) {
  const c = (comp(ev).competitors || []).find(x => x.homeAway === ha) || {};
  const t = c.team || {};
  return fixTeam({ id: String(t.id ?? c.id ?? ""), name: t.displayName || t.name || "", abbr: t.abbreviation || "",
    logo: t.logo || "", color: t.color ? "#" + String(t.color).replace(/^#/, "") : "", score: num(c.score) });
}
const kickoffOf = ev => (ev && (ev.date || comp(ev).date)) || "";

function kickoffLabel(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "Kick-off";
  try {
    return "Kick-off " + new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
  } catch { return "Kick-off"; }
}
const isHalftime = ev => /half\s*-?\s*time/i.test(statusOf(ev).type?.description || "") || /HALFTIME/i.test(statusOf(ev).type?.name || "");
function statusLabel(ev) {
  const state = stateOf(ev);
  const desc = String(statusOf(ev).type?.description || "");
  if (state === "pre") return kickoffLabel(kickoffOf(ev));
  if (isHalftime(ev)) return "Half time";
  if (state === "post") return "Full time";
  if (/first/i.test(desc)) return "1st half";
  if (/second/i.test(desc)) return "2nd half";
  return desc || "Live";
}

export function normalizeScoreboardEvent(ev, leagueId) {
  ev = ev || {};
  return {
    id: String(ev.id ?? ""), leagueId: String(leagueId), leagueName: leagueNameOf(leagueId),
    kickoff: kickoffOf(ev), name: ev.name || "", shortName: ev.shortName || "",
    venue: comp(ev).venue?.fullName || "",
    status: { state: stateOf(ev), label: statusLabel(ev) },
    home: side(ev, "home"), away: side(ev, "away"),
  };
}

// Minute-in-progress label, ESPN style (317 s -> 6').
export function clockLabelFor(sec, period) {
  const m = Math.floor(sec / 60) + 1;
  if (period === 1 && m > 40) return `40+${m - 40}'`;
  if (period === 2 && m > 80) return `80+${m - 80}'`;
  return `${m}'`;
}

function clockFor(ev, state, period, events, nowMs, kickoffMs) {
  if (state === "pre") return { clockSec: 0, clockLabel: "", clockSource: "estimated" };
  if (state === "post") return { clockSec: 4800, clockLabel: "FT", clockSource: "feed" };
  if (isHalftime(ev)) return { clockSec: 2400, clockLabel: "HT", clockSource: "estimated" };
  const feed = num(statusOf(ev).clock);
  if (feed > 0) return { clockSec: feed, clockLabel: clockLabelFor(feed, period), clockSource: "feed" };
  const last = Math.max(0, ...events.filter(e => e.period === period).map(e => e.clockSec));
  const est = Number.isFinite(kickoffMs) ? (nowMs - kickoffMs) / 1000 : 0;
  let sec;
  if (period <= 1) sec = Math.min(Math.max(est, last), 2400 + 600);
  else if (period === 2) sec = Math.min(Math.max(2400 + (est - 2400 - 900), last), 4800 + 600);
  else sec = Math.max(last, 4800);
  sec = Math.round(sec);
  // estimated past the end of a half: do not invent added minutes ("40+'" not "40+10'")
  const label = period === 1 && sec >= 2400 ? "40+'" : period === 2 && sec >= 4800 ? "80+'" : clockLabelFor(sec, period);
  return { clockSec: sec, clockLabel: label, clockSource: "estimated" };
}

function buildNameMap(summary, sbEvent) {
  const names = new Map();
  for (const ro of summary?.rosters || [])
    for (const r of ro.roster || []) if (r.athlete?.id) names.set(String(r.athlete.id), r.athlete.displayName || r.athlete.fullName || "");
  for (const d of comp(sbEvent).details || [])
    for (const a of d.athletesInvolved || []) if (a.id && !names.has(String(a.id))) names.set(String(a.id), a.displayName || a.fullName || "");
  return names;
}

function buildEvents(plays, names, home, away) {
  const items = Array.isArray(plays?.items) ? plays.items : [];
  const out = items.map((p, i) => {
    const typeText = p.type?.text || "";
    const teamId = teamIdOf(p);
    const clockSec = num(p.clock?.value);
    const period = num(p.period?.number ?? p.period, 1);
    const players = (p.participants || []).map(x => idFromRef(x.athlete?.$ref, /\/athletes\/(\d+)/) ?? x.athlete?.id)
      .filter(Boolean).map(id => ({ id: String(id), name: names.get(String(id)) || "" }));
    const abbr = String(teamId) === home.id ? home.abbr : String(teamId) === away.id ? away.abbr : "";
    const text = [typeText.replace(/^./, c => c.toUpperCase()), players.map(x => x.name).filter(Boolean).join(", "), abbr && `(${abbr})`].filter(Boolean).join(" ");
    return { id: String(p.id ?? i), seq: 0, type: eventType(typeText), period, clockSec,
      clockLabel: p.clock?.displayValue || clockLabelFor(clockSec, period),
      teamId: teamId == null ? null : String(teamId), players, homeScore: num(p.homeScore), awayScore: num(p.awayScore), text, _i: i };
  });
  out.sort((a, b) => a.period - b.period || a.clockSec - b.clockSec || a._i - b._i);
  out.forEach((e, i) => { e.seq = i; delete e._i; });
  return out;
}

function buildLineups(summary, events, home, away) {
  const lu = { home: [], away: [] };
  for (const ro of summary?.rosters || []) {
    const key = ro.homeAway === "home" || (!ro.homeAway && String(ro.team?.id) === home.id) ? "home" : "away";
    const list = (ro.roster || []).map(r => ({ id: String(r.athlete?.id ?? ""), name: r.athlete?.displayName || r.athlete?.fullName || "",
      number: r.jersey != null && r.jersey !== "" ? num(r.jersey, null) : null, position: r.position?.abbreviation || "", starter: !!r.starter }));
    // ESPN may leave every starter flag false (seen pre-kick-off): fall back to shirts 1-15.
    if (list.length && !list.some(x => x.starter)) list.forEach(x => { x.starter = x.number != null && x.number <= 15; });
    list.forEach(x => { x.onPitch = x.starter; });
    list.sort((a, b) => (b.starter - a.starter) || ((a.number ?? 99) - (b.number ?? 99)));
    lu[key] = list;
  }
  for (const e of events) {
    if (e.type !== "sub_off" && e.type !== "sub_on") continue;
    const list = String(e.teamId) === home.id ? lu.home : String(e.teamId) === away.id ? lu.away : [...lu.home, ...lu.away];
    for (const pl of e.players) { const row = list.find(x => x.id === pl.id); if (row) row.onPitch = e.type === "sub_on"; }
  }
  return lu;
}

// The scoreboard score can lag the play feed's running score: take the higher (scores never go down).
function scoreFromEvents(home, away, events) {
  const top = events.reduce((b, e) => (e.homeScore + e.awayScore > b.homeScore + b.awayScore ? e : b), { homeScore: 0, awayScore: 0 });
  if (top.homeScore + top.awayScore <= home.score + away.score || top.homeScore < home.score || top.awayScore < away.score) return null;
  return { home: { ...home, score: top.homeScore }, away: { ...away, score: top.awayScore } };
}

export function buildMatch({ sbEvent, plays, summary, leagueId, leagueName, nowMs = Date.now() }) {
  const fx = normalizeScoreboardEvent(sbEvent, leagueId);
  const state = fx.status.state;
  const events = buildEvents(plays, buildNameMap(summary, sbEvent), fx.home, fx.away);
  let period = state === "pre" ? 0 : num(statusOf(sbEvent).period, 1);
  if (state === "post" && period < 2) period = 2;
  const clk = clockFor(sbEvent || {}, state, period, events, nowMs, Date.parse(fx.kickoff));
  const fromPlays = state === "pre" ? null : scoreFromEvents(fx.home, fx.away, events);
  const partial = [plays ? "" : "plays", summary ? "" : "summary"].filter(Boolean);
  return {
    id: fx.id, league: { id: fx.leagueId, name: leagueName || fx.leagueName },
    kickoff: fx.kickoff, venue: fx.venue, neutral: !!comp(sbEvent).neutralSite,
    status: { state, period, label: fx.status.label, ...clk },
    home: fromPlays ? fromPlays.home : fx.home, away: fromPlays ? fromPlays.away : fx.away, events,
    lineups: buildLineups(summary, events, fx.home, fx.away),
    stats: null,
    source: { name: "espn", fetchedAt: new Date(nowMs).toISOString(), partial,
      note: "ESPN public feed; events typically 20-40 s behind TV; clock estimated" + (fromPlays ? "; score from play feed" : "") },
  };
}

const ymd = d => {
  if (typeof d === "string") return d.replace(/-/g, "");
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
};
async function getJson(fetchImpl, url) {
  const r = await fetchImpl(url);
  if (!r || !r.ok) throw new Error(`HTTP ${r && r.status} ${url}`);
  return r.json();
}

export async function fetchFixtures({ leagueIds, date = new Date(), fetchImpl = globalThis.fetch } = {}) {
  const ids = leagueIds && leagueIds.length ? leagueIds : LEAGUES.slice(0, 9).map(l => l.id);
  const d = ymd(date);
  const res = await Promise.all(ids.map(async id => {
    try {
      const j = await getJson(fetchImpl, SB(id, d));
      return (j.events || []).map(ev => normalizeScoreboardEvent(ev, id));
    } catch { return []; }
  }));
  return res.flat().sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}

// `date` (optional, Date|YYYYMMDD) = scoreboard day; without it today, yesterday, tomorrow are tried in turn.
export async function fetchMatch({ leagueId, eventId, date, fetchImpl = globalThis.fetch, nowMs = Date.now() }) {
  const opt = p => p.catch(() => null);
  const playsP = opt(getJson(fetchImpl, PLAYS(leagueId, eventId)));
  const summaryP = opt(getJson(fetchImpl, SUMMARY(leagueId, eventId)));
  const days = date ? [ymd(date)] : [0, -1, 1].map(o => ymd(new Date(nowMs + o * 864e5)));
  let sbEvent = null;
  for (const d of days) {
    const j = await opt(getJson(fetchImpl, SB(leagueId, d)));
    sbEvent = (j?.events || []).find(e => String(e.id) === String(eventId));
    if (sbEvent) break;
  }
  const [plays, summary] = await Promise.all([playsP, summaryP]);
  if (!sbEvent) throw new Error(`ESPN event ${eventId} not found on scoreboard for league ${leagueId}`);
  return buildMatch({ sbEvent, plays, summary, leagueId: String(leagueId), leagueName: leagueNameOf(leagueId), nowMs });
}
