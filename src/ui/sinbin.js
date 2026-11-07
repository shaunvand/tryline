// Sin-bin strip. Pure: returns HTML string, "" when no active cards.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/** renderSinBin({match, cards: activeCards(match), counts: playerCounts(match)}) */
export function renderSinBin({ match, cards, counts } = {}) {
  if (!cards || !cards.length) return "";
  const c = counts || { home: 15, away: 15 };
  const chips = `<span class="tl-chip tl-sb-count" title="Players on the pitch">&#11035; ${esc(c.home)} v ${esc(c.away)}</span>`;
  const pills = cards.map((k) => {
    const icon = k.type === "red_card" ? "&#128997;" : "&#129000;";
    const side = k.side || "";
    const time = k.remainingSec == null
      ? "off for the match"
      : `${mmss(k.remainingSec)} left &middot; returns at ${Math.ceil(k.endSec / 60)}'`;
    return `<span class="tl-chip tl-sb-pill tl-sb-${esc(side)}" data-card-id="${esc(k.eventId)}">${icon} <b class="tl-c-${esc(side)}">${esc(k.abbr)}</b> ${esc(k.player)} ${time}</span>`;
  }).join("");
  const label = `${match?.home?.abbr || "Home"} v ${match?.away?.abbr || "Away"} players on pitch`;
  return `<div class="tl-sinbin" role="status" aria-label="${esc(label)}" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${chips}${pills}</div>`;
}
