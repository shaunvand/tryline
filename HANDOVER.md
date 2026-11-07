# TryLine handover to Matt (from Shaun's PA, 2026-11-07 15:20 SAST)

Shaun has handed TryLine to Matt. Matt owns it from here.

## What TryLine is
- Mobile-first live-rugby second screen (PWA): score, clock, timeline, estimated pitch position,
  win probability + projected score, lineups, glossary, replay/demo mode.
- Plain ES modules, no build step, no dependencies. See README.md and ARCHITECTURE.md.
- Live: https://shaunvand.github.io/tryline/ (GitHub Pages, branch main).
- 58 tests pass (`npm test`, Node 24).

## Data
- ESPN + World Rugby public feeds, free, about 10-30 s behind TV. Details: RESEARCH.md.
- Pitch position, club-match clock and win odds are estimates/model outputs; labelled as such in the app.
- Free feeds are "not for resale": stay non-commercial until a licensed feed is paid for.
- Never scrape SuperSport. Any paid feed needs Shaun's yes.

## Strategy (research/best_play.md + research/competitor_audit.md)
- Positioning: free, no-login, no-ads "second screen that explains the game", South Africa first.
- Gaps to own: sin-bin countdown + 14 v 15, "what just happened" explainers, win-prob swing,
  player stat lines, follow teams, where to watch, coverage honesty page.
- Money later: supporter tier (USD 2-3/mo), legal odds affiliate toggle, then B2B on a licensed feed.
- Roadmap: v1.1 (2-4 weeks) win-prob chart, .ics export, recap card, Afrikaans glossary, low-data mode;
  v2 for Six Nations 2027; paid feed for RWC 2027 if the user base justifies it.

## Work still running in Shaun's builder (do not edit the same files until these finish)
- Job 525fc1d8: competitor audit + top 3-5 quick wins built into the app (running).
- Job ef68af43: full mobile-ready pass (safe areas, thumb nav, install/offline, Lighthouse) (queued after 525fc1d8).
- When both are done, their changes land in this folder and the live site. Check git log / this file for updates.

## Change log
- 2026-11-07 (Matt's builder): Post-match "Full-time analysis" screen added (competitor audit item 10, recap card).
  New: src/model/postmatch.js, src/ui/postmatch.js, styles/postmatch.css, tests/postmatch.test.js.
  Small additive edits: src/app.js (lazy loader, render call, share click), index.html (CSS link + #match-postmatch),
  sw.js (3 files precached, VERSION tryline-v7), src/ui/timeline.js (exports its icons), README.md, ARCHITECTURE.md.
  NOT RUN YET: someone with a shell must run `npm test` and then deploy. The only replay recording stops at 21',
  so demo mode will not reach full time until a full-match recording is added.

## Known limits for Matt's builders
- They can edit files but cannot run code (no npm, python, git push). Deploys and tests need someone with a shell.
