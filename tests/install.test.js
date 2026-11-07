import test from "node:test";
import assert from "node:assert/strict";
import { platform, renderInstallHint, shouldShowHint, dismissHint, recordVisit } from "../src/ui/install.js";

const fake = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const DAY = 86400000, T0 = 1_700_000_000_000;

test("shouldShowHint needs >= 2 visits", () => {
  const s = fake();
  assert.equal(shouldShowHint(s, T0), false);
  recordVisit(s); assert.equal(shouldShowHint(s, T0), false);
  recordVisit(s); assert.equal(shouldShowHint(s, T0), true);
});

test("dismissHint hides for 14 days then returns", () => {
  const s = fake(); s.setItem("tl.visits", "5");
  dismissHint(s, T0);
  assert.equal(shouldShowHint(s, T0 + 13 * DAY), false);
  assert.equal(shouldShowHint(s, T0 + 14 * DAY + 1), true);
});

test("shouldShowHint tolerates null / broken storage", () => {
  assert.equal(shouldShowHint(null, T0), false);
  const bad = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  assert.equal(shouldShowHint(bad, T0), false);
  assert.doesNotThrow(() => dismissHint(bad, T0));
});

test("renderInstallHint", () => {
  const ios = renderInstallHint("ios-safari");
  assert.match(ios, /Add to Home Screen/); assert.match(ios, /<svg/);
  assert.match(renderInstallHint("android", true), /data-install-btn/);
  assert.equal(renderInstallHint("android", false), "");
  assert.equal(renderInstallHint("standalone"), "");
});

test("platform() is safe in Node", () => { assert.equal(platform(), "desktop"); });
