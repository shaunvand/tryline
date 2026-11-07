// Event timeline, newest first, grouped by half. Pure: returns HTML string.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const TARGET = `<svg class="tl-ico-svg" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>`;
const ICONS = {
  try: "&#127945;", penalty_try: "&#127945;", conversion: TARGET, penalty_goal: TARGET, drop_goal: TARGET,
  missed_kick: "&#10060;", yellow_card: "&#129000;", red_card: "&#128997;", sub_off: "&#128257;", sub_on: "&#128257;",
  kickoff: "&#9201;", half_time: "&#9208;", full_time: "&#127937;",
};
const SCORING = new Set(["try", "penalty_try", "conversion", "penalty_goal", "drop_goal"]);
const TITLES = { try: "Try", penalty_try: "Penalty try", conversion: "Conversion", penalty_goal: "Penalty goal", drop_goal: "Drop goal",
  missed_kick: "Missed kick", yellow_card: "Yellow card", red_card: "Red card", sub_off: "Off", sub_on: "On" };

const half = (p) => (p === 1 ? "1st half" : p === 2 ? "2nd half" : p === 3 ? "Extra time (1st)" : p === 4 ? "Extra time (2nd)" : "Match");

function row(e, match) {
  const team = [match.home, match.away].find((t) => t && String(t.id) === String(e.teamId));
  const abbr = team ? team.abbr : "";
  const side = team ? (team === match.home ? "home" : "away") : "";
  const names = (e.players || []).map((p) => esc(p.name)).join(", ");
  const score = SCORING.has(e.type) && e.homeScore != null && e.awayScore != null ? `<span class="tl-ev-score">${esc(e.homeScore)}-${esc(e.awayScore)}</span>` : "";
  const body = names || esc(e.text || "");
  return `<li class="tl-ev tl-ev-${esc(e.type)}">
  <span class="tl-ev-clock">${esc(e.clockLabel || "")}</span>
  <span class="tl-ev-ico">${ICONS[e.type] || "&bull;"}</span>
  <span class="tl-ev-main"><b class="tl-ev-team tl-c-${side}">${esc(abbr)}</b> <span class="tl-ev-type">${esc(TITLES[e.type] || "")}</span> <span class="tl-ev-players">${body}</span></span>
  ${score}</li>`;
}

export function renderTimeline({ match } = {}) {
  const evs = ((match && match.events) || []).filter((e) => e && (e.type !== "other" || e.text));
  if (!evs.length) return `<div class="tl-empty">No events yet</div>`;
  const sorted = evs.slice().sort((a, b) => (b.seq ?? 0) - (a.seq ?? 0) || (b.clockSec ?? 0) - (a.clockSec ?? 0));
  let out = "", cur = null, open = false;
  for (const e of sorted) {
    if (!open || e.period !== cur) {
      if (open) out += "</ul>";
      cur = e.period;
      out += `<h3 class="tl-group">${esc(half(cur))}</h3><ul class="tl-events">`;
      open = true;
    }
    out += row(e, match);
  }
  return `<div class="tl-timeline">${out}${open ? "</ul>" : ""}</div>`;
}
