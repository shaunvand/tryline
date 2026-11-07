// Full-time analysis renderer. Pure HTML strings, except shareOrCopy/sharePostMatch (browser share/clipboard).
// Data comes from model/postmatch.js buildPostMatch(). Every block returns "" when its data is missing.
import { TIMELINE_ICONS, TIMELINE_TITLES } from "./timeline.js";
import { renderWatch } from "./watch.js";
import { renderFollowButton } from "./follow.js";
import { isFollowed } from "../follow.js";
import { fmtDay, fmtTime, tzLabel } from "../time.js";
import { pctText, minuteOf, describeEvent, teamName, teamAbbr } from "../model/postmatch.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
const block = (id, title, body, foot = "") =>
  `<section class="tl-pm-block" aria-labelledby="pm-${id}"><h3 class="tl-group" id="pm-${id}">${esc(title)}</h3>${body}${foot ? `<p class="tl-pm-foot">${foot}</p>` : ""}</section>`;

function resultBlock(pm, m) {
  if (!pm.final) return "";
  const H = teamName(m, "home"), A = teamName(m, "away");
  const bits = [];
  if (pm.ht) bits.push(`Half time ${esc(pm.ht.home)}-${esc(pm.ht.away)}`);
  if (pm.margin) bits.push(`${esc(pm.final.home > pm.final.away ? H : A)} won by ${esc(pm.margin)}`);
  else bits.push("Draw");
  const shape = pm.shape ? `<p class="tl-pm-shape">${esc(pm.shape.text)}</p>` : "";
  const gap = pm.shape && !pm.shape.complete
    ? `<p class="tl-pm-foot">The event feed is missing some scores, so half time and game shape may be off.</p>` : "";
  return `<section class="tl-pm-block tl-pm-result" aria-label="Result">
<p class="tl-pm-score"><span class="tl-c-home">${esc(H)}</span> <b>${esc(pm.final.home)}-${esc(pm.final.away)}</b> <span class="tl-c-away">${esc(A)}</span></p>
<p class="tl-muted tl-pm-sub">${bits.join(" &middot; ")}</p>${shape}${gap}</section>`;
}

// Chart: balance = (home win chance - away win chance + 1) / 2, so the top is a sure home win and the bottom a sure away win.
const W = 320, Hh = 132, PL = 4, PR = 4, PT = 16, PB = 18;
function chart(story, m) {
  const pts = story.points;
  const x = s => PL + (s / story.endSec) * (W - PL - PR);
  const y = p => PT + (1 - (p.pHome - p.pAway + 1) / 2) * (Hh - PT - PB);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.sec).toFixed(1)} ${y(p).toFixed(1)}`).join("");
  const mid = PT + (Hh - PT - PB) / 2, hx = x(2400).toFixed(1), bottom = Hh - PB;
  const mark = (i, cls) => (i == null || !pts[i] ? "" : `<circle class="${cls}" cx="${x(pts[i].sec).toFixed(1)}" cy="${y(pts[i]).toFixed(1)}" r="${cls === "tl-pm-turn" ? 6 : 4}"/>`);
  const hA = esc(teamAbbr(m, "home")), aA = esc(teamAbbr(m, "away"));
  const desc = `Line above the middle means ${hA} more likely to win, below means ${aA}. ` +
    (story.biggest ? `Yellow dot: biggest swing. ` : "") + (story.turning ? `Ring: turning point.` : "");
  return `<svg class="tl-pm-chart" viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-labelledby="pm-wp-t pm-wp-d">
