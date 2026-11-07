// Coverage page: what the free feed gives per competition. Data from data/coverage.json:
// call setCoverageData(json) once (fetch in app.js) or pass { data } per call.
import { LEAGUES } from "../leagues.js";
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

let DATA = null;
export function setCoverageData(json) { DATA = json || null; }

const chips = (arr, cls) => arr.map(x => `<span class="tl-chip tl-cov-${cls}">${esc(x)}</span>`).join(" ");

export function renderCoverage({ data = DATA } = {}) {
  if (!data) return `<div class="tl-card"><p class="tl-muted">Coverage info unavailable</p></div>`;
  const rows = LEAGUES.filter(l => data.leagues?.[l.id]).map(l => {
    const c = data.leagues[l.id];
    return `<div class="tl-card tl-cov"><h3>${esc(l.name)}</h3>` +
      (c.live?.length ? `<p>Live: ${chips(c.live, "live")}</p>` : "") +
      (c.estimated?.length ? `<p>Estimated: ${chips(c.estimated, "est")}</p>` : "") +
      (c.missing?.length ? `<p>Not available: ${chips(c.missing, "miss")}</p>` : "") +
      (c.note ? `<p class="tl-muted">${esc(c.note)}</p>` : "") + `</div>`;
  });
  return `<section class="tl-coverage"><h2>Data coverage</h2><p class="tl-muted">${esc(data.note || "")}</p>${rows.join("")}</section>`;
}

export function renderCoverageNote(leagueId, { data = DATA } = {}) {
  const c = data?.leagues?.[String(leagueId)];
  if (!c) return "";
  let txt;
  if (!c.live?.length) txt = c.note || "Not available";
  else {
    txt = `Live: ${c.live.join(", ")}.`;
    if (c.estimated?.length) txt += ` Estimated: ${c.estimated.join(", ")}.`;
    if (c.missing?.length) txt += ` Missing: ${c.missing.join(", ")}.`;
  }
  return `<p class="tl-cov-note tl-muted">${esc(txt)} <a href="#/coverage">Coverage</a></p>`;
}
