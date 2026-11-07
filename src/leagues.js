// ESPN rugby league catalogue. ids are ESPN league ids.
export const LEAGUES = [
  { id: "17567", name: "Nations Championship", short: "NC", region: "International" },
  { id: "289234", name: "International Test", short: "Test", region: "International" },
  { id: "180659", name: "Six Nations", short: "6N", region: "Europe" },
  { id: "244293", name: "Rugby Championship", short: "RC", region: "Southern Hemisphere" },
  { id: "164205", name: "Rugby World Cup", short: "RWC", region: "International" },
  { id: "270557", name: "URC", short: "URC", region: "Europe / South Africa" },
  { id: "267979", name: "Premiership", short: "PREM", region: "England" },
  { id: "270559", name: "Top 14", short: "T14", region: "France" },
  { id: "242041", name: "Super Rugby Pacific", short: "SRP", region: "Pacific" },
  { id: "271937", name: "Champions Cup", short: "ECC", region: "Europe" },
  { id: "272073", name: "Challenge Cup", short: "ECH", region: "Europe" },
  { id: "270555", name: "Currie Cup", short: "CC", region: "South Africa" },
  { id: "270563", name: "NPC", short: "NPC", region: "New Zealand" },
  { id: "289262", name: "MLR", short: "MLR", region: "USA" },
];
export const DEFAULT_LEAGUE_IDS = LEAGUES.slice(0, 9).map(l => l.id);
