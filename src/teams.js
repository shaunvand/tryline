// ESPN team abbreviations are often wrong ("SOU", "JAP", "SEC", "USA" for Perpignan) and two club logos are
// country flags (Perpignan -> usa.png, Vannes -> van.png). fixTeam() patches both by team name. Pure.
const ABBR = {
  "south africa": "RSA", "japan": "JPN", "fiji": "FIJ", "new zealand": "NZL", "australia": "AUS", "argentina": "ARG",
  "pau": "PAU", "section paloise": "PAU", "perpignan": "PER", "toulon": "TLN", "stade francais paris": "SFP",
  "stade toulousain": "TLS", "toulouse": "TLS", "clermont auvergne": "CLE", "vannes": "VAN", "racing 92": "R92",
  "union bordeaux begles": "UBB", "bordeaux begles": "UBB", "bayonne": "BAY", "la rochelle": "LRO", "lyon": "LYO",
  "montpellier herault": "MON", "montpellier": "MON", "castres olympique": "CAS", "castres": "CAS",
};
const FLAG_LOGO = new Set(["perpignan", "vannes"]);
const key = n => String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function fixTeam(t) {
  if (!t || typeof t !== "object") return t;
  const k = key(t.name), out = { ...t };
  if (ABBR[k]) out.abbr = ABBR[k];
  if (FLAG_LOGO.has(k) && /\/countries\//.test(out.logo || "")) out.logo = "";
  return out;
}
