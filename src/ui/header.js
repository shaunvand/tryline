// Match header: crests, score, status chip, clock, win-probability bar. Pure: returns HTML string.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (p) => Math.round((Number(p) || 0) * 100);

function crest(t, side) {
  t = t || {};
  const color = /^#[0-9a-f]{3,8}$/i.test(t.color || "") ? t.color : `var(--${side})`;
  const inner = t.logo
    ? `<img class="tl-crest-img" src="${esc(t.logo)}" alt="${esc(t.name)}" loading="lazy">`
    : `<span class="tl-badge" style="background:${color}">${esc(t.abbr || (t.name || "?").slice(0, 3).toUpperCase())}</span>`;
  return `<div class="tl-team tl-team-${side}">${inner}<span class="tl-team-name">${esc(t.name)}</span></div>`;
}

export function kickoffLabel(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d)) return "Kick-off TBC";
  const f = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return "Kick-off " + f.format(d) + " SAST";
}

function chip(m) {
  const st = m.status || {};
  const label = String(st.label || "").toLowerCase();
  if (st.state === "post") return `<span class="tl-chip tl-chip-ft">FT</span>`;
  if (st.state === "in") {
    if (label.includes("half time")) return `<span class="tl-chip tl-chip-ht">HT</span>`;
    if (m.source?.name === "replay") return `<span class="tl-chip tl-chip-ht">REPLAY</span>`;
    return `<span class="tl-chip tl-chip-live"><i class="tl-live-dot"></i>LIVE</span>`;
  }
  return `<span class="tl-chip tl-chip-pre">${esc(kickoffLabel(m.kickoff))}</span>`;
}

function clock(m) {
  const st = m.status || {};
  if (st.state !== "in" || !st.clockLabel) return "";
  const tag = st.clockSource === "estimated"
    ? `<span class="tl-tag tl-tag-est" title="Estimated from wall clock">est.</span>`
    : `<span class="tl-tag tl-tag-feed" title="Clock from feed">feed &#10003;</span>`;
  return `<div class="tl-clock">${esc(st.clockLabel)} ${tag}</div>`;
}

function probBar(m, prob, projected) {
  if (m.status && m.status.state === "post") return ""; // result is final: no model numbers
  if (!prob) return `<div class="tl-prob tl-prob-empty">Win chance: loading <small>(model estimate)</small></div>`;
  const h = pct(prob.pHome), a = pct(prob.pAway), d = Math.max(0, 100 - h - a);
  const hw = h + d / 2; // draw share split so the bar always fills
  const proj = projected || prob.projected;
  const projLine = proj ? `<div class="tl-proj">Projected FT ${esc(proj.home)}-${esc(proj.away)} &middot; model estimate</div>` : "";
  const drawTxt = d >= 1 ? `<span class="tl-prob-draw">Draw ${d}%</span>` : "";
  return `<div class="tl-prob">
  <div class="tl-prob-cap">Win chance &middot; model estimate</div>
  <div class="tl-prob-bar" role="img" aria-label="Win probability ${esc(m.home.abbr)} ${h}%, ${esc(m.away.abbr)} ${a}%">
    <span class="tl-prob-home" style="width:${hw}%"></span><span class="tl-prob-away" style="width:${100 - hw}%"></span>
  </div>
  <div class="tl-prob-nums"><span>${esc(m.home.abbr)} ${h}%</span>${drawTxt}<span>${esc(m.away.abbr)} ${a}%</span></div>
  ${projLine}</div>`;
}

export function renderHeader({ match, prob = null, projected = null } = {}) {
  const m = match;
  if (!m) return `<div class="tl-header tl-empty">No match</div>`;
  const pre = m.status && m.status.state === "pre";
  const score = pre ? `<span class="tl-score-vs">vs</span>`
    : `<span class="tl-score-n">${esc(m.home.score ?? 0)}</span><span class="tl-score-sep">-</span><span class="tl-score-n">${esc(m.away.score ?? 0)}</span>`;
  return `<section class="tl-header">
  <div class="tl-header-top">${chip(m)}<span class="tl-league">${esc(m.league && m.league.name)}</span></div>
  <div class="tl-scoreline">${crest(m.home, "home")}<div class="tl-score"><div class="tl-score-row">${score}</div>${clock(m)}</div>${crest(m.away, "away")}</div>
  ${probBar(m, prob, projected)}
</section>`;
}
