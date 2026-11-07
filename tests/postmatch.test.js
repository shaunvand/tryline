import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreTimeline, halfTimeScore, gameShape, winProbStory, keyMoments, sinBinImpact, cardSpellSec, disciplineRows,
  topBySide, whatDecidedIt, shareText, nextFixture, buildPostMatch, finalScore, APP_URL,
} from "../src/model/postmatch.js";
import { renderPostMatch, shareOrCopy } from "../src/ui/postmatch.js";

// Same Match contract as the adapters: cumulative clockSec (2nd half from 2400), running homeScore/awayScore.
const H = { id: "h", name: "South Africa", abbr: "RSA" }, A = { id: "a", name: "Italy", abbr: "ITA" };
const ev = (id, type, teamId, clockSec, hs = null, as = null, name = "", extra = {}) => ({
  id, type, teamId, clockSec, period: clockSec >= 2400 ? 2 : 1, homeScore: hs, awayScore: as,
  players: name ? [{ id: name, name }] : [], clockLabel: `${Math.floor(clockSec / 60)}'`, text: "", ...extra,
});
const mk = (events, hs, as, extra = {}) => ({
  id: "m1", league: { id: "x", name: "Test Cup" }, kickoff: "2026-11-07T14:00Z", venue: "", neutral: false,
  status: { state: "post", period: 2, label: "Full time", clockSec: 4800, clockLabel: "80'", clockSource: "feed" },
  home: { ...H, score: hs }, away: { ...A, score: as }, events, lineups: { home: [], away: [] }, stats: null, ...extra,
});

// Italy lead 0-17 (a try while RSA are down to 14), RSA come back and win 24-17 with a 75' try.
const COMEBACK = [
  ev("t1", "try", "a", 600, 0, 5, "Capuozzo"), ev("c1", "conversion", "a", 660, 0, 7),
  ev("p1", "penalty_goal", "a", 1800, 0, 10), ev("y1", "yellow_card", "h", 1920, null, null, "Mbonambi"),
  ev("t2", "try", "a", 2100, 0, 15, "Menoncello"), ev("c2", "conversion", "a", 2160, 0, 17),
  ev("p2", "penalty_goal", "h", 2580, 3, 17), ev("t3", "try", "h", 3000, 8, 17, "Arendse"), ev("c3", "conversion", "h", 3060, 10, 17),
  ev("t4", "try", "h", 3600, 15, 17, "Arendse"), ev("c4", "conversion", "h", 3660, 17, 17),
  ev("t5", "try", "h", 4500, 22, 17, "Kolisi"), ev("c5", "conversion", "h", 4560, 24, 17),
];
const comeback = mk(COMEBACK, 24, 17);

// RSA ahead from the first score to the end.
const WIRE = [ev("p1", "penalty_goal", "h", 300, 3, 0), ev("t1", "try", "h", 1200, 8, 0, "Kolisi"),
  ev("p2", "penalty_goal", "a", 3000, 8, 3), ev("t2", "try", "h", 3600, 13, 3, "Am")];
const STATS = {
  home: { territory: 0.64, possession: 0.58, penaltiesConceded: 5, lineoutsWon: 12, lineoutsTotal: 14, scrumsWon: 6, turnoversWon: 7 },
  away: { territory: 0.36, possession: 0.42, penaltiesConceded: 13, lineoutsWon: 9, lineoutsTotal: 12, scrumsWon: 4, turnoversWon: 3 },
  players: {
    home: [{ name: "A1", tries: 2, metres: 80, carries: 12 }, { name: "A2", tackles: 12 }, { name: "A3", carries: 10 }, { name: "A4" }],
    away: [{ name: "B1", metres: 40 }],
  },
};
const wire = mk(WIRE, 13, 3, { stats: STATS });

