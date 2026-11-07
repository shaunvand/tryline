// In-app toasts + opt-in Notification API. All browser access is guarded so Node can import this.
const KEY_TYPES = new Set(["try", "penalty_try", "yellow_card", "red_card", "penalty_goal", "drop_goal", "full_time"]);

/** New key events in nextEvents that were not in prevEvents (matched by id). */
export function diffEvents(prevEvents, nextEvents) {
  const seen = new Set((prevEvents || []).map(e => String(e.id)));
  return (nextEvents || []).filter(e => KEY_TYPES.has(e.type) && !seen.has(String(e.id)));
}

/** -> {title, body}. Plain text (escape when inserting as HTML; showToast uses textContent). */
export function formatAlert(event, match) {
  const h = match?.home, a = match?.away;
  const hs = event.homeScore ?? h?.score ?? 0, as = event.awayScore ?? a?.score ?? 0;
  const team = [h, a].find(t => t && String(t.id) === String(event.teamId));
  const tn = team?.name || team?.abbr || "";
  const clock = event.clockLabel ? ` (${event.clockLabel})` : "";
  const hn = h?.name || h?.abbr || "Home", an = a?.name || a?.abbr || "Away";
  const lead = hs === as ? `${hn} ${hs}-${as} ${an}` : hs > as ? `${hn} ${hs}-${as}` : `${an} ${as}-${hs}`;
  const who = event.players?.[0]?.name;
  const titles = {
    try: "TRY!", penalty_try: "PENALTY TRY!", penalty_goal: "PENALTY GOAL", drop_goal: "DROP GOAL!",
    yellow_card: "YELLOW CARD", red_card: "RED CARD", full_time: "FULL TIME",
  };
  const head = titles[event.type] || "Update";
  if (event.type === "full_time") return { title: `${head} ${hn} ${hs}-${as} ${an}`, body: `${hn} ${hs} - ${as} ${an}` };
  if (event.type === "yellow_card" || event.type === "red_card") {
    return { title: `${head} ${tn}`.trim(), body: `${[who, tn].filter(Boolean).join(", ")}${clock}. ${hn} ${hs}-${as} ${an}` };
  }
  return { title: `${head} ${lead}${clock}`, body: `${[who, tn].filter(Boolean).join(", ")} · ${hn} ${hs}-${as} ${an}` };
}

export function isSupported() {
  return typeof window !== "undefined" && typeof Notification !== "undefined";
}

export async function requestPermission() {
  if (!isSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

export function showToast(container, { title, body } = {}) {
  if (!container || typeof document === "undefined") return null;
  const el = document.createElement("div");
  el.className = "tl-toast";
  el.setAttribute("role", "status");
  const t = document.createElement("strong"); t.textContent = title || "";
  const b = document.createElement("span"); b.textContent = body || "";
  el.append(t, b);
  container.appendChild(el);
  const toasts = container.querySelectorAll(".tl-toast");
  for (let i = 0; i < toasts.length - 3; i++) toasts[i].remove();
  setTimeout(() => el.remove(), 6000);
  return el;
}

/** System notification only if granted and tab hidden; otherwise returns false so the caller shows a toast. */
export function notify({ title, body } = {}) {
  if (isSupported() && Notification.permission === "granted" && typeof document !== "undefined" && document.hidden) {
    try { new Notification(title, { body, tag: "tryline" }); return true; } catch { return false; }
  }
  return false;
}
