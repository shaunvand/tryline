// TryLine bootstrap: hash router, polling, rendering, alerts. Plain ES module, relative URLs only.
import { createStore } from "./store.js";
import { loadSettings, saveSettings, toggleLeague } from "./settings.js";
import { loadFixtures, loadMatch } from "./adapters/index.js";
import { displayStats } from "./linker.js";
import { DEFAULT_LEAGUE_IDS } from "./leagues.js";
import { live } from "./model/winprob.js";
import { estimateZone, momentum } from "./model/pitch.js";
import { renderHeader } from "./ui/header.js";
import { renderTimeline } from "./ui/timeline.js";
import { renderLineups } from "./ui/lineups.js";
import { renderStats, deriveCounts } from "./ui/stats.js";
import { renderPitch } from "./ui/pitch.js";
import { renderFixtures } from "./ui/fixtures.js";
import { renderGlossary, loadGlossary } from "./ui/glossary.js";
import { diffEvents, formatAlert, showToast, notify, requestPermission } from "./ui/alerts.js";
import { getTimeZone, setTimeZone, tzLabel, tzOptions } from "./time.js";
import { loadFollowed, toggleFollow, isFollowed, matchInvolvesFollowed } from "./follow.js";
import { renderFollowButton, renderFollowedChips } from "./ui/follow.js";
import { activeCards, playerCounts } from "./model/sinbin.js";
import { latestExplainer } from "./model/explain.js";
import { renderSinBin } from "./ui/sinbin.js";
import { renderExplainer } from "./ui/explain.js";
import { renderPlayers } from "./ui/players.js";
import { setBroadcastData, renderWatch, renderForm, countryOptions, detectCountry } from "./ui/watch.js";
import { setCoverageData, renderCoverage, renderCoverageNote } from "./ui/coverage.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// clock times follow the user's time zone (time.js; device zone by default)
const hhmmss = ms => new Date(ms).toLocaleTimeString("en-GB", { hour12: false, ...(getTimeZone() ? { timeZone: getTimeZone() } : {}) });
const LAST_KEY = "tryline.lastMatch";
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

const store = createStore({ view: "fixtures", fixtures: null, fixturesAt: 0, match: null, matchKey: null, matchErr: null, tab: "timeline" });
let settings = loadSettings();
let ratings = null;
fetch(new URL("./model/ratings.json", import.meta.url)).then(r => (r.ok ? r.json() : null))
  .then(r => { ratings = r; rerenderMatch(); }).catch(() => {});
// static JSON (no JSON modules without a build): broadcast + coverage tables
const getJson = path => fetch(new URL(path, document.baseURI)).then(r => (r.ok ? r.json() : null)).catch(() => null);
getJson("data/broadcast.json").then(j => { setBroadcastData(j); rerenderMatch(); });
getJson("data/coverage.json").then(j => { setCoverageData(j); rerenderMatch(); if (store.get().view === "coverage") routeCoverage(); });
const country = () => settings.country || detectCountry();

// explainer cards the user closed (this tab only)
const DISMISS_KEY = "tl.dismissedExplainers";
const dismissed = (() => { try { return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]")); } catch { return new Set(); } })();
function dismissExplainer(id) {
  dismissed.add(String(id));
  try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed])); } catch { /* ignore */ }
}

// ---- replay module is optional (built in parallel); a missing file only disables replays ----
let replayMod;
async function replayModule() {
  if (replayMod === undefined) replayMod = await import("./adapters/replay.js").catch(() => null);
  return replayMod;
}
async function replayList() {
  const m = await replayModule();
  try { return m ? (m.listReplays ? m.listReplays() : m.REPLAYS || []) : []; } catch { return []; }
}

