# Shell ids and classes (index.html / styles/base.css)

Views (toggle `.tl-hidden`): `#view-fixtures`, `#view-match`, `#view-glossary`, `#view-settings`, `#view-coverage` (route `#/coverage`).
Fixtures: fill `#view-fixtures` (replace the skeleton card).
Match: `#match-header` (also holds follow stars `[data-follow]`, sin-bin strip, where-to-watch, form, coverage note); `#match-explainer` (between header and tabs, "what just happened" card, dismiss `[data-dismiss-explainer]`, dismissed ids in sessionStorage `tl.dismissedExplainers`); tab strip `#match-tabs` buttons `[data-tab=timeline|pitch|stats|lineups]` (toggle `.active`);
panels `#tab-timeline #tab-pitch #tab-stats #tab-lineups` (toggle `.tl-hidden`; timeline is visible by default).
Glossary: `#glossary-q` (search input, pre-filled from `#/glossary?q=TERM`), `#glossary-list`.
Settings: `#opt-notify` (checkbox), `#opt-followed-only` (checkbox), `#opt-speed` (select, values 1/5/20), `#opt-tz` (select, "" = device time, stored in localStorage `tl.tz`), `#opt-country` (select, where-to-watch country, stored in settings), opened via `#tl-settings-btn`.
Stats tab also holds the Players section (`#players` heading).
Chrome: `#tl-topbar`, `#tl-conn` (`data-status="live|offline"`; also set aria-label/title), `#tl-settings-btn`,
`#tl-install` (hidden; remove `.tl-hidden` on beforeinstallprompt), `#tl-nav` links `[data-nav=fixtures|match|glossary]`
(toggle `.active`; hrefs `#/`, `#/match`, `#/glossary`), `#tl-toasts` (append toast elements; styled via `#tl-toasts>*`).
Classes: `.tl-hidden`, `.tl-card`, `.tl-btn` (`.tl-btn-sm`, `.ghost`), `.tl-chip` (`.active`), `.tl-input`, `.tl-row`,
`.tl-tabs`, `.tl-skeleton`, `.tl-dot`, `.tl-icon-btn`, `.tl-view`, `.tl-panel`.
Tokens: `--bg --card --card2 --fg --muted --accent --home --away --yellow --red --line --r`.
`styles/ui-a.css` and `styles/ui-b.css` are linked but owned by other authors.
