// Estimated play zone + momentum from the event feed. NOT tracking data. (Fable 5.1)
// Coordinates: x 0..100 along the pitch (0 = home try line, 100 = away try line), y 0..100 across.
// Home attacks toward x=100 in our rendering regardless of the real end-change.
// If the source gives real event coordinates (World Rugby timeline sometimes does), they win.

const ATTACK = { try: 100, penalty_try: 100, conversion: 96, penalty_goal: 72, drop_goal: 70, missed_kick: 75 };

export function estimateZone(match) {
  const ev = (match.events || []).filter(e => e.type !== "sub_on" && e.type !== "sub_off");
  const last = ev[ev.length - 1];
  const st = match.status || {};
  if (!last || st.state === "pre") return { x: 50, y: 50, label: "Kick-off zone", confidence: "low", basis: "no events yet", estimated: true };
  if (st.state === "post") return { x: 50, y: 50, label: "Full time", confidence: "n/a", basis: "match over", estimated: true };
  const homeSide = String(last.teamId) === String(match.home.id);
  const abbr = homeSide ? match.home.abbr : match.away.abbr;
  const ageSec = Math.max(0, (st.clockSec || 0) - (last.clockSec || 0));
  if (last.pos && typeof last.pos.x === "number" && ageSec <= 90) {
    return { x: Math.max(0, Math.min(100, last.pos.x)), y: Math.max(0, Math.min(100, last.pos.y ?? 50)),
      label: `${abbr} ${label(last.type)}`, confidence: "high", basis: "event location from feed", estimated: false };
  }
  const depth = ATTACK[last.type];
  // after a score, play restarts from halfway with the conceding team kicking off
  if (depth !== undefined && ageSec > 90) {
    return { x: 50, y: 50, label: "Restart around halfway", confidence: "low", basis: `${label(last.type)} ${Math.round(ageSec / 60)} min ago`, estimated: true };
  }
  if (depth !== undefined) {
    const x = homeSide ? depth : 100 - depth;
    return { x, y: last.type === "try" ? 30 + 40 * hash01(last.id) : 50,
      label: `${abbr} ${label(last.type)} zone`, confidence: "medium",
      basis: `last event: ${label(last.type)} at ${last.clockLabel || "?"}`, estimated: true };
  }
  if (last.type === "yellow_card" || last.type === "red_card") {
    // a card usually goes to the defending side under pressure, so play is near their line
    const x = homeSide ? 22 : 78;
    return { x, y: 50, label: `Pressure on ${abbr} line`, confidence: "low", basis: `${label(last.type)} to ${abbr}`, estimated: true };
  }
  return { x: 50, y: 50, label: "Midfield (estimated)", confidence: "low", basis: label(last.type), estimated: true };
}

/** Momentum in [-1, 1]: + favours home. Exponentially decayed weighted scoring events over ~10 min. */
export function momentum(match, nowSec = null) {
  const st = match.status || {};
  const now = nowSec ?? st.clockSec ?? 0;
  const W = { try: 5, penalty_try: 6, conversion: 1, penalty_goal: 2.5, drop_goal: 2.5, yellow_card: -3, red_card: -5, missed_kick: 0.5 };
  let m = 0;
  for (const e of match.events || []) {
    const w = W[e.type]; if (w === undefined) continue;
    const age = Math.max(0, now - (e.clockSec || 0));
    const decay = Math.exp(-age / 600);
    const sign = String(e.teamId) === String(match.home.id) ? 1 : -1;
    m += sign * w * decay;
  }
  // blend in territory / possession-last-10 when the source has them
  const s = match.stats;
  if (s && s.home && s.away) {
    const t = num(s.home.territoryLast10) ?? num(s.home.territory);
    if (t !== null) m += (t - 0.5) * 4;
  }
  return Math.max(-1, Math.min(1, m / 8));
}

function num(v) { return typeof v === "number" && !Number.isNaN(v) ? v : null; }

export function label(type) {
  return ({ try: "try", penalty_try: "penalty try", conversion: "conversion", penalty_goal: "penalty goal", drop_goal: "drop goal",
    missed_kick: "missed kick", yellow_card: "yellow card", red_card: "red card", sub_on: "sub on", sub_off: "sub off",
    kickoff: "kick-off", half_time: "half time", full_time: "full time" })[type] || (type || "event").replace(/_/g, " ");
}

function hash01(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; }
