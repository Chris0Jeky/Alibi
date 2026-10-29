# Experimental evidence-case authoring

Refs #436, #437 and #440. This describes the authoring tools, not a production import
format. The experimental Reading Room case is also integrated into Castle in source;
its [host decision](CASTLE-HOST.md) records delivery, save ownership and remaining gates.

Run `node tools/case-authoring.cjs path/to/case.json` with Node 22. Success prints a source-byte SHA-256 receipt and counts. A malformed source exits 1 with a field-path diagnostic. The file reader refuses non-regular files, invalid UTF-8 and sources larger than 262144 bytes. `validateCase` accepts already parsed plain JSON-shaped objects; `parseCase` additionally enforces serialized byte limits.

The versioned contract and implementation sequence are in [the spec](../superpowers/specs/2026-09-27-case-workbench.md) and [the plan](../superpowers/plans/2026-09-27-case-workbench.md). Text limits count UTF-16 code units; byte limits count UTF-8 bytes. A step's prerequisites are AND dependencies. Citations can refer to its own records or transitive prerequisites, not a sibling that happens to have been completed. Alternative sufficient citation sets are unordered and duplicate-free.

Every source has story-on/off prose, three ordered hints, a separately labelled worked answer and original provenance. The receipt is explicitly `structure-only`: it does not prove semantic entailment, uniqueness, fairness, rights or human enjoyment. Unknown fields and future versions are refused, not silently coerced.

## Share projection (#452)

`share(definition, completed)` in `tools/case-session.cjs` returns a frozen
`postern-case-share-1` object from an allowlist: `caseId`, `revision` and a fixed invitation
`text` naming the case title. It validates progress using step IDs and prerequisites, but never
discloses progress, authored answers, hints, notes or saves. The output is identical at every
progress boundary. Unknown case formats and malformed identities are refused. The preview shows
the exact text before an explicit copy. Cancel before copying has no clipboard side effect;
Copy and Cancel are disabled while the browser handles a request. Restart dismisses its UI
result, but cannot undo a clipboard request already sent. Nothing is posted. Method labels,
landing links are not implemented. The workbench preview and experimental Castle player both
show the invitation before an explicit Copy; neither posts it or includes the Castle notebook.

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

The initial authoring slice recorded 47 local source tests and 70 Castle tests; that historical
evidence is not a current full-build or browser result. See the relevant change handoffs for
exact-head qualification and outstanding gates.

#441 supplies the original playable specimen and semantic model. #443 adds the author-test-only
`tools/case-model.cjs`; its [receipt convention and proof limits](READING-ROOM-BLACKOUT.md#reusable-model-receipts)
use that specimen. #442's [Castle adapter](CASTLE-HOST.md) uses the existing Castle notebook
and optional delivery for this experimental case; it does not create a new save authority or
change Chapter I. Source integration is not evidence of public deployment, physical-device
acceptance or editorial approval.

## Playtest receipt (#455)

`tools/case-playtest-receipt.cjs` is a memory-only collector embedded in the workbench preview. It is off until a tester presses **Start playtest receipt**; until then every recorder is a no-op. It builds a `postern-case-playtest-1` object from an allowlist: case ID, revision and source SHA-256, the story modes used, and per visited stage its ID, outcome (`completed` or `not-completed`), hint and reveal request counts, an `assisted` flag and explicit `priorAssistance` baseline, check submissions split into incomplete (interface) and reasoning rejections, repeat checks after completion, plus one tester observation of at most 500 characters. Events are capped at 500 (`truncated` reports the cap). Answers, citations, notes, saves, device details and timestamps are never read into it.

The same collector now powers the optional Castle Reading Room receipt. Collection stays off
until **Start local playtest receipt** is chosen. The player loads a content-hashed receipt module
only after that choice, checks its listed size and SHA-256, then stores the module in the existing
case-pack cache for a controlled offline return. A first start may need a same-origin code download;
no receipt or player data is sent. If the module is not cached and a connection is unavailable,
collection does not start. Without a controlling service worker, the browser's later `import()` can
make its own request, so the first checked fetch alone is not a guarantee about the exact bytes the
browser executes. The module uses the existing trusted same-origin hashed-asset boundary rather
than adding another loader or cache policy.

Privacy/utility trade-off: with no timeline, the receipt cannot measure time on task or order of actions, and by design it does not support a difficulty score from speed. Counts begin at consent. The workbench preview marks help used earlier in that page as prior assistance without importing hint/reveal counts; reloading drops that page-only baseline. Castle snapshots one boolean per stage from the current saved hint/reveal indicators when the tester starts collection; it does not backfill their counts or reconstruct an exhaustive history. Help saved in another tab after that snapshot is not inferred as prior assistance. These baselines contribute to `assisted`. Outcomes retain already-completed stages when visited. Counts say what help was requested, not whether it was read or needed; the incomplete/reasoning split is a shape heuristic (an empty verdict or no cited source), not intent. No identifying details or reasoning are collected automatically; the tester controls the optional observation and reads the exact JSON before copying it. Copying is the only output; **Discard receipt**, restart and reload drop it from page memory; they cannot erase an earlier clipboard copy or cancel one already requested. No receipt or player data is transmitted. Any later transmission should reuse the owner's existing feedback/Pulseboard direction rather than a new service or SDK. Tests use observation text labelled as a synthetic fixture; no human observation has been collected yet.
