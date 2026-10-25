# The Reading Room Blackout: experimental specimen

Refs #441, #437 and #436. Stack on #444's bounded authoring contract. This is original fiction and an authoring experiment, not a published Wrenmere chapter or official cabinet pack.

## Build and play

With Node 22, without installing packages:

```sh
node tools/case-authoring.cjs content/cases/reading-room-blackout.json
node tools/case-preview.cjs content/cases/reading-room-blackout.json reading-room-blackout.html
```

Open the new HTML in a browser. The CLI refuses to overwrite an existing file; choose a new output name for another build. The page carries its source SHA-256 and revision. It has no external scripts, fonts, assets, accounts, network requests or persistent storage. Refreshing or closing resets progress, visibly disclosed on the page. Offline source necessarily includes answer data; this is not an anti-cheat or secrecy boundary against inspection.

## The case

Six records support three stages and nine claims: narrow the removal interval, interpret a silent but disconnected alarm, and distinguish access from identification. Select supported, contradicted or not established, then a smallest sufficient source set. Incorrect input retains the draft. Rechecking cannot remove prior progress or award duplicate completion. Hints advance through orientation, constraint and method; the worked answer is a separate action and does not complete a stage.

Story mode changes presentation only. Daylight/Lamplight, native select/checkbox/button controls, source links and non-drag navigation are available. The experimental conclusion deliberately preserves uncertainty; no arbitrary culprit is revealed after the records fail to identify one.

## Boundaries and proof

`tools/case-session.cjs` consumes an already validated definition. It is a pure, memory-only transition/projection layer, not a public import validator or new save owner. Its player projection excludes authored answer bundles and worked answers. Host integration and durable recovery belong to #442.

`tests/case-blackout-model.test.cjs` independently enumerates 20 fictional worlds: five whole-minute times strictly between the two observations, two possible actors and two door-open states. The alarm remains disconnected and unheard. Each claim has a separately written predicate; uncertainty retains true and false witnesses. It now uses `tools/case-model.cjs`. An empty world set is refused. Both the premise digest and the complete source-byte SHA-256 are pinned, so changes to records, claim wording or answers require model review.

This verifies only the explicitly simplified model, not real-world clock accuracy, all possible natural-language interpretations, clue fairness, rights or enjoyment. The exact citation bundles are authored and still need editorial review; the finite model does not automatically prove each bundle's minimality. #453 owns creator repair testing.

## Reusable model receipts

With Node 22+, import `classifyModels` and `createModelReceipt` from `tools/case-model.cjs`. The executable example is the `model` fixture and mutation tests in `tests/case-blackout-model.test.cjs`; generic controls live in `tests/case-model.test.cjs`. This is an author-test convention with no runtime solver dependency or new official truth authority.

Write the finite model and each claim's synchronous, pure Boolean predicate independently of the answer key. Enumerate **all** admissible models within the stated domains, including alternatives that would disprove the intended answer. `classifyModels(models, predicate, maxModels)` evaluates every supplied world once: all true is `supported`, all false is `contradicted`, and both is `not-established`. Results retain the first canonically ordered true and false witnesses as `{ model: ... }`, or null when no such witness exists. Re-evaluate the predicate on those witnesses in tests. An empty model set throws; it never proves a universal claim. Non-Boolean results, model mutation, sparse/non-JSON model data and a model count above the declared ceiling are refused.

`createModelReceipt(sourceText, model)` first validates the case through the existing authoring parser and checks the adapter's binding. Supply:

| Field | Author responsibility |
| --- | --- |
| `id`, `revision` | Identify and version the model adapter; review and increment when assumptions or predicates change. |
| `caseId`, `caseRevision`, `sourceSha256` | Pin the reviewed case and SHA-256 of its exact UTF-8 source, including whitespace. Never blindly refresh this pin to make a changed case pass. |
| `assumptions` | Nonempty list of explicit simplifications and accepted premises, including clock, access and observation assumptions. |
| `bounds` | Nonempty object of finite, nonempty domain arrays. State units and endpoint semantics in assumptions. |
| `maxModels`, `models` | Explicit integer ceiling in 1..100000 and the complete finite array after applying premises. A partial search or a timeout must not supply a truncated array as proof. |
| `predicates` | Claim-ID-to-predicate object, independently authored; missing predicates produce `unsupported-model`, never an authored-key fallback. |

