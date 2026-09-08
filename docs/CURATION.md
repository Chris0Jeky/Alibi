# Curation Cabinet integration

The source registry is `content/official-packs.json`: the 116-puzzle published pack plus thirteen
16-puzzle packs. `tools/official-catalogue.cjs` validates each bounded pack, rejects duplicate pack
and puzzle IDs globally, and preserves the source definitions after validation. The resulting
324-puzzle catalogue is trusted build output, never a larger user import. The worker still limits
untrusted files to 3 MiB and 150 puzzles, with its existing bounded execution window.

## Baseline and identity

The delivered bundle had 498 matching SHA-256 file receipts. Its pinned main commit is recorded
in [curation/bundle-baseline.json](curation/bundle-baseline.json). The 116 published definitions
match that commit exactly as JSON values. All new core IDs use `curated-{family}-{01..16}`, revision 1.
`content/catalog.json` and `content/legacy.json` remain unchanged. Existing saved runs retain their
pinned definitions; the `alibi-device` identity/version and `.openai/hosting.json` remain unchanged.

The asset work is integrated from committed source only. The other task owns the primary checkout;
this work uses `codex/curation-cabinet` in an isolated worktree. No uncommitted asset work is copied.

## Editorial and content size

The explicit editorial registry maps IDs and revisions to four 52-puzzle thematic anthologies.
These are independent vignettes, not a continuous chronology. The runtime projection includes rules,
controls, a labelled general tactic, and completion-gated answer notes. Initial-board nudges and
native answer traces are retained in the source sidecar but are not displayed as mid-game deductions.
Imported packs cannot add editorial scripts, remote artwork or registry entries.

Difficulty remains provisional and timing is not measured. Machine uniqueness and reducer completion
do not certify enjoyment, human difficulty or a no-guess solving path. Use the
[playtest sheet](curation/PLAYTEST_TEMPLATE.md) for at least two puzzles per family.

Official data is a separately hashed local script, included in the coherent offline release.
The 125 KiB gzip code budget and 1.3 MiB shell budget remain; the latter explicitly excludes official
data. A separate 1 MiB data ceiling and 2.3 MiB total core ceiling bound the expanded release.
Initial code plus data is capped at 200 KiB gzip. `build-info.json` reports both parts and the total;
this does not hide the catalogue download or relabel it as optional.

## Reproduce

- `npm run verify`
- `node tools/verify-curation.cjs` (set `PYTHON` if needed)
- `python tests/browser_ui.py`
- `ALIBI_CURATION_UI=1 ALIBI_UI_WIDTH=390 python tests/browser_ui.py` (set environment variables separately on PowerShell)
- `python tests/browser_origin.py` against the built localhost server

The independent Python solver and native reducer checker cover all 324 definitions. Actual-control
browser runs cover the existing catalogue and representative new puzzles in all thirteen families.
The original published pack remains separate so the bundle checker does not count it twice.

## Remaining acceptance

The 59 challenges, four acquired museum images and final asset commit `3dddb47` are integrated.
The original and new-puzzle UI suites pass, as do 66 curation real-origin controls and every
challenge mechanism at 390/1280px. PR #19 carries the exact head, CI and review receipt.
Hosted acceptance and physical-device playtesting are distinct. Publication requires the reviewed
source and green repository gate; a curation bundle or old report alone is not a deployment receipt.
[HUMAN_TODO.md](../HUMAN_TODO.md) remains the owner-action record, including the affected Android
retest, TalkBack, sustained performance, source licence and name decisions.

## Challenge saves and acquired art

Challenges use a separate `alibi-challenges-v1` database, never the core pack importer. Each run
pins its challenge revision, mechanism, objective, start hash and bounded action log. Queens
and knight prefixes remain fixed, semantic objectives allow alternate valid finishes, and
imported JSON is parsed/replayed in the existing timed worker. Store/mount callers defensively
validate the bounded replay again. Restores atomically retain a pre-restore copy; subsequent
moves retain that copy. Session fallback refuses restore. Unknown/future records are protected.
Challenge export/restore is explicit; the combined cabinet/Club/Quiet backup does not include it.

The trusted art ledger is `assets-source/curation/registry.json`; runtime hashes/transforms are
in `assets-source/curation/runtime.json`. Durer’s Melencolia and celestial map, Hiroshige’s Kanbara
and Van Gogh’s Irises use current Met object-level Open Access records. The Monet candidate
remains unavailable with no placeholder. Four 600px museum images total 155,210 bytes.

`node tools/update-curation-bundle.cjs` creates a versioned, hashed refresh inside the ignored
input folder, including the integrated preview/site, current runtime assets, museum provenance
and source content. It preserves the original 498-file delivery and refuses to overwrite an
existing snapshot. This is a reviewable local artifact, not a publication receipt.
