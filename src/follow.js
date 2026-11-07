// Follow teams (no login). Stored in localStorage "tl.followed" as a JSON array of team keys.
// followKey: lowercase letters only, so "South Africa" (ESPN) and "south africa " (World Rugby) both -> "southafrica".
const KEY = "tl.followed";
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function followKey(team) {
  const name = typeof team === "string" ? team : (team?.name || team?.abbr || "");
  return String(name ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

export function loadFollowed() {
  try {
    const arr = JSON.parse(ls()?.getItem(KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr.map(String).filter(Boolean) : []);
  } catch { return new Set(); }
}

function save(set) {
  try { ls()?.setItem(KEY, JSON.stringify([...set])); } catch { /* quota or disabled */ }
}

const asSet = followed => followed instanceof Set ? followed : loadFollowed();

// followed is optional everywhere (defaults to the stored set).
export function isFollowed(team, followed) {
  const k = followKey(team);
  return !!k && asSet(followed).has(k);
}

// Toggle and persist; returns the new Set.
export function toggleFollow(team) {
  const set = loadFollowed(), k = followKey(team);
  if (!k) return set;
  if (!set.delete(k)) set.add(k);
  save(set);
  return set;
}

export function followedIn(fixture, followed) {
  const set = asSet(followed);
  return !!fixture && (isFollowed(fixture.home, set) || isFollowed(fixture.away, set));
}

export const matchInvolvesFollowed = (match, followed) => followedIn(match, followed);
