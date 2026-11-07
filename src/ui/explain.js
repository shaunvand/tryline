// Dismissible "what just happened" card. Pure: returns HTML string.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** renderExplainer({ex, event, match}); dismiss via [data-dismiss-explainer] button, id in data-explainer-id. */
export function renderExplainer({ ex, event, match } = {}) {
  if (!ex || !event) return "";
  const team = [match?.home, match?.away].find((t) => t && String(t.id) === String(event.teamId));
  const id = String(event.id);
  const who = event.players?.[0]?.name;
  const side = team && team === match.home ? "home" : "away";
  return `<div class="tl-card tl-explainer" data-explainer-id="${esc(id)}" role="note">
  <div class="tl-explainer-head"><span class="tl-ev-clock">${esc(event.clockLabel || "")}</span> <b>${esc(ex.title)}</b>${team ? ` <span class="tl-c-${side}">${esc(team.abbr || team.name)}</span>` : ""}${who ? ` <span>${esc(who)}</span>` : ""}
    <button type="button" class="tl-btn tl-explainer-x" data-dismiss-explainer="${esc(id)}" aria-label="Dismiss">&times;</button></div>
  <p class="tl-explainer-meaning">${esc(ex.meaning)}</p>
  <p class="tl-explainer-outcome"><b>What happens next:</b> ${esc(ex.outcome)}</p>
  <a href="#/glossary?q=${encodeURIComponent(ex.term)}">Read the law</a>
</div>`;
}
