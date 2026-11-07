# TryLine — live rugby data research (Fable 5.1, 2026-11-07)

Question: what live rugby union data is publicly available, free, and legal enough to build a
second-screen "pocket companion" on, and what can only be bought.

## Verdict in one paragraph
Two free, keyless, CORS-open JSON feeds cover almost everything a second screen needs. **ESPN's
hidden API** gives fixtures, live score, scoring events, cards, substitutions and lineups for every
major competition (URC, Premiership, Top 14, Super Rugby Pacific, Six Nations, Rugby Championship,
RWC, autumn Tests / Nations Championship, Champions + Challenge Cup, NPC) plus years of results for a
ratings model. **World Rugby's Pulselive API** adds what ESPN lacks for internationals and Top 14: a
real match clock, team stats (possession, territory, tackles, carries, metres, lineouts, rucks,
penalties, last-10-minute possession and territory) and per-player stats. **No public source has
player x/y tracking.** The World Rugby timeline carries an event `position {x,y}` field, but it was
null on every event sampled, so pitch position in the app is an **estimate from the last event**,
clearly labelled. Nothing needs a paid key; nothing was signed up for or paid.

## Sources, verified live on Italy v South Africa (kick-off 11:40 UTC, 2026-11-07)

1. ESPN hidden API — USABLE, FREE, GREY (undocumented but open; CORS `*`)
   - Fixtures/scores: `https://site.api.espn.com/apis/site/v2/sports/rugby/{leagueId}/scoreboard?dates=YYYYMMDD` (also `dates=YYYY&limit=1000` for a full year of results).
   - Events: `https://sports.core.api.espn.com/v2/sports/rugby/leagues/{L}/events/{E}/competitions/{E}/plays?limit=500` — type (try, conversion, penalty goal, cards, substitutions), clock seconds, period, scorer, running score.
   - Lineups + venue: `https://site.web.api.espn.com/apis/site/v2/sports/rugby/{L}/summary?event={E}` — rosters with positions and starters. Team statistics array is empty for rugby.
   - Latency: `Cache-Control: max-age 3–10 s`; scoring events appeared ~20–40 s after the TV moment.
   - Gaps: the displayed clock sticks at "1'" (we estimate the clock from kickoff time + last play clock); no possession/territory; no text commentary; no odds for rugby.
   - League ids: URC 270557 · Premiership 267979 · Top 14 270559 · Super Rugby Pacific 242041 · Six Nations 180659 · Rugby Championship 244293 · RWC 164205 · International Tests 289234 · Nations Championship 17567 · Champions Cup 271937 · Challenge Cup 272073 · Currie Cup 270555 (stale since 2022) · NPC 270563 · MLR 289262.
   - Legality: unofficial, undocumented; robots.txt does not cover the API hosts; it is the same feed ESPN's own site uses. Personal, non-commercial, low-rate use (≤ 1 request / 15 s per match) is the accepted norm. Not for resale.

2. World Rugby (Pulselive) — USABLE, FREE, GREY (unlisted public API; CORS `*`; no key)
   - Match list: `https://api.wr-rims-prod.pulselive.com/rugby/v3/match?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&pageSize=50` — status U / L1 / LHT / L2 / C, scores, event (competition) name. Covers Tests, Nations Championship, Six Nations, Rugby Championship, RWC, Top 14, English Championship, Rugby Europe. **Not** URC or Premiership.
   - Summary: `.../match/{id}/summary` — real clock (`match.clock.secs`), full team lists (23 + extras) with numbers and positions, officials.
   - Stats: `.../match/{id}/stats` — `teamStats[2].stats` with Possession, Territory, BallPossessionLast10Mins, TerritoryLast10Mins, Tackles, TackleSuccess, MissedTackles, Carries, Metres, DefendersBeaten, Passes, LineoutsWon, RucksWon, PenaltiesConceded, TurnoversWon, KickSuccess … and `playerStats` per player.
   - Timeline: `.../match/{id}/timeline` — Try, Conversion, Penalty, Drop Goal, Yellow/Red Card, Replacement On/Off with `time.secs`, `teamIndex`, `playerId`, `points`, `position {x,y}` (null in practice).
   - Latency: ~0.2 s per call; stats and timeline refresh within ~30 s of the event. The list endpoint's clock lags; use summary.
   - Legality: same feed as world.rugby match centre; no ToS gate on the host; GREY like ESPN.