For an unsupported model adapter, pass `models: null` and a nonempty `unsupportedReason`, retaining the intended assumptions, bounds and ceiling. Its receipt and every claim have `unsupported-model` status with no witnesses or answer agreement. This differs from a zero-world contradiction in the premises, which throws. A partially covered case also has overall `unsupported-model` status while retaining classified claims. A complete classification with any key disagreement has `answer-mismatch`; agreement has `classified`. Neither status means editorial approval. Each claim records the authored answer and a Boolean agreement (null for unsupported claims), after independent evaluation.

Serialize the returned object with `JSON.stringify(receipt, null, 2)` when a review needs an artifact. There is no timestamp or ambient Git dependency: the same source, metadata and pure predicates produce the same bytes, including with reordered models/object keys. Receipts record source hash/byte count, case revision, adapter identity/revision, assumptions, bounds, model count, statuses and witnesses. The source hash binds the case, not the JavaScript adapter; keep the adapter and receipt together in source review. The helper checks the supplied enumeration, not its completeness against prose or domain metadata. Authors must justify that completeness and the prose-to-predicate translation separately.

The Blackout controls deliberately retain unchanged answer keys while (1) changing the hearing clue and its modeled observation, (2) removing the exhaustive actor premise and admitting a Cleo witness, and (3) moving the later check from 18:08 to 18:09, admitting minute 8 as a counterexample to the old strict window. Each changes an expected verdict and produces `answer-mismatch`. Premise removal is a counterfactual adapter test, labelled in its assumptions, not a reinterpretation of the unchanged source. Another control changes only an ambiguous culprit's authored answer and requires the independent oracle to disagree. Mutant hashes are computed for those explicitly authored test inputs; the baseline remains pinned.

### Existing proof gaps and solver tooling

The [continuation contract](../castle/CONTINUATION.md) remains authoritative for proposed chapter scope. This helper does not close those chapters' issues:

| Work | Candidate finite model and required counterexamples |
| --- | --- |
| #53, Chapter II | Enumerate allowed map alignments and adjacency constraints. An omitted route does not identify its editor or prove motive. The proposed Iona reference and independent garden log must exist and be reviewed before modeling attribution or observed travel; absent those records, mark those predicates unsupported or retain alternatives. |
| #76, Chapter III | Model intended, installed and observed warning networks as separate variables. Mutate one connection and remove the observation premise; a feasible path must not imply a delivered warning, and silence must not prove no attempt. |
| #77, Chapter IV | Enumerate bounded capacity/order schedules with explicit open/closed interval endpoints. Vary an endpoint and remove a witness premise; retain alternative schedules rather than infer an exact timestamp, final thought or certain rescue. |

Reuse family-specific legality/solution enumeration from `src/core.js`, `src/engines.js` and `src/bridges.js` where applicable; `tools/validate-pack.cjs` remains the existing pack validation entrypoint. A bounded solver's solution cap is not an exhaustive case enumeration: only feed completed enumeration here, otherwise report unsupported. Keep predicates independent of published solutions and authored answer keys. Do not promote this convention into a general theorem prover until several real cases show a shared need; formal model scope and editorial validity remain separate reviews.

## Reproducible verification

```sh
node --test tests/case-model.test.cjs tests/case-authoring.test.cjs tests/case-reader.test.cjs tests/case-session.test.cjs tests/case-blackout-model.test.cjs tests/case-preview.test.cjs
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_case_workbench.py
```

Local Node evidence after recorded failing contract tests: 88 tests passed across these five files. Existing castle baseline: 70 passed. Generated HTML is about 30 KiB before formatting. These numbers do not imply a full application build or human acceptance.

The local environment lacks cached build/formatter dependencies and blocks Chromium navigation to both file and loopback URLs. No local browser pass is claimed. The read-only exact-head GitHub workflow exercises 320px portrait, desktop and landscape controls, offline reload, keyboard focus, draft preservation, both story modes, staged hints, explicit reveal, restart and hostile authored text. It uploads the specimen, screenshots, source head and browser receipt, plus formatting diagnostics without modifying source. Inspect the current run rather than assuming the added test passed.

Before promotion: independent code/editorial review, current-head CI, actual-source human playtesting and a reviewed existing-host adapter. Keep the prototype outside official registration and startup byte budgets. No production save migration, deployment or external service is part of this PR.
