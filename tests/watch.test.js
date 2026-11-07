import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setTimeZone, getTimeZone, fmtTime, fmtDay, tzLabel, tzOptions } from "../src/time.js";
import { renderWatch, countryOptions, detectCountry, renderForm, setBroadcastData } from "../src/ui/watch.js";
import { renderCoverage, renderCoverageNote, setCoverageData } from "../src/ui/coverage.js";
import { buildMatch } from "../src/adapters/espn.js";

const rd = p => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
setBroadcastData(rd("../data/broadcast.json"));
setCoverageData(rd("../data/coverage.json"));

test("fmtTime respects setTimeZone", () => {
  const t = "2026-11-07T14:10:00Z";
  setTimeZone("Africa/Johannesburg"); assert.equal(fmtTime(t), "16:10"); assert.equal(tzLabel(), "SAST");
  setTimeZone("Pacific/Auckland"); assert.equal(fmtTime(Date.parse(t)), "03:10");
  setTimeZone("Europe/London"); assert.equal(fmtTime(t), "14:10");
  setTimeZone("Not/AZone"); assert.equal(getTimeZone(), null);
  setTimeZone("Africa/Johannesburg");
  const now = Date.parse("2026-11-07T08:00:00Z");
  assert.equal(fmtDay(t, now), "Today");
  assert.equal(fmtDay("2026-11-08T10:00:00Z", now), "Tomorrow");
  assert.match(fmtDay("2026-11-14T10:00:00Z", now), /Sat 14 Nov/);
  assert.equal(tzOptions()[0].value, null);
  setTimeZone(null);
});

test("renderWatch", () => {
  assert.match(renderWatch({ leagueId: "17567", country: "ZA" }), /SuperSport/);
  assert.match(renderWatch({ leagueId: "270557", country: "GB" }), /Premier Sports/);
  assert.match(renderWatch({ leagueId: "270555", country: "GB" }), /not available/);
  assert.ok(countryOptions().some(o => o.value === "ZA"));
  assert.ok(typeof detectCountry() === "string");
});

test("coverage", () => {
  assert.match(renderCoverageNote("270557"), /Estimated: clock/);
  assert.match(renderCoverageNote("270557"), /href="#\/coverage"/);
  assert.match(renderCoverageNote("270555"), /stale since 2022/);
  assert.match(renderCoverage(), /Currie Cup/);
});

test("form parsing and render", () => {
  const fx = n => rd(`./fixtures/${n}.json`);
  const m = buildMatch({ sbEvent: fx("espn_scoreboard_event"), plays: fx("espn_plays"), summary: fx("espn_summary"), leagueId: "17567", nowMs: Date.now() });
  for (const s of [m.form.home, m.form.away]) assert.ok(s.length > 0 && s.every(r => /^[WLD]$/.test(r)));
  const html = renderForm({ match: m });
  assert.match(html, /tl-pip-l/);
  assert.match(html, /Last 3 meetings/);
  assert.equal(renderForm({ match: { ...m, form: { home: [], away: [] }, h2h: null } }), "");
});
