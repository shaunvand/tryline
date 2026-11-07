import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWrMatch } from "../src/adapters/wr.js";
import { playerRating, fantasyPoints, topPerformers } from "../src/model/rating.js";
import { renderPlayers } from "../src/ui/players.js";

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/wr_${n}.json`, import.meta.url), "utf8"));
const m = buildWrMatch({ summary: fx("summary"), stats: fx("stats"), timeline: fx("timeline").timeline, nowMs: 0 });
const pl = m.stats.players;

test("wr players mapped", () => {
  // fixture feed lists only players with recorded stats (10 per side at 21:52), not the full squad
  assert.ok(pl.home.length >= 10 && pl.away.length >= 10);
  assert.ok(pl.home.some(p => typeof p.tackles === "number"));
  assert.equal(pl.home[0].lineoutsWon, null);
  assert.ok(m.stats.home.topPlayers);
});
test("rating bounds and monotone", () => {
  for (const p of [...pl.home, ...pl.away]) { const r = playerRating(p); assert.ok(r >= 0 && r <= 10); }
  assert.ok(playerRating({ metres: 50 }) > playerRating({ metres: 10 }));
  assert.equal(playerRating({}), 5);
  assert.equal(playerRating({ metres: 9999 }), 10);
  assert.equal(playerRating({ missedTackles: 99 }), 0);
  assert.equal(fantasyPoints({ tries: 1, metres: 25, tackles: 5 }), 14);
});
test("topPerformers sorted", () => {
  const t = topPerformers(pl, 5);
  assert.equal(t.length, 5);
  for (let i = 1; i < 5; i++) assert.ok(t[i - 1].rating >= t[i].rating);
  assert.ok(["home", "away"].includes(t[0].side));
});
test("renderPlayers", () => {
  const evil = { ...m, stats: { ...m.stats, players: { home: [{ name: "<img src=x>", number: 1, position: "Prop", tackles: 5 }], away: [] } } };
  const h = renderPlayers({ match: evil, nowSec: 0 });
  assert.ok(!h.includes("<img src=x>") && h.includes("&lt;img"));
  assert.ok(h.includes("TryLine's own formula from World Rugby stats, not official fantasy points"));
  assert.ok(renderPlayers({ match: m }).includes("<details"));
  assert.ok(renderPlayers({ match: { home: {}, away: {}, stats: null } }).includes("not in the free feed"));
});
