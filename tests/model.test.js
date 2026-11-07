import { test } from "node:test";
import assert from "node:assert/strict";
import { phi, preMatch, live, secondsRemaining, kickOdds, teamRatingByName } from "../src/model/winprob.js";
import { estimateZone, momentum } from "../src/model/pitch.js";

const ratings = { global: { meanTotal: 46, hfa: 4, sdMargin: 16 }, leagues: {},
  teams: { "1": { name: "Strong Town", rating: 12 }, "2": { name: "Weak City", rating: -6 } } };
const base = (over = {}) => ({ id: "x", league: { id: "L" }, home: { id: "1", abbr: "STR", score: 0 }, away: { id: "2", abbr: "WEA", score: 0 },
  status: { state: "pre", period: 0, clockSec: 0 }, events: [], ...over });

test("phi is a CDF", () => { assert.ok(Math.abs(phi(0) - 0.5) < 1e-6); assert.ok(phi(3) > 0.998); assert.ok(phi(-3) < 0.002); });
test("pre-match favours the stronger home side", () => {
  const p = preMatch({ ratings, leagueId: "L", homeId: "1", awayId: "2" });
  assert.equal(p.mu0, 22); assert.ok(p.pHome > 0.85); assert.ok(p.pHome + p.pAway + p.pDraw > 0.999);
});
test("rating by name for non-ESPN ids", () => {
  assert.equal(teamRatingByName(ratings, "Strong Town"), 12);
  assert.equal(teamRatingByName(ratings, "Nobody"), 0);
  const p = preMatch({ ratings, leagueId: "L", home: { id: "wr-9", name: "Weak City" }, away: { id: "wr-8", name: "Strong Town" } });
  assert.equal(p.mu0, -14);
});
test("seconds remaining by period", () => {
  assert.equal(secondsRemaining({ state: "pre" }), 4800);
  assert.equal(secondsRemaining({ state: "in", period: 1, clockSec: 600 }), 4200);
  assert.equal(secondsRemaining({ state: "in", period: 1, clockSec: 2700 }), 2400); // stoppage in 1st half
  assert.equal(secondsRemaining({ state: "in", period: 2, clockSec: 3600 }), 1200);
  assert.equal(secondsRemaining({ state: "post" }), 0);
});
test("live: a late lead is near-certain, final is certain", () => {
  const m = base({ home: { id: "1", abbr: "STR", score: 10 }, away: { id: "2", abbr: "WEA", score: 20 }, status: { state: "in", period: 2, clockSec: 4620 } });
  const r = live({ ratings, match: m });
  assert.ok(r.pAway > 0.95, `pAway ${r.pAway}`);
  assert.ok(r.projected.away >= 20 && r.projected.home >= 10);
  const done = live({ ratings, match: { ...m, status: { state: "post", period: 2, clockSec: 4800 } } });
  assert.equal(done.pAway, 1); assert.equal(done.projected.away, 20);
});
test("live: probabilities monotone in margin", () => {
  const at = (hs) => live({ ratings, match: base({ home: { id: "1", abbr: "STR", score: hs }, away: { id: "2", abbr: "WEA", score: 10 }, status: { state: "in", period: 2, clockSec: 3000 } }) }).pHome;
  assert.ok(at(0) < at(10) && at(10) < at(24));
});
test("live: red card to home shifts odds to away", () => {
  const st = { state: "in", period: 1, clockSec: 900 };
  const clean = live({ ratings, match: base({ status: st }) }).pHome;
  const carded = live({ ratings, match: base({ status: st, events: [{ id: "e1", type: "red_card", teamId: "1", period: 1, clockSec: 800 }] }) }).pHome;
  assert.ok(carded < clean);
});
test("kick odds in range", () => { assert.ok(kickOdds({ zone: "wide" }) < kickOdds({ zone: "central" })); assert.ok(kickOdds({}) > 0.5); });
test("pitch zone: try by home sits on away line, labelled estimated", () => {
  const m = base({ status: { state: "in", period: 1, clockSec: 700 }, events: [{ id: "t1", type: "try", teamId: "1", period: 1, clockSec: 660, clockLabel: "11'" }] });
  const z = estimateZone(m); assert.equal(z.x, 100); assert.equal(z.confidence, "medium"); assert.equal(z.estimated, true);
  assert.ok(momentum(m) > 0);
  const old = estimateZone({ ...m, status: { state: "in", period: 1, clockSec: 1200 } }); assert.equal(old.x, 50);
});
test("pitch zone: real coordinates win over estimate", () => {
  const m = base({ status: { state: "in", period: 1, clockSec: 700 }, events: [{ id: "p1", type: "penalty_goal", teamId: "2", period: 1, clockSec: 690, pos: { x: 30, y: 60 } }] });
  const z = estimateZone(m); assert.equal(z.x, 30); assert.equal(z.estimated, false);
});
