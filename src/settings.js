// localStorage-backed settings {notify, speed, leagues, alertFollowedOnly, country}.
// alertFollowedOnly (bool, default false): when true, only alert for matches involving followed teams (see follow.js). Works without localStorage (Node, private mode).
import { DEFAULT_LEAGUE_IDS } from "./leagues.js";

const KEY = "tryline.settings.v1";
export const DEFAULTS = Object.freeze({ notify: false, speed: 5, leagues: DEFAULT_LEAGUE_IDS, alertFollowedOnly: false, country: null });
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };

function clean(s) {
  return {
    notify: typeof s.notify === "boolean" ? s.notify : DEFAULTS.notify,
    speed: [1, 5, 20].includes(Number(s.speed)) ? Number(s.speed) : DEFAULTS.speed,
    leagues: Array.isArray(s.leagues) ? s.leagues.map(String) : [...DEFAULTS.leagues],
    alertFollowedOnly: typeof s.alertFollowedOnly === "boolean" ? s.alertFollowedOnly : DEFAULTS.alertFollowedOnly,
    country: typeof s.country === "string" && /^[A-Z]{2}$/.test(s.country) ? s.country : null, // null = detectCountry()
  };
}

export function loadSettings() {
  try { return clean(JSON.parse(ls()?.getItem(KEY) || "{}") || {}); } catch { return clean({}); }
}

export function saveSettings(patch) {
  const next = clean({ ...loadSettings(), ...patch });
  try { ls()?.setItem(KEY, JSON.stringify(next)); } catch { /* quota or disabled */ }
  return next;
}

export function toggleLeague(id) {
  const cur = loadSettings().leagues;
  const s = String(id);
  return saveSettings({ leagues: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] });
}

export const alertFollowedOnly = () => loadSettings().alertFollowedOnly;
