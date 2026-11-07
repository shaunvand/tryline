// Time-zone aware formatting. Choice persisted in localStorage "tl.tz" (null = device time).
// Integrator: call setTimeZone(settings.tz) on boot/change; use fmtTime/fmtDay/tzLabel in views.
const KEY = "tl.tz";
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const valid = tz => { try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return true; } catch { return false; } };

let tz = null;
try { const v = ls()?.getItem(KEY); if (v && valid(v)) tz = v; } catch { /* ignore */ }

export function setTimeZone(tzOrNull) {
  tz = tzOrNull && valid(tzOrNull) ? tzOrNull : null;
  try { const s = ls(); if (s) { if (tz) s.setItem(KEY, tz); else s.removeItem(KEY); } } catch { /* ignore */ }
  return tz;
}
export const getTimeZone = () => tz;

const ms = v => (typeof v === "number" ? v : Date.parse(v));
const opts = o => (tz ? { ...o, timeZone: tz } : o);
// Intl.DateTimeFormat construction costs ~1 ms on a phone; the fixtures list formats hundreds of dates, so cache them
const dtfCache = new Map();
const dtf = (loc, o) => { const k = loc + JSON.stringify(o); let f = dtfCache.get(k); if (!f) { f = new Intl.DateTimeFormat(loc, o); dtfCache.set(k, f); } return f; };
const fmt = (o, v) => dtf("en-GB", opts(o)).format(v);

export function fmtTime(v) {
  const t = ms(v);
  return Number.isFinite(t) ? fmt({ hour: "2-digit", minute: "2-digit", hour12: false }, t) : "TBC";
}
const dayKey = t => dtf("en-CA", opts({ year: "numeric", month: "2-digit", day: "2-digit" })).format(t);
export function fmtDay(v, nowMs = Date.now()) {
  const t = ms(v);
  if (!Number.isFinite(t)) return "Date TBC";
  const k = dayKey(t);
  if (k === dayKey(nowMs)) return "Today";
  if (k === dayKey(nowMs + 864e5)) return "Tomorrow";
  if (k === dayKey(nowMs - 864e5)) return "Yesterday";
  return fmt({ weekday: "short", day: "numeric", month: "short" }, t).replace(",", "");
}
// "SAST" for Africa/Johannesburg (Intl gives "GMT+2"), else Intl short name ("BST", "GMT+11"...).
let devTz;
const deviceTz = () => { if (devTz === undefined) { try { devTz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { devTz = null; } } return devTz; };
export function tzLabel(atMs = Date.now()) {
  if ((tz || deviceTz()) === "Africa/Johannesburg") return "SAST";
  try {
    const p = dtf("en-GB", opts({ timeZoneName: "short" })).formatToParts(atMs).find(x => x.type === "timeZoneName");
    return p ? p.value : "";
  } catch { return ""; }
}
export function tzOptions() {
  return [
    { value: null, label: "Device time" },
    { value: "Africa/Johannesburg", label: "South Africa (SAST)" },
    { value: "Europe/London", label: "UK / Ireland (London)" },
    { value: "Europe/Paris", label: "France (Paris)" },
    { value: "Australia/Sydney", label: "Australia (Sydney)" },
    { value: "Pacific/Auckland", label: "New Zealand (Auckland)" },
  ];
}
