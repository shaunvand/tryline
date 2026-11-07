# TryLine

Mobile-first live-rugby second-screen PWA: scores, timeline, estimated pitch position, win-probability model, lineups, glossary. Plain ES modules, no build, no dependencies. See `ARCHITECTURE.md`.

## What's new (2026-11-07)
- Sin-bin strip: active yellow/red cards with time left and players on the pitch.
- "What just happened" card for the latest score or card, with a link to the glossary entry.
- Follow teams (star in the match header): "Your teams" group in Fixtures, optional alerts for followed teams only.
- Players section in Stats: top performers and per-team stats (World Rugby-covered matches).
- Where to watch, recent form and head-to-head in the match header.
- Time-zone and country settings; all kick-off times follow the chosen zone (device zone by default).
- Data coverage page (`#/coverage`) and glossary deep links (`#/glossary?q=Try`).

## Run locally
```
python -m http.server 8787
```
Open http://127.0.0.1:8787/ (relative URLs only, so it also works under a sub-path).

## Test
```
npm test
```
(Node 24, `node --test`.)

## Replay / demo mode
Recordings made with `tools/record_live.py` and converted by `tools/make_replay.py` live in `recordings/`. Open `#/replay/<file>` to step through a recorded match; set speed (1x/5x/20x) in Settings.

## Data sources and honesty
Scores and events: ESPN and World Rugby public feeds (about 10-30 s behind TV). Club-match clock is estimated, pitch position is estimated from events, win probability and projected score are model outputs. Details: [RESEARCH.md](RESEARCH.md).

## Deploy (GitHub Pages)
Push the repo, then Settings > Pages > deploy from branch `main`, root. `404.html` redirects unknown paths to `./`, keeping the hash. Bump `VERSION` in `sw.js` when shipping shell changes.

## Replay mode
`node tools/make_replay.mjs` turns `recordings/raw/*.jsonl` (ESPN `<leagueId>_<eventId>.jsonl`, World Rugby `wr_<matchId>.jsonl`) into `recordings/<slug>.json`: a list of `{t, match}` snapshots, only where the normalised Match changed. When ESPN and World Rugby cover the same match (same team names and day) they are merged: WR clock, status, stats, events and lineups win; ESPN ids, logos and kickoff are kept. `src/adapters/replay.js` plays a recording back (`createReplay(recording, {speed})`: `start`, `stop`, `seek`, `setSpeed`, `progress`); gaps are clamped to 0.3-4 s per step. Add new recordings to `REPLAYS` in that file. Test: `node --test tests/replay.test.js`.