// Italy win 15-10 with five penalty goals against two RSA tries.
const BOOT = [ev("t1", "try", "h", 600, 5, 0, "Arendse"), ev("p1", "penalty_goal", "a", 900, 5, 3), ev("p2", "penalty_goal", "a", 1500, 5, 6),
  ev("t2", "try", "h", 2000, 10, 6, "Kolisi"), ev("p3", "penalty_goal", "a", 2700, 10, 9), ev("p4", "penalty_goal", "a", 3300, 10, 12),
  ev("p5", "penalty_goal", "a", 4000, 10, 15)];
const boot = mk(BOOT, 10, 15);

test("score timeline uses feed scores, falls back to points by type, skips repeats", () => {
  const tl = scoreTimeline(comeback);
  assert.equal(tl.length, 12); // 13 events minus the card
  assert.deepEqual([tl.at(-1).home, tl.at(-1).away], [24, 17]);
  const espnLike = mk([ev("a", "try", "h", 600), ev("b", "conversion", "h", 660), ev("c", "penalty_goal", "a", 3000)], 7, 3);
  assert.deepEqual(scoreTimeline(espnLike).map(s => [s.home, s.away]), [[5, 0], [7, 0], [7, 3]]);
  // no team id: the side comes from the score change; a repeated score is not counted twice
  const noTeam = mk([ev("a", "penalty_goal", null, 300, 0, 3), ev("b", "penalty_goal", "a", 310, 0, 3)], 0, 3);
  const t = scoreTimeline(noTeam);
  assert.equal(t.length, 1); assert.equal(t[0].side, "away");
});

test("half-time score from 1st-half events", () => {
  assert.deepEqual(halfTimeScore(comeback), { home: 0, away: 17 });
  assert.deepEqual(halfTimeScore(wire), { home: 8, away: 0 });
  assert.deepEqual(halfTimeScore(mk([ev("a", "try", "h", 600), ev("b", "conversion", "h", 660), ev("c", "penalty_goal", "a", 3000)], 7, 3)), { home: 7, away: 0 });
  assert.equal(halfTimeScore(mk([], 0, 0)), null);
  assert.equal(halfTimeScore(mk([ev("x", "try", "h", 3000, 5, 0)], 5, 0)), null); // only 2nd-half events: unknown
});

test("game shape: comeback, late decider, lead changes, wire-to-wire, draw", () => {
  const s = gameShape(comeback);
  assert.equal(s.winner, "home"); assert.equal(s.margin, 7);
  assert.equal(s.maxDeficit, 17); assert.equal(s.leadChanges, 1);
  assert.equal(s.decidedLate, true); assert.equal(s.decidedEvent.id, "t5"); assert.equal(s.complete, true);
  assert.deepEqual(s.keys, ["comeback", "decided-late", "lead-changes"]);
  assert.match(s.text, /South Africa came back from 17 points down/);
  assert.match(s.text, /decided in the last 10 minutes/);
  assert.match(s.text, /the lead changed once/);

  const w = gameShape(wire);
  assert.equal(w.ledThroughout, true); assert.equal(w.decidedLate, false); assert.equal(w.leadChanges, 0);
  assert.match(w.text, /South Africa led from start to finish/);

  const b = gameShape(boot);
  assert.equal(b.winner, "away"); assert.equal(b.leadChanges, 3); assert.equal(b.maxDeficit, 5);
  assert.match(b.text, /Italy came back from 5 points down; the lead changed 3 times\./);

  const d = gameShape(mk([ev("a", "penalty_goal", "h", 300, 3, 0), ev("b", "penalty_goal", "a", 900, 3, 3)], 3, 3));
  assert.equal(d.winner, null); assert.equal(d.key, "draw");
  assert.match(d.text, /Italy came back from 3 points down to draw/);

  // feed missing a score: flagged as incomplete
  assert.equal(gameShape(mk(WIRE, 16, 3)).complete, false);
});

