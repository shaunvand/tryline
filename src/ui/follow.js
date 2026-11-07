// Follow UI: star toggle + chips of followed teams. Pure HTML-string renderers.
import { followKey } from "../follow.js";
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

// Star toggle. Handler: click on [data-follow] -> toggleFollow({name: el.dataset.name}).
export function renderFollowButton(team, followed) {
  const name = team?.name || team?.abbr || "", key = followKey(team), on = !!followed;
  return `<button type="button" class="tl-btn tl-follow${on ? " tl-on" : ""}" data-follow="${esc(key)}" data-name="${esc(name)}" aria-pressed="${on}" aria-label="${on ? "Unfollow" : "Follow"} ${esc(name)}">${on ? "★" : "☆"}</button>`;
}

// teamsSeen: team objects ({name, abbr}) or names, used to show proper names for followed keys.
// Handler: click on [data-unfollow] -> toggleFollow(el.dataset.unfollow) (a key is a valid team string).
export function renderFollowedChips(followedSet, teamsSeen = []) {
  const keys = [...(followedSet || [])];
  if (!keys.length) return "";
  const names = new Map();
  for (const t of teamsSeen || []) {
    const n = typeof t === "string" ? t : (t?.name || t?.abbr), k = followKey(n);
    if (k && !names.has(k)) names.set(k, n);
  }
  return `<div class="tl-chips tl-follow-chips" role="group" aria-label="Followed teams">` +
    keys.map(k => {
      const n = names.get(k) || k;
      return `<span class="tl-chip tl-follow-chip">★ ${esc(n)} <button type="button" class="tl-follow-x" data-unfollow="${esc(k)}" aria-label="Unfollow ${esc(n)}">×</button></span>`;
    }).join("") + `</div>`;
}
