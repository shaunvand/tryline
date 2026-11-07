import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createReplay, REPLAYS, listReplays } from "../src/adapters/replay.js";

const rec = JSON.parse(readFileSync(new URL("../recordings/ita-v-rsa-2026-11-07.json", import.meta.url), "utf8"));

function fakeTimer() {
  const q = []; let id = 0;
  return { q, setTimeout: (fn, ms) => { q.push({ id: ++id, fn, ms }); return id; },
    clearTimeout: i => { const k = q.findIndex(x => x.id === i); if (k >= 0) q.splice(k, 1); },
    fire() { const x = q.shift(); x.fn(); return x.ms; } };
}

test("recording shape and monotonic time", () => {
  assert.equal(rec.slug, "ita-v-rsa-2026-11-07");
  assert.ok(rec.snapshots.length > 5);
  for (let i = 1; i < rec.snapshots.length; i++) assert.ok(Date.parse(rec.snapshots[i].t) >= Date.parse(rec.snapshots[i - 1].t));
  assert.ok(REPLAYS.some(r => r.slug === rec.slug) && listReplays().length === REPLAYS.length);
});

test("scores never decrease (<=1 correction)", () => {
  for (const k of ["home", "away"]) {
    let dec = 0;
    for (let i = 1; i < rec.snapshots.length; i++) if (rec.snapshots[i].match[k].score < rec.snapshots[i - 1].match[k].score) dec++;
    assert.ok(dec <= 1, `${k} decreased ${dec} times`);
  }
});

test("start emits first snapshot synchronously, then advances with clamped delays", () => {
  const timer = fakeTimer(); const got = [];
  const r = createReplay(rec, { speed: 5, timer });
  r.start(m => got.push(m));
  assert.equal(got.length, 1);
  assert.equal(got[0].source.name, "replay");
  assert.equal(got[0].id, rec.snapshots[0].match.id);
  assert.equal(timer.q.length, 1);
  const ms = timer.fire();
  assert.ok(ms >= 300 && ms <= 4000);
  assert.equal(got.length, 2);
  assert.equal(r.progress().index, 1);
  r.stop();
  assert.equal(timer.q.length, 0);
});

test("seek(1) yields final snapshot and playback stops at end", () => {
  const timer = fakeTimer(); const got = [];
  const r = createReplay(rec, { timer });
  r.start(m => got.push(m));
  r.seek(1);
  const last = rec.snapshots.at(-1).match;
  const cur = r.current();
  // score = recorded score, or the latest event's running score when that is ahead (see reconcile in replay.js)
  const ev = [...last.events].reverse().find(e => e.homeScore != null);
  const ahead = ev && ev.homeScore + ev.awayScore > last.home.score + last.away.score;
  assert.equal(cur.home.score, ahead ? ev.homeScore : last.home.score);
  assert.equal(cur.away.score, ahead ? ev.awayScore : last.away.score);
  assert.ok(cur.status.state === "post" || cur.status.state === last.status.state);
  assert.deepEqual(r.progress(), { index: rec.snapshots.length - 1, total: rec.snapshots.length, fraction: 1 });
  assert.equal(timer.q.length, 0);
  assert.equal(got.at(-1).events.length, last.events.length);
});

test("fixture and setSpeed", () => {
  const timer = fakeTimer();
  const r = createReplay(rec, { timer, speed: 1 });
  const f = r.fixture();
  assert.equal(f.leagueId, rec.leagueId);
  assert.ok(f.home.name && f.away.name);
  r.start(() => {});
  r.setSpeed(1000);
  assert.equal(timer.q.length, 1);
  assert.equal(timer.q[0].ms, 300);
  r.seek(0.5);
  assert.ok(Math.abs(r.progress().fraction - 0.5) < 0.1);
});

test("current() takes score and clock from events that run ahead of the recorded score", () => {
  const ev = { id: "e1", type: "try", period: 1, clockSec: 1374, teamId: "5", homeScore: 0, awayScore: 31 };
  const m = { id: "1", league: { id: "l", name: "L" }, status: { state: "in", period: 1, clockSec: 1312, clockLabel: "21'" },
    home: { id: "20", name: "Italy", abbr: "ITA", score: 0 }, away: { id: "5", name: "South Africa", abbr: "SOU", score: 17 }, events: [ev] };
  const c = createReplay({ slug: "x", snapshots: [{ t: "2026-11-07T12:00:00Z", match: m }] }).current();
  assert.deepEqual([c.home.score, c.away.score], [0, 31]);
  assert.equal(c.status.clockLabel, "22'");
  assert.equal(c.away.abbr, "RSA");
});
