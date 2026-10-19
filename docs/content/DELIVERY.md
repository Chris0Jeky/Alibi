# Declaring deferred content

Register an official pack in `content/official-packs.json`'s ordered `packs` list, then add its
path once to that file's `deferred` list to defer its definitions: the build keeps startup listing
entries, places full definitions in the existing precached chunk, retains the complete worker
ID catalogue for import/backup collision checks, and accounts for both scripts exactly once.
Never reorder `packs` or edit published IDs/revisions to change delivery. For an optional WebP,
add one object to `content/asset-delivery.json`'s `deferred` list, for example
`{"id":"study-art","file":"assets-source/studies/art.webp","sha256":"<64 lowercase hex digits>","fallback":"club-reading-room"}`;
`fallback` names existing core artwork in `ALIBI_MEDIA` or `ALIBI_CURATION_MEDIA`. This uses the
existing verified image loader, hashed `enhanced-` assets and `enhancementBytes` receipt, outside
startup and the core precache; show it with `data-adaptive-image="study-art"` on an image whose
`src` is the fallback. The build requires a matching `source.file` or `derivative.file` in
`assets-source/curation/registry.json`: that same source or derivative must have a `sha256`
equal to the declaration, and its registry record must have a nonempty `rights.licence` or
`source.rights`. Files may live under `assets-source/` or the registry policy's `derivativeRoot`
(`src/curation-assets/`). If paths repeat, any one record must satisfy both the hash and rights
checks; separate records cannot supply them independently. Images are limited to 1 MiB
and remain optional offline until cached; official puzzles stay offline-ready. Rebuild and run
the budget, official-deferred, delivery-build, accounting and worker tests after declaring either.
