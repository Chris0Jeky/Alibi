/* Player-facing history from the trusted release ledger, included in offline builds. */
(function (G) {
  'use strict';
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  G.AlibiUpdates = {
    page() {
      const releases = G.ALIBI_RELEASES;
      return `<div class="release-history"><div class="eyebrow">THE ALIBI CHANGELOG</div><h1>What’s new.</h1><p>A growing puzzle club, shaped by the people who play it. Here’s what arrived, and what became a little easier to use.</p><p class="collection-caption">You’re playing version ${esc(G.ALIBI_CONFIG.version)}. These notes describe what arrived in each release.</p><nav class="release-index" aria-label="Jump to a version">${releases.map((r) => `<button class="btn secondary small" data-action="release-jump" data-value="${esc(r.version)}">${esc(r.version)}</button>`).join('')}</nav>${releases.map((r) => `<article class="release-entry" id="release-${esc(r.version)}" tabindex="-1"><div class="eyebrow">VERSION ${esc(r.version)} · ${r.date ? `<time datetime="${esc(r.date)}">${esc(new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))}</time>` : 'SOURCE BASELINE'}</div><h2>${esc(r.title)}</h2><ul>${r.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul><div class="release-links">${r.receipt ? `<a href="https://github.com/Chris0Jeky/Alibi/blob/main/${esc(r.receipt)}" target="_blank" rel="noopener noreferrer">Release details ↗</a>` : ''}${r.tag ? `<a href="https://github.com/Chris0Jeky/Alibi/releases/tag/${esc(r.tag)}" target="_blank" rel="noopener noreferrer">GitHub release ↗</a>` : ''}</div></article>`).join('')}<button class="btn" data-action="navigate" data-page="home">Back to your desk</button></div>`;
    },
  };
})(globalThis);
