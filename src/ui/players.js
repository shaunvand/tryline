// Player stats view: top performers + per-team lists. Pure HTML string.
import { topPerformers, playerRating } from "../model/rating.js";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const v = (x) => (x == null ? "-" : esc(x));
const FWD = /prop|hook|lock|row|flanker|number 8|^(lo|pr|hk|fl|n8|sr|bf|of)$/i;
const isFwd = (p) => (p.number != null ? p.number <= 8 : FWD.test(p.position || ""));

function keyStats(p) {
  const l = isFwd(p) ? [["TK", p.tackles], ["C", p.carries], ["LO", p.lineoutsWon]] : [["M", p.metres], ["DB", p.defendersBeaten], ["C", p.carries]];
  return l.map(([k, x]) => `<span class="tl-chip">${k} ${v(x)}</span>`).join(" ");
}
const abbr = (match, side) => esc(match?.[side]?.abbr || match?.[side]?.name || side);

function teamList(match, side, list) {
  const rows = list.map((p) => `<tr><td>${v(p.number)}</td><td>${esc(p.name)}</td><td>${esc(p.position)}</td><td>${v(p.tries)}</td><td>${v(p.carries)}</td><td>${v(p.metres)}</td><td>${v(p.defendersBeaten)}</td><td>${v(p.tackles)}</td><td>${v(p.missedTackles)}</td><td>${v(p.turnoversWon)}</td><td>${playerRating(p)}</td></tr>`).join("");
  return `<details class="tl-card tl-pl-team"><summary>${esc(match?.[side]?.name || abbr(match, side))} (${list.length})</summary>
<div style="overflow-x:auto"><table class="tl-pl-table"><thead><tr><th>#</th><th>Player</th><th>Pos</th><th>T</th><th>C</th><th>M</th><th>DB</th><th>TK</th><th>MT</th><th>TO</th><th>Rtg</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

/** renderPlayers({match, nowSec}) -> HTML string. Reads match.stats.players. */
export function renderPlayers({ match, nowSec } = {}) {
  const pl = match?.stats?.players;
  if (!pl || !((pl.home || []).length || (pl.away || []).length)) {
    return `<div class="tl-card tl-pl-empty"><p class="tl-muted">Player stats are not in the free feed for this competition (available for internationals and Top 14).</p></div>`;
  }
  const top = topPerformers(pl, 5).map((p) => `<li class="tl-pl-row"><span class="tl-chip tl-pl-rating">${p.rating.toFixed(1)}</span> <strong>${esc(p.name)}</strong> <span class="tl-muted">${abbr(match, p.side)} ${p.number != null ? "#" + esc(p.number) : ""} ${esc(p.position)}</span> ${keyStats(p)}</li>`).join("");
  return `<section class="tl-players"><div class="tl-card"><h3>Top performers</h3><ol class="tl-pl-top" style="list-style:none;padding:0;margin:0">${top}</ol></div>
${teamList(match, "home", pl.home || [])}${teamList(match, "away", pl.away || [])}
<p class="tl-muted tl-pl-foot">Ratings are TryLine's own formula from World Rugby stats, not official fantasy points</p></section>`;
}
