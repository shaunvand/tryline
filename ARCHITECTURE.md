# TryLine — architecture (written by Fable 5.1, 2026-11-07)

Mobile-first PWA, **no build step** (plain ES modules), hosted free on GitHub Pages. Data is fetched
directly in the browser from ESPN's public JSON (CORS `*` verified on all three endpoints), so no
backend is needed for live mode. Python tools record and convert matches for replay/demo mode.

```
index.html            app shell, installs sw.js, loads src/app.js
manifest.webmanifest  PWA manifest (standalone, icons in /icons)
sw.js                 offline shell cache (network-first for data)
src/
  app.js              bootstrap: router (hash), polling loop, alert dispatch        (Opus)
  store.js            tiny observable store: state, subscribe(fn), set(patch)        (Opus)
  adapters/
    espn.js           fetchFixtures(leagueIds, date) / fetchMatch(leagueId, eventId) → Match  (Sonnet)
    replay.js         ReplayAdapter(recordingJson, speed) → same interface, steps through snapshots (Sonnet)
    index.js          pick adapter from URL (#/replay/<file> or live)                (Sonnet)
  model/
    winprob.js        PURE: preMatch(), live(), projectedScore(), kickOdds()          (Fable)
    pitch.js          PURE: estimateZone(events) → {x,y,label,confidence}, momentum() (Fable)
    ratings.json      team ratings + league params from tools/build_ratings.py       (Fable)
  ui/
    fixtures.js       today's + next 7 days list, SA time (Africa/Johannesburg), league filter (Sonnet)
    header.js         score, clock (feed vs estimated badge), status, win-prob bar, projected score (Sonnet)
    timeline.js       event feed, newest first, icons per type                        (Sonnet)
    lineups.js        15 + bench per side, on/off markers from sub events             (Sonnet)
    pitch.js          SVG pitch, estimated play zone + momentum arrow, "ESTIMATED" label (Sonnet)
    stats.js          team stats if source has them, else derived counts (tries, pens, cards, subs) (Sonnet)
    glossary.js       ref-decision explainer + laws glossary (static JSON)           (Sonnet)
    alerts.js         in-app toast + Notification API (opt-in) for try/card/FT       (Sonnet)
  data/
    glossary.json
tests/                node --test (Node 24): adapters (fixtures from recordings/), model
tools/
  record_live.py      poll ESPN for live events → recordings/raw/<league>_<event>.jsonl
  make_replay.py      raw jsonl → recordings/<slug>.json (compact snapshot list for replay.js)
  fetch_history.py    ESPN year scoreboards → data/history.json
  build_ratings.py    history → src/model/ratings.json
```

## Normalised `Match` contract (every adapter returns exactly this)
```js
{
  id: "603994", league: { id: "17567", name: "Nations Championship" },
  kickoff: "2026-11-07T11:40Z", venue: "Stadio Friuli", neutral: false,
  status: { state: "pre"|"in"|"post", period: 0|1|2|3|4,   // 3,4 = extra time
            label: "1st half"|"Half time"|"2nd half"|"Full time"|"Kick-off 13:40",
            clockSec: 1260, clockLabel: "21'", clockSource: "feed"|"estimated" },
  home: { id, name, abbr, logo, color, score }, away: { ... },
  events: [ { id, seq, type, period, clockSec, clockLabel, teamId, players: [{id,name}],
              homeScore, awayScore, text } ],
    // type ∈ try | penalty_try | conversion | penalty_goal | drop_goal | missed_kick |
    //        yellow_card | red_card | sub_off | sub_on | kickoff | half_time | full_time | other
  lineups: { home: [ { id, name, number, position, starter, onPitch } ], away: [...] },
  stats: null | { home: { possession, territory, tackles, carries, metres, ... }, away: {...} },
  source: { name: "espn"|"replay", fetchedAt, note: "scores+events ~10-30 s behind TV" }
}
```
Rules: adapters never throw on partial data — missing sections are `[]`/`null`. `clockSource` is
`"estimated"` whenever the feed clock is not advancing (ESPN rugby: displayClock sticks at "1'"); the
estimate = max(last play clock, wall-clock since kickoff adjusted for half time), capped at 40'/80'+stoppage.

## Honesty labels (non-negotiable in the UI)
- Pitch position is **estimated from the last event**, never real tracking. Always show "ESTIMATED".
- Win probability + projected score are **model estimates** (ratings from past results + live state).
- Clock shows "est." when derived from wall clock.
- Team stats panel says "Not in free feed" when `stats` is null, instead of inventing numbers.

## Post-match (full-time analysis, added 2026-11-07)
- `src/model/postmatch.js`: pure, no DOM. `buildPostMatch(match, {ratings, fixtures, nowMs})` returns null unless
  `status.state === "post"`, else `{final, ht, shape, story, moments, sinbin, discipline, top, decided, share, next}`;
  each part is null/[] when its data is missing. Building blocks: `scoreTimeline` (running score: feed scores, else
  points by type), `halfTimeScore`, `gameShape`, `winProbStory` (re-runs `winprob.live()` every minute and just
  before/after each score and card; biggest swing + turning point = last time the winner's chance went above 50%),
  `keyMoments`, `sinBinImpact` (spell lengths from `sinbin.js`), `disciplineRows`, `topBySide` (`rating.js`),
  `whatDecidedIt` (fixed scored rules, top 3), `shareText`, `nextFixture`.
- `src/ui/postmatch.js`: HTML strings (inline SVG chart, no libraries) + `shareOrCopy` (Web Share, else clipboard).
  Reuses timeline icons, `watch.js`, `ui/follow.js`.
- `src/app.js` lazy-loads both modules when a match reaches full time and renders into `#match-postmatch` (top of
  the match view; the live widgets stay below). If no fixtures are loaded it fetches the 7-day list once for "What's next".
- Honesty: win-chance numbers are labelled "TryLine model estimate", ratings "TryLine rating (own formula)",
  "What decided it" says it is written by fixed rules (no AI).

## Polling
- Live match: scoreboard every 15 s, plays every 15 s, summary (lineups) every 5 min.
- Fixtures: every 60 s on the fixtures screen. Back off ×2 on HTTP errors, max 2 min.
- ESPN sets `Cache-Control: max-age 3-10`, so faster polling adds nothing.
