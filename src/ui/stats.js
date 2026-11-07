// Team stats: head-to-head bars when the feed has them, else counts derived from events. Pure.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ZERO = () => ({ tries: 0, conversions: 0, penaltyGoals: 0, dropGoals: 0, yellow: 0, red: 0, subs: 0 });

/** Counts per side from match.events. penalty_try counts as a try. Subs = sub_on events. */
export function deriveCounts(match) {
  const out = { home: ZERO(), away: ZERO() };
  const homeId = match && match.home && String(match.home.id);
  for (const e of (match && match.events) || []) {
    if (e.teamId == null) continue;
    const c = String(e.teamId) === homeId ? out.home : out.away;
    switch (e.type) {
      case "try": case "penalty_try": c.tries++; break;
      case "conversion": c.conversions++; break;
      case "penalty_goal": c.penaltyGoals++; break;
      case "drop_goal": c.dropGoals++; break;
      case "yellow_card": c.yellow++; break;
      case "red_card": c.red++; break;
      case "sub_on": c.subs++; break;
    }
  }
  return out;
}

const DERIVED = [["tries", "Tries"], ["conversions", "Conversions"], ["penaltyGoals", "Penalty goals"], ["dropGoals", "Drop goals"],
  ["yellow", "Yellow cards"], ["red", "Red cards"], ["subs", "Substitutions"]];

// [key, label, isPercent]
const STAT_ROWS = [["possession", "Possession", 1], ["territory", "Territory", 1], ["possessionLast10", "Possession (last 10 min)", 1],
  ["territoryLast10", "Territory (last 10 min)", 1], ["tackles", "Tackles"], ["tackleSuccess", "Tackle success", 1], ["missedTackles", "Missed tackles"],
  ["carries", "Carries"], ["metres", "Metres"], ["defendersBeaten", "Defenders beaten"], ["cleanBreaks", "Clean breaks"], ["passes", "Passes"],
  ["offloads", "Offloads"], ["lineoutsWon", "Lineouts won"], ["scrumsWon", "Scrums won"], ["rucksWon", "Rucks won"],
  ["penaltiesConceded", "Penalties conceded"], ["turnoversWon", "Turnovers won"], ["kickSuccess", "Kick success", 1]];

const num = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));

function bar(label, hv, av, isPct, extra) {
  const h = num(hv), a = num(av);
  const tot = (h || 0) + (a || 0);
  const hw = tot > 0 ? ((h || 0) / tot) * 100 : 50;
  const fmt = (v, i) => `${v == null ? "-" : esc(v) + (isPct ? "%" : "")}${extra && extra[i] ? ` <small>${esc(extra[i])}</small>` : ""}`;
  return `<div class="tl-stat"><div class="tl-stat-nums"><span>${fmt(h, 0)}</span><span class="tl-stat-label">${esc(label)}</span><span>${fmt(a, 1)}</span></div>
  <div class="tl-stat-bar"><span class="tl-stat-h" style="width:${hw.toFixed(1)}%"></span><span class="tl-stat-a" style="width:${(100 - hw).toFixed(1)}%"></span></div></div>`;
}

function topPlayers(tp, match) {
  if (!tp) return "";
  let html = "";
  for (const [side, team] of [["home", match.home], ["away", match.away]]) {
    const data = tp[side];
    if (!data || typeof data !== "object") continue;
    const cats = Array.isArray(data) ? [["Top players", data]] : Object.entries(data);
    for (const [cat, list] of cats) {
      if (!Array.isArray(list) || !list.length) continue;
      html += `<div class="tl-top"><h4 class="tl-top-title tl-c-${side}">${esc(team && team.abbr)} &middot; ${esc(cat)}</h4><table class="tl-top-table"><tbody>` +
        list.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.value ?? p.count ?? "")}</td></tr>`).join("") + `</tbody></table></div>`;
    }
  }
  return html ? `<h3 class="tl-group">Top players</h3>${html}` : "";
}

const head = (m) => `<div class="tl-stats-head"><b class="tl-c-home">${esc(m.home.abbr)}</b><b class="tl-c-away">${esc(m.away.abbr)}</b></div>`;

export function renderStats({ match, derived } = {}) {
  if (!match) return `<div class="tl-empty">No match</div>`;
  const st = match.stats;
  if (!st) {
    const d = derived || deriveCounts(match);
    const rows = DERIVED.map(([k, l]) => bar(l, d.home[k], d.away[k], false)).join("");
    return `<div class="tl-stats">${head(match)}<h3 class="tl-group">Counted from the event feed (may miss events)</h3>${rows}
  <p class="tl-note">Possession and territory are not in the free feed for this competition</p></div>`;
  }
  const H = st.home || {}, A = st.away || {};
  const rows = [];
  for (const [k, l, p] of STAT_ROWS) {
    if (num(H[k]) == null && num(A[k]) == null) continue;
    if (k === "lineoutsWon") {
      const t = (s) => (num(s.lineoutsTotal) != null ? "/" + s.lineoutsTotal : "");
      rows.push(bar(l, H[k], A[k], false, [t(H), t(A)]));
    } else if (k === "tackles") {
      const t = (s) => (num(s.tackleSuccess) != null ? s.tackleSuccess + "%" : "");
      rows.push(bar(l, H[k], A[k], false, [t(H), t(A)]));
    } else if (k === "tackleSuccess" && num(H.tackles) != null) continue; // shown beside tackles
    else rows.push(bar(l, H[k], A[k], !!p));
  }
  const body = rows.join("") || `<div class="tl-empty">No stats yet</div>`;
  return `<div class="tl-stats">${head(match)}${body}${topPlayers(st.topPlayers, match)}</div>`;
}