<title id="pm-wp-t">Win chance over the match (TryLine model estimate)</title><desc id="pm-wp-d">${desc}</desc>
<rect x="${PL}" y="${PT}" width="${W - PL - PR}" height="${(Hh - PT - PB) / 2}" class="tl-pm-zone-h"/>
<rect x="${PL}" y="${mid}" width="${W - PL - PR}" height="${(Hh - PT - PB) / 2}" class="tl-pm-zone-a"/>
<line x1="${PL}" x2="${W - PR}" y1="${mid}" y2="${mid}" class="tl-pm-mid"/>
<line x1="${hx}" x2="${hx}" y1="${PT}" y2="${bottom}" class="tl-pm-ht"/>
<text x="${PL + 2}" y="${PT - 4}" class="tl-pm-lbl">${hA} win</text>
<text x="${PL + 2}" y="${Hh - 4}" class="tl-pm-lbl">${aA} win</text>
<text x="${hx}" y="${PT - 4}" class="tl-pm-lbl" text-anchor="middle">HT</text>
<text x="${W - PR}" y="${Hh - 4}" class="tl-pm-lbl" text-anchor="end">${Math.round(story.endSec / 60)}'</text>
<path d="${d}" class="tl-pm-line"/>
${mark(story.biggest?.pointIndex, "tl-pm-swing")}${mark(story.turning?.pointIndex, "tl-pm-turn")}
</svg>`;
}

function winProbBlock(pm, m) {
  const s = pm.story;
  if (!s || !s.points?.length) return "";
  const items = [];
  const b = s.biggest;
  if (b) {
    items.push(`<li><span class="tl-pm-key tl-pm-key-swing" aria-hidden="true"></span><b>Biggest swing</b> (${esc(minuteOf(b.event))}): ` +
      `${esc(describeEvent(b.event, m, b.eventSide))} moved ${esc(teamName(m, b.side))}'s win chance from ${esc(pctText(b.from))} to ${esc(pctText(b.to))}.</li>`);
  }
  const t = s.turning;
  if (t) {
    const win = esc(teamName(m, t.side));
    const what = t.event ? esc(describeEvent(t.event, m, t.swing?.eventSide)) : "";
    items.push(`<li><span class="tl-pm-key tl-pm-key-turn" aria-hidden="true"></span><b>Turning point</b> (${esc(t.byEvent && t.event ? minuteOf(t.event) : `${Math.floor(t.sec / 60)}'`)}): ` +
      (t.byEvent && what ? `${what} put ${win} ahead on the model for good (${esc(pctText(t.from))} to ${esc(pctText(t.to))}).`
        : `${win}'s win chance went above 50% for good as time ran down${what ? `, after ${what}` : ""}.`) + `</li>`);
  } else if (s.alwaysAhead && s.winner) {
    items.push(`<li><b>No turning point:</b> ${esc(teamName(m, s.winner))} were favourites on the model all match.</li>`);
  }
  return block("wp", "Win chance story", chart(s, m) + (items.length ? `<ul class="tl-pm-list">${items.join("")}</ul>` : ""),
    "TryLine model estimate, rebuilt from the score and cards at each moment. Not betting odds.");
}

function momentsBlock(pm, m) {
  if (!pm.moments?.length) return "";
  const rows = pm.moments.map(k => `<li class="tl-ev tl-ev-${esc(k.type)}"><span class="tl-ev-clock">${esc(k.minute)}</span>` +
    `<span class="tl-ev-ico">${TIMELINE_ICONS[k.type] || "&bull;"}</span>` +
    `<span class="tl-ev-main"><b class="tl-ev-team tl-c-${esc(k.side || "")}">${esc(k.abbr)}</b> <span class="tl-ev-type">${esc(TIMELINE_TITLES[k.type] || "")}</span> <span class="tl-ev-players">${esc(k.player)}</span></span>` +
    (k.score ? `<span class="tl-ev-score">${esc(k.score.home)}-${esc(k.score.away)}</span>` : "") + `</li>`).join("");
  return block("km", "Key moments", `<ul class="tl-events tl-pm-moments">${rows}</ul>`);
}

function sinBinBlock(pm, m) {
  if (!pm.sinbin?.length) return "";
  const est = m.status?.clockSource === "estimated" ? " The clock for this match is estimated, so spells are approximate." : "";
  return block("sb", "Sin-bin impact", `<ul class="tl-pm-list">${pm.sinbin.map(b => `<li>${esc(b.text)}${b.player ? ` <span class="tl-muted">(${esc(b.player)})</span>` : ""}</li>`).join("")}</ul>`,
    `Points scored while the team was a player short, from event times.${est}`);
}

function disciplineBlock(pm, m) {
  const d = pm.discipline;
  if (!d?.rows?.length) return "";
  const cell = (r, s) => (r.display[s] === null ? "-" : esc(r.display[s]) + (r.pct ? "%" : ""));
  const rows = d.rows.map(r => `<tr><td>${cell(r, "home")}</td><th scope="row">${esc(r.label)}</th><td>${cell(r, "away")}</td></tr>`).join("");
  return block("dp", "Discipline and set piece",
    `<table class="tl-pm-table"><thead><tr><th scope="col" class="tl-c-home">${esc(teamAbbr(m, "home"))}</th><th scope="col"><span class="tl-sr">Stat</span></th><th scope="col" class="tl-c-away">${esc(teamAbbr(m, "away"))}</th></tr></thead><tbody>${rows}</tbody></table>`,
    d.fromFeed ? "Cards counted from the event feed; the rest from the World Rugby feed." : "Counted from the event feed (may miss events). Set-piece numbers are not in the free feed for this match.");
}

