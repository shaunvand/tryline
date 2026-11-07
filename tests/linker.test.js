import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMatch, normalizeScoreboardEvent } from "../src/adapters/espn.js";
import { buildWrMatch, normalizeWrListItem } from "../src/adapters/wr.js";
import { findLink, mergeFixtures, mergeMatch, namesMatch, displayStats, sastDay } from "../src/linker.js";
import { createStore } from "../src/store.js";
import { loadSettings, saveSettings, toggleLeague, DEFAULTS } from "../src/settings.js";

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), "utf8"));
const sbEvent = fx("espn_scoreboard_event");
const espn = buildMatch({ sbEvent, plays: fx("espn_plays"), summary: fx("espn_summary"), leagueId: "17567", nowMs: Date.parse("2026-11-07T12:00Z") });
const wrSummary = fx("wr_summary");
const wr = buildWrMatch({ summary: wrSummary, stats: fx("wr_stats"), timeline: fx("wr_timeline"), nowMs: 0 });
const wrItem = normalizeWrListItem(fx("wr_list"));

test("names and SAST day", () => {
  assert.ok(namesMatch("Clermont Auvergne", "ASM Clermont Auvergne"));
  assert.ok(namesMatch("Montpellier Herault", "Montpellier Herault Rugby Club"));
  assert.ok(namesMatch("South Africa", "South Africa"));
  assert.ok(!namesMatch("Pau", "Perpignan"));
  assert.equal(sastDay(Date.parse("2026-11-07T22:30Z")), "2026-11-08");
});

test("fixtures dedupe: one row with wrId; WR-only rows route to #/match/wr", () => {
  const e = normalizeScoreboardEvent(sbEvent, "17567");
  const other = { ...wrItem, id: "x1", leagueName: "Rugby Europe Trophy Men's 2027", home: { ...wrItem.home, name: "Malta" }, away: { ...wrItem.away, name: "Germany" } };
  const out = mergeFixtures([e, e], [wrItem, other]);
  assert.equal(out.length, 2);
  const row = out.find(f => f.id === "603994");
  assert.equal(row.wrId, wrItem.id);
  assert.ok(row.home.logo !== undefined);
  const w = out.find(f => f.wrId === "x1");
  assert.equal(w.href, "#/match/wr/x1");
  assert.ok(w.leagueId.startsWith("wr:"));
  assert.equal(findLink(e, [{ ...wrItem, kickoffMs: wrItem.kickoffMs + 3 * 864e5 }]), null);
});

test("fixtures: an unlinked ESPN duplicate of a linked match (teams swapped, other id) is dropped", () => {
  const e = normalizeScoreboardEvent(sbEvent, "17567");
  const dup = { ...e, id: "999", kickoff: new Date(Date.parse(e.kickoff) - 5 * 60e3).toISOString(), home: { ...e.away, id: "a1" }, away: { ...e.home, id: "h1" } };
  const out = mergeFixtures([e, dup], [wrItem]);
  assert.deepEqual(out.map(f => f.id), ["603994"]);
  assert.equal(mergeFixtures([e, dup], []).length, 2); // without a WR link nothing is dropped
});

test("ESPN abbreviations are patched (South Africa -> RSA)", () => {
  const e = normalizeScoreboardEvent(sbEvent, "17567");
  assert.equal([e.home, e.away].find(t => t.name === "South Africa")?.abbr, "RSA");
});

test("merge: WR clock, stats, ESPN ids on events", () => {
  const m = mergeMatch({ ...espn, events: espn.events.slice(0, 3) }, wr, false);
  assert.equal(m.events.length, wr.events.length); // WR has more events -> WR events win
  assert.equal(m.source.name, "espn+wr");
  assert.equal(m.id, "603994");
  assert.equal(m.status.clockSource, "feed");
  assert.equal(m.status.clockSec, wr.status.clockSec);
  assert.ok(m.stats && m.stats.home);
  for (const e of m.events) assert.ok(e.teamId === null || e.teamId === espn.home.id || e.teamId === espn.away.id, e.teamId);
  const t = m.events.find(e => e.type === "try");
  assert.equal(t.teamId, espn.away.id); // South Africa scored the first try
});

test("merge swapped: sides and running scores flip", () => {
  const m = mergeMatch({ ...espn, events: [] }, wr, true);
  assert.equal(mergeMatch(espn, wr, true).events, espn.events); // ESPN has more events -> ESPN kept
  const t = m.events.find(e => e.type === "try");
  assert.equal(t.teamId, espn.home.id);
  assert.equal(t.homeScore, 8);
  assert.deepEqual(m.stats.home, wr.stats.away);
});

test("merge tolerates a missing side", () => {
  assert.equal(mergeMatch(espn, null), espn);
  assert.equal(mergeMatch(null, wr), wr);
});

test("displayStats: fractions to percent, topPlayers reshaped", () => {
  const d = displayStats(wr.stats);
  assert.ok(d.home.possession > 1 && d.home.possession <= 100);
  assert.ok(!("raw" in d.home));
  assert.ok(d.topPlayers.home.Tackles.length > 0);
  assert.ok(d.topPlayers.home.Tackles[0].name);
  assert.equal(displayStats(null), null);
});

test("store and settings", () => {
  const s = createStore({ a: 1 });
  let seen = null;
  const off = s.subscribe((st, prev) => { seen = [st.a, prev.a]; });
  s.set({ a: 2 });
  assert.deepEqual(seen, [2, 1]);
  off(); s.set({ a: 3 }); assert.deepEqual(seen, [2, 1]);
  const mem = new Map();
  globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(loadSettings().leagues, [...DEFAULTS.leagues]);
  saveSettings({ notify: true, speed: 20 });
  assert.equal(loadSettings().speed, 20);
  assert.equal(toggleLeague("17567").leagues.includes("17567"), false);
  assert.equal(toggleLeague("17567").leagues.includes("17567"), true);
  delete globalThis.localStorage;
});

test("mergeMatch: header score never trails the merged events' running score", () => {
  const e = { id: "x", seq: 0, type: "try", period: 1, clockSec: 100, teamId: espn.away.id, players: [], homeScore: 3, awayScore: 40, text: "" };
  const stale = { ...espn, home: { ...espn.home, score: 0 }, away: { ...espn.away, score: 10 }, events: [...espn.events, e] };
  const wrStub = { id: "w", home: { id: "h", score: 0 }, away: { id: "a", score: 0 }, status: { state: "pre" }, events: [], lineups: null, stats: null, source: {} };
  const m = mergeMatch(stale, wrStub, false);
  assert.deepEqual([m.home.score, m.away.score], [3, 40]);
});

test("mergeMatch: a frozen WR clock never trails the events and is marked estimated", () => {
  const e = { id: "y", seq: 0, type: "try", period: 2, clockSec: 3033, teamId: espn.away.id, players: [], homeScore: 0, awayScore: 52, text: "" };
  const wrStub = { id: "w", home: { id: "h", score: 0 }, away: { id: "a", score: 52 }, events: [e], lineups: null, stats: null, source: {},
    status: { state: "in", period: 2, label: "2nd half", clockSec: 2502, clockLabel: "41'", clockSource: "feed" } };
  const m = mergeMatch({ ...espn, events: [], status: { ...espn.status, state: "in" } }, wrStub, false);
  assert.equal(m.status.clockSec, 3033);
  assert.equal(m.status.clockLabel, "50'");
  assert.equal(m.status.clockSource, "estimated");
});
