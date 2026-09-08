/* Trusted build registry only. Imported packs cannot supply artwork or editorial code. */
(function (G) {
  'use strict';
  const config = G.ALIBI_CURATION;
  const byId = new Map(config.entries.map((e) => [e.id, e]));
  G.AlibiCuration = {
    get: (p) => byId.get(p.id),
    difficulty: (p) => p.difficulty + (byId.has(p.id) ? ' · provisional' : ''),
    collections: config.collections,
  };
})(globalThis);
