// TryLine bootstrap: hash router, polling, rendering, alerts. Plain ES module, relative URLs only.
import { createStore } from "./store.js";
import { loadSettings, saveSettings, toggleLeague } from "./settings.js";
import { loadFixtures, loadMatch } from "./adapters/index.js";
import { displayStats } from "./linker.js";
import { DEFAULT_LEAGUE_IDS } from "./leagues.js";
import { renderFixtures } from "./ui/fixtures.js";
import { diffEvents, formatAlert, showToast, notify, requestPermission } from "./ui/alerts.js";
import { getTimeZone, setTimeZone, tzLabel, tzOptions } from "./time.js";
import { loadFollowed, toggleFollow, isFollowed, matchInvolvesFollowed } from "./follow.js";
import { renderFollowButton, renderFollowedChips } from "./ui/follow.js";
import { setBroadcastData, renderWatch, renderForm, countryOptions, detectCountry } from "./ui/watch.js";
import { platform, renderInstallHint, shouldShowHint, dismissHint, recordVisit } from "./ui/install.js";

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
// run non-critical work after first paint, when the main thread is idle (TBT on slow phones)
const idle = (fn, timeout = 2500) => (globalThis.requestIdleCallback ? requestIdleCallback(() => fn(), { timeout }) : setTimeout(fn, 200));
// static JSON (no JSON modules without a build): ratings, broadcast + coverage tables
const getJson = path => fetch(new URL(path, document.baseURI)).then(r => (r.ok ? r.json() : null)).catch(() => null);
let matchDataP = null;
function loadMatchData() { // ratings (win prob) + where-to-watch: needed only once a match is shown
  return (matchDataP ||= Promise.all([
    fetch(new URL("./model/ratings.json", import.meta.url)).then(r => (r.ok ? r.json() : null)).then(r => { ratings = r; }).catch(() => {}),
    getJson("data/broadcast.json").then(setBroadcastData),
  ]).then(() => rerenderMatch()));
}
// lazy UI modules: fetched on first use with dynamic import(), never on the fixtures critical path
const lazy = {};
function lazyMod(name, load) {
  if (!lazy[name]) lazy[name] = { p: load().then(m => (lazy[name].m = m)).catch(e => { delete lazy[name]; throw e; }) };
  return lazy[name].p;
}
const coverageMod = () => lazyMod("coverage", async () => {
  const [m, j] = await Promise.all([import("./ui/coverage.js"), getJson("data/coverage.json")]);
  m.setCoverageData(j);
  return m;
});
const playersMod = () => lazyMod("players", () => import("./ui/players.js"));
// match-screen renderers + models: not needed to paint fixtures, so they stay off the boot path
const matchUi = () => lazyMod("match", async () => {
  const ms = await Promise.all([import("./model/winprob.js"), import("./model/pitch.js"), import("./ui/header.js"), import("./ui/timeline.js"),
    import("./ui/lineups.js"), import("./ui/stats.js"), import("./ui/pitch.js"), import("./model/sinbin.js"), import("./model/explain.js"),
    import("./ui/sinbin.js"), import("./ui/explain.js")]);
  return Object.assign({}, ...ms);
});
const glossaryMod = () => lazyMod("glossary", () => import("./ui/glossary.js"));
// full-time analysis (model + renderer), loaded only when a match reaches full time
const postMatchMod = () => lazyMod("postmatch", async () => Object.assign({}, ...(await Promise.all([import("./model/postmatch.js"), import("./ui/postmatch.js")]))));
const loaded = name => lazy[name]?.m || null;
const country = () => settings.country || detectCountry();

