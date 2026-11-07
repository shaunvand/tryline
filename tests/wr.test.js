import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeWrListItem, buildWrMatch, fetchWrMatch, fetchWrMatches, normTeamName } from "../src/adapters/wr.js";

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/wr_${n}.json`, import.meta.url), "utf8"));
const summary = fx("summary"), stats = fx("stats"), tl = fx("timeline");
const m = buildWrMatch({ summary, stats, timeline: tl.timeline, nowMs: 0 });

test("list item", () => {
  const f = normalizeWrListItem(fx("list"));
  assert.equal(f.source, "wr");
  assert.equal(f.home.name, "Italy");
  assert.equal(f.status.state, "in");
  assert.equal(f.leagueName, "Nations Championship 2026");
  assert.ok(f.kickoffMs > 0);
});
test("scores and clock", () => {
  assert.equal(m.home.score, summary.match.scores[0]);
  assert.equal(m.away.score, summary.match.scores[1]);
  assert.equal(m.status.clockSource, "feed");
  assert.equal(m.status.clockSec, summary.match.clock.secs);
  assert.equal(m.status.period, 1);
  assert.match(m.status.clockLabel, /^\d+'$/);
});
test("events", () => {
  const t = m.events.find(e => e.type === "try");
  assert.ok(t.players[0].name);
  assert.equal(t.awayScore, 8);
  assert.equal(t.homeScore, 0);
  const last = m.events[m.events.length - 1];
  assert.equal(last.awayScore, m.away.score);
  assert.ok(m.events.some(e => e.type === "sub_on") && m.events.some(e => e.type === "conversion"));
  assert.ok(m.events.every(e => e.pos === undefined));
});
test("stats", () => {
  assert.ok(m.stats.home.possession > 0 && m.stats.home.possession < 1);
  assert.ok(Math.abs(m.stats.home.possession + m.stats.away.possession - 1) < 0.02);
  assert.ok(m.stats.home.raw.Carries >= 0);
  assert.ok(m.stats.home.topPlayers.length <= 5);
  assert.equal(m.stats.home.yellowCards, undefined);
});
test("lineups", () => {
  for (const s of ["home", "away"]) assert.equal(m.lineups[s].filter(p => p.starter).length, 15);
  const off = m.events.find(e => e.type === "sub_off" && e.players[0]);
  const p = [...m.lineups.home, ...m.lineups.away].find(p => p.id === off.players[0].id);
  assert.equal(p.onPitch, false);
});
test("status codes", () => {
  const mk = status => buildWrMatch({ summary: { ...summary, match: { ...summary.match, status } } }).status;
  assert.deepEqual([mk("LHT").label, mk("LHT").clockSec, mk("LHT").period], ["Half time", 2400, 2]);
  assert.equal(mk("C").state, "post");
  assert.equal(mk("LET").period, 3);
});
test("fetch tolerates stats/timeline failure", async () => {
  const fetchImpl = async url => url.endsWith("/summary")
    ? { ok: true, json: async () => summary } : { ok: false, status: 500, json: async () => ({}) };
  const r = await fetchWrMatch({ matchId: "x", fetchImpl, nowMs: 0 });
  assert.equal(r.stats, null);
  assert.deepEqual(r.events, []);
  const l = await fetchWrMatches({ dateFrom: "2026-11-07", dateTo: "2026-11-08",
    fetchImpl: async () => ({ ok: true, json: async () => ({ content: [fx("list")] }) }) });
  assert.equal(l.length, 1);
});
test("normTeamName", () => {
  assert.equal(normTeamName("South Africa"), "springboks");
  assert.equal(normTeamName("Stade Toulousain"), "toulouse");
  assert.equal(normTeamName("Union Bordeaux-Bègles"), "bordeaux");
  assert.equal(normTeamName("Italy"), "italy");
});