// ---- connection dot ----
function setConn(ok) {
  const el = $("#tl-conn");
  if (!el) return;
  const s = ok && navigator.onLine !== false ? "live" : "offline";
  el.dataset.status = s;
  el.setAttribute("aria-label", `Connection: ${s}`);
  el.title = s;
  const t = $("#tl-conn-txt");
  if (t) { t.textContent = s === "live" ? "Online" : "Offline"; t.dataset.status = s; }
}
addEventListener("online", () => setConn(true));
addEventListener("offline", () => setConn(false));

// ---- polling: one active loop, x2 backoff on errors (max 120 s), paused while hidden ----
let poll = null;
function stopPolling() { if (poll) clearTimeout(poll.timer); poll = null; }
function startPolling(fn, baseMs) {
  stopPolling();
  const p = { fails: 0, timer: null };
  p.tick = async () => {
    if (poll !== p) return;
    clearTimeout(p.timer);
    if (document.hidden) return; // resumed by visibilitychange
    try { await fn(); p.fails = 0; setConn(true); }
    catch (e) { p.fails++; setConn(false); console.warn("TryLine poll failed:", e && e.message); }
    if (poll !== p) return;
    const base = baseMs();
    p.timer = setTimeout(p.tick, p.fails ? Math.min(120e3, base * 2 ** p.fails) : base);
  };
  poll = p;
  p.tick();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && poll) poll.tick(); });

// ---- views ----
const VIEWS = ["fixtures", "match", "glossary", "settings", "coverage"];
function show(view) {
  for (const v of VIEWS) $(`#view-${v}`)?.classList.toggle("tl-hidden", v !== view);
  document.querySelectorAll("#tl-nav a").forEach(a => a.classList.toggle("active", a.dataset.nav === view));
  store.set({ view });
}

// ---- fixtures ----
async function refreshFixtures() {
  const leagueIds = [...new Set([...DEFAULT_LEAGUE_IDS, ...settings.leagues])];
  const { fixtures, espnOk, wrOk } = await loadFixtures({ leagueIds });
  const down = !espnOk && !wrOk;
  // an outage must not look like "no matches": keep the last good list and say so
  if (down) store.set({ fixturesDown: Date.now(), fixtures: store.get().fixtures || null });
  else store.set({ fixtures, fixturesAt: Date.now(), fixturesDown: 0 });
  await renderFixturesView();
  if (down) throw new Error("No fixture source answered");
}
async function renderFixturesView() {
  const st = store.get();
  const banner = st.fixturesDown
    ? `<p class="tl-card tl-err tl-banner" role="alert">Could not reach ESPN or World Rugby${st.fixtures ? `, showing data from ${esc(hhmmss(st.fixturesAt))}` : ""}. Retrying automatically.</p>` : "";
  if (!st.fixtures) { if (banner && st.view === "fixtures") $("#view-fixtures").innerHTML = banner; return; }
  const replays = await replayList();
  if (store.get().view !== "fixtures") return;
  const followed = loadFollowed();
  const teamsSeen = st.fixtures.flatMap(f => [f.home, f.away]).filter(Boolean);
  $("#view-fixtures").innerHTML = banner + renderFollowedChips(followed, teamsSeen) +
    renderFixtures({ fixtures: st.fixtures, selectedLeagueIds: settings.leagues, nowMs: Date.now(), replays, followed }) +
    `<p class="tl-src">Times in ${esc(tzLabel())} · updated ${esc(hhmmss(st.fixturesAt))} · ESPN + World Rugby public feeds</p>`;
}
$("#view-fixtures").addEventListener("click", e => {
  const u = e.target.closest("button[data-unfollow]");
  if (u) { toggleFollow(u.dataset.unfollow); renderFixturesView(); return; }
  const b = e.target.closest("button[data-league]");
  if (!b) return;
  settings = toggleLeague(b.dataset.league);
  renderFixturesView();
});

// ---- match ----
let alerted = []; // {type, side, sec} already announced for the current match
let replay = null;
function stopReplay() {
  if (replay) { try { replay.r.stop(); } catch { /* ignore */ } clearInterval(replay.iv); }
  replay = null;
  $("#tl-replaybar").classList.add("tl-hidden");
}

