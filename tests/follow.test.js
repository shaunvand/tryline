import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const F = await import("../src/follow.js");
const { renderFollowButton, renderFollowedChips } = await import("../src/ui/follow.js");
const { renderFixtures } = await import("../src/ui/fixtures.js");
const S = await import("../src/settings.js");

test("followKey normalises", () => {
  assert.equal(F.followKey("South Africa"), F.followKey("south africa "));
  assert.equal(F.followKey({ name: "South Africa" }), "southafrica");
});

test("toggle and persist", () => {
  store.clear();
  assert.equal(F.loadFollowed().size, 0);
  let s = F.toggleFollow({ name: "South Africa" });
  assert.ok(s.has("southafrica"));
  assert.equal(store.get("tl.followed"), '["southafrica"]');
  assert.ok(F.isFollowed({ name: "south africa " }));
  assert.ok(F.followedIn({ home: { name: "Wales" }, away: { name: "South Africa" } }));
  assert.ok(F.matchInvolvesFollowed({ home: { name: "South Africa" }, away: {} }));
  s = F.toggleFollow("South Africa");
  assert.equal(s.size, 0);
  assert.equal(F.followedIn({ home: { name: "Wales" }, away: { name: "Fiji" } }), false);
  store.set("tl.followed", "garbage");
  assert.equal(F.loadFollowed().size, 0);
});

test("ui buttons escape", () => {
  const b = renderFollowButton({ name: 'A"<b>' }, true);
  assert.match(b, /aria-pressed="true"/);
  assert.match(b, /data-follow="ab"/);
  assert.doesNotMatch(b, /<b>/);
  const c = renderFollowedChips(new Set(["southafrica"]), [{ name: "South Africa" }]);
  assert.match(c, /data-unfollow="southafrica"/);
  assert.match(c, /South Africa/);
  assert.equal(renderFollowedChips(new Set()), "");
});

test("fixtures: Your teams group first, still in normal group", () => {
  const now = Date.parse("2026-11-07T08:00:00Z");
  const fx = [
    { id: "a", leagueId: "L1", kickoff: "2026-11-07T10:00:00Z", home: { abbr: "AAA", name: "Aaa" }, away: { abbr: "BBB", name: "Bbb" }, status: { state: "pre" } },
    { id: "z", leagueId: "L1", kickoff: "2026-11-08T10:00:00Z", home: { abbr: "RSA", name: "South Africa" }, away: { abbr: "WAL", name: "Wales" }, status: { state: "pre" } },
  ];
  const html = renderFixtures({ fixtures: fx, nowMs: now, followed: new Set(["southafrica"]) });
  const iMine = html.indexOf("Your teams"), iUp = html.indexOf("Upcoming");
  assert.ok(iMine >= 0 && iMine < iUp);
  assert.ok(html.indexOf("/L1/z") > iMine && html.indexOf("/L1/z") < iUp);
  assert.ok(html.indexOf("/L1/z", iUp) > iUp);
  assert.match(html, /tl-fx-star/);
  assert.doesNotMatch(renderFixtures({ fixtures: fx, nowMs: now }), /Your teams/);
});

test("settings alertFollowedOnly", () => {
  store.clear();
  assert.equal(S.alertFollowedOnly(), false);
  S.saveSettings({ alertFollowedOnly: true });
  assert.equal(S.alertFollowedOnly(), true);
  assert.ok(S.loadSettings().leagues.length > 0);
});
