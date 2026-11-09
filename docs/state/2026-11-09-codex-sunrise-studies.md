# Sunrise Studies: source and evidence handoff

Branch: `codex/sunrise-studies-20261109`

Base: reconciled main `7636d385050e8a3c308cf46cccc615fc3e6fd9ce`

Status: local source change; not published or deployed.

## Short design and plan

Add one official, deferred `Sunrise Studies` pack with 30 Sun & Moon puzzles (15 each at 6×6 and
8×8) followed by 12 7×7 Futoshiki puzzles. Keep both families' classic rules and all existing
published IDs, revisions, definitions and legacy fixtures unchanged. Generate candidates offline
from retained seeds, select for structural variety, prove one semantic answer with native and
independent bounded solvers, and reject D4-equivalent structures plus binary complements against
the earlier catalogue and siblings. Group discovery with searchable subtitles and the existing
catalogue news links. Publish machine evidence and intended clue-based paths; leave human difficulty
calibration and device checks open.

## Delivered content

- `content/extra/sunrise-studies.json`: 42 revision-1 official definitions in one pack. Binary
  clues keep at least two printed symbols in each 6×6 line; its 15 labels progress from Steady to
  Tricky. The 8×8 boards progress from Expert to Master. Futoshiki has six fixed ranks and at least
  eight horizontal and eight vertical comparisons per board; provisional tiers follow visible
  comparison density. These are editorial placements, not measured human ratings.
- `content/curation/editorial/sunrise-studies.json`: per-board seed, definition-bound native and
  independent proof receipt, structural metrics, visible-clue opening, intended reasoning path,
  and a likely mistake. It explicitly records `humanPlaytested: false` and
  `noGuessCertificate: false`.
- `content/curation/editorial/sunrise-baseline.json`: 570-puzzle canonical-definition hash, the
  exact pre-existing registry path order, and the `legacy.json` hash. The test checks the old
  catalogue byte-for-definition unchanged while excluding only the new Sunrise IDs.
- `tools/curation/generate-sunrise.cjs` and `tools/curation/sunrise.cjs`: deterministic offline
  candidate pooling, structural selection, editorial notes and proof gating. The game does not
  import these tools.
- `tools/curation/night-recipes.cjs`: optional 6×6 binary recipe sizing; default 8×8 candidates
  retain their prior behavior. No solver budget or existing puzzle pack was regenerated.
- `tests/helpers/family-studies-grid-oracle.cjs`: binary and Futoshiki independent enumerators
  now expose an explicit 500,000-node bound and exhaustion status. The Futoshiki oracle rejects
  contradictory inequalities even when both endpoints are already given.
- `src/curation.js`: the existing news cards now link to both Sunrise tracks. Searchable subtitles
  let players find the shared study group in the catalogue.
- `content/official-packs.json`, `AGENTS.md`, `README.md` and `docs/PROJECT-MAP.md`: append the
  pack as deferred and refresh measured family/catalogue counts.

## Counts and delivery

The trusted registry grows from 570 puzzles in 32 packs to 612 puzzles in 33 packs. The original
403 startup definitions remain unchanged. Deferred definitions grow from 167 to 209 across ten
packs. Sun & Moon now has 85 puzzles; Futoshiki has 63. The build emits the new pack only in the
existing precached deferred chunk.

## Verification

- Before implementation, the new registered/deferred 30-plus-12 contract failed on the expected
  missing `Sunrise Studies pack exists` assertion.
- `node --test tests/sunrise-studies.test.cjs`: 8 passed, 0 failed, 0 skipped. The suite
  regenerates all selected definitions from their recorded seeds, checks 30/12 family totals and
  15/15 binary sizes, runs exact-definition certificates, validates progression metrics and
  rejects structural/complement duplicates against all earlier compatible content.
- The independent-proof contract separately checks zero, one and multiple semantic solutions for
  both families, plus an exhausted 1-node search. Its fixed-given inequality contradiction first
  failed against the old Futoshiki enumerator, then passed with the initial-edge check.
- `node --test tests/night-authoring.test.cjs tests/night-study-quality.test.cjs tests/official-catalogue.test.cjs`:
  11 passed, 0 failed. Existing seeded Night candidates, quality certificates and trusted
  catalogue validation remain green.
- `node --test tests/official-deferred.test.cjs tests/docs-counts.test.cjs`: 15 passed, 0 failed.
  The built startup/deferred split reproduces the official catalogue and the docs match measured
  family totals.
- `npm run format:check`: passed. `git diff --check`: clean.
- `npm run build:web`: passed. Final emitted values: `puzzles: 612`, `deferredPuzzles: 209`,
  `initialCodeAndContentGzipBytes: 206600`, `deferredContentGzipBytes: 24217`, and
  `javascriptGzipBytes: 135663`.

## Not verified and remaining gate

`node --test tests/budget.test.cjs` passes the application gzip, deferred-content and initial
code/content subchecks, but fails the unchanged precache-shell ceiling. Final accounting is
`coreOfflineBytes` 1,982,065 minus `officialContentBytes` 536,806 = `shellBytes` 1,445,259. The
existing threshold is 1.32 MiB + 60,160 = 1,444,280.32 bytes, leaving a 978.68-byte excess. No
budget was raised. Root owns the shared application-copy trimming and should rerun the budget test
and full clean-head verification after integration.

No human has solved these 42 boards. No no-guess guarantee, completion-time measure, calibrated
difficulty result, hosted build, physical Android/touch/TalkBack result, or phone comfort claim is
made. Continue with the data-first calibration policy in `HUMAN_TODO.md` q-8/q-10 and the device
acceptance session in `HUMAN_TODO.md` q-11 / `docs/PHONE-SESSION.md` S2 and S4. Browser or source
uniqueness checks cannot close those human and physical-device gates.
