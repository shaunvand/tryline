// Sin-bin / card tracking. Pure, no DOM.
// ASSUMPTIONS: clockSec is cumulative match time (2nd half starts at 2400), so a yellow shown at 35'
// simply keeps counting into the 2nd half. Feed clocks are approximate (may be "estimated").
// A yellow lasts 600 s. A red card with text containing "20" or "bunker" is a 20-minute red:
// the team may replace the player after 1200 s. Any other red is permanent (never expires).
export const YELLOW_SEC = 600;
export const RED20_SEC = 1200;

const teamSide = (match, id) =>
  String(match?.home?.id) === String(id) ? "home" : String(match?.away?.id) === String(id) ? "away" : null;

function isRed20(e) {
  return /20|bunker/i.test(String(e.text || ""));
}

/** Cards currently keeping a team short. Expired ones are omitted. */
export function activeCards(match) {
  const now = match?.status?.clockSec ?? 0;
  const out = [];
  for (const e of match?.events || []) {
    if (e.type !== "yellow_card" && e.type !== "red_card") continue;
    const startSec = e.clockSec ?? 0;
    if (startSec > now) continue;
    let endSec = null;
    if (e.type === "yellow_card") endSec = startSec + YELLOW_SEC;
    else if (isRed20(e)) endSec = startSec + RED20_SEC;
    const expired = endSec != null && now >= endSec;
    if (expired) continue;
    const side = teamSide(match, e.teamId);
    const team = side ? match[side] : null;
    out.push({
      eventId: e.id, teamId: e.teamId, side, abbr: team?.abbr || "", player: e.players?.[0]?.name || "",
      type: e.type, startSec, endSec, remainingSec: endSec == null ? null : endSec - now, expired: false,
      permanent: endSec == null,
    });
  }
  return out;
}

/** Players on the pitch per side: 15 minus active cards, floor 13. */
export function playerCounts(match) {
  const c = { home: 15, away: 15 };
  for (const k of activeCards(match)) if (k.side) c[k.side] -= 1;
  return { home: Math.max(13, c.home), away: Math.max(13, c.away) };
}