3. Premiership / URC / Top 14 club stats — `rugby-union-feeds.incrowdsports.com` (behind premrugby.com) — GREY, NOT USED by default
   - Richest club stats (~178 per team, per-player) and events for PREM, URC, Top 14, Pro D2, Champions/Challenge Cup, but it needs an app key that is hard-coded in premrugby.com's page. Borrowing a site's embedded key is a grey area, so it is documented here and left out of the shipped app. Live-update behaviour unverified (no club match was live during research).

4. RugbyPass live pages — GREY, scrape only — the only free source of live **text commentary** (server-rendered HTML with an inline JSON blob: commentary messages, possession, territory). Fragile HTML scraping, so not used; events are rendered as a text feed instead.

5. NO / not usable: SuperSport (`robots.txt` disallows `/api/*` and `/apix/*`); URC's stats site (React app on a WordPress GraphQL, no stats API found); LNR Top 14 (no API found); Six Nations / Autumn Nations Series sites (no JSON found, data is in World Rugby anyway); BBC Sport (reuse restricted); Sportradar widget feeds (ToS-grey, not probed); Flashscore/Livescore (ToS forbid scraping).

## Paid / freemium APIs (November 2026; prices from public pages, several unverified)
- API-Sports Rugby — free 100 req/day; PRO ≈ $15–19/mo for 7,500/day. Events, lineups; team-stat depth for URC/Premiership unverified. Best cheap upgrade if it checks out. https://api-sports.io/sports/rugby
- SportsAPI Pro — union + league, match stats incl. tackles/carries/metres/scrums, lineups, 5–10 s cache; price not public. https://docs.sportsapipro.com/api-reference/rugby-v2/overview
- Goalserve — $150/mo (30-day trial), live scores every 2–4 s, live game stats, events. https://www.goalserve.com/sport-data-feeds/rugby-api/prices
- Sportradar Rugby Union — enterprise (est. $1,000+/mo), trial key available; live push, lineups, team/player stats, win probability. No tracking data. https://developer.sportradar.com/rugby
- Stats Perform / Opta — enterprise only; the official Six Nations / Premiership data partner; deepest data (incl. some event x/y). No public price.
- Odds for a model input: Odds-API.io from £49/mo (covers all target competitions); The Odds API free tier only lists Six Nations.
- Not found / unverified: SportMonks (no rugby), Entitysport, Sportdevs, Broadage, LSports, Genius, BetsAPI.
- **Player GPS / positional tracking: no public or commercially listed API offers it.** Teams' GPS data (Catapult, STATSports) is private.

## What a paid feed would add over the free stack
- Club team stats (possession, territory, tackles) for URC, Premiership, Super Rugby (the free stack has them for internationals + Top 14 only).
- Faster, contractually stable updates (5–10 s) and an SLA, instead of ~20–40 s on ESPN.
- Bookmaker odds as a better pre-match prior than our ratings model.
- Cheapest sensible step: API-Sports PRO (~$19/mo) after testing the free 100/day key against a live URC match. Enterprise (Sportradar/Opta) only if this becomes a product.

## What is live vs estimated in TryLine
- Live from feeds: score, scoring events, cards, substitutions, lineups, kickoff times; for internationals + Top 14 also the real clock and team stats.
- Estimated by our model: clock for club matches (wall clock + last event), pitch position / zone of play, momentum, win probability, projected final score, kick success odds.