test("win-prob story: biggest swing and turning point named by event", () => {
  const st = winProbStory(comeback, null);
  assert.ok(st.points.length > 80);
  for (const p of st.points) assert.ok(p.pHome >= 0 && p.pHome <= 1 && p.pAway >= 0 && p.pAway <= 1);
  assert.equal(st.swings.length, 13); // 12 scores + 1 card
  assert.equal(st.biggest.event.id, "t5");
  assert.equal(st.biggest.side, "home");
  assert.ok(st.biggest.to > st.biggest.from);
  assert.equal(st.turning.event.id, "t5");
  assert.equal(st.turning.byEvent, true);
  assert.ok(st.turning.from <= 0.5 && st.turning.to > 0.5);
  assert.equal(st.points[st.biggest.pointIndex].kind, "event");

  const w = winProbStory(wire, null);
  assert.equal(w.turning, null); assert.equal(w.alwaysAhead, true); // favourite on the model all match
  const d = winProbStory(mk([ev("a", "penalty_goal", "h", 300, 3, 0), ev("b", "penalty_goal", "a", 900, 3, 3)], 3, 3), null);
  assert.equal(d.turning, null); assert.equal(d.winner, null);
  assert.equal(winProbStory(mk([], 0, 0), null), null);
});

test("key moments: tries, pens, drop goals and cards in order", () => {
  const km = keyMoments(comeback);
  assert.deepEqual(km.map(k => k.event.id), ["t1", "p1", "y1", "t2", "p2", "t3", "t4", "t5"]);
  assert.equal(km[2].score, null); assert.equal(km[2].player, "Mbonambi"); assert.equal(km[2].abbr, "RSA");
  assert.deepEqual(km.at(-1).score, { home: 22, away: 17 });
  assert.deepEqual(keyMoments(mk([], 0, 0)), []);
});

test("sin-bin window points", () => {
  const sb = sinBinImpact(comeback);
  assert.equal(sb.length, 1);
  assert.equal(sb[0].side, "home"); assert.equal(sb[0].carded, 0); assert.equal(sb[0].opponent, 7); assert.equal(sb[0].net, 7);
  assert.equal(sb[0].endSec, 2520);
  assert.match(sb[0].text, /While South Africa was down to 14 \(32' to 42'\): RSA 0, ITA 7/);

  const red = mk([ev("t1", "try", "h", 600, 5, 0), ev("r1", "red_card", "a", 2000, null, null, "X", { text: "Red card" }),
    ev("t2", "try", "h", 3000, 10, 0), ev("p1", "penalty_goal", "h", 3600, 13, 0)], 13, 0);
  const r = sinBinImpact(red)[0];
  assert.equal(r.permanent, true); assert.equal(r.carded, 0); assert.equal(r.opponent, 8);
  assert.match(r.text, /After Italy's red card \(33'\): ITA 0, RSA 8/);

  // a card at 75': the 10 minutes run past full time
  const late = sinBinImpact(mk([ev("y", "yellow_card", "a", 4500), ev("t", "try", "h", 4700, 5, 0)], 5, 0))[0];
  assert.equal(late.cutShort, true); assert.match(late.text, /75' to full time/); assert.equal(late.opponent, 5);

  assert.equal(cardSpellSec({ type: "yellow_card" }), 600);
  assert.equal(cardSpellSec({ type: "red_card", text: "20-minute red card" }), 1200);
  assert.equal(cardSpellSec({ type: "red_card", text: "Red card" }), null);
  assert.deepEqual(sinBinImpact(mk([], 0, 0)), []);
});

test("discipline rows only for fields the feed has; top performers per side", () => {
  const d = disciplineRows(wire);
  assert.equal(d.fromFeed, true);
  assert.deepEqual(d.rows.map(r => r.key), ["penaltiesConceded", "yellow", "lineoutsWon", "scrumsWon", "turnoversWon", "possession", "territory"]);
  assert.equal(d.rows.find(r => r.key === "lineoutsWon").display.home, "12/14");
  assert.equal(d.rows.find(r => r.key === "territory").home, 64);
  const ev2 = disciplineRows(comeback);
  assert.equal(ev2.fromFeed, false);
  assert.deepEqual(ev2.rows.map(r => [r.key, r.home, r.away]), [["yellow", 1, 0]]);
  assert.equal(disciplineRows(mk([], 0, 0)), null);

  const t = topBySide(wire, 3);
  assert.equal(t.home.length, 3); assert.equal(t.away.length, 1);
  assert.equal(t.home[0].name, "A1");
  assert.ok(t.home[0].rating >= t.home[1].rating && t.home[1].rating >= t.home[2].rating);
  assert.equal(topBySide(comeback), null);
});

