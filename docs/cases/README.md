# Experimental evidence-case authoring

Refs #436, #437 and #440. This is authoring tooling, not a new production import format or a shipped case.

Run `node tools/case-authoring.cjs path/to/case.json` with Node 22. Success prints a source-byte SHA-256 receipt and counts. A malformed source exits 1 with a field-path diagnostic. The file reader refuses non-regular files, invalid UTF-8 and sources larger than 262144 bytes. `validateCase` accepts already parsed plain JSON-shaped objects; `parseCase` additionally enforces serialized byte limits.

The versioned contract and implementation sequence are in [the spec](../superpowers/specs/2026-09-27-case-workbench.md) and [the plan](../superpowers/plans/2026-09-27-case-workbench.md). Text limits count UTF-16 code units; byte limits count UTF-8 bytes. A step's prerequisites are AND dependencies. Citations can refer to its own records or transitive prerequisites, not a sibling that happens to have been completed. Alternative sufficient citation sets are unordered and duplicate-free.

Every source has story-on/off prose, three ordered hints, a separately labelled worked answer and original provenance. The receipt is explicitly `structure-only`: it does not prove semantic entailment, uniqueness, fairness, rights or human enjoyment. Unknown fields and future versions are refused, not silently coerced.

## Verification and remaining work

Local source tests: 47 passed after recorded failing contract tests, including a sparse-array regression. Existing castle suite: 70 passed. These are not a full build or browser result. Local `npm ci --offline` failed because youch-core 0.3.3 was not cached; no dependency versions were changed. The PR's exact-head CI and independent review remain gates.

#441 owns the original playable specimen and semantic model. #442 owns any future adapter to an existing save domain and optional content delivery. #443 owns reusable semantic counterexample tooling. The production catalogue, routes, storage, hints, application budgets and all published puzzle definitions remain unchanged.

## Playtest receipt (#455)

`tools/case-playtest-receipt.cjs` is a memory-only collector embedded in the workbench preview. It is off until a tester presses **Start playtest receipt**; until then every recorder is a no-op. It builds a `postern-case-playtest-1` object from an allowlist: case ID, revision and source SHA-256, the story modes used, and per visited stage its ID, outcome (`completed` or `not-completed`), hint and reveal request counts, an `assisted` flag, check submissions split into incomplete (interface) and reasoning rejections, repeat checks after completion, plus one tester observation of at most 500 characters. Events are capped at 500 (`truncated` reports the cap). Answers, citations, notes, saves, device details and timestamps are never read into it.

Privacy/utility trade-off: with no timeline, the receipt cannot measure time on task or order of actions, and by design it does not support a difficulty score from speed. Counts say what help was requested, not whether it was read or needed; the incomplete/reasoning split is a shape heuristic (an empty verdict or no cited source), not intent. In exchange, a receipt holds nothing that identifies the tester or their reasoning, and they read the exact JSON before copying it. Copying is the only output; **Discard receipt**, restart and reload drop it, and nothing is sent (`connect-src 'none'`). Any later transmission should reuse the owner's existing feedback/Pulseboard direction rather than a new service or SDK. Tests use observation text labelled as a synthetic fixture; no human observation has been collected yet.
