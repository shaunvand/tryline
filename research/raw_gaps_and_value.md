# Gaps and value: TryLine research (2026-11-07)

Scope note: searches were snippet-level plus one page fetch (arXiv). Items marked UNVERIFIED were not confirmed on the cited page. No Reddit threads or app-store review text on feature requests were surfaced; demand evidence below is indirect.

## Ranked gaps (demand evidence x feasibility with free data), my judgement (estimate)
1. Plain-language TMO/decision context for casual fans (strong evidence, high feasibility via text templates on the ESPN event feed).
2. Live win probability on a second screen (no live consumer product found; feasible with score/time/pre-match rating).
3. Low-data / SA-first mode (SAST, DStv-gated viewing context; feasibility high, direct demand evidence thin).
4. Grassroots/community score feed (crowded by union-body apps; hard to win without club sign-up).
5. Kicking maps / expected points for hardcore fans (research exists, data is not in free feeds).
6. B2B widgets (vendors exist, paid; low fit with free data).
7. Fantasy live points (official games exist; no free official scoring data).

## (a) Casual TV fans: laws, TMO, "why was that a penalty"
- A 2021 academic study (Stoney and Fletcher; 194-fan questionnaire plus governing-body interviews) found fans supported TMO but wanted clearer information; top requests were referee-TMO audio on stadium PA or on-screen captions explaining decisions. Source: [core.ac.uk PDF](https://core.ac.uk/download/286268194.pdf) (read via search excerpt only).
- Premiership Rugby trialled playing referee-TMO conversation over the stadium PA and asked fans for feedback: [Rugby World](https://www.rugbyworld.com/news/fans-hear-referee-decisions-over-stadium-pa-system-133403). PRO14 also considered a TMO change to help fans understand decisions: [RugbyPass](https://rugbypass.com/news/pro14-considering-bold-tmo-change-to-help-fans-understand-decisions-greg-garner).
- Complexity is a recurring barrier. A 2015 Samsung-sponsored British survey reported 90% of respondents did not understand offside (survey size unclear; old): [DJS Research](https://www.djsresearch.co.uk/SportLeisureAndTourismMarketResearchInsightsAndFindings/article/Brits-find-Rugby-laws-confusing-survey-finds-02519).
- Implication: an event-triggered "what just happened" card (penalty type, TMO review pending, yellow card = 10 min) needs no extra data beyond event type. Exact referee reasons are not in free feeds (estimate).

## (b) Hardcore fans: momentum, win probability, expected points, kicking maps, territory
- No live consumer win-probability product for rugby union surfaced. Search found only pre-match tools: [Rugby Analytics AI](https://mwm.ai/apps/rugby-analytics-ai/6762166262) and a GitHub Dixon-Coles/Elo project ([listing](https://awesome.ecosyste.ms/projects/github.com%2Fgmalbert%2Frugby)). This is absence of evidence in a limited search, not proof.
- Sportradar's Rugby API advertises win probabilities, but is a gated paid B2B product: [Sportradar developer docs](https://developer.sportradar.com/rugby/reference).
- Research precedent: Watts and Pipping-Gamon, "Kicking for Goal or Touch? An Expected Points Framework for Penalty Decisions in Rugby Union", arXiv:2512.00312, submitted 29 Nov 2025, revised 26 Jan 2026; used 35,199 phases from 132 matches of 2018/19 Premiership data plus an angle-distance kick model from international records. Source: [arXiv](https://arxiv.org/abs/2512.00312). Phase-level location data exists for research, but it is not a free live feed.
- In-game win probability for rugby league (NRL) exists in the literature, conditioning on score differential, events and a kickoff probability from betting odds: [Annals of Applied Statistics](https://projecteuclid.org/journals/annals-of-applied-statistics/volume-16/issue-1/In-game-win-probabilities-for-the-National-Rugby-League/10.1214/21-AOAS1514.full). Transferable approach for TryLine: score + time + pre-match rating (estimate).
- Union stats apps already show possession, tackles, territory, metres: [Gainline](https://apps.apple.com/us/app/id6642677437). Raw team stats are table stakes; modelled outputs (win probability, zone) are the differentiator.

## (c) Fantasy players
- Official Six Nations fantasy has super-sub rules (tripled/halved points) that are easy to misread: [Six Nations guide](https://sixnationsrugby.com/en/m6n/news/guide-to-six-nations-fantasy-rugby-2025). Superbru also runs Six Nations fantasy: [Superbru](https://www.superbru.com/news/2025-six-nations-fantasy-and-predictor-now-live-on-superbru-rugby).
- A rugby-fantasy app developer claims the top complaint is apps that break when it matters most: [uinno.io](https://uinno.io/blog/how-to-build-fantasy-rugby-app-guide-and-research) (vendor claim, not independent).
- Oval3 (Web3 fantasy rugby, NFT players) raised 2.5 million euros ([Journal du Coin](https://journalducoin.com/nft/oval3-transforme-essais-web3-leve-2-5-millions-euros/)) and was MLR's exclusive fantasy NFT partner (announced Feb 2023, [BeInCrypto](https://beincrypto.com/oval3-mlrs-exclusive-fantasy-nft-partner)). Current status NOT verified.
- No evidence found of demand for auto-sub advice. Official fantasy scoring data is not free (estimate), so low feasibility.

## (d) South Africa
- SA Rugby and SuperSport extended the domestic club competitions deal (Currie Cup, Varsity Cup): [Sportcal](https://www.sportcal.com/news/sa-rugby-and-supersport-extend-domestic-club-competitions-deal/).
- One guide says Showmax closed 30 April 2026 and SuperSport live rugby is now via DStv app/satellite only: [Octafield](https://octafield.com/how-to-watch-rugby) (secondary source, UNVERIFIED).
- Currie Cup 2026 starts 17 July 2026 per [Octafield](https://octafield.com/news/when-does-currie-cup-start-2026); Varsity Cup 2026 ran 16 Feb to 13 Apr: [Wikipedia mirror](https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/2026_Varsity_Cup).
- Varsity Cup non-televised matches were streamed on the SuperSport Schools App in 2022: [SuperSport](https://supersport.com/rugby/general/news/b0c7fea3-b0d6-40c8-abd2-c2e38d5b883c/varsity-matches-to-be-streamed-on-supersport-schools-app). Current status unverified.
- Official Springbok app is mostly historical reference (summaries since 1891, bios, news): [App Store](https://apps.apple.com/in/app/springbok/id656767238).
- Nothing found on Afrikaans-language apps, school-rugby score feeds, or load-shedding/low-data features. These are open, unvalidated gaps. ESPN/World Rugby feeds likely do not cover Currie Cup/school rugby fully (estimate).

## (e) Clubs, coaches, amateur
- Anyscor: scoring app for club staff plus a free fan app, launched with the Energia All-Ireland League: [Irish Times, 11 Jan 2024](https://www.irishtimes.com/business/2024/01/11/app-keeps-fans-of-amateur-sports-up-to-date-on-match-scores/). The article notes most amateur platforms are fan-facing and do not let clubs record updates.
- Rugby Australia's Rugby Xplorer covers grassroots-to-elite live scores: [listing](https://spark.mwm.ai/en/apps/rugby-xplorer/1348617362). NZ provincial apps let teams and referees score games: [South Canterbury](https://www.scrfu.co.nz/game-day-app-1). The Club Referee pushes scores/cards to a fan app: [listing](https://marlvel.ai/apps/the-club-referee).
- Implication: unions with their own apps own this segment; the opening is a union-agnostic scorer, which needs user-entered data, not free feeds.

## (f) Broadcasters and B2B
- Statscore sells rugby widgets (StatsWidgets), ScoutsFeed and SportsAPI: [Statscore](https://www.statscore.com/coverage/sportsapi/rugby/). Data Sports Group sells RWC-focused widgets/microsites: [DSG](https://datasportsgroup.com/news-article/128963/harnessing-the-power-of-data-in-the-2023-rugby-world-cup/). API-Sports publishes a free tier of 100 requests/day with a widget builder: [API-Sports](https://api-sports.io/sports/rugby). No prices published for Sportradar/Statscore; nothing found on Stats Perform/Opta rugby or pub second-screen licensing.
- Second-screen precedent: the RBS 6 Nations Live Challenge app was relaunched by Jam: [The Drum](https://www.thedrum.com/news/rbs-6-nations-live-challenge-app-re-launched-jam); Six Nations dual-screen coverage: [Mobile Marketing](https://mobilemarketingmagazine.com/six-nations-joins-the-dual-screen-scrum/). Both dated; current survival unverified.
- World Rugby bought RugbyPass and launched RugbyPass TV before RWC 2023: [World Rugby](https://www.world.rugby/news/834901/world-rugby-launches-rugbypass-tv-ahead-of-rugby-world-cup-2023-to-transform-entertainment-for-fans-everywhere?lang=en). RugbyPass also has a live scores app: [App Store](https://apps.apple.com/app/id6456941954).

## Fan research and startups
- World Rugby/Nielsen (Nov 2017, 36 nations) claimed 338 million fans: [RugbyPass](https://rugbypass.com/news/world-rugby-make-remarkable-claim-number-global-rugby-fans). World Rugby Fan Survey 2025 (4,000 respondents; Japan, South Africa, Australia, France, Canada, USA, UK) is cited in [Blueprint for Growth 2025](https://resources.worldrugby-rims.pulselive.com/worldrugby/document/2025/10/07/7abf0802-18cd-4aff-bc31-9412346de782/A-Blueprint-For-Growth-2025-ENG.pdf). Content on laws/second-screen NOT read.
- Gainline (Sportive Industries): 4.60 from 18 ratings per third-party tracker [Chrome-Stats](https://chrome-stats.com/d/id6642677437) (not the App Store; tiny sample). A 3-star review cites defunct teams and missing fixtures such as the Nations Cup. Closest direct competitor to TryLine.
- SportsBase and "Rugby AI" as startups: nothing relevant found.

## Prompt-injection note
One search result set reported that a fetched page contained instructions to make an HTTP request; I ignored it.
