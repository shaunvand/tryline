import test from "node:test";
import assert from "node:assert/strict";
import { activeCards, playerCounts } from "../src/model/sinbin.js";
import { explainEvent, latestExplainer } from "../src/model/explain.js";
import { renderSinBin } from "../src/ui/sinbin.js";
import { renderExplainer } from "../src/ui/explain.js";

const mk = (clockSec, events) => ({
  home: { id: "h", abbr: "SA" }, away: { id: "a", abbr: "NZ" }, status: { clockSec }, events,
});
const Y = (clockSec, id = "y", teamId = "h") => ({ id, type: "yellow_card", teamId, clockSec, players: [{ name: "P <1>" }] });

test("yellow remaining decreases with clock", () => {
  const a = activeCards(mk(1260, [Y(1200)]))[0], b = activeCards(mk(1320, [Y(1200)]))[0];
  assert.equal(a.remainingSec, 540); assert.equal(b.remainingSec, 480); assert.equal(a.abbr, "SA");
});
test("yellow at 35 min still active at 42 min", () => {
  const c = activeCards(mk(2520, [Y(2100)]));
  assert.equal(c.length, 1); assert.equal(c[0].remainingSec, 180); assert.equal(c[0].endSec, 2700);
  assert.equal(activeCards(mk(2700, [Y(2100)])).length, 0);
});
test("counts 14 v 15, floor 13", () => {
  assert.deepEqual(playerCounts(mk(1300, [Y(1200)])), { home: 14, away: 15 });
  assert.deepEqual(playerCounts(mk(1300, [Y(1200, "1"), Y(1250, "2"), Y(1260, "3")])), { home: 13, away: 15 });
});
test("red never expires; 20-min red does after 1200s", () => {
  const red = { id: "r", type: "red_card", teamId: "a", clockSec: 600, text: "Red card" };
  assert.equal(activeCards(mk(4800, [red])).length, 1);
  assert.equal(activeCards(mk(4800, [red]))[0].remainingSec, null);
  const r20 = { ...red, text: "20-minute red card (bunker)" };
  assert.equal(activeCards(mk(1700, [r20])).length, 1);
  assert.equal(activeCards(mk(1800, [r20])).length, 0);
});
test("explainEvent null for subs; content for cards", () => {
  assert.equal(explainEvent({ type: "sub_on" }), null);
  assert.match(explainEvent({ type: "yellow_card" }).meaning, /sin bin/);
  assert.match(explainEvent({ type: "penalty_try" }).meaning, /7 points/);
});
test("latestExplainer picks newest within window", () => {
  const m = mk(1000, [{ id: "1", type: "try", clockSec: 500 }, { id: "2", type: "sub_on", clockSec: 950 }, { id: "3", type: "penalty_goal", clockSec: 900 }, { id: "4", type: "yellow_card", clockSec: 700 }]);
  assert.equal(latestExplainer(m, 1000).event.id, "3");
  assert.equal(latestExplainer(m, 1000, 50), null);
});
test("renderers", () => {
  const m = mk(1300, [Y(1200)]);
  assert.equal(renderSinBin({ match: m, cards: [], counts: playerCounts(m) }), "");
  const h = renderSinBin({ match: m, cards: activeCards(m), counts: playerCounts(m) });
  assert.match(h, /14 v 15/); assert.match(h, /8:20/); assert.match(h, /returns at 30'/); assert.ok(!h.includes("<1>"));
  const e = m.events[0];
  const x = renderExplainer({ ex: explainEvent(e, m), event: e, match: m });
  assert.match(x, /data-explainer-id="y"/); assert.match(x, /#\/glossary\?q=Yellow%20card/);
});
