// TryLine service worker. Code/data are network-first (a deploy shows at once); the cache is the offline fallback.
// Bump VERSION when the SHELL list changes.
const VERSION = 'tryline-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './styles/base.css', './styles/ui-a.css', './styles/ui-b.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './data/glossary.json',
  './src/app.js', './src/store.js', './src/settings.js', './src/leagues.js', './src/linker.js', './src/teams.js',
  './src/adapters/index.js', './src/adapters/espn.js', './src/adapters/wr.js', './src/adapters/replay.js',
  './src/model/winprob.js', './src/model/pitch.js', './src/model/ratings.json',
  './src/ui/fixtures.js', './src/ui/header.js', './src/ui/timeline.js', './src/ui/lineups.js', './src/ui/pitch.js',
  './src/ui/stats.js', './src/ui/glossary.js', './src/ui/alerts.js'];
const LIVE_HOSTS = ['api.wr-rims-prod.pulselive.com', 'espn.com'];
const u = (p) => new URL(p, self.registration.scope).href;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(SHELL.map((p) => c.add(u(p)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (LIVE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return; // network-only
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(u('./index.html')).then((r) => r || caches.match(u('./')))));
    return;
  }
  // network-first for every same-origin asset; cache only as the offline fallback
  e.respondWith(caches.open(VERSION).then((c) => fetch(req)
    .then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; })
    .catch(() => c.match(req).then((hit) => hit || Response.error()))));
});
