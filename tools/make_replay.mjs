// Build recordings/<slug>.json from recordings/raw/*.jsonl. Usage: node tools/make_replay.mjs [rawDir] [outDir]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { buildMatch } from "../src/adapters/espn.js";
import { buildWrMatch, normTeamName } from "../src/adapters/wr.js";

const root = new URL("..", import.meta.url);
const rawDir = process.argv[2] || new URL("recordings/raw/", root).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const outDir = process.argv[3] || new URL("recordings/", root).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MAX_BYTES = 1.5e6;

const readLines = f => readFileSync(`${rawDir}/${f}`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).sort((a, b) => a.t < b.t ? -1 : a.t > b.t ? 1 : 0);
const strip = m => JSON.stringify({ ...m, source: undefined });

// Per-source timeline: [{ms, match}] after each record once the source can build a Match.
function espnTimeline(lines, leagueId) {
  let sb = null, plays = null, summary = null; const out = [];
  for (const r of lines) {
    if (r.kind === "scoreboard") sb = r.event; else if (r.kind === "plays") plays = r.data; else if (r.kind === "summary") summary = r.data;
    if (!sb) continue;
    const ms = Date.parse(r.t);
    out.push({ ms, match: buildMatch({ sbEvent: sb, plays, summary, leagueId, nowMs: ms }) });
  }
  return out;
}
function wrTimeline(lines) {
  let summary = null, stats = null, timeline = null; const out = [];
  for (const r of lines) {
    if (r.kind === "summary") summary = r.data; else if (r.kind === "stats") stats = r.data; else if (r.kind === "timeline") timeline = r.data;
    if (!summary) continue;
    const ms = Date.parse(r.t);
    out.push({ ms, match: buildWrMatch({ summary, stats, timeline: timeline || [], nowMs: ms }) });
  }
  return out;
}

// Same policy as the app: WR clock/status/stats/events/lineups win when present; ESPN ids, logos, colours, kickoff.
function merge(e, w) {
  const side = k => ({ ...w[k], id: e[k].id, logo: e[k].logo ?? w[k].logo, color: e[k].color ?? w[k].color, name: e[k].name || w[k].name });
  const idMap = { [w.home.id]: e.home.id, [w.away.id]: e.away.id };
  const events = w.events.length ? w.events.map(x => ({ ...x, teamId: idMap[x.teamId] ?? x.teamId })) : e.events;
  const wrLive = w.status.state !== "pre";
  return {
    ...w, id: e.id, league: e.league, kickoff: e.kickoff || w.kickoff, venue: e.venue || w.venue,
    status: wrLive ? w.status : e.status, home: side("home"), away: side("away"), events,
    lineups: (w.lineups.home.length || w.lineups.away.length) ? w.lineups : e.lineups,
    stats: w.stats ?? e.stats,
    source: { name: "espn+wr", fetchedAt: w.source.fetchedAt, note: "ESPN + World Rugby feeds (recorded replay)" },
  };
}

const files = readdirSync(rawDir).filter(f => f.endsWith(".jsonl"));
const espn = files.filter(f => !f.startsWith("wr_")).map(f => {
  const [leagueId] = f.replace(".jsonl", "").split("_");
  const tl = espnTimeline(readLines(f), leagueId);
  return { f, tl, key: matchKey(tl.at(-1)?.match) };
}).filter(x => x.tl.length);
const wrs = files.filter(f => f.startsWith("wr_")).map(f => {
  const tl = wrTimeline(readLines(f));
  return { f, tl, key: matchKey(tl.at(-1)?.match) };
}).filter(x => x.tl.length);

function matchKey(m) {
  if (!m) return "";
  return `${[m.home.name, m.away.name].map(normTeamName).join("|")}@${String(m.kickoff).slice(0, 10)}`;
}

function combine(e, w) {
  if (!e || !w) return (e || w).tl.map(x => x);
  const times = [...new Set([...e.tl, ...w.tl].map(x => x.ms))].sort((a, b) => a - b);
  const at = (tl, ms) => { let r = null; for (const x of tl) { if (x.ms <= ms) r = x; else break; } return r; };
  return times.map(ms => {
    const a = at(e.tl, ms), b = at(w.tl, ms);
    return { ms, match: a && b ? merge(a.match, b.match) : (a || b).match };
  });
}

function build(e, w) {
  let tl = combine(e, w);
  const snaps = []; let prev = null;
  for (const x of tl) {
    const j = strip(x.match);
    if (j === prev) continue;
    prev = j; snaps.push({ t: new Date(x.ms).toISOString(), match: x.match });
  }
  const last = snaps.at(-1).match;
  const slug = `${(last.home.abbr || last.home.name).toLowerCase()}-v-${(last.away.abbr || last.away.name).toLowerCase()}-${String(last.kickoff).slice(0, 10)}`.replace(/[^a-z0-9-]/g, "");
  const rec = { slug, title: `${last.home.name} v ${last.away.name}`, leagueId: String(last.league.id), leagueName: last.league.name, builtAt: new Date().toISOString(), snapshots: snaps };
  let size = JSON.stringify(rec).length;
  if (size > MAX_BYTES) {
    snaps.forEach((s, i) => {
      if (i % 10 === 0 || i === snaps.length - 1 || !s.match.stats) return;
      const st = s.match.stats;
      for (const k of ["home", "away"]) if (st[k]) { delete st[k].raw; delete st[k].topPlayers; }
    });
    size = JSON.stringify(rec).length;
  }
  return { rec, size };
}

mkdirSync(outDir, { recursive: true });
const usedW = new Set();
for (const e of espn) {
  const w = wrs.find(x => x.key === e.key);
  if (w) usedW.add(w);
  const { rec, size } = build(e, w);
  writeFileSync(`${outDir}/${rec.slug}.json`, JSON.stringify(rec));
  const f = rec.snapshots.at(-1).match;
  console.log(`${rec.slug}: ${rec.snapshots.length} snapshots, ${(size / 1024).toFixed(0)} KB, final ${f.home.score}-${f.away.score} (${f.status.state}), sources ${e.f}${w ? " + " + w.f : ""}`);
}
for (const w of wrs.filter(x => !usedW.has(x))) {
  const { rec, size } = build(null, w);
  writeFileSync(`${outDir}/${rec.slug}.json`, JSON.stringify(rec));
  console.log(`${rec.slug}: ${rec.snapshots.length} snapshots, ${(size / 1024).toFixed(0)} KB (wr only)`);
}
