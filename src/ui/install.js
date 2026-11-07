// Add-to-home-screen hint. Pure helpers, all browser APIs guarded so this loads under Node.
const VISITS_KEY = "tl.visits", DISMISS_KEY = "tl.installDismissed", DAY = 86400000, SNOOZE_DAYS = 14, MIN_VISITS = 2;

const defStorage = () => { try { return globalThis.localStorage; } catch { return null; } };
const readNum = (st, k) => { try { const n = Number(st?.getItem(k)); return Number.isFinite(n) ? n : 0; } catch { return 0; } };

export function platform() {
  try {
    if (globalThis.navigator?.standalone === true) return "standalone";
    if (globalThis.matchMedia?.("(display-mode: standalone)")?.matches) return "standalone";
    const ua = globalThis.navigator?.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (globalThis.navigator?.platform === "MacIntel" && globalThis.navigator?.maxTouchPoints > 1);
    if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "desktop" : "ios-safari";
    if (/Android/.test(ua)) return "android";
  } catch { /* fall through */ }
  return "desktop";
}

const SHARE_SVG = '<svg class="tl-share-glyph" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
const CLOSE = '<button type="button" class="tl-icon-btn" data-install-dismiss aria-label="Dismiss">&times;</button>';

// canInstall: true when a beforeinstallprompt event has been captured (Android/desktop).
export function renderInstallHint(plat, canInstall = true) {
  if (plat === "ios-safari") {
    return `<div class="tl-card tl-install-hint" role="note"><span>Install TryLine: tap Share ${SHARE_SVG} then &lsquo;Add to Home Screen&rsquo;</span>${CLOSE}</div>`;
  }
  if ((plat === "android" || plat === "desktop") && canInstall) {
    return `<div class="tl-card tl-install-hint" role="note"><span>Get TryLine on your device for quick access.</span><button type="button" class="tl-btn tl-btn-sm" data-install-btn>Install app</button>${CLOSE}</div>`;
  }
  return "";
}

// Counts a visit per call; call once per page load (e.g. from boot) via recordVisit.
export function recordVisit(storage = defStorage()) {
  try { const n = readNum(storage, VISITS_KEY) + 1; storage?.setItem(VISITS_KEY, String(n)); return n; } catch { return 0; }
}

export function shouldShowHint(storage = defStorage(), nowMs = Date.now()) {
  if (!storage) return false;
  if (readNum(storage, VISITS_KEY) < MIN_VISITS) return false;
  const d = readNum(storage, DISMISS_KEY);
  return !(d && nowMs - d < SNOOZE_DAYS * DAY);
}

export function dismissHint(storage = defStorage(), nowMs = Date.now()) {
  try { storage?.setItem(DISMISS_KEY, String(nowMs)); } catch { /* storage unavailable */ }
}
