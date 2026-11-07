// Where to watch + recent form renderers. Pure; HTML strings; all text escaped.
// Data: call setBroadcastData(json) once with the parsed data/broadcast.json (fetch it in app.js),
// or pass { data } per call.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

let DATA = null;
export function setBroadcastData(json) { DATA = json || null; }

const COUNTRIES = [["ZA", "South Africa"], ["GB", "United Kingdom"], ["IE", "Ireland"], ["FR", "France"], ["AU", "Australia"], ["NZ", "New Zealand"], ["US", "United States"]];
export const countryOptions = () => COUNTRIES.map(([value, label]) => ({ value, label }));

const TZ_COUNTRY = {
  "Africa/Johannesburg": "ZA", "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR",
  "Pacific/Auckland": "NZ", "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU",
  "Australia/Perth": "AU", "Australia/Adelaide": "AU",
};
export function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    if (/^America\//.test(tz || "")) return "US";
    const lang = (globalThis.navigator && (navigator.languages?.[0] || navigator.language)) || "";
    const m = /-([A-Za-z]{2})$/.exec(lang);
    const cc = m && m[1].toUpperCase();
    if (cc && COUNTRIES.some(([c]) => c === cc)) return cc;
  } catch { /* ignore */ }
  return "ZA";
}

export function renderWatch({ leagueId, country = "ZA", data = DATA } = {}) {
  const e = data?.leagues?.[String(leagueId)]?.[country];
  if (!e) return `<p class="tl-watch tl-muted">Broadcast info not available for this competition</p>`;
  const link = e.url ? ` <a href="${esc(e.url)}" target="_blank" rel="noopener">Open</a>` : "";
  const detail = e.detail ? ` <span class="tl-muted">(${esc(e.detail)})</span>` : "";
  const unv = e.verified ? "" : ` <span class="tl-muted" title="${esc(data?.note || "Check your provider")}">(unconfirmed)</span>`;
  return `<p class="tl-watch">Where to watch (${esc(country)}): <strong>${esc(e.name)}</strong>${detail}${unv}${link}</p>`;
}

const pipBg = r => (r === "W" ? "var(--accent)" : r === "L" ? "var(--red)" : "var(--muted)");
const pip = r => `<span class="tl-pip tl-pip-${esc(String(r).toLowerCase())}" style="display:inline-block;width:1.4em;height:1.4em;line-height:1.4em;border-radius:50%;text-align:center;font-size:.75em;font-weight:700;margin-right:3px;color:#fff;background:${pipBg(r)}">${esc(r)}</span>`;
const side = (t, arr) => `<div class="tl-form-row"><span class="tl-form-team">${esc(t?.abbr || t?.name || "")}</span> ${arr.length ? arr.map(pip).join("") : '<span class="tl-muted">no data</span>'}</div>`;

export function renderForm({ match } = {}) {
  if (!match) return "";
  const f = match.form || { home: [], away: [] };
  const h = match.h2h;
  let h2h = "";
  if (h && h.last?.length) {
    const l = h.last[0];
    h2h = `<p class="tl-h2h tl-muted">Last ${h.last.length} meetings: ${esc(l.homeAbbr)} ${esc(l.hs)} – ${esc(l.awayAbbr)} ${esc(l.as)} (most recent; ${esc(match.home?.abbr)} ${esc(h.homeWins)}W, ${esc(match.away?.abbr)} ${esc(h.awayWins)}W, ${esc(h.draws)}D)</p>`;
  }
  if (!f.home.length && !f.away.length && !h2h) return "";
  return `<div class="tl-card tl-form"><h3>Recent form</h3>${side(match.home, f.home)}${side(match.away, f.away)}${h2h}</div>`;
}
