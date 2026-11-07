// World Rugby (Pulselive) adapter -> normalised Match (see ARCHITECTURE.md). No deps, relative urls only.
export const WR_BASE = "https://api.wr-rims-prod.pulselive.com/rugby/v3";

const ALIASES = {
  southafrica: "springboks", newzealand: "allblacks", stadetoulousain: "toulouse",
  asmclermontauvergne: "clermont", unionbordeauxbegles: "bordeaux", rctoulonnais: "toulon",
  usaperpignan: "perpignan", sectionpaloise: "pau", staderochelais: "larochelle",
  lyonolympiqueuniversitaire: "lyon", montpellierheraultrugbyclub: "montpellier",
  stadefrancaisparis: "stadefrancais", avironbayonnais: "bayonne", castresolympique: "castres",
};

/** Lowercase letters only, accents stripped, common club/nation aliases folded. */
export function normTeamName(name) {
  const k = String(name ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  return ALIASES[k] || k;
}

const pad = n => String(n).padStart(2, "0");
const num = v => (typeof v === "number" && isFinite(v) ? v : null);

function kickoffLabel(time) {
  if (!time || num(time.millis) == null) return "Scheduled";
  const d = new Date(time.millis + (num(time.gmtOffset) ?? 0) * 3600000);
  return `Kick-off ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function statusOf(code, time) {
  if (code === "C") return { state: "post", label: "Full time" };
  if (code === "LHT") return { state: "in", label: "Half time" };
  if (code === "L1") return { state: "in", label: "1st half" };
  if (code === "L2") return { state: "in", label: "2nd half" };
  if (code === "LET") return { state: "in", label: "Extra time" };
  return { state: "pre", label: kickoffLabel(time) }; // U and anything unknown
}

function teamOf(t, score) {
  return { id: String(t?.id ?? ""), name: t?.name ?? "", abbr: t?.abbreviation ?? "", score: score ?? 0 };
}

export function normalizeWrListItem(item) {
  const teams = item?.teams || [];
  const sc = item?.scores || [];
  return {
    id: String(item?.matchId ?? ""), source: "wr",
    leagueName: item?.events?.[0]?.label || item?.competition || "",
    kickoffMs: item?.time?.millis ?? null,
    home: teamOf(teams[0], sc[0]), away: teamOf(teams[1], sc[1]),
    status: statusOf(item?.status, item?.time),
    venue: item?.venue?.name || "",
  };
}

const clockLabel = secs => `${Math.floor(Math.max(0, secs) / 60)}'`;
const PERIOD_OF_STATUS = { U: 0, L1: 1, LHT: 2, L2: 2, LET: 3, C: 2 };
const PERIOD = { L1: 1, LHT: 2, L2: 2, LET: 3, C: 2 };

function playerName(p) {
  const n = p?.name;
  if (typeof n === "string") return n;
  return n?.display || [n?.first?.known || n?.first?.official, n?.last?.known || n?.last?.official].filter(Boolean).join(" ");
}

export function eventType(e) {
  const s = `${e.type ?? ""}|${e.typeLabel ?? ""}|${e.group ?? ""}`.toLowerCase();
  if (/penalty try|pen try|\bpt\b/.test(s)) return "penalty_try";
  if (/drop ?goal|\bdg\d?\b/.test(s)) return "drop_goal";
  if (/yellow/.test(s)) return "yellow_card";
  if (/red card|\brc\b/.test(s)) return "red_card";
  if (/sub on|replacement on/.test(s)) return "sub_on";
  if (/sub off|replacement off/.test(s)) return "sub_off";
  if (/conversion|\bc2\b|\|con$/.test(s)) return "conversion";
  if (/^t\d|\btry\b/.test(s)) return "try";
  if (/^p3|penalty|\|pen\b/.test(s)) return "penalty_goal";
  return "other";
}

const LABEL = { try: "Try", penalty_try: "Penalty try", conversion: "Conversion", penalty_goal: "Penalty goal",
  drop_goal: "Drop goal", yellow_card: "Yellow card", red_card: "Red card", sub_on: "Replacement on", sub_off: "Replacement off" };

// Assumption: WR position.x/y are either fractions 0..1 or already 0..100. Both <=1 -> scaled x100.
// All-null (the usual case today) -> no pos.
function posOf(p) {
  if (!p || num(p.x) == null) return undefined;
  const x = p.x, y = num(p.y) ?? 50;
  const k = x <= 1 && y <= 1 ? 100 : 1;
  const c = v => Math.max(0, Math.min(100, v * k));
  return { x: c(x), y: c(y) };
}

function buildLineups(summary) {
  const idx = new Map(); // player id/altId -> {side, rec}
  const lineups = { home: [], away: [] };
  (summary?.teams || []).slice(0, 2).forEach((t, i) => {
    const side = i === 0 ? "home" : "away";
    const caps = new Set([...(t.teamList?.captainIds || []), ...(t.teamList?.captainAltIds || [])]);
    for (const r of t.teamList?.list || []) {
      const n = parseInt(r.number, 10);
      if (!r.player || !isFinite(n)) continue; // staff rows have no number
      // Starter = any position other than "Rep"; the feed has had a duplicate shirt "19" for a starting lock,
      // so shirt number (<=15) is only the fallback when position is missing.
      const starter = r.position ? r.position !== "Rep" : n <= 15;
      const rec = { id: String(r.player.id), name: playerName(r.player), number: n,
        position: r.positionLabel || r.position || "", starter, onPitch: starter,
        captain: caps.has(r.player.id) || caps.has(r.player.altId) };
      lineups[side].push(rec);
      idx.set(String(r.player.id), { side, rec });
      if (r.player.altId) idx.set(String(r.player.altId), { side, rec });
    }
    lineups[side].sort((a, b) => a.number - b.number);
  });
  return { lineups, idx };
}

const STAT_KEYS = { possession: "Possession", territory: "Territory", possessionLast10: "BallPossessionLast10Mins",
  territoryLast10: "TerritoryLast10Mins", tackles: "Tackles", tackleSuccess: "TackleSuccess", missedTackles: "MissedTackles",
  carries: "Carries", metres: "Metres", defendersBeaten: "DefendersBeaten", cleanBreaks: "CleanBreaks", passes: "Passes",
  offloads: "Offloads", lineoutsWon: "LineoutsWon", lineoutsTotal: "TotalLineouts", scrumsWon: "ScrumsWon",
  rucksWon: "RucksWon", penaltiesConceded: "PenaltiesConceded", turnoversWon: "TurnoversWon",
  turnoversConceded: "TurnoversConceded", kickSuccess: "KickSuccess", kicksFromHand: "KicksFromHand",
  yellowCards: "YellowCards", redCards: "RedCards" };

// Per-player lines. Feed key names are inspected from tests/fixtures/wr_stats.json; absent key -> null.
const pv = (st, k) => (num(st?.[k]) != null ? Number(st[k]) : null);
function playerLine(p) {
  const st = p.stats || {};
  const pens = (num(st.PenDefs) != null || num(st.PenOffs) != null) ? (Number(st.PenDefs) || 0) + (Number(st.PenOffs) || 0) : null;
  return { id: String(p.player?.id ?? ""), name: playerName(p.player), number: parseInt(p.number, 10) || null,
    position: p.positionLabel || p.position || "", tries: pv(st, "Tries"), points: pv(st, "Points"), carries: pv(st, "Carries"),
    metres: pv(st, "Metres"), defendersBeaten: pv(st, "DefendersBeaten"), cleanBreaks: pv(st, "CleanBreaks"),
    offloads: pv(st, "Offload"), passes: pv(st, "Passes"), tackles: pv(st, "Tackles"), missedTackles: pv(st, "MissedTackles"),
    turnoversWon: pv(st, "TurnoverWon"), penaltiesConceded: pens, kicksFromHand: pv(st, "KicksFromHand"),
    lineoutsWon: pv(st, "LineoutsWon") };
}

function sideStats(ts) {
  const raw = ts?.stats || {};
  const out = {};
  for (const [k, src] of Object.entries(STAT_KEYS)) if (num(raw[src]) != null) out[k] = raw[src];
  out.raw = raw;
  const top = (ts?.playerStats || []).map(p => ({ name: playerName(p.player), number: parseInt(p.number, 10) || null,
    tackles: p.stats?.Tackles ?? 0, carries: p.stats?.Carries ?? 0, metres: p.stats?.Metres ?? 0 }))
    .sort((a, b) => (b.tackles + b.carries) - (a.tackles + a.carries)).slice(0, 5);
  if (top.length) out.topPlayers = top;
  return out;
}

// teamStats entries carry no teamId in the recorded feed: index order is assumed to equal match.teams order
// (checked on a recorded match: teamStats[0] players were the home side). A teamId is honoured if present.
function buildStats(stats, teams) {
  const ts = stats?.teamStats;
  if (!Array.isArray(ts) || !ts.length) return null;
  const pick = i => ts.find(x => x.teamId != null && String(x.teamId) === String(teams[i]?.id)) || ts[i];
  const players = { home: (pick(0)?.playerStats || []).map(playerLine), away: (pick(1)?.playerStats || []).map(playerLine) };
  return { home: sideStats(pick(0)), away: sideStats(pick(1)), players };
}

export function buildWrMatch({ summary, stats, timeline, nowMs } = {}) {
  const m = summary?.match || {};
  const teams = m.teams || [];
  const sc = m.scores || [];
  const code = m.status;
  const st = statusOf(code, m.time);
  let secs = code === "LHT" ? 2400 : num(m.clock?.secs) ?? 0;
  // seen live 2026-11-07: in L2 the match clock restarts from 0 (01:42) while event times stay cumulative
  if (code === "L2" && secs < 2400) secs += 2400;
  const home = { ...teamOf(teams[0], sc[0]), logo: null, color: null };
  const away = { ...teamOf(teams[1], sc[1]), logo: null, color: null };
  const { lineups, idx } = buildLineups(summary);
  const raw = Array.isArray(timeline) ? timeline : timeline?.timeline || [];
  const sorted = raw.map((e, i) => [e, i]).sort((a, b) =>
    (a[0].timestamp?.millis ?? 0) - (b[0].timestamp?.millis ?? 0) || a[1] - b[1]).map(x => x[0]);
  let hs = 0, as = 0;
  const events = sorted.map((e, i) => {
    const type = eventType(e);
    const side = e.teamIndex === 1 ? "away" : "home";
    const pts = num(e.points) || 0;
    if (side === "home") hs += pts; else as += pts;
    const hit = idx.get(String(e.playerId)) || idx.get(String(e.playerAltId));
    const players = hit ? [{ id: hit.rec.id, name: hit.rec.name }] : [];
    if (hit && type === "sub_on") hit.rec.onPitch = true;
    if (hit && type === "sub_off") hit.rec.onPitch = false;
    const t = num(e.time?.secs) ?? 0;
    const tm = side === "home" ? home : away;
    const ev = { id: `wr-${i}`, seq: i, type, period: PERIOD[e.phase] ?? 1, clockSec: t,
      clockLabel: clockLabel(t), teamId: tm.id, players, homeScore: hs, awayScore: as,
      text: `${LABEL[type] || e.typeLabel || e.type || "Event"}${players[0] ? " - " + players[0].name : ""} (${tm.abbr})` };
    const pos = posOf(e.position);
    if (pos) ev.pos = pos;
    return ev;
  });
  // half-time subs share 40' with early 2nd-half events: order by half, then clock, then feed order
  events.sort((a, b) => (a.period - b.period) || (a.clockSec - b.clockSec) || (a.seq - b.seq));
  events.forEach((e, i) => { e.seq = i; }); // renderers sort by seq, so it must follow the half order
  return {
    id: String(m.matchId ?? ""), league: { id: String(m.events?.[0]?.id ?? ""), name: m.events?.[0]?.label || m.competition || "" },
    kickoff: m.time?.millis != null ? new Date(m.time.millis).toISOString().replace(/:\d\d\.\d+Z$/, "Z") : null,
    venue: m.venue?.name || "", neutral: false,
    status: { state: st.state, period: PERIOD_OF_STATUS[code] ?? 0, label: st.label,
      clockSec: secs, clockLabel: clockLabel(secs), clockSource: "feed" },
    home, away, events, lineups, stats: buildStats(stats, teams),
    source: { name: "wr", fetchedAt: new Date(nowMs ?? Date.now()).toISOString(), note: "World Rugby feed; scores+events a few seconds behind" },
  };
}

async function getJson(url, fetchImpl) {
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`WR ${r.status} ${url}`);
  return r.json();
}

// The API answers 400 when endDate == startDate, so a one-day call is widened to the next day.
const nextDay = d => new Date(Date.parse(d + "T00:00:00Z") + 864e5).toISOString().slice(0, 10);
export async function fetchWrMatches({ dateFrom, dateTo, fetchImpl = fetch } = {}) {
  const end = dateTo && dateTo > dateFrom ? dateTo : nextDay(dateFrom);
  const url = p => `${WR_BASE}/match?startDate=${dateFrom}&endDate=${end}&pageSize=100&page=${p}`;
  const first = await getJson(url(0), fetchImpl);
  const items = [...(first?.content || [])];
  const pages = Math.min(first?.pageInfo?.numPages || 1, 4);
  for (let p = 1; p < pages; p++) items.push(...((await getJson(url(p), fetchImpl).catch(() => null))?.content || []));
  return items.map(normalizeWrListItem);
}

export async function fetchWrMatch({ matchId, fetchImpl = fetch, nowMs } = {}) {
  const base = `${WR_BASE}/match/${encodeURIComponent(matchId)}`;
  const [summary, stats, timeline] = await Promise.all([
    getJson(`${base}/summary`, fetchImpl),
    getJson(`${base}/stats`, fetchImpl).catch(() => null),
    getJson(`${base}/timeline`, fetchImpl).then(j => j?.timeline || []).catch(() => []),
  ]);
  return buildWrMatch({ summary, stats, timeline, nowMs });
}
