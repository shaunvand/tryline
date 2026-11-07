// SVG pitch renderer. Pure string output. Position is ESTIMATED unless the feed gives coordinates.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Layout in viewBox 140x90: try lines at X0=20 and X1=120 (100 m), in-goal 10 deep, field y 10..80.
const X0 = 20, X1 = 120, Y0 = 10, Y1 = 80;

/** Zone name from the attacking team's view. x: 0 = home try line, 100 = away. attackingHome=true => attacking toward 100. */
export function zoneName(x, attackingHome = true) {
  if (typeof x !== "number" || Number.isNaN(x)) return "own half";
  const d = attackingHome ? x : 100 - x; // distance advanced from own try line
  if (d <= 0 || d >= 100) return "in-goal";
  if (d <= 22) return "own 22";
  if (d <= 50) return "own half";
  if (d <= 78) return "opp half";
  return "opp 22";
}

function pitchSvg(zone, home, away) {
  const stripes = [];
  for (let i = 0; i < 10; i += 2) stripes.push(`<rect x="${X0 + i * 10}" y="${Y0}" width="10" height="${Y1 - Y0}" fill="#2bb673" opacity=".25"/>`);
  const line = (x1, y1, x2, y2, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width=".5"${dash ? ' stroke-dasharray="2 2"' : ""}/>`;
  const post = x => `<path d="M${x - 1.5} 41v8M${x - 1.5} 45h3M${x + 1.5} 41v8" stroke="#fff" stroke-width=".6" fill="none"/>`;
  const parts = [
    `<rect x="0" y="0" width="140" height="90" fill="#0f5a37"/>`,
    `<rect x="${X0 - 10}" y="${Y0}" width="10" height="${Y1 - Y0}" fill="#0c4a2d"/>`,
    `<rect x="${X1}" y="${Y0}" width="10" height="${Y1 - Y0}" fill="#0c4a2d"/>`,
    `<rect x="${X0}" y="${Y0}" width="100" height="${Y1 - Y0}" fill="#14804f"/>`,
    ...stripes,
    `<rect x="${X0 - 10}" y="${Y0}" width="120" height="${Y1 - Y0}" fill="none" stroke="#fff" stroke-width=".6"/>`,
    line(X0, Y0, X0, Y1), line(X1, Y0, X1, Y1), // try lines
    line(70, Y0, 70, Y1), // halfway
    line(X0 + 22, Y0, X0 + 22, Y1), line(X1 - 22, Y0, X1 - 22, Y1), // 22 m
    line(60, Y0, 60, Y1, true), line(80, Y0, 80, Y1, true), // 10 m either side of halfway
    line(X0 + 5, Y0 + 2, X0 + 5, Y1 - 2, true), line(X1 - 5, Y0 + 2, X1 - 5, Y1 - 2, true), // 5 m
    post(X0), post(X1),
    `<text x="${X0 - 5}" y="47" font-size="4" fill="#fff" opacity=".85" text-anchor="middle" transform="rotate(-90 ${X0 - 5} 45)">${esc(home)}</text>`,
    `<text x="${X1 + 5}" y="47" font-size="4" fill="#fff" opacity=".85" text-anchor="middle" transform="rotate(90 ${X1 + 5} 45)">${esc(away)}</text>`,
  ];
  if (zone && typeof zone.x === "number") {
    const px = (X0 + clamp(zone.x, 0, 100)).toFixed(1);
    const py = (Y0 + clamp(zone.y ?? 50, 0, 100) / 100 * (Y1 - Y0)).toFixed(1);
    parts.push(
      `<circle cx="${px}" cy="${py}" r="3" fill="#facc15" opacity=".5"><animate attributeName="r" values="3;8;3" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0;.6" dur="1.6s" repeatCount="indefinite"/></circle>`,
      `<circle cx="${px}" cy="${py}" r="2.4" fill="#facc15" stroke="#0b1020" stroke-width=".6"/>`);
  }
  return `<svg class="tl-pitch-svg" viewBox="0 0 140 90" role="img" aria-label="Rugby pitch with estimated play zone" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
}

export function renderPitch({ match, zone, momentum } = {}) {
  const home = match?.home?.abbr || "HOME", away = match?.away?.abbr || "AWAY";
  const z = zone || { x: 50, y: 50, label: "Midfield (estimated)", basis: "no data", estimated: true };
  const badge = z.estimated
    ? `<div class="tl-badge tl-badge-est">ESTIMATED FROM EVENTS — not live tracking</div>`
    : `<div class="tl-badge tl-badge-feed">Event location from feed</div>`;
  let mom = "";
  if (typeof momentum === "number" && !Number.isNaN(momentum)) {
    const m = clamp(momentum, -1, 1), w = Math.abs(m) * 50;
    const style = m >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
    const txt = Math.abs(m) < 0.05 ? "even" : `${m >= 0 ? home + " +" : away + " +"}${Math.abs(m).toFixed(1)}`;
    mom = `<div class="tl-momentum"><div class="tl-mom-bar"><span class="tl-mom-fill ${m >= 0 ? "tl-home" : "tl-away"}" style="${style}"></span><span class="tl-mom-mid"></span></div>` +
      `<div class="tl-mom-label">Momentum: ${esc(txt)} (last ~10 min) · estimate from scores and cards</div></div>`;
  }
  return `<section class="tl-pitch">${badge}${pitchSvg(z, home, away)}` +
    `<div class="tl-pitch-ends"><span>Left: ${esc(home)} end</span><span>Right: ${esc(away)} end</span></div>` +
    `<div class="tl-pitch-note">Schematic: the feed has no direction of play, and teams swap ends at half time</div>` +
    `<div class="tl-pitch-label">${esc(z.label)} · ${esc(z.basis)}</div>${mom}</section>`;
}
