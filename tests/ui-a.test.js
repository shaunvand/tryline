import test from "node:test";
import assert from "node:assert/strict";
import { renderHeader } from "../src/ui/header.js";
import { renderTimeline } from "../src/ui/timeline.js";
import { renderLineups } from "../src/ui/lineups.js";
import { renderStats, deriveCounts } from "../src/ui/stats.js";

const match = {
  id: "1", league: { id: "1", name: "Test League" }, kickoff: "2026-11-07T11:40Z",
  status: { state: "in", period: 2, label: "2nd half", clockSec: 3000, clockLabel: "50'", clockSource: "estimated" },
  home: { id: "h", name: "Home RFC", abbr: "HOM", logo: null, color: "#112233", score: 17 },
  away: { id: "a", name: "Away RFC", abbr: "AWY", logo: "x.png", color: null, score: 10 },
  events: [
    { id: "1", seq: 1, type: "try", period: 1, clockSec: 600, clockLabel: "10'", teamId: "h", players: [{ id: "p", name: "<script>alert(1)</script>" }], homeScore: 5, awayScore: 0 },
    { id: "2", seq: 2, type: "conversion", period: 1, clockSec: 660, clockLabel: "11'", teamId: "h", players: [{ id: "q", name: "Kicker" }], homeScore: 7, awayScore: 0 },
    { id: "3", seq: 3, type: "yellow_card", period: 2, clockSec: 2700, clockLabel: "45'", teamId: "a", players: [{ id: "r", name: "Carded" }] },
  ],
  lineups: { home: [{ id: "1", name: "<script>x</script>", number: 1, position: "LH", starter: true, onPitch: false }, { id: "16", name: "Sub", number: 16, position: "HK", starter: false, onPitch: true }], away: [] },
  stats: null,
};

test("header shows scores, est. badge, prob bar", () => {
  const h = renderHeader({ match, prob: { pHome: 0.7, pAway: 0.3, pDraw: 0 }, projected: { home: 31, away: 17 } });
  for (const s of ["17", "10", "Home RFC", "LIVE", "est.", "70%", "30%", "Projected FT 31-17"]) assert.ok(h.includes(s), s);
  assert.ok(renderHeader({ match, prob: null }).includes("Win chance: loading"));
  assert.ok(renderHeader({ match: { ...match, status: { state: "pre", label: "x" } } }).includes("Kick-off"));
});

test("timeline newest first, escaped, running score, empty state", () => {
  const t = renderTimeline({ match });
  assert.ok(!t.includes("<script>"));
  assert.ok(t.includes("&lt;script&gt;"));
  assert.ok(t.includes("7-0") && t.includes("2nd half") && t.includes("1st half"));
  assert.ok(t.indexOf("Carded") < t.indexOf("Kicker"));
  assert.ok(renderTimeline({ match: { ...match, events: [] } }).includes("No events yet"));
});

test("lineups escape, off tag, bench, empty", () => {
  const l = renderLineups({ match });
  assert.ok(!l.includes("<script>") && l.includes("tl-off-tag") && l.includes("Bench"));
  assert.ok(renderLineups({ match: { ...match, lineups: { home: [], away: [] } } }).includes("Lineups not published yet"));
});

test("deriveCounts and stats render", () => {
  const d = deriveCounts(match);
  assert.equal(d.home.tries, 1);
  assert.equal(d.home.conversions, 1);
  assert.equal(d.away.yellow, 1);
  assert.ok(renderStats({ match }).includes("not in the free feed"));
  const s = renderStats({ match: { ...match, stats: { home: { possession: 60, tackles: 90, tackleSuccess: 88, lineoutsWon: 8, lineoutsTotal: 9 }, away: { possession: 40, tackles: 70 } } } });
  assert.ok(s.includes("Possession") && s.includes("60%") && s.includes("/9") && s.includes("88%") && !s.includes("Carries"));
});