function topBlock(pm, m) {
  const t = pm.top;
  if (!t || !(t.home.length || t.away.length)) return "";
  const col = side => !t[side].length ? "" : `<div><h4 class="tl-pm-h4 tl-c-${side}">${esc(teamName(m, side))}</h4><ol class="tl-pm-top">` +
    t[side].map(p => `<li><span class="tl-chip tl-pl-rating">${esc(p.rating.toFixed(1))}</span> <strong>${esc(p.name)}</strong> <span class="tl-muted">${esc(p.position || "")}</span></li>`).join("") + `</ol></div>`;
  return block("tp", "Top performers", `<div class="tl-pm-cols">${col("home")}${col("away")}</div>`,
    "TryLine rating (own formula) from World Rugby stats, not an official rating.");
}

function decidedBlock(pm) {
  if (!pm.decided?.length) return "";
  return block("wd", "What decided it", `<ul class="tl-pm-list tl-pm-decided">${pm.decided.map(r => `<li>${esc(r.text)}</li>`).join("")}</ul>`,
    "Written by fixed rules from the numbers on this screen (no AI). Win-chance figures are model estimates.");
}

function shareBlock(pm) {
  if (!pm.share) return "";
  return block("sh", "Share",
    `<p class="tl-pm-share-row"><button type="button" class="tl-btn" data-pm-share data-share-text="${esc(pm.share)}" aria-describedby="pm-share-msg">Share result</button>` +
    ` <span id="pm-share-msg" class="tl-muted" data-pm-share-msg role="status" aria-live="polite"></span></p>` +
    `<details class="tl-pm-preview"><summary>Preview text</summary><pre>${esc(pm.share)}</pre></details>`);
}

function nextBlock(pm, m, { followed, country, nowMs }) {
  const rows = ["home", "away"].map(side => {
    const team = m[side];
    if (!team?.name) return "";
    const n = pm.next?.[side];
    const on = isFollowed(team, followed);
    let fx = "";
    if (n) {
      const f = n.fixture, ms = n.kickoffMs;
      const href = f.href || `#/match/${encodeURIComponent(f.leagueId)}/${encodeURIComponent(f.id)}`;
      fx = `<p>Next: ${n.home ? "v" : "at"} <strong>${esc(n.opponent?.name || n.opponent?.abbr || "TBC")}</strong>, ` +
        `${esc(fmtDay(ms, nowMs))} ${esc(fmtTime(ms))} ${esc(tzLabel(ms))}${f.leagueName ? ` <span class="tl-muted">(${esc(f.leagueName)})</span>` : ""} <a href="${esc(href)}">Open</a></p>` +
        renderWatch({ leagueId: f.leagueId, country });
    }
    return `<div class="tl-pm-next"><h4 class="tl-pm-h4 tl-c-${side}">${esc(team.name)}</h4>${fx}` +
      `<p class="tl-pm-follow">${renderFollowButton(team, on)} <span>${on ? "Following" : "Follow"} ${esc(team.name)}</span></p></div>`;
  }).join("");
  const anyNext = pm.next && (pm.next.home || pm.next.away);
  const watch = anyNext ? "" : renderWatch({ leagueId: m.league?.id, country });
  return block("nx", "What's next", rows + watch, anyNext ? "" : "Next fixtures show here when they are in the next 7 days of fixtures.");
}

/** renderPostMatch({pm, match, open, followed, country, nowMs}) -> HTML string ("" unless pm is set). */
export function renderPostMatch({ pm, match, open = true, followed, country = "ZA", nowMs = Date.now() } = {}) {
  if (!pm || !match) return "";
  const body = [resultBlock(pm, match), winProbBlock(pm, match), momentsBlock(pm, match), sinBinBlock(pm, match),
    disciplineBlock(pm, match), topBlock(pm, match), decidedBlock(pm), shareBlock(pm), nextBlock(pm, match, { followed, country, nowMs })].join("");
  return `<details class="tl-card tl-pm"${open ? " open" : ""}><summary class="tl-pm-sum">Full-time analysis</summary>${body}` +
    `<p class="tl-pm-foot">Live widgets are below.</p></details>`;
}

/** Web Share API, else clipboard. -> "shared" | "copied" | "cancelled" | "failed" */
export async function shareOrCopy(text, nav = globalThis.navigator) {
  if (!text) return "failed";
  if (nav && typeof nav.share === "function") {
    try { await nav.share({ title: "TryLine full-time", text }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  try {
    if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); return "copied"; }
  } catch { /* fall through */ }
  return "failed";
}

const MSG = { shared: "Shared.", copied: "Copied. Paste it anywhere.", cancelled: "", failed: "Could not share. Open the preview and copy the text." };
/** Click handler for [data-pm-share]: shares the button's text and reports the result next to it. */
export async function sharePostMatch(btn, nav = globalThis.navigator) {
  const r = await shareOrCopy(btn?.dataset?.shareText || "", nav);
  const msg = btn?.closest?.(".tl-pm-block")?.querySelector("[data-pm-share-msg]");
  if (msg) msg.textContent = MSG[r];
  return r;
}