// Alert de-dupe by type + side + clock (within 2 min), so a switch between ESPN and WR events never re-alerts.
const sideOf = (e, m) => (String(e.teamId) === String(m.home.id) ? "h" : "a");
const seen = (e, m) => alerted.some(a => a.type === e.type && a.side === sideOf(e, m) && Math.abs(a.sec - (e.clockSec || 0)) <= 120);
const remember = (e, m) => alerted.push({ type: e.type, side: sideOf(e, m), sec: e.clockSec || 0 });

function fireAlert(event, m) {
  const a = formatAlert(event, m);
  // "only teams I follow" gates the system notification; the in-app toast always shows
  const wanted = !settings.alertFollowedOnly || matchInvolvesFollowed(m, loadFollowed());
  if (!(settings.notify && wanted && notify(a))) showToast($("#tl-toasts"), a);
}

function applyMatch(m, key) {
  const st = store.get();
  if (st.matchKey !== key || !m) return; // route changed while loading
  const prev = st.match;
  if (prev && !key.startsWith("replay/")) m = carryForward(prev, m);
  if (!prev) (m.events || []).forEach(e => remember(e, m));
  else {
    for (const e of diffEvents(prev.events, m.events)) if (!seen(e, m)) { remember(e, m); fireAlert(e, m); }
    if (prev.status?.state === "in" && m.status?.state === "post") fireAlert({ type: "full_time", id: "ft" }, m);
  }
  store.set({ match: m, matchErr: null, matchOkAt: Date.now() });
  rerenderMatch();
}

// A partial feed failure (plays/summary down) must not blank a screen that had data: keep the last good sections.
const luLen = lu => ((lu && lu.home) || []).length + ((lu && lu.away) || []).length;
function carryForward(prev, m) {
  const kept = [];
  const out = { ...m };
  if (!(m.events || []).length && (prev.events || []).length) { out.events = prev.events; kept.push("events"); }
  if (!luLen(m.lineups) && luLen(prev.lineups)) { out.lineups = prev.lineups; kept.push("lineups"); }
  if (!m.stats && prev.stats) { out.stats = prev.stats; kept.push("stats"); }
  if (kept.length) out.source = { ...(m.source || {}), degraded: kept };
  return out;
}

const SRC = { "espn+wr": "ESPN + World Rugby", wr: "World Rugby", replay: "Replay", espn: "ESPN" };

