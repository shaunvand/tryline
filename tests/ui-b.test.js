import test from "node:test";
import { setTimeZone } from "../src/time.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPitch, zoneName } from "../src/ui/pitch.js";
import { renderFixtures } from "../src/ui/fixtures.js";
import { renderGlossary, filterGlossary } from "../src/ui/glossary.js";
import { diffEvents, formatAlert, isSupported } from "../src/ui/alerts.js";

const data = JSON.parse(readFileSync(new URL("../data/glossary.json", import.meta.url), "utf8"));
const match = { home: { id: "1", abbr: "RSA", name: "South Africa", score: 17 }, away: { id: "2", abbr: "ENG", name: "England", score: 3 } };

test("pitch shows ESTIMATED badge and svg", () => {
  const html = renderPitch({ match, zone: { x: 80, y: 40, label: "RSA try zone", basis: "last event: try", estimated: true }, momentum: 0.4 });
  assert.match(html, /ESTIMATED FROM EVENTS — not live tracking/);
  assert.match(html, /<svg[^>]+viewBox="0 0 140 90"/);
  assert.match(html, /<animate/);
  assert.match(html, /RSA try zone · last event: try/);
  assert.match(html, /Momentum: RSA \+0\.4 \(last ~10 min\)/);
  const feed = renderPitch({ match, zone: { x: 10, y: 50, label: "x", basis: "y", estimated: false } });
  assert.doesNotMatch(feed, /ESTIMATED FROM/);
  assert.match(feed, /Event location from feed/);
});

test("zoneName", () => {
  assert.equal(zoneName(10), "own 22");
  assert.equal(zoneName(40), "own half");
  assert.equal(zoneName(60), "opp half");
  assert.equal(zoneName(90), "opp 22");
  assert.equal(zoneName(100), "in-goal");
  assert.equal(zoneName(10, false), "opp 22");
});

test("fixtures: live first, SAST time, hrefs", () => {
  setTimeZone("Africa/Johannesburg"); // deterministic on any machine
  const now = Date.parse("2026-11-07T08:00:00Z");
  const fx = [
    { id: "a", leagueId: "L1", leagueName: "League <1>", kickoff: "2026-11-07T14:10:00Z", home: { abbr: "AAA" }, away: { abbr: "BBB" }, status: { state: "pre" } },
    { id: "b", leagueId: "L1", leagueName: "League <1>", kickoff: "2026-11-07T07:00:00Z", home: { abbr: "CCC", score: 10 }, away: { abbr: "DDD", score: 7 }, status: { state: "in", label: "2nd half" } },
    { id: "c", leagueId: "L2", leagueName: "L2", kickoff: "2026-11-06T10:00:00Z", home: { abbr: "EEE", score: 1 }, away: { abbr: "FFF", score: 2 }, status: { state: "post" } },
  ];
  const html = renderFixtures({ fixtures: fx, selectedLeagueIds: [], nowMs: now, replays: [{ slug: "demo-1", title: "Demo <match>" }] });
  assert.ok(html.indexOf("LIVE") < html.indexOf("16:10 SAST"));
  assert.match(html, /16:10 SAST/);
  assert.match(html, /href="#\/match\/L1\/b"/);
  assert.match(html, /href="#\/replay\/demo-1"/);
  assert.match(html, /data-league="L1"/);
  assert.match(html, /Today/);
  assert.match(html, /Demo &lt;match&gt;/);
  assert.doesNotMatch(html, /League <1>/);
  const only = renderFixtures({ fixtures: fx, selectedLeagueIds: ["L2"], nowMs: now });
  assert.match(only, /No live matches/);
  assert.doesNotMatch(only, /AAA/);
});

test("glossary: size and search", () => {
  assert.ok(data.terms.length >= 45);
  assert.equal(data.decisions.length, 15);
  for (const t of data.terms) for (const k of ["term", "short", "law", "refSignal", "whyItMatters"]) assert.ok(t[k], `${t.term} missing ${k}`);
  const all = renderGlossary({ query: "", data });
  assert.match(all, /Ref decision explainer/);
  assert.match(all, /Knock-on/);
  const f = filterGlossary(data, "jackal");
  assert.ok(f.terms.length >= 1 && f.terms.length < data.terms.length);
  const html = renderGlossary({ query: "jackal", data });
  assert.match(html, /Jackal/);
  assert.doesNotMatch(html, /Lineout not straight/);
});

test("diffEvents returns only new key events", () => {
  const prev = [{ id: "1", type: "try" }];
  const next = [{ id: "1", type: "try" }, { id: "2", type: "conversion" }, { id: "3", type: "yellow_card" }, { id: "4", type: "sub_on" }, { id: "5", type: "full_time" }];
  assert.deepEqual(diffEvents(prev, next).map(e => e.id), ["3", "5"]);
  assert.deepEqual(diffEvents(null, []), []);
});

test("formatAlert has team and score; isSupported false in Node", () => {
  const a = formatAlert({ id: "9", type: "try", teamId: "1", clockLabel: "34'", homeScore: 17, awayScore: 3, players: [{ name: "Kolbe" }] }, match);
  assert.match(a.title, /TRY!/);
  assert.match(a.title, /South Africa 17-3/);
  assert.match(a.title, /\(34'\)/);
  assert.match(a.body, /Kolbe/);
  assert.equal(isSupported(), false);
});