// ---- offline cache of the last good fixtures/match (an offline reload still shows scores) ----
const FX_CACHE = "tl.lastFixtures", MATCH_CACHE = "tl.lastMatchData";
const lsJson = k => { try { return JSON.parse(lsGet(k) || "null"); } catch { return null; } };
const isOffline = () => navigator.onLine === false;

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
const listOf = m => { try { return m ? (m.listReplays ? m.listReplays() : m.REPLAYS || []) : []; } catch { return []; } };
async function replayList() { return listOf(await replayModule()); }

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
addEventListener("online", () => { setConn(true); if (poll) poll.tick(); });
addEventListener("offline", () => {
  setConn(false);
  const v = store.get().view;
  if (v === "fixtures") renderFixturesView();
  if (v === "match") rerenderMatch();
});

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
// battery: in the background stop polling, the replay clock, CSS animations and the SVG pitch pulse
function onVisibility() {
  const hidden = document.hidden;
  document.body.classList.toggle("tl-bg", hidden);
  document.querySelectorAll("svg").forEach(svg => { try { if (hidden) svg.pauseAnimations(); else svg.unpauseAnimations(); } catch { /* ignore */ } });
  if (replay) {
    if (hidden && replay.playing) { try { replay.r.stop(); } catch { /* ignore */ } clearInterval(replay.iv); replay.iv = null; replay.resume = true; }
    else if (!hidden && replay.resume) { replay.resume = false; replay.r.start(replay.onUpdate); replay.iv = setInterval(updateReplayProgress, 1000); }
  }
  if (!hidden && poll) poll.tick();
}
document.addEventListener("visibilitychange", onVisibility);

