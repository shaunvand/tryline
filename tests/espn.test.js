import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMatch, fetchFixtures, fetchMatch, normalizeScoreboardEvent, eventType } from "../src/adapters/espn.js";
import { LEAGUES, DEFAULT_LEAGUE_IDS } from "../src/leagues.js";

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), "utf8"));
const sbEvent = fx("espn_scoreboard_event"), plays = fx("espn_plays"), summary = fx("espn_summary");
const KICK = Date.parse(sbEvent.date);

test("leagues", () => {
  assert.equal(LEAGUES.length, 14);
  assert.equal(DEFAULT_LEAGUE_IDS.length, 9);
  assert.equal(DEFAULT_LEAGUE_IDS[0], "17567");
});

test("eventType mapping", () => {
  assert.equal(eventType("Penalty Try"), "penalty_try");
  assert.equal(eventType("missed conversion"), "missed_kick");
  assert.equal(eventType("player substituted"), "sub_off");
  assert.equal(eventType("whatever"), "other");
});

test("normalizeScoreboardEvent", () => {
  const f = normalizeScoreboardEvent(sbEvent, "17567");
  assert.equal(f.id, "603994");
  assert.equal(f.leagueName, "Nations Championship");
  assert.equal(f.status.state, "in");
  assert.equal(f.status.label, "1st half");
  assert.equal(f.home.abbr, "ITA");
  assert.equal(f.away.score, 22);
});

test("buildMatch live, estimated clock", () => {
  const m = buildMatch({ sbEvent, plays, summary, leagueId: "17567", nowMs: KICK + 21 * 60 * 1000 });
  assert.equal(m.home.score, 0);
  assert.equal(m.away.score, 22);
  assert.equal(m.status.period, 1);
  assert.equal(m.status.clockSource, "estimated");
  assert.equal(m.status.clockSec, 1260);
  assert.equal(m.status.clockLabel, "22'");
  const tries = m.events.filter(e => e.type === "try");
  assert.equal(tries.length, 3);
  assert.equal(tries[0].teamId, "5");
  assert.ok(tries[0].players[0].name.length > 0);
  assert.equal(tries.at(-1).awayScore, 22);
  const secs = m.events.map(e => e.clockSec);
  assert.deepEqual(secs, [...secs].sort((a, b) => a - b));
});

test("clock never below last play, caps at 40+10 and labels it 40+ (no invented added time)", () => {
  const early = buildMatch({ sbEvent, plays, summary, leagueId: "17567", nowMs: KICK });
  assert.equal(early.status.clockSec, 1144);
  const late = buildMatch({ sbEvent, plays, summary, leagueId: "17567", nowMs: KICK + 3600e3 });
  assert.equal(late.status.clockSec, 3000);
  assert.equal(late.status.clockLabel, "40+'");
});

test("lineups and subs", () => {
  const m = buildMatch({ sbEvent, plays, summary, leagueId: "17567", nowMs: KICK + 1e6 });
  assert.equal(m.lineups.home.length, 23);
  assert.equal(m.lineups.away.length, 23);
  assert.equal(m.lineups.home.filter(p => p.starter).length, 15);
  const off = m.events.find(e => e.type === "sub_off"), on = m.events.find(e => e.type === "sub_on");
  const row = id => m.lineups.home.find(p => p.id === id);
  assert.equal(row(off.players[0].id).onPitch, false);
  assert.equal(row(on.players[0].id).onPitch, true);
  assert.equal(m.lineups.home.filter(p => p.onPitch).length, 15);
});

test("partial data does not throw", () => {
  const m = buildMatch({ sbEvent, plays: null, summary: null, leagueId: "17567", nowMs: KICK });
  assert.deepEqual(m.events, []);
  assert.deepEqual(m.lineups, { home: [], away: [] });
  assert.equal(m.stats, null);
});

test("post and pre states", () => {
  const post = structuredClone(sbEvent);
  post.status = { clock: 0, displayClock: "1'", period: 2, type: { state: "post", description: "Full Time", name: "STATUS_FULL_TIME" } };
  const m = buildMatch({ sbEvent: post, plays, summary, leagueId: "17567", nowMs: KICK + 9e6 });
  assert.equal(m.status.clockSec, 4800);
  assert.equal(m.status.clockLabel, "FT");
  assert.equal(m.status.label, "Full time");
  const pre = structuredClone(sbEvent);
  pre.status = { period: 0, type: { state: "pre", description: "Scheduled" } };
  assert.match(buildMatch({ sbEvent: pre, leagueId: "17567", nowMs: KICK - 1e6 }).status.label, /^Kick-off/);
});

test("halftime and second half", () => {
  const ht = structuredClone(sbEvent);
  ht.status = { clock: 0, period: 1, type: { state: "in", description: "Halftime", name: "STATUS_HALFTIME" } };
  const m = buildMatch({ sbEvent: ht, plays, summary, leagueId: "17567", nowMs: KICK + 2700e3 });
  assert.equal(m.status.clockLabel, "HT");
  const h2 = structuredClone(sbEvent);
  h2.status = { clock: 0, period: 2, type: { state: "in", description: "Second Half" } };
  const m2 = buildMatch({ sbEvent: h2, plays, summary, leagueId: "17567", nowMs: KICK + (40 + 15 + 10) * 60e3 });
  assert.equal(m2.status.period, 2);
  assert.equal(m2.status.clockSec, 3000);
});

const ok = body => ({ ok: true, status: 200, json: async () => body });
test("fetchFixtures survives failing leagues", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    if (url.includes("/180659/")) throw new Error("network");
    if (url.includes("/244293/")) return { ok: false, status: 500, json: async () => ({}) };
    return ok(url.includes("/17567/") ? fx("espn_scoreboard") : { events: [] });
  };
  const r = await fetchFixtures({ leagueIds: ["17567", "180659", "244293", "270557"], date: "2026-11-07", fetchImpl });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "603994");
  assert.ok(calls.every(u => u.includes("dates=20261107")));
});

test("fetchMatch tolerates missing summary", async () => {
  const fetchImpl = async url => {
    if (url.includes("scoreboard")) return ok(fx("espn_scoreboard"));
    if (url.includes("/plays")) return ok(plays);
    throw new Error("summary down");
  };
  const m = await fetchMatch({ leagueId: "17567", eventId: "603994", date: "20261107", fetchImpl, nowMs: KICK + 1e6 });
  assert.equal(m.events.length, 8);
  assert.deepEqual(m.lineups, { home: [], away: [] });
  await assert.rejects(fetchMatch({ leagueId: "17567", eventId: "nope", date: "20261107", fetchImpl }));
});

test("header score follows the play feed when the scoreboard lags", () => {
  const lag = structuredClone(sbEvent);
  for (const c of lag.competitions[0].competitors) c.score = c.homeAway === "away" ? "15" : "0";
  const m = buildMatch({ sbEvent: lag, plays, summary, leagueId: "17567", nowMs: KICK + 21 * 60e3 });
  const last = m.events.reduce((b, e) => (e.homeScore + e.awayScore > b.homeScore + b.awayScore ? e : b));
  assert.deepEqual([m.home.score, m.away.score], [last.homeScore, last.awayScore]);
  assert.equal(m.away.score, 22);
  assert.match(m.source.note, /score from play feed/);
  assert.deepEqual(m.source.partial, []);
  assert.deepEqual(buildMatch({ sbEvent, plays: null, summary: null, leagueId: "17567", nowMs: KICK }).source.partial, ["plays", "summary"]);
});
