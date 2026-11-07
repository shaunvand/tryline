// Offline shell: every module app.js can load (static or dynamic import) and every icon the head/manifest
// references must be precached by sw.js, or an offline reload breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, sep } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(resolve(root, p), "utf8");
const rel = f => "./" + relative(root, f).split(sep).join("/");
const sw = read("sw.js");
const shell = new Set([...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]));

function moduleGraph(entry) {
  const seen = new Set();
  const walk = f => {
    if (seen.has(f)) return;
    seen.add(f);
    const src = readFileSync(f, "utf8");
    const specs = [...src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s*["'](\.[^"']+)["']/gm), ...src.matchAll(/import\(\s*["'](\.[^"']+)["']\s*\)/g)];
    for (const m of specs) walk(resolve(dirname(f), m[1]));
  };
  walk(resolve(root, entry));
  return [...seen].map(rel);
}

test("sw.js SHELL lists every module reachable from src/app.js (static + dynamic)", () => {
  const missing = moduleGraph("src/app.js").filter(p => !shell.has(p));
  assert.deepEqual(missing, []);
});

test("sw.js SHELL lists the head and manifest icons, and every SHELL file exists", () => {
  const html = read("index.html");
  const heads = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon|apple-touch-startup-image|manifest|stylesheet)"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  const man = JSON.parse(read("manifest.webmanifest"));
  const icons = man.icons.map(i => "./" + i.src.replace(/^\.\//, ""));
  const missing = [...heads, ...icons].filter(p => !shell.has(p));
  assert.deepEqual(missing, []);
  const absent = [...shell].filter(p => p !== "./" && !existsSync(resolve(root, p)));
  assert.deepEqual(absent, []);
});

test("index.html modulepreloads exactly the static module graph, and the iOS install tags are present", () => {
  const html = read("index.html");
  const pre = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(m => m[1]);
  for (const p of pre) assert.ok(existsSync(resolve(root, p)), p);
  for (const lazy of ["./src/ui/players.js", "./src/ui/coverage.js", "./src/ui/glossary.js", "./src/adapters/replay.js"]) assert.ok(!pre.includes(lazy), `${lazy} must stay lazy`);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /apple-touch-icon" sizes="180x180"/);
});

test("app.js does not statically import the lazy modules", () => {
  const app = read("src/app.js");
  for (const m of ["./ui/players.js", "./ui/coverage.js", "./ui/glossary.js", "./adapters/replay.js"]) {
    assert.ok(!new RegExp(`^import[^;]*from\\s*"${m.replace(/\./g, "\\.")}"`, "m").test(app), m);
  }
});

test("logoThumb resizes ESPN team logos and leaves other URLs alone", async () => {
  const { logoThumb } = await import("../src/ui/fixtures.js");
  assert.equal(logoThumb("https://a.espncdn.com/i/teamlogos/rugby/teams/500/20.png", 40),
    "https://a.espncdn.com/combiner/i?img=/i/teamlogos/rugby/teams/500/20.png&w=40&h=40");
  assert.equal(logoThumb("https://example.com/x.png", 40), "https://example.com/x.png");
  assert.equal(logoThumb("", 40), "");
});
