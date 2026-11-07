# Shell ids and classes (index.html / styles/base.css)

Views (toggle `.tl-hidden`): `#view-fixtures`, `#view-match`, `#view-glossary`, `#view-settings`.
Fixtures: fill `#view-fixtures` (replace the skeleton card).
Match: `#match-header`; tab strip `#match-tabs` buttons `[data-tab=timeline|pitch|stats|lineups]` (toggle `.active`);
panels `#tab-timeline #tab-pitch #tab-stats #tab-lineups` (toggle `.tl-hidden`; timeline is visible by default).
Glossary: `#glossary-q` (search input), `#glossary-list`.
Settings: `#opt-notify` (checkbox), `#opt-speed` (select, values 1/5/20), opened via `#tl-settings-btn`.
Chrome: `#tl-topbar`, `#tl-conn` (`data-status="live|offline"`; also set aria-label/title), `#tl-settings-btn`,
`#tl-install` (hidden; remove `.tl-hidden` on beforeinstallprompt), `#tl-nav` links `[data-nav=fixtures|match|glossary]`
(toggle `.active`; hrefs `#/`, `#/match`, `#/glossary`), `#tl-toasts` (append toast elements; styled via `#tl-toasts>*`).
Classes: `.tl-hidden`, `.tl-card`, `.tl-btn` (`.tl-btn-sm`, `.ghost`), `.tl-chip` (`.active`), `.tl-input`, `.tl-row`,
`.tl-tabs`, `.tl-skeleton`, `.tl-dot`, `.tl-icon-btn`, `.tl-view`, `.tl-panel`.
Tokens: `--bg --card --card2 --fg --muted --accent --home --away --yellow --red --line --r`.
`styles/ui-a.css` and `styles/ui-b.css` are linked but owned by other authors.