function rerenderMatch() {
  const { match: m, view, tab, matchErr } = store.get();
  if (view !== "match") return;
  const head = $("#match-header");
  if (!m && !store.get().matchKey) {
    head.classList.remove("tl-skeleton");
    head.innerHTML = `<p>No match open.</p><p><a class="tl-btn" href="#/">Pick a match from Fixtures</a></p>`;
    for (const t of ["timeline", "pitch", "stats", "lineups"]) $(`#tab-${t}`).innerHTML = "";
    $("#match-explainer").innerHTML = "";
    return;
  }
  if (!m) {
    $("#match-explainer").innerHTML = "";
    head.classList.toggle("tl-skeleton", !matchErr);
    head.innerHTML = matchErr
      ? `<p class="tl-err">Could not load this match: ${esc(matchErr)}</p><p class="tl-src">Retrying automatically. <a href="#/">Back to fixtures</a></p>`
      : "Loading match…";
    return;
  }
  let prob = null;
  try { if (m.status?.state !== "post") prob = live({ ratings, match: m }); } catch (e) { console.warn("winprob", e); }
  const src = m.source || {}, isReplay = src.name === "replay";
  const okAt = store.get().matchOkAt || 0;
  const stale = !isReplay && m.status?.state === "in" && okAt && Date.now() - okAt > 2 * 15e3;
  head.classList.remove("tl-skeleton");
  head.classList.toggle("tl-stale", !!stale);
  const followed = loadFollowed();
  let cards = [];
  try { cards = activeCards(m); } catch (e) { console.warn("sinbin", e); }
  const leagueId = m.league?.id;
  head.innerHTML = renderHeader({ match: m, prob }) +
    `<div class="tl-follow-row">${renderFollowButton(m.home, isFollowed(m.home, followed))}<span class="tl-muted tl-follow-cap">Follow</span>${renderFollowButton(m.away, isFollowed(m.away, followed))}</div>` +
    (cards.length ? renderSinBin({ match: m, cards, counts: playerCounts(m) }) +
      (m.status?.clockSource === "estimated" ? `<p class="tl-src">Sin-bin times use the estimated clock</p>` : "") : "") +
    renderWatch({ leagueId, country: country() }) +
    renderForm({ match: m }) +
    (stale ? `<p class="tl-err tl-stale-msg" role="status">Data stale since ${esc(hhmmss(okAt))} · retrying</p>` : "") +
    (src.degraded?.length ? `<p class="tl-err tl-stale-msg">Feed degraded, showing last ${esc(src.degraded.join(", "))}</p>` : "") +
    `<p class="tl-src">${esc(SRC[src.name] || src.name || "")}${src.fetchedAt && !isReplay ? " · updated " + esc(hhmmss(Date.parse(src.fetchedAt))) : ""}` +
    `${src.note ? " · " + esc(src.note) : ""}</p>` +
    renderCoverageNote(leagueId);
  let ex = null;
  try { ex = latestExplainer(m, m.status?.clockSec); } catch (e) { console.warn("explainer", e); }
  $("#match-explainer").innerHTML = ex && !dismissed.has(String(ex.event.id)) ? renderExplainer({ ex: ex.ex, event: ex.event, match: m }) : "";
  if (tab === "timeline") $("#tab-timeline").innerHTML = renderTimeline({ match: m });
  if (tab === "pitch") {
    let zone = null, mom = null;
    try { zone = estimateZone(m); mom = momentum(m); } catch (e) { console.warn("pitch model", e); }
    $("#tab-pitch").innerHTML = renderPitch({ match: m, zone, momentum: mom });
  }
  // Players live inside Stats (raw m: displayStats strips stats.players); keeps the tab strip at 4 for 390px screens
  if (tab === "stats") $("#tab-stats").innerHTML = renderStats({ match: { ...m, stats: displayStats(m.stats) }, derived: deriveCounts(m) }) +
    `<h3 class="tl-pl-head" id="players">Players</h3>` + renderPlayers({ match: m, nowSec: m.status?.clockSec });
  if (tab === "lineups") $("#tab-lineups").innerHTML = renderLineups({ match: m });
  const H = m.home.abbr || m.home.name, A = m.away.abbr || m.away.name;
  document.title = m.status?.state === "pre" ? `${H} v ${A} · TryLine`
    : `${H} ${m.home.score ?? 0}-${m.away.score ?? 0} ${A}${m.status?.clockLabel ? " " + m.status.clockLabel : ""} · TryLine`;
}

