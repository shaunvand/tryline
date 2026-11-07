// Laws glossary + ref decision explainer. Data lives in data/glossary.json (loaded by the app, passed in).
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

const hit = (obj, q) => !q || Object.values(obj).some(v => String(v).toLowerCase().includes(q));

/** Filter helper (exported for tests). data = {terms, decisions}. */
export function filterGlossary(data, query = "") {
  const q = String(query || "").trim().toLowerCase();
  return { terms: (data?.terms || []).filter(t => hit(t, q)), decisions: (data?.decisions || []).filter(d => hit(d, q)) };
}

let cache = null;
export function setGlossary(data) { cache = data; }
/** Browser: fetch data/glossary.json (relative to this module) once and cache it. */
export async function loadGlossary() {
  if (!cache) cache = await (await fetch(new URL("../../data/glossary.json", import.meta.url))).json();
  return cache;
}

/** renderGlossary({query, data}). `data` defaults to the cached glossary (call loadGlossary() first). */
export function renderGlossary({ query = "", data = cache } = {}) {
  const { terms, decisions } = filterGlossary(data, query);
  const termHtml = terms.map(t => `<article class="tl-gl-item"><h3>${esc(t.term)}</h3><p>${esc(t.short)}</p>` +
    `<dl><dt>Law</dt><dd>${esc(t.law)}</dd><dt>Ref signal</dt><dd>${esc(t.refSignal)}</dd><dt>Why it matters</dt><dd>${esc(t.whyItMatters)}</dd></dl></article>`).join("");
  const decHtml = decisions.map(d => `<tr><td>${esc(d.decision)}</td><td>${esc(d.signal)}</td><td>${esc(d.outcome)}</td></tr>`).join("");
  return `<div class="tl-glossary"><input class="tl-gl-search" type="search" placeholder="Search laws and terms" value="${esc(query)}" aria-label="Search glossary">` +
    `<section><h2>Ref decision explainer</h2>${decHtml ? `<table class="tl-gl-table"><thead><tr><th>Decision</th><th>Signal</th><th>Usual outcome</th></tr></thead><tbody>${decHtml}</tbody></table>` : `<p class="tl-empty">No matching decisions.</p>`}</section>` +
    `<section><h2>Laws and terms (${terms.length})</h2>${termHtml || `<p class="tl-empty">No matching terms.</p>`}</section></div>`;
}
