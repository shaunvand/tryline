// Replay adapter: steps through a recorded match (built by tools/make_replay.mjs). No network except loadReplay().
import { fixTeam } from "../teams.js";
export const REPLAYS = [
  { slug: "ita-v-rsa-2026-11-07", title: "Italy v South Africa (Nations Championship, 7 Nov 2026)", file: "./recordings/ita-v-rsa-2026-11-07.json" },
];
export const listReplays = () => REPLAYS.map(r => ({ ...r }));

export async function loadReplay(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Replay load failed: HTTP ${r.status} ${url}`);
  return r.json();
}

const MIN_MS = 300, MAX_MS = 4000;

// Recordings can hold WR events that run ahead of the recorded score/clock (the ESPN score lagged while the
// recorder ran). Use the latest event's running score and clock when they are ahead, so header and timeline agree.
const lastScored = m => [...(m.events || [])].reverse().find(e => e.homeScore != null && e.awayScore != null);
function scoreOf(m, k) {
  const e = lastScored(m), t = m[k];
  if (!e || (+e.homeScore + +e.awayScore) <= ((+m.home.score || 0) + (+m.away.score || 0))) return t;
  return { ...t, score: +(k === "home" ? e.homeScore : e.awayScore) };
}
function reconcile(m) {
  const st = m.status || {}, maxSec = Math.max(0, ...(m.events || []).filter(e => e.period === st.period).map(e => +e.clockSec || 0));
  if (st.state !== "in" || !(maxSec > (st.clockSec || 0))) return m;
  return { ...m, status: { ...st, clockSec: maxSec, clockLabel: `${Math.floor(maxSec / 60)}'` } };
}

export function createReplay(recording, { speed = 5, nowMs, timer } = {}) {
  const snaps = recording?.snapshots || [];
  if (!snaps.length) throw new Error("Recording has no snapshots");
  const tm = timer || { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: id => clearTimeout(id) };
  const times = snaps.map(s => Date.parse(s.t));
  let idx = 0, spd = Math.max(0.1, +speed || 5), handle = null, running = false, cb = null;

  const current = () => {
    const m = snaps[idx].match;
    return { ...reconcile(m), home: fixTeam(scoreOf(m, "home")), away: fixTeam(scoreOf(m, "away")), source: { ...m.source, name: "replay", fetchedAt: new Date(nowMs ?? times[idx]).toISOString(), note: `Recorded replay (${recording.title || recording.slug})` } };
  };
  const fixture = () => {
    const m = snaps[idx].match, side = k => ({ id: m[k].id, name: m[k].name, abbr: fixTeam(m[k]).abbr, logo: m[k].logo ?? null, color: m[k].color ?? null, score: m[k].score });
    return { id: m.id, slug: recording.slug, leagueId: String(recording.leagueId ?? m.league.id), leagueName: recording.leagueName || m.league.name,
      kickoff: m.kickoff, name: `${m.home.name} vs ${m.away.name}`, shortName: `${fixTeam(m.home).abbr} v ${fixTeam(m.away).abbr}`, venue: m.venue,
      status: { state: m.status.state, label: m.status.label }, home: side("home"), away: side("away"), replay: true };
  };
  const emit = () => { if (cb) cb(current()); };
  const clear = () => { if (handle != null) { tm.clearTimeout?.(handle); handle = null; } };
  const schedule = () => {
    clear();
    if (!running || idx >= snaps.length - 1) { if (idx >= snaps.length - 1) running = false; return; }
    const wait = Math.min(MAX_MS, Math.max(MIN_MS, (times[idx + 1] - times[idx]) / spd));
    handle = tm.setTimeout(() => { handle = null; idx++; emit(); schedule(); }, wait);
  };

  return {
    fixture, current,
    start(onUpdate) { cb = onUpdate || cb; running = true; emit(); schedule(); },
    stop() { running = false; clear(); },
    seek(fraction) {
      const f = Math.min(1, Math.max(0, +fraction || 0));
      idx = Math.round(f * (snaps.length - 1));
      emit(); schedule();
    },
    setSpeed(n) { spd = Math.max(0.1, +n || spd); if (running) schedule(); },
    progress: () => ({ index: idx, total: snaps.length, fraction: snaps.length > 1 ? idx / (snaps.length - 1) : 1 }),
  };
}