// ---- views ----
const VIEWS = ["fixtures", "match", "glossary", "settings", "coverage"];
function show(view) {
  for (const v of VIEWS) $(`#view-${v}`)?.classList.toggle("tl-hidden", v !== view);
  document.querySelectorAll("#tl-nav a").forEach(a => {
    const on = a.dataset.nav === view;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  store.set({ view });
}

// ---- fixtures ----
// 4G: today + tomorrow first (paints sooner), the full week once the main thread is idle
let fullWeek = false, fullWeekQueued = false;
async function refreshFixtures() {
  const leagueIds = [...new Set([...DEFAULT_LEAGUE_IDS, ...settings.leagues])];
  const { fixtures, espnOk, wrOk } = await loadFixtures({ leagueIds, days: fullWeek ? 7 : 2 });
  const down = !espnOk && !wrOk;
  // an outage must not look like "no matches": keep the last good list and say so
  if (down) store.set({ fixturesDown: Date.now(), fixtures: store.get().fixtures || null });
  else {
    store.set({ fixtures, fixturesAt: Date.now(), fixturesDown: 0 });
    if (fullWeek) idle(() => lsSet(FX_CACHE, JSON.stringify({ at: store.get().fixturesAt, fixtures })));
  }
  await renderFixturesView();
  if (down) throw new Error("No fixture source answered");
  if (!fullWeek && !fullWeekQueued) {
    fullWeekQueued = true;
    idle(async () => {
      fullWeek = true;
      await replayModule();
      if (store.get().view === "fixtures") await refreshFixtures().catch(() => {});
      setTimeout(() => idle(() => matchUi().catch(() => {})), 8000); // warm the match screen so a tap opens it at once
    });
  }
}
const OFFLINE_TXT = "You\u2019re offline \u2014 last scores shown";
function offlineBanner(at) {
  return `<p class="tl-card tl-offline tl-banner" role="status">${OFFLINE_TXT}${at ? ` (from ${esc(hhmmss(at))})` : ""}.</p>`;
}
function installHint() {
  const p = platform();
  if (p === "standalone" || installed || !shouldShowHint()) return "";
  return renderInstallHint(p, !!deferredInstall);
}
function renderFixturesView() {
  const st = store.get();
  const banner = isOffline() ? offlineBanner(st.fixtures && st.fixturesAt)
    : st.fixturesDown
      ? `<p class="tl-card tl-err tl-banner" role="alert">Could not reach ESPN or World Rugby${st.fixtures ? `, showing data from ${esc(hhmmss(st.fixturesAt))}` : ""}. Retrying automatically.</p>` : "";
  if (st.view !== "fixtures") return;
  if (!st.fixtures) { if (banner) $("#view-fixtures").innerHTML = banner; return; }
  // the replay list needs adapters/replay.js: never wait for it; load it when idle, then re-render
  const replays = replayMod !== undefined ? listOf(replayMod) : [];
  if (replayMod === undefined && fullWeek) replayModule().then(m => { if (m && store.get().view === "fixtures") renderFixturesView(); });
  const followed = loadFollowed();
  const teamsSeen = st.fixtures.flatMap(f => [f.home, f.away]).filter(Boolean);
  const html = banner + installHint() + renderFollowedChips(followed, teamsSeen) +
    renderFixtures({ fixtures: st.fixtures, selectedLeagueIds: settings.leagues, nowMs: Date.now(), replays, followed }) +
    `<p class="tl-src">Times in ${esc(tzLabel())} · updated ${esc(hhmmss(st.fixturesAt))} · ESPN + World Rugby public feeds</p>`;
  paintFixtures(html);
}
// The first two paints of the list (today+tomorrow, then the full week) go in one section per frame: the cold
// text layout of the whole list in one task blocks the main thread for 100+ ms on a mid-range phone.
// Later 60 s refreshes swap the HTML in one go (no scroll jump).
let fxPaints = 0;
function paintFixtures(html) {
  const view = $("#view-fixtures");
  if (fxPaints >= 2) { view.innerHTML = html; return; }
  fxPaints++;
  const t = document.createElement("template");
  t.innerHTML = html;
  const wrap = t.content.querySelector(".tl-fixtures");
  const rest = wrap ? [...wrap.children].slice(2) : [];
  rest.forEach(n => n.remove());
  view.replaceChildren(t.content);
  const step = () => {
    if (!wrap.isConnected || !rest.length) return;
    wrap.append(rest.shift());
    if (rest.length) requestAnimationFrame(step);
  };
  if (rest.length) requestAnimationFrame(step);
}
$("#view-fixtures").addEventListener("click", e => {
  if (e.target.closest("[data-install-dismiss]")) { dismissHint(); e.target.closest(".tl-install-hint")?.remove(); return; }
  if (e.target.closest("[data-install-btn]")) { runInstall(); return; }
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
  // a match restored from the offline cache counts as a first load: no alert burst for events missed meanwhile
  if (!prev || st.matchFromCache) (m.events || []).forEach(e => remember(e, m));
  else {
    for (const e of diffEvents(prev.events, m.events)) if (!seen(e, m)) { remember(e, m); fireAlert(e, m); }
    if (prev.status?.state === "in" && m.status?.state === "post") fireAlert({ type: "full_time", id: "ft" }, m);
  }
  store.set({ match: m, matchErr: null, matchOkAt: Date.now(), matchFromCache: false });
  if (!key.startsWith("replay/")) saveMatchSoon(key, m);
  rerenderMatch();
}
let saveTimer = 0;
function saveMatchSoon(key, m) { // throttled: at most one localStorage write per poll, off the render path
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => lsSet(MATCH_CACHE, JSON.stringify({ key, at: Date.now(), match: m })), 1500);
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
    renderPostMatchSection(null);
    return;
  }
  if (!m) {
    $("#match-explainer").innerHTML = "";
    renderPostMatchSection(null);
    head.classList.toggle("tl-skeleton", !matchErr);
    head.innerHTML = matchErr
      ? `<p class="tl-err">Could not load this match: ${esc(matchErr)}</p><p class="tl-src">Retrying automatically. <a href="#/">Back to fixtures</a></p>`
      : "Loading match…";
    return;
  }
  if (!matchDataP) idle(loadMatchData, 800);
  if (!loaded("coverage")) coverageMod().then(rerenderMatch, () => {});
  const U = loaded("match");
  if (!U) {
    matchUi().then(rerenderMatch, () => { head.innerHTML = `<p class="tl-err">Could not load the match screen.</p>`; });
    head.classList.add("tl-skeleton");
    head.textContent = "Loading match…";
    return;
  }
  const { live, estimateZone, momentum, renderHeader, renderTimeline, renderLineups, renderStats, deriveCounts, renderPitch,
    activeCards, playerCounts, latestExplainer, renderSinBin, renderExplainer } = U;
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
  const offline = !isReplay && isOffline();
  head.innerHTML = (offline ? `<p class="tl-card tl-offline tl-stale-msg" role="status">${OFFLINE_TXT}${okAt ? ` (from ${esc(hhmmss(okAt))})` : ""}.</p>` : "") +
    renderHeader({ match: m, prob }) +
    `<div class="tl-follow-row">${renderFollowButton(m.home, isFollowed(m.home, followed))}<span class="tl-muted tl-follow-cap">Follow</span>${renderFollowButton(m.away, isFollowed(m.away, followed))}</div>` +
    (cards.length ? renderSinBin({ match: m, cards, counts: playerCounts(m) }) +
      (m.status?.clockSource === "estimated" ? `<p class="tl-src">Sin-bin times use the estimated clock</p>` : "") : "") +
    renderWatch({ leagueId, country: country() }) +
    renderForm({ match: m }) +
    (!offline && stale ? `<p class="tl-err tl-stale-msg" role="status">Data stale since ${esc(hhmmss(okAt))} · retrying</p>` : "") +
    (src.degraded?.length ? `<p class="tl-err tl-stale-msg">Feed degraded, showing last ${esc(src.degraded.join(", "))}</p>` : "") +
    `<p class="tl-src">${esc(SRC[src.name] || src.name || "")}${src.fetchedAt && !isReplay ? " · updated " + esc(hhmmss(Date.parse(src.fetchedAt))) : ""}` +
    `${src.note ? " · " + esc(src.note) : ""}</p>` +
    (loaded("coverage") ? loaded("coverage").renderCoverageNote(leagueId) : "");
  renderPostMatchSection(m);
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
  if (tab === "stats") {
    const pm = loaded("players");
    if (!pm) playersMod().then(rerenderMatch, () => {});
    // keep the open/closed state of the per-team <details> across re-renders
    const open = [...document.querySelectorAll("#tab-stats details.tl-pl-team")].map(d => d.open);
    $("#tab-stats").innerHTML = renderStats({ match: { ...m, stats: displayStats(m.stats) }, derived: deriveCounts(m) }) +
      `<h3 class="tl-pl-head" id="players">Players</h3>` + (pm ? pm.renderPlayers({ match: m, nowSec: m.status?.clockSec }) : `<p class="tl-muted">Loading players…</p>`);
    document.querySelectorAll("#tab-stats details.tl-pl-team").forEach((d, i) => { if (open[i]) d.open = true; });
  }
  if (tab === "lineups") $("#tab-lineups").innerHTML = renderLineups({ match: m });
  if (document.hidden) document.querySelectorAll("#tab-pitch svg").forEach(svg => { try { svg.pauseAnimations(); } catch { /* ignore */ } });
  const H = m.home.abbr || m.home.name, A = m.away.abbr || m.away.name;
  // screen readers hear the score only when it changes (the header itself is rebuilt every tick)
  const said = `${m.home.name || H} ${m.home.score ?? 0}, ${m.away.name || A} ${m.away.score ?? 0}`;
  const lr = $("#tl-score-live");
  if (lr && m.status?.state !== "pre" && lr.dataset.said !== said) { lr.dataset.said = said; lr.textContent = said; }
  document.title = m.status?.state === "pre" ? `${H} v ${A} · TryLine`
    : `${H} ${m.home.score ?? 0}-${m.away.score ?? 0} ${A}${m.status?.clockLabel ? " " + m.status.clockLabel : ""} · TryLine`;
}

// ---- full-time analysis: shown above the live widgets once status.state is "post" (live and replay) ----
let pmHtml = "", pmFixturesTried = null;
function renderPostMatchSection(m) {
  let el = $("#match-postmatch");
  if (!el) { el = document.createElement("div"); el.id = "match-postmatch"; $("#view-match").insertBefore(el, $("#tl-replaybar").nextSibling); }
  let html = "";
  if (m && m.status?.state === "post") {
    const P = loaded("postmatch");
    if (!P) { postMatchMod().then(rerenderMatch, () => {}); return; }
    const st = store.get();
    if (!st.fixtures && pmFixturesTried !== st.matchKey) { // "What's next" needs fixtures: fetch once if none are loaded
      pmFixturesTried = st.matchKey;
      loadFixtures({ leagueIds: [...new Set([...DEFAULT_LEAGUE_IDS, ...settings.leagues])], days: 7 })
        .then(r => { if (!store.get().fixtures && (r.espnOk || r.wrOk)) { store.set({ fixtures: r.fixtures, fixturesAt: Date.now() }); rerenderMatch(); } })
        .catch(() => {});
    }
    try {
      const pm = P.buildPostMatch(m, { ratings, fixtures: st.fixtures, nowMs: Date.now() });
      html = P.renderPostMatch({ pm, match: m, open: el.querySelector("details.tl-pm")?.open ?? true, followed: loadFollowed(), country: country() });
    } catch (e) { console.warn("postmatch", e); }
  }
  if (html !== pmHtml) { pmHtml = html; el.innerHTML = html; } // unchanged: keep the DOM (focus, share message)
}

function setTab(tab) {
  store.set({ tab });
  document.querySelectorAll("#match-tabs button").forEach(b => { b.classList.toggle("active", b.dataset.tab === tab); b.setAttribute("aria-pressed", String(b.dataset.tab === tab)); if (b.dataset.tab === tab) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
  for (const t of ["timeline", "pitch", "stats", "lineups"]) $(`#tab-${t}`).classList.toggle("tl-hidden", t !== tab);
  rerenderMatch();
}
$("#match-tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) setTab(b.dataset.tab); });
// header/explainer HTML is rebuilt on every update, so delegate from the view
$("#view-match").addEventListener("click", e => {
  const f = e.target.closest("button[data-follow]");
  if (f) { toggleFollow({ name: f.dataset.name }); rerenderMatch(); return; }
  const sh = e.target.closest("[data-pm-share]");
  if (sh) { loaded("postmatch")?.sharePostMatch(sh); return; }
  const x = e.target.closest("[data-dismiss-explainer]");
  if (x) { dismissExplainer(x.dataset.dismissExplainer); $("#match-explainer").innerHTML = ""; }
});

function openMatch(key) {
  alerted = [];
  matchUi().catch(() => {});
  // last good copy of this match (offline reload); its events count as already announced
  const c = key.startsWith("replay/") ? null : lsJson(MATCH_CACHE);
  const m = c && c.key === key && c.match ? c.match : null;
  if (m) (m.events || []).forEach(e => remember(e, m));
  $("#tl-score-live").dataset.said = "";
  store.set({ match: m, matchKey: key, matchErr: null, matchOkAt: m ? c.at : 0, matchFromCache: !!m });
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
  try { await (await glossaryMod()).loadGlossary(); } catch { $("#glossary-list").innerHTML = `<p class="tl-err">Glossary could not load.</p>`; return; }
  renderGlossaryList();
}
function renderGlossaryList() {
  const g = loaded("glossary");
  if (!g) return;
  const list = $("#glossary-list");
  list.innerHTML = g.renderGlossary({ query: $("#glossary-q").value });
  list.querySelector(".tl-gl-search")?.remove(); // the shell's #glossary-q is the search box
}
$("#glossary-q").addEventListener("input", () => { if (store.get().view === "glossary") renderGlossaryList(); });

// ---- coverage ----
async function routeCoverage() {
  show("coverage");
  let m;
  try { m = await coverageMod(); } catch { $("#view-coverage").innerHTML = `<div class="tl-card"><p class="tl-err">Coverage could not load.</p></div>`; return; }
  if (store.get().view === "coverage") $("#view-coverage").innerHTML = m.renderCoverage();
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

// ---- install prompt (Android/desktop: beforeinstallprompt; iOS Safari: Share -> Add to Home Screen hint) ----
let deferredInstall = null, installed = false;
function syncInstallUi() {
  const p = platform(), can = !!deferredInstall && !installed;
  $("#tl-install").classList.toggle("tl-hidden", !can);
  $("#opt-install").classList.toggle("tl-hidden", !can);
  $("#opt-install-txt").textContent = p === "standalone" || installed ? "TryLine is installed on this device."
    : p === "ios-safari" ? "In Safari, tap Share, then \u2018Add to Home Screen\u2019."
    : can ? "Add TryLine to your home screen for full-screen, one-tap access."
    : "Use your browser menu to install TryLine or add it to your home screen.";
  if (store.get().view === "fixtures" && store.get().fixtures) renderFixturesView();
}
async function runInstall() {
  if (!deferredInstall) return;
  const ev = deferredInstall;
  deferredInstall = null;
  ev.prompt();
  try { const c = await ev.userChoice; if (c && c.outcome === "accepted") installed = true; } catch { /* ignore */ }
  syncInstallUi();
}
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; syncInstallUi(); });
$("#tl-install").addEventListener("click", runInstall);
$("#opt-install").addEventListener("click", runInstall);
addEventListener("appinstalled", () => { installed = true; deferredInstall = null; syncInstallUi(); });

// external links leave in a new tab (keeps the standalone app open); in-app hash links stay in the app
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || a.target) return;
  let u;
  try { u = new URL(a.getAttribute("href"), location.href); } catch { return; }
  if (u.origin !== location.origin) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
});

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
recordVisit();
// last good fixtures from a previous visit: shown at once (and offline) until the network answers
{
  const c = lsJson(FX_CACHE);
  if (c && Array.isArray(c.fixtures)) store.set({ fixtures: c.fixtures, fixturesAt: c.at || 0 });
}
// yield once so the module-graph evaluation and the first route run as two short tasks, not one long one (TBT)
await new Promise(r => setTimeout(r, 0));
syncInstallUi();
setTab("timeline");
route();
