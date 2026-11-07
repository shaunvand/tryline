# TryLine competitor audit (draft, analyst pass, 2026-11-07)

Inputs: six scout files in `research/raw_*.md`, `RESEARCH.md`, and a check of the TryLine source (`src/`) so the quick wins don't repeat shipped features. I also pulled the latest GB App Store reviews myself from the iTunes RSS feeds the official-apps scout cited, so section 4 has real quotes.

Conventions:
- "(est)" marks an estimate or inference.
- "(tracker)" marks a third-party ratings site, not the store itself.
- "(Apple, XX)" marks a figure read from Apple's API or page for storefront XX.
- Ratings differ by storefront. Where scouts give different numbers for the same app, I list each one with its source and don't average them.
- Complaint counts come from small samples: about 12 recent reviews per app (official-apps scout) or about 4 visible reviews per page (complaints scout). Treat every frequency as directional.
- Google Play pages were not read by any scout. Every Android figure is (tracker).
- Reddit and forums were unreachable. No Reddit evidence is in this audit.

---

## 1. Competitor landscape

### 1a. Official competition and union apps

**Six Nations Rugby Official** (iOS id489164343; Android)
- Features: live match centre, Fantasy Rugby, highlights, team news, fixtures, stats, table, player profiles, quizzes, live notifications, Autumn Nations Series; English, French, Italian. [App Store GB](https://apps.apple.com/gb/app/six-nations-official/id489164343)
- Platforms: iOS, Android.
- Data depth: official data partner, so full squads and stats in principle (est). Recent reviews report wrong squads, positions and stats, and line-ups not loading. [review feed](https://itunes.apple.com/gb/rss/customerreviews/id=489164343/sortby=mostrecent/json)
- Price: free.
- Ratings, with a conflict: 4.68 from 13,800 (Apple, GB) [lookup](https://itunes.apple.com/lookup?id=489164343&country=gb). 4.7 from 932 (Apple, US) [App Store US](https://apps.apple.com/us/app/-/id489164343). Android 3.28 from about 1.3K (tracker) [AppGoblin](https://appgoblin.info/apps/com.sixnationsrugby). These are storefront differences, not errors.
- Verdict: the best-rated official app, but data accuracy is poor and fantasy spam hurts it. Android is weak.

**PREM Rugby** (iOS id1148123668)
- Features: news, fixtures, match centre with live scores and tables, video, club notifications, final coverage and tickets. [App Store](https://apps.apple.com/gb/app/id1148123668)
- Platforms: iOS; Android not verified.
- Data depth: live scores, line-ups, tables. The InCrowd feed behind premrugby.com has about 178 stats per team, but the app doesn't expose that depth (est; see `RESEARCH.md`).
- Price: free.
- Ratings: 4.56 from 3,396 (Apple, GB), version 3.18.2, 2026-11-03 [lookup](https://itunes.apple.com/lookup?id=1148123668&country=gb). Android not verified.
- Verdict: polished and well rated. Users can't find live games, the black-on-red score is hard to read, and scores are slow at half time.

**United Rugby Championship (URC)** (iOS id1436694463; Android org.pro14rugby.app)
- Features: news, match centre with line-ups, live text commentary with stats, tables, alerts, fantasy, predictor, polls, highlights. [App Store](https://apps.apple.com/app/id1436694463)
- Platforms: iOS, Android.
- Data depth: richest on paper (live text commentary), but the app is unstable.
- Price: free. Streaming is a separate app, URC TV: 1.56 from 149 (tracker), last updated 2025-09-25 [AppGoblin](https://appgoblin.info/apps/tv.urc).
- Ratings: 3.16 from 19 (Apple, GB) [lookup](https://itunes.apple.com/lookup?id=1436694463&country=gb). Android 2.88 from 514 (tracker) [AppGoblin](https://appgoblin.info/apps/org.pro14rugby.app). Conflict: an older snapshot of the same tracker showed 1.76 from 478.
- Verdict: the weakest major official app. Users report crashes after updates, broken login and lost features.

**Men's Rugby World Cup 2027** (World Rugby, iOS id1436008780)
- Features: not verified by the scouts. Reviews mention fantasy, player info only in the browser, and no archive.
- Platforms: iOS; Android not verified.
- Data depth: live scores and fixtures; reviews report lagging and reversed scores.
- Price: free.
- Ratings: 4.71 from 9,101 (Apple, GB), last release 2025-12-01 [search](https://itunes.apple.com/search?term=world%20rugby&country=gb&entity=software&limit=25).
- Verdict: high rating, probably from the tournament surge (est). The main complaints are login and registration friction and laggy or wrong scores. [review feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436008780/sortby=mostrecent/json)

**Other World Rugby apps** [same search](https://itunes.apple.com/search?term=world%20rugby&country=gb&entity=software&limit=25)
- Platforms: iOS (Android not verified). Price: free. Data depth and features not verified.
- HSBC SVNS: 4.43 from 3,229 (Apple, GB).
- Laws of Rugby: 4.21 from 14 (Apple, GB).
- Verdict: a sevens-only app, plus a laws reference with a small audience. Neither is a live union companion.

**NZR+ / All Blacks & Black Ferns Rugby** (iOS id6450051979)
- Features: live match centre, team and player profiles, highlights, archive, news, fixtures, and a Gaming tab with free Super Rugby Pacific predictors. [lookup NZ](https://itunes.apple.com/lookup?id=6450051979&country=nz), [App Store](https://apps.apple.com/us/app/nzr/id6450051979)
- Platforms: iOS; Android not verified.
- Data depth: live match centre; stat depth not verified.
- Price: free download; subscription price not verified.
- Ratings: 3.98 from 310 (Apple, NZ).
- Verdict: the nearest thing to a Super Rugby app, but it is NZ-centric.

**Springboks** (Ticketmaster UK, iOS id6760295918)
- Features: ticketing only (buy, resell, transfer, entry). No scores or stats. [lookup ZA](https://itunes.apple.com/lookup?id=6760295918&country=za)
- Platforms: iOS; Android not verified.
- Data depth: none (no scores or stats). Price: free.
- Ratings: 4.0 from 89 (Apple, ZA), updated 2026-11-04.
- Context: fans struggled with the ticket route. [Daily Maverick](https://www.dailymaverick.co.za/article/2026-08-20-springboks-ticket-strategy-leaves-fans-frustrated/)
- Older SARU Springbok app: stats, bios and match summaries back to 1891; current status not verified. [listing](https://apps.apple.com/in/app/springbok/id656767238)
- Verdict: no official SA live-scores app exists.

**Rugby Australia and RFU** [AU lookup](https://itunes.apple.com/lookup?id=1361376895&country=au), [GB search](https://itunes.apple.com/search?term=England%20Rugby%20RFU&country=gb&entity=software&limit=15)
- Platforms: iOS (Android not verified). Price: free. Data depth: no fan scores or stats.
- Rugby Match Day: 1.66 from 65 (Apple, AU). It is a scoring tool for match officials.
- Allianz Twickenham: 2.12 from 131 (Apple, GB). It is a stadium app.
- England Rugby Learning: 4.54 from 837 (Apple, GB). It is for coaching education.
- Verdict: neither union has a fan scores app.

**Top 14 (LNR) and Super Rugby Pacific**
- No official consumer app was found for either. The finding comes from searches, so it is not proof.
- LNR's "ELLIS" is an internal tool. [PR Newswire](https://www.prnewswire.com/fr/news-releases/la-ligue-nationale-du-rugby-lnr-marque-des-points-grace-a-lautomatisation-des-processus-dappian-301864030.html)
- Third-party Rugby Addict: iOS, 3.84 from 146 (Apple, FR), last updated 2017; price and data depth not verified. [search FR](https://itunes.apple.com/search?term=Top%2014%20LNR%20rugby&country=fr&entity=software&limit=15)
- Verdict: an open niche, and TryLine already covers both (Top 14 with the real clock and stats from World Rugby).

### 1b. Score and broadcaster apps

**Gainline: Rugby Live Scores** (iOS id6642677437) [App Store US](https://apps.apple.com/us/app/id6642677437)
- Features: Six Nations, RWC, Premiership, URC, Top 14, Super Rugby; minute-by-minute timelines, line-ups, match stats, Match Insights, Referee Watch, player ratings, weather, head-to-head, broadcast info by country, Lock Screen Live Activities, widgets, custom alerts.
- Platforms: iOS (no web or Android found; scout estimate).
- Data depth: events, line-ups, match stats, player ratings; source feed not stated.
- Price: free, with Gainline Pro at USD 2.99 or 6.99 a month and USD 19.99 or 39.99 a year.
- Ratings: 4.6 from 18 (Apple, US). The same figure appears on a tracker. [Chrome-Stats](https://chrome-stats.com/d/id6642677437)
- Scout conflicts: the developer is "Red Davis" (score scout) or "Sportive Industries" (gaps scout). "iOS-only, no web" is a scout estimate.
- Verdict: the closest rival on features, with a tiny audience. Users report missing fixtures (Nations Cup) and defunct MLR teams.

**RugbyPass / RugbyPass TV** (World Rugby; iOS id6456941954, one app id with four reported figures)
- Features: streaming (SVNS, U20, Pacific Nations Cup), news, stats database, live scores, tables, line-ups, team sheets, alerts for followed teams and players, Chromecast, option to hide scores. [App Store ZA](https://apps.apple.com/za/app/rugbypass-tv/id6456941954)
- Platforms: iOS, TV and Chromecast; Android not verified.
- Price: free app. An undated help article gives USD 7.99 a week, 19.99 a month and 159.99 a year (unverified, may be stale).
- Ratings: 4.50 from 1,686 (Apple, GB) [search](https://itunes.apple.com/search?term=world%20rugby&country=gb&entity=software&limit=25). 4.6 from 226 (Apple, ZA). 4.8 from 1.9K (Apple, US) [App Store US](https://apps.apple.com/us/app/rugbypass-live-scores-news/id6456941954). 4.8 from 646 (tracker) [AppPricingLab](https://apppricinglab.com/app/apple/6456941954).
- Data depth: also the only free source of live text commentary, but only by scraping HTML (`RESEARCH.md`).
- Verdict: strong World Rugby-owned asset. Users report login loops (the developer says VPN users can't sign in), streams failing at big events, and unclear geo limits.

**Union Live** (Sportsmate, iOS id416969111)
- Features: rugby union aggregator (scores, fixtures, news, podcasts).
- Platforms: iOS; Android not verified.
- Data depth: scores and fixtures; coverage of competitions varies by season (reviews).
- Price: free with ads (reviews mention ad clutter).
- Ratings: 4.44 from 11,466 (Apple, AU), updated 2026-07-16 [search AU](https://itunes.apple.com/search?term=super%20rugby%20pacific&country=au&entity=software&limit=25). The complaints scout gives 4.4 from 11K. [App Store AU](https://apps.apple.com/au/app/union-live/id416969111)
- Verdict: a big base, but coverage of internationals and the Rugby Championship comes and goes, and the app has ad and podcast clutter.

**Ultimate Rugby** (iOS id565995979) [App Store](https://apps.apple.com/app/id565995979)
- Features: all-rugby aggregator with a paywall on lower-tier competitions.
- Platforms: iOS; Android not verified.
- Data depth: scores and replacements; card detail reportedly reduced (secondary, unverified).
- Price: free with ads plus a subscription; price not found.
- Ratings: 2.9 from 102 (Apple).
- Verdict: praised as "the only thing out there" for all rugby, but punished for its paywall and video pop-ups.

**6 Nations - Rugby Scores Live** (third-party, iOS id414001342) [App Store](https://apps.apple.com/app/id414001342)
- This is not the official app.
- Features, data depth: game times and game stats (reviews). Platforms: iOS. Price: not found.
- Ratings: 4.8 from 273 (Apple).
- Verdict: proof that a basic, simpler app can beat the official one ("Much more user friendly than the official Guinness app").

**Flashscore** (iOS id766443283) [App Store ZW](https://apps.apple.com/zw/app/id766443283?l=en-gb)
- Features: generalist score app. Rugby coverage is unclear: the page lists the Rugby Nations Championship but not rugby in its sports list.
- Price: Flashscore+ ad-free at GBP 3.99 a month or GBP 29.99 a season. [Flashscore UK](https://www.flashscore.co.uk/news/flashscore-introduces-ad-free-flashscore-with-new-subscription-prices/xfLPIrAs) In-app purchase prices conflict: USD 4.99 and 34.99 on the listing, 2.99 in a search summary.
- Platforms: iOS, Android, web.
- Data depth for rugby: scores and line-ups (reviews); stat depth not verified.
- Ratings: 4.7 from 1.3k (Apple, ZW).
- Verdict: football-first. Rugby line-ups shown in random order, plus flickering and reversing scores on Trustpilot.

**Sofascore** (iOS id1176147574) [App Store](https://apple.co/2yHgLKU)
- Features: 25 sports including rugby union and league. Ratings and heatmaps cover only 38 football-oriented leagues; it has Attack Momentum. Whether these work for rugby is unverified.
- Platforms: iOS, Android, web.
- Data depth for rugby: scores and pages for union and league competitions; deeper features unverified.
- Price: free with ads; only an old USD 0.49 "Remove Ads 1 month" entry seen, no current Premium price verified.
- Ratings, with a conflict: 4.88 from about 70.3K (tracker) [AppGoblin](https://appgoblin.info/apps/1176147574). 4.9 from about 21K (Apple, GB) [App Store GB](https://apps.apple.com/gb/app/id1176147574).
- Verdict: excellent generalist, shallow on rugby (est). Complaints about intrusive ads and an odds tab that won't hide.

**LiveScore**
- Minimalist, with ads and no ad-free option. The only source is a Sofascore-authored comparison, so it is biased. [Sofascore](https://www.sofascore.com/news/sofascore-vs-livescore-which-live-score-app-should-you-use/)
- Platforms: iOS, Android, web. Price: free with ads. Ratings: not found.
- Verdict: rugby depth unverified.

**ESPN app**
- Rugby depth in the main app is unverified. An old standalone RugbyNow app existed. [ESPN Africa](https://africa.espn.com/rugby/story/_/id/14854537/rugby-scores-go-download-rugbynow)
- Ratings conflict: 4.7 from about 4.0M (tracker) [AppFollow](https://apps.appfollow.io/ios/espn-live-sports-scores/317469184?country=us), versus a claim of 1.53 rising to 2.68 for one version [MWM](https://mwm.ai/articles/espn-live-sports-scores-v8-19-1-addresses-major-performance-issues-in-june-2026).
- Platforms: iOS, Android, web. Price: free with ads.
- Verdict: ESPN is TryLine's data source more than a rival.

**Broadcasters**
- **BBC Sport**: Six Nations live text, reports and highlights; free in the UK. [Digital TV Europe](https://digitaltveurope.com/2024/02/06/bbc-unveils-six-nations-broadcast-plans) Two reviewers (URC, PREM) say they fall back to the BBC for accurate scores (see section 4).
- **Sky Sports**: 4.6 from about 248,700 (tracker, undated). [AppFollow](https://apps.appfollow.io/ios/sky-sports/500102120?country=gb) Rugby depth unverified.
- **TNT Sports via discovery+**: GBP 30.99 to 32.99 a month (low-quality guides). [discovery+](https://get.discoveryplus.com/gb/watch-entertainment-and-sport?snb=4)
- **SuperSport / DStv**: from 17 Sep 2026, Sports R399 a month on Stream (about USD 22, est) and R479 on satellite. Springbok Tests stay on Premium at R799. [Briefly](https://briefly.co.za/sports/rugby/252786-dstvs-r479-sports-package-springbok-tests-r500-premium-wall/) The SuperSport app is 4.4 from about 31K (Apple, ZA) [App Store ZA](https://apps.apple.com/za/app/supersport/id356818029). The score scout couldn't find a rating, but the complaints scout did. Showmax reportedly closed 30 Apr 2026 (secondary source, unverified). [Octafield](https://octafield.com/how-to-watch-rugby)
- **Stan Sport (AU)**: about AUD 20 a month as an add-on (one source says AUD 15). Wallabies rights unconfirmed. [Budget Seniors](https://www.budgetseniors.com/streaming/stan-subscription/)
- Verdict: expensive viewing (USD 13 to 40 a month, est). A free second screen sits beside these apps, not against them.

### 1c. Fantasy

**Official Guinness Six Nations Fantasy** [Fantasy Rugby Geek](https://fantasyrugbygeek.com/fantasy-rugby-games-overview-official-guinness-six-nations-2026-fantasy-game/)
- Rules: 200-star cap; 15 starters plus a Supersub (points tripled); Captain doubles; max 4 players per country.
- Scoring includes carried metres (1 point per 10 m), 50-22 (7), steals, cards and Player of the Match (15). Ownership percentages are shown.
- Platforms: web and inside the Six Nations app. Data depth: official per-player scoring.
- Price: free; entry price not stated. Ratings: see the Six Nations app (1a).
- Verdict: the reference fantasy game. The Supersub rules are easy to misread. [Six Nations guide](https://sixnationsrugby.com/en/m6n/news/guide-to-six-nations-fantasy-rugby-2025)

**Superbru**
- Free web, iOS and Android predictor and fantasy games: Six Nations, URC, Champions Cup, Super Rugby, Premiership, RWC, Top 14 predictor. [Superbru](https://www.superbru.com/home/sport.php?back=1&s=1), [Top 14](https://www.superbru.com/top14)
- Data depth: predictions and fantasy; no live stats found. Price: free.
- The 2026 Six Nations fantasy shows as inactive. Ratings: a 4.8 self-claim, unverified.
- Verdict: dominant SA-born predictor brand. It does predictions, not a live companion.

**DraftXV** [site](https://www.draftxv.com/)
- Free head-to-head draft fantasy for URC (up to 12 managers) and Premiership (up to 10), with a live draft room and trades.
- It is the only product found with a live in-game matchup score.
- Platforms: web (apps not verified). Price: free. Ratings: not found. Data depth: per-player fantasy scoring; data source not stated.
- Verdict: a niche product; its live view validates the "my players right now" need.

**Others**
- Official Super Rugby Pacific fantasy, Dream XV Rugby (Premiership) and Draft Rugby (Super Rugby, URC) are listed by [Fantasy Rugby Geek](https://fantasyrugbygeek.com/resources/) but weren't opened.
- Oval3: Web3/NFT fantasy that raised EUR 2.5M [Journal du Coin](https://journalducoin.com/nft/oval3-transforme-essais-web3-leve-2-5-millions-euros/) and was MLR's partner in 2023 [BeInCrypto](https://beincrypto.com/oval3-mlrs-exclusive-fantasy-nft-partner). Current status unverified.

### 1d. Betting trackers

**Hollywoodbets Live Scores (SA)** [FAQ](https://www.hollywoodbetslivescores.co.za/faqs)
- Free; covers rugby, with alerts for match start and tries; Android, Huawei and iOS.
- Data depth: live scores and stats; data provider unknown. Ratings: not found.
- Verdict: a sportsbook acquisition funnel. Try alerts are table stakes.

**Betway Scores** [App Store](https://apps.apple.com/gh/app/betway-scores/id1364404446)
- Platforms: iOS. Price: free. Ratings: not found.
- No rugby in the sport list the scout saw.

**Not found**: Bet365, Sportingbet, and any Sportradar or Genius link to SA rugby trackers.

**Widget vendors**
- Sportal365 sells a rugby livescore widget to publishers. [Sportal365](https://knowledge-base.sportal365.com/rugby-livescore-widget)
- Stats Perform markets live visualisations; its page returned 403. [Stats Perform](https://www.statsperform.com/betting-fantasy/betting-content/live-content-visualisations/)

### 1e. Data, ratings, coaching and grassroots

**Data and rating providers** (all B2B or editorial: web or API only, no store ratings)
- **Oval Insights**: B2B live win-predictor and kick-success APIs for Premiership, URC, European Cup, Sky and Channel 9, delivered via AWS. No consumer product. [Broadcast](https://www.broadcastnow.co.uk/production/aws-and-oval-insights-unveil-data-driven-rugby-insights/5186253.article), [TVBEurope](https://www.tvbeurope.com/?p=114679)
- **Sportradar Rugby API**: enterprise. It advertises win probabilities. [docs](https://developer.sportradar.com/rugby/reference) Price estimates conflict: about USD 1,000+ a month (`RESEARCH.md`) versus USD 5-10k a month in competitor blogs ([SharpAPI](https://sharpapi.io/compare/sportradar-alternative)). Both are unverified.
- **Stats Perform / Opta**: official Six Nations and Premiership data partner; price by quote. The Opta Index gives action-point player ratings and a team of the week. [The Analyst](https://theanalyst.com/articles/european-rugby-team-of-the-week-jalibert-takes-top-spot)
- **RugbyPass Index**: ML player and team ratings, launched 2018. Current status and price unknown. [RugbyPass](https://rugbypass.com/news/rugbypass-index-rpi-officially-launched)
- **Statscore, Data Sports Group, API-Sports**: sell widgets and APIs. API-Sports has a free tier of 100 requests a day; the others publish no price. [Statscore](https://www.statscore.com/coverage/sportsapi/rugby/), [DSG](https://datasportsgroup.com/news-article/128963/harnessing-the-power-of-data-in-the-2023-rugby-world-cup/), [API-Sports](https://api-sports.io/sports/rugby)
- **Goalserve rugby**: USD 150 a month, 750 for 6 months, 1,000 a year. [Goalserve](https://www.goalserve.com/v/sport-data-feeds/rugby-api/prices)
- **Rugby Analytics AI**: pre-match predictions only. [MWM](https://mwm.ai/apps/rugby-analytics-ai/6762166262)

**Coaching tools** (desktop or web software for analysts; no store ratings found; prices from a reseller page, so possibly biased) [AnalysisPro](https://www.analysispro.com/nacsport-vs-hudl-sportscode)
- Hudl Sportscode: price by quote, est GBP 1,000 to 5,000 a year.
- Nacsport: GBP 125 to 1,845 a year.
- Catapult One: from USD 179.99 a year; a USD 70k claim for the full system is low confidence. [Fitgap](https://us.fitgap.com/products/055754/stats-hosted-solutions)
- Kinovea and LongoMatch have free tiers. [Frame Sports](https://framesports.ai/blog/free-vs-paid-rugby-analysis-software)
- Sportable smart-ball trial in the Premiership. [SportBusiness](https://sportbusiness.com/news/premiership-rugby-to-trial-sportables-smart-ball-tech-in-northern-hemisphere-first)
- Verdict: built for analysts, not fans. Little overlap with TryLine.

**Grassroots scoring** (iOS and Android apps run by unions; free for fans; ratings not collected by scouts)
- Anyscor: a club-staff scorer plus a free fan app (All-Ireland League). [Irish Times](https://www.irishtimes.com/business/2024/01/11/app-keeps-fans-of-amateur-sports-up-to-date-on-match-scores/)
- Rugby Xplorer (Rugby Australia). [listing](https://spark.mwm.ai/en/apps/rugby-xplorer/1348617362)
- NZ provincial game-day apps. [SCRFU](https://www.scrfu.co.nz/game-day-app-1)
- The Club Referee. [listing](https://marlvel.ai/apps/the-club-referee)
- Verdict: unions own this segment, and it runs on user-entered data. A weak fit for TryLine.

---

## 2. Economics and margins

### Revenue models seen
- **Ads plus an ad-free upgrade**: Flashscore, Sofascore, Union Live, LiveScore (ads only).
- **Freemium subscription**: Gainline Pro, Ultimate Rugby (paywalled competitions), RugbyPass TV (streaming).
- **Owner marketing, free**: Six Nations, PREM, URC, RWC, NZR+. The apps support tickets, fantasy sponsors and video rights.
- **Betting affiliate or operator funnel**: Hollywoodbets Live Scores. Sofascore runs a large affiliate arm. [SBC News](https://sbcnews.co.uk/europe/2024/07/05/sofascore-affiliate-leaders/)
- **B2B data and widgets**: Oval Insights, Sportradar, Statscore, Sportal365, Goalserve.

### Benchmarks
- **FotMob**, FY2024, from iGamingToday citing filings: NOK 129.05M revenue (about EUR 11M), EBITDA NOK 56.7M (about 44% margin, est), 29 staff, 20M+ MAU, so about USD 0.55-0.60 revenue per MAU per year (est). [iGamingToday](https://www.igamingtoday.com/fotmob-the-norwegian-success-story-youve-probably-never-heard-of/) Anomaly: pre-tax profit (NOK 63.6M) is higher than EBITDA, which the article doesn't explain. Third-party revenue guesses of USD 5.6-8.6M are below the filing figure and unreliable. [Prospeo](https://prospeo.io/c/fotmob), [Growjo](https://growjo.com/company/FotMob)
- **Sofascore**: USD 10-15M a year (Similarweb, third party, snippet). [Similarweb](https://www.similarweb.com/company/sofascore.com) The company claims 40M MAU. [Sofascore](https://www.sofascore.com/news/sofascore-among-top-sports-apps-in-2026)
- Audited LiveScore and Flashscore revenue: not found.

### Price points
- **Ad-free subscription**: Flashscore+ GBP 3.99 a month or GBP 29.99 a season. [Flashscore UK](https://www.flashscore.co.uk/news/flashscore-introduces-ad-free-flashscore-with-new-subscription-prices/xfLPIrAs) A market point of about USD 4-5 a month (est).
- **Rugby-specific Pro**: Gainline USD 2.99-6.99 a month, 19.99-39.99 a year.
- **Ad eCPM**: banners USD 0.50-1.50 in tier-1 markets. [Playwire](https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect) South Africa iOS banners USD 0.16-0.22, and interstitials USD 2.45-3.80 (2023 data from games, not sports). [PocketGamer.biz](https://www.pocketgamer.biz/mobile-ecpms-grow-by-20-percent-this-march-2023-in-mature-markets) No sports-specific figure was found.
- **Betting affiliate**: CPA USD 25-150 (UK), 25-90 in emerging markets; revshare 30-45%; SA from 35%. [Track360](https://track360.io/blog/affiliate-commission-rates-benchmark-2026) Australian rates and the legal limits on promoting betting were not researched.
- **Store fees**: 15% on subscriptions (Google from day one; Apple under the Small Business Program, or from year two). [RevenueCat](https://revenuecat.com/blog/engineering/small-business-program), [AppleInsider](https://appleinsider.com/articles/21/10/21/google-play-drops-all-subscription-commissions-to-15-from-day-one) A PWA billed on the web avoids store fees but pays processor fees (not researched).

### Feed costs compared with revenue
- **TryLine today**: USD 0. It uses ESPN and World Rugby public JSON with no key (`RESEARCH.md`).
- **Paid floor**: API-Sports PRO about USD 15-19 a month (price unverified; its pricing page returned 403); Goalserve USD 150 a month; Sportradar enterprise (estimates conflict, see 1e).
- **Labelled risk**: `RESEARCH.md` rates both free feeds GREY and says the accepted norm is "personal, non-commercial, low-rate use" and "not for resale". Adding ads, a subscription or affiliate links probably moves TryLine outside that norm. A paid feed may then be needed (est). Goalserve costs USD 1,000 a year on the annual plan or USD 1,800 on monthly billing, which is about 45 to 80% of the USD 2.3k modelled ad income at 10k MAU.
- **Unresolved tension** (for the lead):
  - The complaints evidence favours staying free and ad-free (ads and paywalls are complaint theme 6 below; the complaints scout ranks them 2 and 3 in its own sample).
  - The economics scout's safe baseline is ads plus an ad-free upgrade.

### Illustrative unit economics (every number is est)
Assumptions, from the economics scout:
- 8 sessions per MAU a month, 3 ad impressions per session (24 impressions per MAU a month), blended eCPM USD 0.80.
- Premium at USD 3.99 a month, 0.5% of MAU convert, net USD 3.39 after a 15% fee.
- Affiliate: 0.1% of MAU make a first deposit each month, at USD 60 CPA.
- Hosting USD 20 / 100 / 800 a month. Free feeds. Seasonality and betting legality ignored.

I checked the arithmetic: 10k × 24 × 0.80 / 1000 = USD 192 a month.

- **10k MAU**: ads USD 192 a month (USD 2.3k a year); premium 50 subscribers, USD 170 a month (USD 2.0k a year); affiliate 10 first deposits, USD 600 a month (USD 7.2k a year). Hosting is about 10% of ad revenue.
- **100k MAU**: ads USD 23k a year; premium USD 20k a year; affiliate USD 72k a year. About 90% margin on ads after hosting.
- **1M MAU**: ads USD 230k a year; premium USD 203k a year; affiliate USD 720k a year.

Sanity check: modelled ad yield is about USD 0.23 per MAU a year, compared with FotMob's about USD 0.55-0.60 (FotMob earns more per user).

Takeaways (est):
- Ads alone need about 50k MAU to reach USD 1k a month.
- Affiliate earns about 3x ads per MAU where it's legal.
- Rugby is seasonal and spikes at weekends, so MAU swings a lot through the year.
- Real cost: founder time, plus a paid feed if TryLine goes commercial.

### Audience size
- RWC 2023: 1.33bn viewing hours, 85% free-to-air. [World Rugby](https://www.world.rugby/news/904424/rugby-world-cup-2023-was-the-most-viewed-rugby-event-of-all-time)
- SA v NZ, Aug 2024: about 4M on SABC plus about 1M on SuperSport, broadcaster-reported. [EWN](https://www.ewn.co.za/sa-vs-nz-4-million-watched-1st-test-match-on-sabc-2nd-match-inaccessible-why)
- Rugby reportedly overtook soccer as SA's most-watched sport. [EWN 2026](https://www.ewn.co.za/2026/05/28/rugby-becomes-most-watched-sport-in-sa-as-bokke-unite-fans)
- World Rugby/Nielsen 2017 claimed 338M fans. [RugbyPass](https://rugbypass.com/news/world-rugby-make-remarkable-claim-number-global-rugby-fans)
- Average attendance: URC 11.2k [RugbyPass](https://rugbypass.com/news/urc-breaks-audience-and-attendance-records), Premiership 15.4k [Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%9326_Premiership_Rugby).
- Not found: SA rugby app download numbers, Top 14 audience.

---

## 3. Gaps: work nobody has done well (ranked by evidence × feasibility with free data)

1. **Plain-language decision context for casual fans.**
   - Evidence: a 2021 study of 194 fans asked for captions or audio that explain TMO calls [core.ac.uk](https://core.ac.uk/download/286268194.pdf). The Premiership trialled ref audio over the stadium PA [Rugby World](https://www.rugbyworld.com/news/fans-hear-referee-decisions-over-stadium-pa-system-133403). A 2015 survey said 90% of respondents didn't understand offside (old, sample size unclear) [DJS](https://www.djsresearch.co.uk/SportLeisureAndTourismMarketResearchInsightsAndFindings/article/Brits-find-Rugby-laws-confusing-survey-finds-02519). A Six Nations reviewer asked for "player and rules information" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=489164343/sortby=mostrecent/json).
   - Feasibility correction: the gaps scout calls TMO cards "high feasibility via the ESPN event feed", but neither free feed has a TMO, review or penalty-reason event. TryLine's `Match` contract has none either (`ARCHITECTURE.md`). TryLine can't detect a pending TMO review.
   - What is feasible: event-triggered explainers for the types that do exist (yellow card = 10-minute sin bin, red card, penalty try, penalty goal, drop goal, missed kick). TryLine already has a static glossary tab; the gap is linking it to live events.
2. **Live in-game win probability for union.**
   - No consumer product found. Only pre-match tools [Rugby Analytics AI](https://mwm.ai/apps/rugby-analytics-ai/6762166262), B2B (Oval, Sportradar) and NRL research [AoAS](https://projecteuclid.org/journals/annals-of-applied-statistics/volume-16/issue-1/In-game-win-probabilities-for-the-National-Rugby-League/10.1214/21-AOAS1514.full).
   - TryLine already ships this. The gap is to keep it labelled as a model and explain it.
3. **One honest place for Top 14 and Super Rugby Pacific, plus stable coverage of every competition.**
   - Neither has an official app (1a).
   - Aggregators lose competitions: Union Live, Gainline (Nations Cup), Ultimate Rugby (section 4, theme 1). URC users lost the Champions and Challenge Cup.
   - Feasible: ESPN covers all of these.
4. **Accurate, fast, readable basics with no login.**
   - Official apps get squads, scores and scenarios wrong, scores are slow at half time, colours are unreadable, and login walls block use (section 4).
   - Gap: execution quality, not data. Feasible today.
5. **SA-first experience.**
   - The Springboks app sells tickets only. Viewing costs R399 to R799 on DStv. No Afrikaans, school-rugby or low-data app was found (absence, not validated demand).
   - Feasibility limits: ESPN Currie Cup data is stale since 2022 (`RESEARCH.md`), Varsity Cup and schools are not covered, and SuperSport's API is blocked by robots.txt. SAST times are already shipped.
6. **Per-player live view (fantasy "my players right now").**
   - Only DraftXV has a live matchup score. The official Six Nations fantasy has complex scoring.
   - Feasibility: World Rugby `playerStats` exist for internationals and Top 14 only. TryLine already shows a top-5 per side (tackles, carries, metres) from `src/adapters/wr.js` in the stats panel. Missing: a per-player watchlist, fuller lines (turnovers, defenders beaten, cards) and a points-style estimate. Official fantasy points can't be replicated exactly; label it "own formula".
7. **Club team stats (possession, territory, tackles) for URC, Premiership and Super Rugby.**
   - Free feeds don't have them: World Rugby excludes URC and Premiership, and ESPN's rugby stats array is empty. Only the InCrowd feed has them, with a borrowed key (grey, excluded).
   - Low feasibility without a paid feed.
8. **Expected points and kicking maps.**
   - Research exists [arXiv 2512.00312](https://arxiv.org/abs/2512.00312), but it needs phase or location data. World Rugby's `position {x,y}` is null in practice.
   - Not feasible on free data, except a simple kick-odds model, which TryLine already has.
9. **Grassroots scoring and B2B widgets.**
   - Served by union apps and paid vendors (1e).
   - Weak fit for free feeds.

---

## 4. Biggest complaints (ranked themes)

Sample: official-apps scout (about 12 recent reviews per app, 7 apps); complaints scout (about 4 visible reviews per page, 8 sources); my re-pull of 4 GB review feeds on 2026-11-07. Counts are what was seen in these samples, not shares of all reviews. Conflict: the complaints scout ranks missing competitions first. This audit puts wrong data first because it adds the official-app review samples, where data errors dominate.

### 1. Wrong, stale or slow data (about 14 reviews across the Six Nations, RWC, PREM, URC, Ultimate Rugby and Flashscore apps)
- Six Nations, 2026-02-04: "Squads not complete players missing!! And positions in back three, centres etc incorrect." [feed](https://itunes.apple.com/gb/rss/customerreviews/id=489164343/sortby=mostrecent/json)
- RWC app, 2023-10-08: "How can an app dedicated to the Rugby World Cup report incorrect scores? 18 ENG SAM 19 was actually 19 ENG SAM 18!!" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436008780/sortby=mostrecent/json)
- PREM, 2026-09-05: "only One of the three games showing on the Home Screen have any scores showing at half time" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1148123668/sortby=mostrecent/json)
- Flashscore (football), 2026-09-15: "suddenly 1-0 but there is no goal and after 10 min back to 0-0" [Trustpilot](https://ca.trustpilot.com/review/flashscore.com)

### 2. Login walls and account friction (about 9 reviews: URC, Six Nations, RWC, RugbyPass)
- URC, 2026-08-22: "trying to login and password not recognised, resetting and no emails to reset the password" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436694463/sortby=mostrecent/json)
- RWC app, 2026-02-05: "no option to autofill password or copy & paste it in - so had to manually type in 20 character password" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436008780/sortby=mostrecent/json)
- Six Nations, 2026-05-12: "it logged me out again but I can't sign back in" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=489164343/sortby=mostrecent/json)
- RugbyPass: login loop, and the developer says VPN users can't sign in (scout paraphrase). [App Store ZA](https://apps.apple.com/za/app/rugbypass-tv/id6456941954)

### 3. Missing or disappearing competitions and features (about 8 reviews: Union Live, Gainline, URC, Ultimate Rugby)
- Union Live, 2024-07-14: "sometimes there's international matches, then they're gone!!" [App Store AU](https://apps.apple.com/au/app/union-live/id416969111)
- URC, 2025-09-26: "Notifications are gone, other leagues have disappeared" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436694463/sortby=mostrecent/json)
- Gainline: "it doesn't have all the fixtures such as the Nations Cup" [App Store US](https://apps.apple.com/us/app/id6642677437)

### 4. Update regressions, crashes and cluttered or unreadable UX (about 10 reviews: URC, PREM, SuperSport, Sofascore, third-party 6 Nations app)
- URC, 2025-10-03: "It's looks prettier but response times are much worse. The league table is last season's" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436694463/sortby=mostrecent/json)
- PREM, 2026-06-07: "Worse thing ever is the black on red scores for live matches, which is impossible to read." [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1148123668/sortby=mostrecent/json)
- Third-party 6 Nations app, 2019: unclear which games are live, "Very vague". [App Store](https://apps.apple.com/app/id414001342)

### 5. Can't find where or how to watch (about 7 reviews: PREM, Six Nations, RugbyPass)
- PREM, 2026-01-31: "It is incredibly difficult to find how to watch the match" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1148123668/sortby=mostrecent/json)
- Six Nations, 2026-02-21: "Where is the tv channel that I can watch each game, it used to tell is on each fixture." [feed](https://itunes.apple.com/gb/rss/customerreviews/id=489164343/sortby=mostrecent/json)
- PREM, 2026-04-04: "Cannot get live matches Paying for tnt" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1148123668/sortby=mostrecent/json)

### 6. Intrusive ads and paywalls (about 8 reviews: Ultimate Rugby, Sofascore, Flashscore)
- Ultimate Rugby, 2018-11-18: "Data that was free is now moved behind the paywall" [App Store](https://apps.apple.com/app/id565995979)
- Ultimate Rugby, 2024-11-08: "unwanted videos constantly pop up" [App Store](https://apps.apple.com/app/id565995979)
- Sofascore, 2024-04-03: "the ad placement is very intrusive" [App Store GB](https://apps.apple.com/gb/app/id1176147574)

### 7. Unwanted notifications (about 3 reviews: Six Nations, SuperSport, Flashscore)
- Six Nations, 2026-03-07: "I've turned off the fantasy rugby notifications but I keep getting peppered with them" [feed](https://itunes.apple.com/gb/rss/customerreviews/id=489164343/sortby=mostrecent/json)
- SuperSport: setting one reminder cancels the other, and there's no sign that a reminder is set (scout paraphrase). [App Store ZA](https://apps.apple.com/za/app/supersport/id356818029)

### 8. Streaming failures at big events (3 reviews: RugbyPass, SuperSport)
- RugbyPass, 2025-03-30: "seems to shut down every time there is an hsbc tournament" [App Store US](https://apps.apple.com/us/app/rugbypass-live-scores-news/id6456941954)
- Not directly relevant to a non-streaming PWA. It shows that peak-load reliability is what users judge.

### Not evidenced
- No reviews were found about late rugby notifications or battery drain. Don't claim them.

### What users praise
- **One app for all rugby**: Ultimate Rugby, "the only thing out there". [App Store](https://apps.apple.com/app/id565995979)
- **Simplicity over official apps**: "Much more user friendly than the official Guinness app"; "Basic but what I need". [App Store](https://apps.apple.com/app/id414001342)
- **Speed and rugby focus**: Gainline. [App Store US](https://apps.apple.com/us/app/id6642677437) PREM: "gives lineups and scores almost as soon as it happens". [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1148123668/sortby=mostrecent/json)
- **Timeline**: URC, "March centre timeline is really good".
- **Requests**:
  - Lock-screen or Dynamic Island pinning (URC 2024-12-15 [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436694463/sortby=mostrecent/json); RugbyPass Live Activities).
  - iCal fixture subscription (third-party 6 Nations app). [App Store](https://apps.apple.com/app/id414001342)
  - Following all games, not just one team (RWC 2025-08-24). [feed](https://itunes.apple.com/gb/rss/customerreviews/id=1436008780/sortby=mostrecent/json)
  - A fantasy game in the PREM app.
- **Fallback to the BBC for accuracy**: URC 2026-01-24; PREM 2026-06-12.

---

## 5. What would make a companion clearly more valuable, by segment

Free data TryLine has:
- ESPN: scores, events, cards, subs and line-ups for every league. The club-match clock is estimated, and there are no team stats.
- World Rugby: the real clock, team stats and player stats for internationals and Top 14.
- Not available: tracking, commentary, TMO or penalty reasons, odds.

### TV fans (casual, second screen beside the broadcast)
- Value: understand what just happened (sin-bin clock, card meaning, scoring explainers), see the score at a glance in readable colours, and know where to watch.
- Feasibility: high. Sin-bin and explainers use event types alone; for club matches the sin-bin timer runs on the estimated clock (est. clock). Where-to-watch needs a hand-kept static file per country and competition (upkeep each season). TMO context isn't detectable.

### Hardcore fans
- Value: win probability with a swing chart, momentum, territory and possession, last-10-minute splits, player stat lines, projected score.
- Feasibility: high for internationals and Top 14 (World Rugby stats, including last-10 possession and territory). Club matches get only modelled outputs, labelled "not in free feed". Expected points and kick maps aren't feasible.

### Fantasy players
- Value: "my players" watchlist with live stat lines (carries, metres, tackles, turnovers) and an approximate points estimate; top performers.
- Feasibility: medium. Player stats cover internationals and Top 14 only, which matches the Six Nations fantasy window. Points must be labelled "own formula", not official. No URC or Premiership player stats for DraftXV users.

### SA-specific
- Value: SAST by default, Springbok Tests and URC SA teams first, an Afrikaans glossary option, low data use (no images), "on SABC or DStv" viewing info.
- Feasibility: high for Tests, URC and the Rugby Championship. Low for the Currie Cup (ESPN stale since 2022) and Varsity or schools rugby (not in free feeds; SuperSport's API is blocked by robots.txt). Demand for Afrikaans and low-data use isn't validated.

### Clubs and coaches
- Value: grassroots scoring, clip tagging.
- Feasibility: low. It needs user-entered data and union relationships. Paid analysis tools already exist. The only fit is an exportable match summary (event timeline to text or CSV) for pro matches.

### Broadcasters and B2B
- Value: embeddable win-probability and pitch widgets for publishers and pubs.
- Feasibility: low under the current data terms. The free feeds are "not for resale" (`RESEARCH.md`), so any B2B offer needs a licensed feed (Goalserve, Sportradar). Oval Insights already sells broadcast-grade versions.

---

## 6. Candidate quick wins (buildable in hours on the free data, none already shipped)

Already shipped, so excluded: opt-in try, card and full-time alerts; "Data stale" banner and updated stamp; static glossary and decision explainer; line-ups sorted by number; SAST times; league filter; "Live now" group; momentum; win probability and projected score; replay; top-5 players per side (tackles, carries, metres) for internationals and Top 14.

1. **Sin-bin countdown**
   - What: a 10-minute timer per yellow card on the match header, plus "14 v 15" player counts. Built from the yellow-card event clock. For club matches the timer uses the estimated clock and shows "est. clock".
   - Value 5. Effort 2-3 h.
   - Answers: gap 1 (decision context); fans asking for "rules information".
2. **"What just happened" card**
   - What: a card slides in on yellow, red, penalty try, penalty goal, drop goal or missed kick, with a one-line plain-English meaning and a link to the matching glossary entry. No TMO, which can't be detected.
   - Value 4. Effort 3 h.
   - Answers: gap 1 (2021 fan study).
3. **Fantasy-style player points and watchlist** (internationals and Top 14)
   - What: extend the existing top-5 list (tackles, carries, metres) to every player with turnovers, defenders beaten and cards from World Rugby `playerStats`, add an "own formula" points score in Six Nations Fantasy style, and let users star players (localStorage).
   - Value 4. Effort 4-6 h.
   - Answers: gap 6 (fantasy); Six Nations "squads and stats wrong" complaints; Opta and RPI-style ratings are paid or editorial.
4. **Follow teams** (localStorage, no login)
   - What: pin followed teams' fixtures to the top, with an option to alert only for followed teams. Everything stays visible.
   - Value 4. Effort 3 h.
   - Answers: login-wall complaint (theme 2); unwanted-notification complaint (theme 7); RWC user locked to one team.
5. **Where to watch**
   - What: a static JSON per competition and country (SA: SuperSport/SABC; UK: TNT/BBC/ITV; AU: Stan; NZ: Sky) shown on each fixture.
   - Value 4. Effort 3-4 h, plus a seasonal update.
   - Answers: theme 5 (PREM, Six Nations "where is the tv channel"); Gainline already has this.
6. **Local time-zone toggle**
   - What: use the device time zone, with SAST as an option. Fixtures are SAST-only today.
   - Value 4 for non-SA users. Effort 1-2 h.
   - Answers: gap 3 (Top 14 and Super Rugby fans outside SA).
7. **Calendar export (.ics)**
   - What: export or subscribe to a competition's or followed team's fixtures, generated client-side from the ESPN scoreboard.
   - Value 3. Effort 2-3 h.
   - Answers: iCal request in the third-party 6 Nations app reviews.
8. **Score-correction guard**
   - What: if a score goes down or an event disappears, show "score corrected by feed" instead of flickering silently, and hold try alerts until the score is confirmed on the next poll.
   - Value 3. Effort 2 h.
   - Answers: theme 1 (Flashscore 1-0 to 0-0; RWC reversed score).
9. **Coverage page**
   - What: one screen listing, per league, what is live and what is estimated (for example "Top 14: real clock + stats"; "URC: events + line-ups, clock estimated"; "Currie Cup: not available"), linked from each match footer.
   - Value 3. Effort 2 h.
   - Answers: theme 3 (coverage that comes and goes); the complaints scout's "label coverage honestly".
10. **Shareable full-time recap**
    - What: an auto-generated text card (score, try scorers, cards, biggest win-probability swing), shared with the Web Share API and the app link. No image server.
    - Value 3. Effort 2-3 h.
    - Answers: no-install growth loop; the "basic but what I need" praise. No direct complaint; a growth gap.
