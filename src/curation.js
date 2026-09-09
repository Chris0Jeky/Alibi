/* Trusted build registry only. Imported packs cannot supply artwork or editorial code. */
(function (G) {
  'use strict';
  const config = G.ALIBI_CURATION;
  const byId = new Map(config.entries.map((e) => [e.id, e]));
  const get = (p) => {
    const entry = byId.get(p.id);
    return entry?.revision === p.revision ? entry : undefined;
  };
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  function notes(p, completed) {
    const n = get(p);
    if (!n) return '';
    return `<section data-curation-notes><p>${esc(n.goal)}</p><p>${esc(n.controls)}</p><ul>${n.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><h3>A general tactic</h3><p>${esc(n.tactic)}</p><p class="fine">This is a strategy, not a forced deduction. Difficulty is provisional; human playtesting and completion-time measurement are still needed.</p>${completed ? `<h3>Answer notes · spoilers</h3><ul data-curation-answer>${n.answer.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p>Answer notes become available after completing this puzzle.</p>'}</section>`;
  }
  function collectionPicker(selected = '') {
    const active = config.collections.find((c) => c.id === selected);
    return `<section class="collection-scope" aria-label="Current collection"><span>${active ? `Showing: <strong>${esc(active.title)}</strong>` : 'Showing all collections, including original puzzles'}</span>${active ? '<button class="btn secondary small" data-action="curation-venue" data-value="">Show all collections</button>' : ''}</section><details class="curation-collections" data-disclosure-key="collections"><summary>Explore four themed collections</summary><p>208 standalone puzzles in four thematic anthologies. These are separate vignettes, not a continuous murder story. Difficulty is provisional; times have not been measured.</p><div class="row"><button class="btn secondary small" data-action="curation-venue" data-value="" aria-pressed="${!selected}">All collections</button>${config.collections.map((c) => `<button class="btn secondary small" data-action="curation-venue" data-value="${esc(c.id)}" aria-pressed="${selected === c.id}">${esc(c.title)} · 52</button>`).join('')}</div>${gallery(selected)}</details>`;
  }
  function gallery(venue) {
    const works = (config.artwork || []).filter(
      (a) => a.kind === 'museum-image' && (!venue || a.venue === venue),
    );
    return `<details class="curation-gallery" data-disclosure-key="gallery"><summary>Museum interludes and credits</summary><p>Complete artwork stays on your device. Sharper detail loads when available and is kept for offline viewing when storage allows.</p><button class="btn secondary small" data-asset-mode aria-pressed="${G.AlibiDelivery?.mode() === 'local'}">Use less data · compact artwork only</button><div>${works.map((a) => `<figure><img data-adaptive-image="${esc(a.id)}" src="${esc(G.ALIBI_CURATION_MEDIA?.[a.id])}" alt="${esc(a.alt)}" loading="lazy" decoding="async"><figcaption><strong>${esc(a.title)}</strong><p>${esc(a.note)}</p><small>${esc(a.credit)} <a href="${esc(a.source)}" target="_blank" rel="noopener noreferrer">Museum object record</a></small></figcaption></figure>`).join('')}</div></details>`;
  }
  G.AlibiCuration = {
    get,
    difficulty: (p) => p.difficulty + (get(p) ? ' · provisional' : ''),
    collections: config.collections,
    notes,
    collectionPicker,
    cover: (p) => G.ALIBI_CURATION_MEDIA?.['cover-' + get(p)?.venue],
  };
})(globalThis);
