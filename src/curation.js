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
    return `<section class="collection-scope" aria-label="Current collection"><span>${active ? `Showing: <strong>${esc(active.title)}</strong>` : 'All collections · original puzzles included'}</span>${active ? '<button id="library-collection-scope-all" class="btn secondary small" data-focus-fallback="library-filter-status" data-action="curation-venue" data-value="">Show all collections</button>' : ''}</section><details class="curation-collections" data-disclosure-key="collections"><summary>Choose a setting <span class="disclosure-hint">Four illustrated collections</span></summary><p class="collection-intro">A harbour observatory, a rain-soaked glasshouse, a gallery after dark, or the last post before snow. Where will your next puzzle take you?</p><button id="library-collection-all" class="btn secondary small" data-action="curation-venue" data-value="" aria-pressed="${!selected}">All collections</button>${collectionCards(selected)}<p class="collection-caption">Each collection brings together ${config.collections[0].puzzleIds.length} standalone puzzles across thirteen games. Pick any record and play at your own pace.</p>${gallery(selected)}</details>`;
  }
  function collectionCards(selected = '', discover = false) {
    return `<div class="collection-cards">${config.collections.map((c) => `<button id="library-collection-${esc(c.id)}" class="collection-card" data-action="${discover ? 'discover-collection' : 'curation-venue'}" data-value="${esc(c.id)}" ${discover ? '' : `aria-pressed="${selected === c.id}"`}><img src="${esc(G.ALIBI_CURATION_MEDIA['cover-' + c.id])}" alt="" width="640" height="400" loading="lazy" decoding="async"><span class="collection-card-copy"><small class="eyebrow">COLLECTION ${esc(c.number)} · ${c.puzzleIds.length} PUZZLES</small><strong>${esc(c.title)}</strong><span>${esc(c.line)}</span><b>${selected === c.id && !discover ? 'Selected collection ✓' : 'Explore collection →'}</b></span></button>`).join('')}</div>`;
  }
  function news() {
    return `<section class="club-news" aria-labelledby="news-title"><div class="news-heading"><div><span class="eyebrow">RECENTLY AT ALIBI</span><h2 id="news-title">Something new to get lost in.</h2><p>More room to think, more places to explore.</p></div><button class="btn secondary" data-action="navigate" data-page="changelog">What’s new · version history →</button></div><div class="news-features"><button data-action="navigate" data-page="library" data-id="binary"><span class="news-symbol" aria-hidden="true">☀ ◐</span><span><small class="eyebrow">FOUR NEW 8 × 8 BOARDS</small><strong>A little more Sun & Moon.</strong><span>Find the balance on a bigger board. Explore all 27 puzzles.</span><b>Play Sun & Moon →</b></span></button><button data-action="navigate" data-page="changelog"><span class="news-symbol" aria-hidden="true">✎</span><span><small class="eyebrow">SHAPED BY PLAYER FEEDBACK</small><strong>Keep your possibilities open.</strong><span>Scene candidate notes, board crosses, clearer help and room for the story.</span><b>See what changed →</b></span></button></div>${collectionCards('', true)}<p class="collection-caption">Four settings, thirteen kinds of puzzle. Each collection is an anthology of independent records, ready to explore in any order.</p></section>`;
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
    collectionCards,
    news,
    cover: (p) => G.ALIBI_CURATION_MEDIA?.['cover-' + get(p)?.venue],
  };
})(globalThis);