function setTab(tab) {
  store.set({ tab });
  document.querySelectorAll("#match-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  for (const t of ["timeline", "pitch", "stats", "lineups"]) $(`#tab-${t}`).classList.toggle("tl-hidden", t !== tab);
  rerenderMatch();
}
$("#match-tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) setTab(b.dataset.tab); });
// header/explainer HTML is rebuilt on every update, so delegate from the view
$("#view-match").addEventListener("click", e => {
  const f = e.target.closest("button[data-follow]");
  if (f) { toggleFollow({ name: f.dataset.name }); rerenderMatch(); return; }
  const x = e.target.closest("[data-dismiss-explainer]");
  if (x) { dismissExplainer(x.dataset.dismissExplainer); $("#match-explainer").innerHTML = ""; }
});

function openMatch(key) {
  alerted = [];
  store.set({ match: null, matchKey: key, matchErr: null });
  show("match");
  rerenderMatch();
}

function routeLiveMatch(leagueId, eventId) {
  const key = `${leagueId}/${eventId}`;
  openMatch(key);
  lsSet(LAST_KEY, `#/match/${key}`);
  startPolling(async () => {
    try { applyMatch(await loadMatch({ leagueId, eventId }), key); }
    catch (e) {
      if (store.get().matchKey === key && !store.get().match) store.set({ matchErr: e.message || String(e) });
      if (store.get().matchKey === key) rerenderMatch(); // shows "Data stale since" once data is old
      throw e;
    }
  }, () => (store.get().match?.status?.state === "in" ? 15e3 : 60e3));
}

// ---- replay ----
function renderReplayBar() {
  if (!replay) return;
  const bar = $("#tl-replaybar");
  let p = { fraction: 0, index: 0, total: 0 };
  try { p = replay.r.progress(); } catch { /* ignore */ }
  bar.classList.remove("tl-hidden");
  bar.innerHTML = `<span class="tl-rp-title">REPLAY · ${esc(replay.title)} · snapshot ${esc(p.index + 1)}/${esc(p.total)}</span>` +
    `<button type="button" class="tl-btn tl-btn-sm" data-rp="toggle">${replay.playing ? "Pause" : "Play"}</button>` +
    `<span class="tl-rp-track" data-rp="seek" role="slider" aria-label="Replay position" aria-valuenow="${Math.round(p.fraction * 100)}">` +
    `<span class="tl-rp-fill" style="width:${(p.fraction * 100).toFixed(1)}%"></span></span>` +
    [1, 5, 20].map(s => `<button type="button" class="tl-chip${settings.speed === s ? " active" : ""}" data-rp="speed" data-speed="${s}">${s}x</button>`).join("");
}
// in-place progress update (rebuilding the bar every second would swallow taps)
function updateReplayProgress() {
  if (!replay) return;
  let p;
  try { p = replay.r.progress(); } catch { return; }
  const t = $("#tl-replaybar .tl-rp-title"), f = $("#tl-replaybar .tl-rp-fill");
  if (!t || !f) return renderReplayBar();
  t.textContent = `REPLAY · ${replay.title} · snapshot ${p.index + 1}/${p.total}`;
  f.style.width = `${(p.fraction * 100).toFixed(1)}%`;
}
$("#tl-replaybar").addEventListener("click", e => {
  if (!replay) return;
  const t = e.target.closest("[data-rp]");
  if (!t) return;
  const what = t.dataset.rp;
  if (what === "toggle") { if (replay.playing) replay.r.stop(); else replay.r.start(replay.onUpdate); replay.playing = !replay.playing; }
  if (what === "speed") { settings = saveSettings({ speed: Number(t.dataset.speed) }); replay.r.setSpeed(settings.speed); syncSettingsForm(); }
  if (what === "seek") {
    const r = t.getBoundingClientRect();
    replay.r.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    applyMatch(replay.r.current(), replay.key);
  }
  renderReplayBar();
});

async function routeReplay(slug) {
  const key = `replay/${slug}`;
  openMatch(key);
  const fail = msg => { if (store.get().matchKey === key) { store.set({ matchErr: msg }); rerenderMatch(); } };
  const mod = await replayModule();
  if (!mod) return fail("replays are not available in this build");
  const item = (await replayList()).find(r => r.slug === slug);
  if (!item) return fail(`no replay called "${slug}"`);
  let rec;
  try { rec = await mod.loadReplay(item.file.includes("/") ? item.file : `recordings/${item.file}`); }
  catch (e) { return fail(e.message || String(e)); }
  if (store.get().matchKey !== key) return;
  const r = mod.createReplay(rec, { speed: settings.speed, nowMs: Date.now() });
  replay = { r, key, title: item.title || rec.title || slug, playing: true, onUpdate: m => { applyMatch(m, key); updateReplayProgress(); } };
  replay.iv = setInterval(updateReplayProgress, 1000);
  lsSet(LAST_KEY, `#/${key}`);
  setConn(true);
  applyMatch(r.current(), key);
  r.start(replay.onUpdate);
  renderReplayBar();
}

// ---- glossary ----
async function routeGlossary(q) {
  show("glossary");
  if (q != null) $("#glossary-q").value = q;
  try { await loadGlossary(); } catch { $("#glossary-list").innerHTML = `<p class="tl-err">Glossary could not load.</p>`; return; }
  renderGlossaryList();
}
function renderGlossaryList() {
  const list = $("#glossary-list");
  list.innerHTML = renderGlossary({ query: $("#glossary-q").value });
  list.querySelector(".tl-gl-search")?.remove(); // the shell's #glossary-q is the search box
}
$("#glossary-q").addEventListener("input", () => { if (store.get().view === "glossary") renderGlossaryList(); });

// ---- coverage ----
function routeCoverage() {
  show("coverage");
  $("#view-coverage").innerHTML = renderCoverage();
}

// ---- settings ----
const opt = (value, label, sel) => `<option value="${esc(value)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
function syncSettingsForm() {
  $("#opt-notify").checked = settings.notify;
  $("#opt-speed").value = String(settings.speed);
  $("#opt-followed-only").checked = settings.alertFollowedOnly;
  const tz = getTimeZone() || "";
  $("#opt-tz").innerHTML = tzOptions().map(o => opt(o.value || "", o.value ? o.label : `${o.label} (${tzLabel()})`, (o.value || "") === tz)).join("");
  const c = country();
  $("#opt-country").innerHTML = countryOptions().map(o => opt(o.value, o.label, o.value === c)).join("");
}
$("#opt-followed-only").addEventListener("change", e => { settings = saveSettings({ alertFollowedOnly: e.target.checked }); });
$("#opt-tz").addEventListener("change", e => { setTimeZone(e.target.value || null); syncSettingsForm(); });
$("#opt-country").addEventListener("change", e => { settings = saveSettings({ country: e.target.value }); });
$("#opt-notify").addEventListener("change", async e => {
  const on = e.target.checked;
  if (on) await requestPermission(); // in-app toasts still work if this is denied
  settings = saveSettings({ notify: on });
});
$("#opt-speed").addEventListener("change", e => {
  settings = saveSettings({ speed: Number(e.target.value) });
  if (replay) { replay.r.setSpeed(settings.speed); renderReplayBar(); }
});
$("#tl-settings-btn").addEventListener("click", () => { location.hash = "#/settings"; });

// ---- install prompt ----
let deferredInstall = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; $("#tl-install").classList.remove("tl-hidden"); });
$("#tl-install").addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  try { await deferredInstall.userChoice; } catch { /* ignore */ }
  deferredInstall = null;
  $("#tl-install").classList.add("tl-hidden");
});
addEventListener("appinstalled", () => $("#tl-install").classList.add("tl-hidden"));

// ---- router ----
function route() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  stopPolling();
  stopReplay();
  document.title = "TryLine";
  const [head, a, b] = parts;
  if (head === "match" && a && b) return routeLiveMatch(a, a === "wr" ? b.replace(/^wr:/, "") : b);
  if (head === "match") {
    const last = lsGet(LAST_KEY);
    if (last) { location.replace(last); return; }
    store.set({ match: null, matchKey: null, matchErr: null });
    show("match");
    return rerenderMatch();
  }
  if (head === "replay" && a) return routeReplay(a);
  if (head === "glossary") return routeGlossary(params.get("q"));
  if (head === "coverage") return routeCoverage();
  if (head === "settings") { syncSettingsForm(); return show("settings"); }
  show("fixtures");
  if (store.get().fixtures) renderFixturesView();
  startPolling(refreshFixtures, () => 60e3);
}
addEventListener("hashchange", route);
syncSettingsForm();
setTab("timeline");
route();