test("what decided it: deterministic rules", () => {
  const c = whatDecidedIt(comeback);
  assert.deepEqual(c.map(r => r.rule), ["late-swing", "sinbin"]);
  assert.match(c[0].text, /South Africa's winning score, a try by Kolisi at 75', was also the biggest swing on TryLine's model/);
  assert.match(c[1].text, /South Africa were outscored 0-7 while down to 14 after the 32' yellow card\./);

  const w = whatDecidedIt(wire);
  assert.deepEqual(w.map(r => r.rule), ["penalties", "territory", "swing"]);
  assert.match(w[0].text, /Italy gave away 13 penalties to South Africa's 5\./);
  assert.match(w[1].text, /64% territory to 36%/);

  const b = whatDecidedIt(boot);
  assert.ok(b.some(r => r.rule === "boot"));
  assert.match(b.find(r => r.rule === "boot").text, /Italy scored fewer tries \(0 to 2\) but won with the boot: 5 penalty goals\./);
  assert.ok(b.length >= 1 && b.length <= 3);

  // late finish without a late decider
  const lf = whatDecidedIt(mk([ev("p", "penalty_goal", "h", 600, 3, 0), ev("t", "try", "h", 4300, 8, 0), ev("c", "conversion", "h", 4360, 10, 0)], 10, 0));
  assert.ok(lf.some(r => r.rule === "late-finish" && /outscoring Italy 7-0 in the last 10 minutes/.test(r.text)));

  assert.deepEqual(whatDecidedIt(mk([], 0, 0)), [{ rule: "fallback", text: "Neither side could find a winner: it finished 0-0." }]);
  assert.deepEqual(whatDecidedIt(mk(COMEBACK, undefined, undefined)), []);
});

test("share text", () => {
  const s = shareText(comeback);
  const lines = s.split("\n");
  assert.equal(lines[0], "FT: South Africa 24-17 Italy (HT 0-17)");
  assert.equal(lines[1], "Test Cup");
  assert.equal(lines[2], "Tries: RSA 3 (Arendse 2, Kolisi) · ITA 2 (Capuozzo, Menoncello)");
  assert.equal(lines[3], "Cards: yellow Mbonambi (RSA) 32'");
  assert.match(lines[4], /^Biggest swing: South Africa's try by Kolisi at 75', RSA win chance \d+% to \d+% \(TryLine model estimate\)$/);
  assert.ok(lines.at(-1).endsWith(APP_URL));
  assert.equal(APP_URL, "https://shaunvand.github.io/tryline/");

  const empty = shareText(mk([], 0, 0));
  assert.ok(empty.startsWith("FT: South Africa 0-0 Italy\n"));
  assert.ok(!/HT|Tries:|Cards:|Biggest swing/.test(empty));
  assert.ok(empty.includes(APP_URL));
  assert.equal(shareText(mk(COMEBACK, undefined, undefined)), "");
});

test("next fixture and buildPostMatch, including missing data", () => {
  const fx = [
    { id: "f2", leagueId: "17567", kickoff: "2026-11-21T15:00Z", status: { state: "pre" }, home: { name: "England" }, away: { name: "South Africa" } },
    { id: "m1", leagueId: "17567", kickoff: "2026-11-07T14:00Z", status: { state: "post" }, home: { name: "South Africa" }, away: { name: "Italy" } },
    { id: "f1", leagueId: "17567", kickoff: "2026-11-14T15:00Z", status: { state: "pre" }, home: { name: "Wales" }, away: { name: "South Africa" } },
  ];
  const after = Date.parse("2026-11-07T14:00Z");
  const n = nextFixture(fx, H, { afterMs: after });
  assert.equal(n.fixture.id, "f1"); assert.equal(n.opponent.name, "Wales"); assert.equal(n.home, false);
  assert.equal(nextFixture(fx, A, { afterMs: after }), null);
  assert.equal(nextFixture(null, H), null);
  assert.equal(nextFixture(fx, H, { afterMs: Date.parse("2026-11-15T00:00Z") }).fixture.id, "f2");

  assert.equal(buildPostMatch({ ...comeback, status: { ...comeback.status, state: "in" } }), null);
  assert.equal(buildPostMatch(null), null);
  const pm = buildPostMatch(comeback, { fixtures: fx, nowMs: Date.parse("2026-11-08T00:00Z") });
  assert.deepEqual(pm.final, { home: 24, away: 17 }); assert.equal(pm.margin, 7);
  assert.equal(pm.next.home.fixture.id, "f1"); assert.equal(pm.next.away, null);
  assert.equal(pm.top, null); assert.ok(pm.share.startsWith("FT:"));
  assert.equal(buildPostMatch(comeback).next, null); // no fixtures loaded

  const bare = buildPostMatch(mk([], 0, 0));
  assert.equal(bare.story, null); assert.equal(bare.ht, null); assert.deepEqual(bare.moments, []);
  assert.deepEqual(bare.sinbin, []); assert.equal(bare.discipline, null); assert.equal(bare.shape.key, "scoreless");
  const noScore = buildPostMatch(mk(COMEBACK, undefined, undefined));
  assert.equal(noScore.final, null); assert.equal(noScore.shape, null); assert.equal(noScore.share, "");
  assert.equal(finalScore({ home: { score: "12" }, away: { score: 3 } }).home, 12);
});

test("renderPostMatch: blocks hide without data, labels and escaping", () => {
  assert.equal(renderPostMatch({ pm: null, match: comeback }), "");
  const html = renderPostMatch({ pm: buildPostMatch(comeback), match: comeback, followed: new Set() });
  for (const s of ["Full-time analysis", "Win chance story", "<svg", "Key moments", "Sin-bin impact", "What decided it",
    "data-pm-share", "TryLine model estimate", "Follow South Africa", "no AI"]) assert.ok(html.includes(s), s);
  assert.ok(!html.includes("Top performers"));
  const withPlayers = renderPostMatch({ pm: buildPostMatch(wire), match: wire, followed: new Set() });
  assert.ok(withPlayers.includes("TryLine rating (own formula)"));
  assert.ok(!withPlayers.includes("Sin-bin impact"));
  const evil = mk(WIRE, 13, 3, { home: { ...H, name: "<img src=x>", score: 13 } });
  const e = renderPostMatch({ pm: buildPostMatch(evil), match: evil, followed: new Set() });
  assert.ok(!e.includes("<img src=x>") && e.includes("&lt;img"));
  const bare = renderPostMatch({ pm: buildPostMatch(mk([], 0, 0)), match: mk([], 0, 0), followed: new Set() });
  assert.ok(!bare.includes("<svg") && !bare.includes("Key moments"));
});

test("shareOrCopy: Web Share, clipboard fallback, cancel", async () => {
  assert.equal(await shareOrCopy("x", { share: async () => {} }), "shared");
  let got = "";
  assert.equal(await shareOrCopy("hello", { clipboard: { writeText: async t => { got = t; } } }), "copied");
  assert.equal(got, "hello");
  const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
  assert.equal(await shareOrCopy("x", { share: async () => { throw abort; } }), "cancelled");
  assert.equal(await shareOrCopy("x", { share: async () => { throw new Error("no"); }, clipboard: { writeText: async () => {} } }), "copied");
  assert.equal(await shareOrCopy("x", {}), "failed");
  assert.equal(await shareOrCopy("", { share: async () => {} }), "failed");
});
