// Fixture list renderer. Days are shown in Africa/Johannesburg (SAST).
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
const TZ = "Africa/Johannesburg";
const dayKey = ms => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

const kickMs = f => f.kickoffMs ?? (f.kickoff ? Date.parse(f.kickoff) : NaN);
export const formatSast = ms => Number.isNaN(ms) ? "TBC" : `${timeFmt.format(ms)} SAST`;

export function dayLabel(ms, nowMs) {
  if (Number.isNaN(ms)) return "Date TBC";
  const k = dayKey(ms);
  if (k === dayKey(nowMs)) return "Today";
  if (k === dayKey(nowMs + 864e5)) return "Tomorrow";
  return dateFmt.format(ms);
}

function team(t) {
  t = t || {};
  const logo = t.logo ? `<img class="tl-logo" src="${esc(t.logo)}" alt="" loading="lazy" width="20" height="20">` : "";
  return `${logo}<span class="tl-fx-abbr">${esc(t.abbr || t.name || "TBC")}</span>`;
}

function row(f, href) {
  const st = f.status?.state, ms = kickMs(f);
  const score = `<span class="tl-fx-score">${esc(f.home?.score ?? 0)} - ${esc(f.away?.score ?? 0)}</span>`;
  let right;
  if (st === "in") right = `<span class="tl-chip tl-chip-live">LIVE</span>${score}<span class="tl-fx-sub">${esc(f.status?.label || "")}</span>`;
  else if (st === "post") right = `${score}<span class="tl-fx-sub">FT</span>`;
  else right = `<span class="tl-fx-time">${esc(formatSast(ms))}</span>`;
  return `<a class="tl-fx-row${st === "in" ? " tl-live" : ""}" href="${esc(href)}" data-state="${esc(st || "pre")}">` +
    `<span class="tl-fx-teams"><span class="tl-fx-team">${team(f.home)}</span><span class="tl-fx-vs">v</span><span class="tl-fx-team">${team(f.away)}</span></span>` +
    `<span class="tl-fx-league">${esc(f.leagueName || "")}</span><span class="tl-fx-right">${right}</span></a>`;
}

function byDay(list, nowMs, asc) {
  const groups = new Map();
  for (const f of [...list].sort((a, b) => ((kickMs(a) || 0) - (kickMs(b) || 0)) * (asc ? 1 : -1))) {
    const ms = kickMs(f), k = Number.isNaN(ms) ? "tbc" : dayKey(ms);
    if (!groups.has(k)) groups.set(k, { label: dayLabel(ms, nowMs), items: [] });
    groups.get(k).items.push(f);
  }
  return [...groups.values()];
}

function group(title, cls, body, emptyText) {
  return `<section class="tl-fx-group ${cls}"><h2 class="tl-fx-h">${esc(title)}</h2>${body || `<p class="tl-empty">${esc(emptyText)}</p>`}</section>`;
}

export function renderFixtures({ fixtures = [], selectedLeagueIds = [], nowMs = Date.now(), replays = [] } = {}) {
  const sel = new Set((selectedLeagueIds || []).map(String));
  const leagues = new Map();
  for (const f of fixtures) if (f.leagueId != null && !leagues.has(String(f.leagueId))) leagues.set(String(f.leagueId), f.leagueName || String(f.leagueId));
  const chips = `<div class="tl-chips" role="group" aria-label="Leagues">` +
    [...leagues].map(([id, name]) => `<button type="button" class="tl-lchip${sel.has(id) ? " tl-on" : ""}" data-league="${esc(id)}" aria-pressed="${sel.has(id)}">${esc(name)}</button>`).join("") + `</div>`;
  const shown = fixtures.filter(f => !sel.size || sel.has(String(f.leagueId)));
  const href = f => f.href || `#/match/${encodeURIComponent(f.leagueId)}/${encodeURIComponent(f.id)}`;
  const rows = list => list.map(f => row(f, href(f))).join("");
  const dayBlocks = groups => groups.map(g => `<h3 class="tl-fx-day">${esc(g.label)}</h3>${rows(g.items)}`).join("");
  const live = shown.filter(f => f.status?.state === "in");
  const pre = shown.filter(f => !["in", "post"].includes(f.status?.state));
  const post = shown.filter(f => f.status?.state === "post");
  const rep = (replays || []).map(r => `<a class="tl-fx-row tl-replay" href="#/replay/${encodeURIComponent(r.slug)}"><span class="tl-fx-teams">${esc(r.title)}</span><span class="tl-fx-right"><span class="tl-chip">REPLAY</span></span></a>`).join("");
  return `<div class="tl-fixtures">${chips}` +
    group("Live now", "tl-fx-live", rows(live), "No live matches right now.") +
    group("Upcoming", "tl-fx-up", dayBlocks(byDay(pre, nowMs, true)), "No upcoming matches.") +
    group("Finished", "tl-fx-done", dayBlocks(byDay(post, nowMs, false)), "No finished matches.") +
    group("Demo / replay", "tl-fx-replay", rep, "No replays available.") + `</div>`;
}
