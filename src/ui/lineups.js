// Lineups: starters 1-15 then bench 16-23, per side. Pure: returns HTML string.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function player(p) {
  const off = p.onPitch === false;
  const cap = p.captain ? ` <span class="tl-cap" title="Captain">C</span>` : "";
  return `<li class="tl-pl${off ? " tl-pl-off" : ""}"><span class="tl-pl-num">${esc(p.number ?? "")}</span>
  <span class="tl-pl-name">${esc(p.name)}${cap}</span><span class="tl-pl-pos">${esc(p.position || "")}</span>${off ? `<span class="tl-off-tag">off</span>` : ""}</li>`;
}

function column(team, side, list) {
  const num = (p) => Number(p.number) || 99;
  const sorted = list.slice().sort((a, b) => num(a) - num(b));
  const isStarter = (p) => (p.starter != null ? !!p.starter : num(p) <= 15);
  const starters = sorted.filter(isStarter), bench = sorted.filter((p) => !isStarter(p));
  return `<div class="tl-lu-col tl-lu-${side}"><h3 class="tl-lu-title tl-c-${side}">${esc((team && team.name) || side)}</h3>
  <ul class="tl-pl-list">${starters.map(player).join("")}</ul>
  ${bench.length ? `<h4 class="tl-lu-bench">Bench</h4><ul class="tl-pl-list">${bench.map(player).join("")}</ul>` : ""}</div>`;
}

export function renderLineups({ match } = {}) {
  const lu = (match && match.lineups) || {};
  const h = lu.home || [], a = lu.away || [];
  if (!h.length && !a.length) return `<div class="tl-empty">Lineups not published yet</div>`;
  return `<div class="tl-lineups">${column(match.home, "home", h)}${column(match.away, "away", a)}</div>`;
}
