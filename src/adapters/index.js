// Data facade for the app: merged ESPN + World Rugby fixtures and matches, with small caches.
import { fetchFixtures, fetchMatch } from "./espn.js";
import { fetchWrMatches, fetchWrMatch } from "./wr.js";
import { DEFAULT_LEAGUE_IDS } from "../leagues.js";
import { findLink, mergeFixtures, mergeMatch, sastDay } from "../linker.js";

const TTL = 60e3;
const espnDayCache = new Map(); // "leagues|YYYYMMDD" -> {at, list}
const wrCache = new Map();      // "from|to" -> {at, list}
const fixtureIndex = new Map(); // "leagueId:id" -> {day: Date, fixture}
const linkCache = new Map();    // "leagueId:id" -> {wrId, swapped} | null

const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
const localYmd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

async function cached(map, key, fn, ttl = TTL) {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.list;
  const list = await fn();
  map.set(key, { at: Date.now(), list });
  return list;
}

/** WR list for a range; never rejects (WR down -> []). */
export async function wrList(fromIso, toIso, fetchImpl) {
  try { return await cached(wrCache, `${fromIso}|${toIso}`, () => fetchWrMatches({ dateFrom: fromIso, dateTo: toIso, fetchImpl })); }
  catch { return []; }
}

/**
 * Fixtures for today + the next `days - 1` days (local calendar), ESPN for `leagueIds` merged with WR.
 * Returns {fixtures, wrOk, espnOk}.
 */
export async function loadFixtures({ leagueIds = DEFAULT_LEAGUE_IDS, days = 7, nowMs = Date.now(), fetchImpl = globalThis.fetch } = {}) {
  const ids = [...new Set(leagueIds.map(String))].filter(id => !id.startsWith("wr:"));
  const dates = Array.from({ length: days }, (_, i) => new Date(nowMs + i * 864e5));
  const espnP = Promise.all(dates.map(d => cached(espnDayCache, `${ids.join(",")}|${localYmd(d)}`,
    () => fetchFixtures({ leagueIds: ids, date: d, fetchImpl })).then(list => list.map(f => ({ f, d })))));
  const wrP = wrList(isoDay(nowMs - 864e5), isoDay(nowMs + days * 864e5), fetchImpl);
  const [espnDays, wr] = await Promise.all([espnP, wrP]);
  const espn = [];
  for (const { f, d } of espnDays.flat()) {
    const k = `${f.leagueId}:${f.id}`;
    if (!fixtureIndex.has(k)) fixtureIndex.set(k, { day: d, fixture: f });
    espn.push(f);
  }
  const fixtures = mergeFixtures(espn, wr, { fromDay: sastDay(nowMs) });
  // remember the fixture-level decision (incl. "no link") so loadMatch never re-links differently
  if (wr.length) for (const f of fixtures) if (!f.id.startsWith("wr:")) linkCache.set(`${f.leagueId}:${f.id}`, f.wrId ? { wrId: f.wrId, swapped: !!f.wrSwapped } : null);
  return { fixtures, espnOk: espn.length > 0, wrOk: wr.length > 0 };
}

async function linkFor(key, espnMatch, fetchImpl) {
  if (linkCache.has(key)) return linkCache.get(key);
  const ko = Date.parse(espnMatch.kickoff);
  if (!Number.isFinite(ko)) return null;
  const l = findLink(espnMatch, await wrList(isoDay(ko - 864e5), isoDay(ko + 864e5), fetchImpl));
  const link = l ? { wrId: l.wr.id, swapped: l.swapped } : null;
  linkCache.set(key, link);
  return link;
}

/** World Rugby only (route #/match/wr/<matchId>). */
export function loadWrMatch({ matchId, fetchImpl = globalThis.fetch, nowMs = Date.now() }) {
  return fetchWrMatch({ matchId, fetchImpl, nowMs });
}

/** Merged Match for an ESPN event; ESPN alone when WR is missing or down; WR alone when ESPN fails but a link is known. */
export async function loadMatch({ leagueId, eventId, fetchImpl = globalThis.fetch, nowMs = Date.now() }) {
  if (String(leagueId) === "wr") return loadWrMatch({ matchId: String(eventId).replace(/^wr:/, ""), fetchImpl, nowMs });
  const key = `${leagueId}:${eventId}`;
  const day = fixtureIndex.get(key)?.day;
  let espn = null, espnErr = null;
  try { espn = await fetchMatch({ leagueId, eventId, date: day, fetchImpl, nowMs }); }
  catch (e) { espnErr = e; }
  const link = espn ? await linkFor(key, espn, fetchImpl).catch(() => null) : linkCache.get(key);
  let wr = null;
  if (link) wr = await fetchWrMatch({ matchId: link.wrId, fetchImpl, nowMs }).catch(() => null);
  if (!espn && !wr) throw espnErr || new Error("Match not found");
  return mergeMatch(espn, wr, !!(link && link.swapped));
}

/** Test hook. */
export function _clearCaches() { espnDayCache.clear(); wrCache.clear(); fixtureIndex.clear(); linkCache.clear(); }
