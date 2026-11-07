---

## 7. Best play (strategy call — Fable 5.1, 2026-11-07)

### The one-paragraph answer
Rugby has no "FotMob for rugby". The official apps are marketing shells with bad data and login walls
(URC 2.9–3.2★, Six Nations Android 3.3★), the generalists (Flashscore, Sofascore) are football-first and
shallow on rugby, and the only rugby-native rival with real depth (Gainline, iOS, USD 2.99–6.99/mo) has
18 ratings. Fans say the same three things everywhere: get the basics right and fast, don't make me log in,
and stop hiding things behind ads and paywalls. TryLine should therefore **win on trust and clarity, not on
data breadth it can't buy**: a free, no-login, honest second screen that is the best place to *understand*
a match (sin-bin clocks, what-just-happened, win swing, player lines) for the competitions the free feeds
cover well, with South Africa as the beachhead. Monetise late and sideways (supporters, affiliates where
legal, then B2B/licensing on a paid feed), never with banner ads.

### Positioning
"The second screen that explains the game." Not a scores app (that race is lost to habit), not a
streaming app, not fantasy. A companion you open *because the TV is on*. Tagline candidates:
"Watch smarter." / "Know what just happened."

### Target user (in order)
1. **The South African TV fan** watching Springbok Tests, URC SA derbies and the Rugby Championship on
   SuperSport/SABC. Largest, most under-served national audience (rugby is now SA's most-watched sport;
   4–5M watched SA v NZ 2024; no SA live-scores app exists; viewing costs R399–R799/month). Time zone,
   channel guide and Bok-first defaults cost nothing.
2. **The casual-but-curious fan anywhere** who doesn't know why that was a penalty (90% confusion stat,
   2021 TMO-captions study). Explainers tied to live events are the moat: nobody does it.
3. **Hardcore + fantasy players** during the international windows (Six Nations, autumn, RWC 2027),
   where World Rugby's free clock + team + player stats make TryLine *deeper* than the official apps.

### Must-have features (what the audit says, mapped to free data)
- Basics done better than the officials: instant score, readable colours, real clock where available and
  an honest "est." elsewhere, every competition in one list, no login, no ads. (Complaint themes 1, 2, 4, 6.)
- **Sin-bin countdown + 14 v 15** and **"What just happened" explainers** linked to the laws glossary.
  (Gap 1; feasible from event types alone.)
- **Win probability swing + projected score**, labelled as a model. (Gap 2; already shipped, keep honest.)
- **Player stat lines + top performers** for internationals and Top 14. (Gap 6; fantasy window.)
- **Follow teams** with alerts only for them. (Themes 2 and 7.)
- **Where to watch** per country + device time zone. (Theme 5; Gainline has it, officials dropped it.)
- **Coverage honesty page**: what is live, estimated, or missing per league. (Theme 3.)
- Later: Lock-screen/Live Activity equivalents need a native shell; a PWA cannot do them. Park.

### Monetisation (phased, and why not ads)
Ads are the number-6 complaint and yield ~USD 0.23 per MAU per year at rugby's scale: 50k MAU for USD 1k a
month. Not worth the trust cost. Order of plays:
1. **Free, no ads, no login** until there is a weekly-active base worth monetising (tens of thousands).
2. **Supporter tier** (web billing, no store fee): USD 2–3/month or ~R40 for lifetime-style perks
   (custom alerts, replay archive, early features). Gainline proves rugby fans pay small amounts.
3. **Affiliate/odds only where legal and only on demand** (an "odds" toggle, off by default). CPA
   USD 25–150 and 30–45% revshare earns ~3× ads per MAU; SA and UK are legal, AU restricted.
4. **B2B** (pub/second-screen widgets, win-prob + explainer overlays for publishers) requires a licensed
   feed; the free feeds are "not for resale". Only after a paid feed is justified by step 2–3 revenue.

### Data source plan
- Now: ESPN (all leagues) + World Rugby (internationals, Top 14). USD 0. Keep polling ≤ 1/15 s per match.
- The moment there is revenue or >~20k MAU: a licensed feed, in this order — test API-Sports PRO
  (~USD 19/mo, depth unverified), else Goalserve (USD 150/mo, live game stats, 30-day trial), else
  Sportradar/Opta when B2B money exists. Any paid step needs Shaun's explicit yes.
- Never scrape SuperSport (robots disallows) or borrow the PREM InCrowd key for a commercial product.

### Roadmap
- **MVP (shipped today + this round):** live score/clock/events/lineups/stats, pitch estimate, win-prob,
  replay, SAST fixtures, glossary; plus sin-bin, explainers, players, follow, where-to-watch, time zone,
  coverage page.
- **v1.1 (next 2–4 weeks, free):** win-prob swing chart over the match; score-correction guard; .ics
  calendar export; shareable full-time recap card; Afrikaans glossary; low-data mode; Springbok-first
  home screen for ZA; collect anonymous usage (self-hosted, no cookies) to learn what sticks.
- **v2 (Six Nations 2027 window, Feb–Mar):** "my players" fantasy watchlist with own-formula points;
  pre-match preview (form, h2h, ratings); multi-match live view; PWA install prompts and TV-cast view
  for pubs; supporter tier on web billing.
- **Paid (RWC 2027, Oct–Nov, AU):** licensed feed if the base justifies it; club team stats for URC/Prem/
  Super Rugby; odds toggle where legal; B2B widget pilot with one SA publisher or pub chain.

### What would kill it
Feed breakage (unofficial APIs can change without notice — keep two sources and the replay fallback),
rights holders objecting to a commercial use of their data (stay non-commercial until licensed), and
building breadth (streaming, news, fantasy) instead of depth (understanding the match).

### Decisions for Shaun
1. Agree the positioning: free, no-login, no-ads "second screen that explains the game", SA first.
2. Name check: keep **TryLine** or pick an SA-flavoured brand before any marketing.
3. Approve nothing paid yet; revisit a licensed feed at the follow-up on 2026-11-21.
