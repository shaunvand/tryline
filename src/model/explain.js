// "What just happened" explainers. Pure. Facts only, no speculation about the specific incident.
const TEXT = {
  yellow_card: {
    title: "Yellow card", term: "Yellow card",
    meaning: "10 minutes in the sin bin; the team plays with 14. Repeated or cynical offences or dangerous play.",
    outcome: "The player cannot return for 10 minutes. The opposition usually gets a penalty.",
  },
  red_card: {
    title: "Red card", term: "Red card",
    meaning: "The player is sent off for serious foul play, such as dangerous contact with the head or a deliberate act of violence.",
    outcome: "The player is out for the match and the team plays with 14, unless it is a 20-minute red, where a replacement can come on after 20 minutes.",
  },
  penalty_try: {
    title: "Penalty try", term: "Penalty try",
    meaning: "7 points awarded, no conversion needed. A try would probably have been scored but for foul play; the offender is usually carded.",
    outcome: "Score goes up by 7. Play restarts with a kick-off from the halfway line.",
  },
  penalty_goal: {
    title: "Penalty goal", term: "Penalty goal",
    meaning: "A team kicked a penalty at the posts. It is worth 3 points.",
    outcome: "Score goes up by 3. The other team restarts play.",
  },
  drop_goal: {
    title: "Drop goal", term: "Drop goal",
    meaning: "The ball is dropped and kicked on the half-volley through the posts during open play. It is worth 3 points.",
    outcome: "Score goes up by 3. The other team restarts play.",
  },
  missed_kick: {
    title: "Missed kick", term: "Penalty goal",
    meaning: "A kick at goal missed the posts, so no points.",
    outcome: "Play continues, normally with a 22 drop-out or a ball in play.",
  },
  conversion: {
    title: "Conversion", term: "Conversion",
    meaning: "A kick after a try, worth 2 extra points.",
    outcome: "Score goes up by 2. The other team restarts play.",
  },
  try: {
    title: "Try", term: "Try",
    meaning: "5 points for grounding the ball over the line.",
    outcome: "A conversion kick for 2 more points follows.",
  },
};

/** -> {title, meaning, outcome, term} | null */
export function explainEvent(event, match) {
  const t = event && TEXT[event.type];
  if (!t) return null;
  let outcome = t.outcome;
  if (event.type === "red_card" && /20|bunker/i.test(String(event.text || ""))) {
    outcome = "A 20-minute red: the player is off, but the team can replace them after 20 minutes, so they play with 14 for 20 minutes.";
  }
  return { title: t.title, meaning: t.meaning, outcome, term: t.term };
}

/** Newest explainable event within maxAgeSec of nowSec (not in the future) -> {event, ex} | null. */
export function latestExplainer(match, nowSec, maxAgeSec = 240) {
  const now = nowSec ?? match?.status?.clockSec ?? 0;
  let best = null;
  (match?.events || []).forEach((e, i) => {
    const ex = explainEvent(e, match);
    if (!ex) return;
    const c = e.clockSec ?? 0;
    if (c > now || now - c > maxAgeSec) return;
    const s = e.seq ?? i;
    if (!best || c > best.c || (c === best.c && s >= best.s)) best = { e, ex, c, s };
  });
  return best ? { event: best.e, ex: best.ex } : null;
}
