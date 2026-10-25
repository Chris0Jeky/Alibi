# Experimental evidence-case authoring

Refs #436, #437 and #440. This is authoring tooling, not a new production import format or a shipped case.

Run `node tools/case-authoring.cjs path/to/case.json` with Node 22. Success prints a source-byte SHA-256 receipt and counts. A malformed source exits 1 with a field-path diagnostic. The file reader refuses non-regular files, invalid UTF-8 and sources larger than 262144 bytes. `validateCase` accepts already parsed plain JSON-shaped objects; `parseCase` additionally enforces serialized byte limits.

The versioned contract and implementation sequence are in [the spec](../superpowers/specs/2026-09-27-case-workbench.md) and [the plan](../superpowers/plans/2026-09-27-case-workbench.md). Text limits count UTF-16 code units; byte limits count UTF-8 bytes. A step's prerequisites are AND dependencies. Citations can refer to its own records or transitive prerequisites, not a sibling that happens to have been completed. Alternative sufficient citation sets are unordered and duplicate-free.

Every source has story-on/off prose, three ordered hints, a separately labelled worked answer and original provenance. The receipt is explicitly `structure-only`: it does not prove semantic entailment, uniqueness, fairness, rights or human enjoyment. Unknown fields and future versions are refused, not silently coerced.

## Story-mode parity (#447)

Run `node tools/case-parity.cjs content/cases/reading-room-blackout.json`. The bounded reader
validates the original bytes before `buildParityReceipt()` exports the case ID, revision,
source SHA-256 and actual prose locale (`en`). Authoring receipts and the embedded receipt in
exported preview HTML also identify revision and locale.

The report has separate `mechanical` and `editorial` results. Mechanical parity compares actual
session projections in both modes: stable step/record/claim IDs, prerequisite availability,
visible records and citation choices, ordered hint levels and source links, and worked-answer
access and sources. The shared non-prose contract records the prerequisite graph, verdicts and
accepted sufficient citation sets. Checks cover initial locks, each step with its transitive
prerequisites complete, and all steps complete (including unrelated sibling progress). They do
not enumerate every possible progress subset. A difference exits 1; a structural pass certifies
none of the prose's meaning.

The editorial result always says `required` and `not-certified`, with all 32 prose pairs keyed
by stable paths. Use the [side-by-side checklist](PARITY-REVIEW.md) to record a separate signed
editorial result. Number, negation and uncertainty mutations in `tests/case-parity.test.cjs`
change evidence meaning while the mechanical report still passes; the changed source hash
invalidates any editorial approval bound to the old bytes. Text equality or an AI assessment
must never silently promote a clue or translation to authoritative status.

`py -3 tests/browser_case_workbench.py` completes both modes through the same native controls
at 320px portrait, desktop and landscape sizes. It checks mode switches during invalid drafts,
after hints/reveals, with complete drafts and after each accepted stage: drafts, focus, progress,
source visibility and hint/reveal access must survive. It emits separate
`test-results/case-workbench/mechanical-parity.json` and `editorial-comparison.json`, alongside
`browser.json` and screenshots; the existing case-workbench CI uploads that directory. The
comparison file is an unsigned worksheet, never a semantic approval. Generated receipts remain
ignored local/CI artifacts.

## Future locale contract

Only the English specimen is supported. No locale selector, translation framework or additional
language is introduced. Before adding one, review an actual translated specimen against the same
case ID/revision and compare the non-prose `mechanical.contract` and both `mechanical.modes`
against the source. IDs, record ownership/kinds, prerequisites, verdicts, sufficient citation
sets, visible choices, ordered hint levels and worked-answer access/source links must remain
identical. Compare prose separately using the checklist, with a named human editor and exact
source/translation hashes. AI-generated translation is an unapproved draft until that review.

A future missing or unreviewed translation must fall back explicitly to the complete reviewed
English case, with a visible notice naming the requested locale and English fallback. Export
the actual resolved locale `en`, the requested locale and fallback reason, plus case revision
and source hashes. Never silently mix partially translated clues or label English fallback as
the requested locale. The current CLI accepts only a case path; it cannot request another locale.
These are acceptance rules for future locale work, not a claim that locale loading exists today.

## Verification and remaining work

Local source tests: 47 passed after recorded failing contract tests, including a sparse-array regression. Existing castle suite: 70 passed. These are not a full build or browser result. Local `npm ci --offline` failed because youch-core 0.3.3 was not cached; no dependency versions were changed. The PR's exact-head CI and independent review remain gates.

#441 supplies the original playable specimen and semantic model. #443 adds the author-test-only `tools/case-model.cjs`; its [receipt convention and proof limits](READING-ROOM-BLACKOUT.md#reusable-model-receipts) use that specimen. #442 owns any future adapter to an existing save domain and optional content delivery. The production catalogue, routes, storage, hints, application budgets and all published puzzle definitions remain unchanged.
