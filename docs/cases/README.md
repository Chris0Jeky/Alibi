# Experimental evidence-case authoring

Refs #436, #437 and #440. This is authoring tooling, not a new production import format or a shipped case.

Run `node tools/case-authoring.cjs path/to/case.json` with Node 22. Success prints a source-byte SHA-256 receipt and counts. A malformed source exits 1 with a field-path diagnostic. The file reader refuses non-regular files, invalid UTF-8 and sources larger than 262144 bytes. `validateCase` accepts already parsed plain JSON-shaped objects; `parseCase` additionally enforces serialized byte limits.

The versioned contract and implementation sequence are in [the spec](../superpowers/specs/2026-09-27-case-workbench.md) and [the plan](../superpowers/plans/2026-09-27-case-workbench.md). Text limits count UTF-16 code units; byte limits count UTF-8 bytes. A step's prerequisites are AND dependencies. Citations can refer to its own records or transitive prerequisites, not a sibling that happens to have been completed. Alternative sufficient citation sets are unordered and duplicate-free.

Every source has story-on/off prose, three ordered hints, a separately labelled worked answer and original provenance. The receipt is explicitly `structure-only`: it does not prove semantic entailment, uniqueness, fairness, rights or human enjoyment. Unknown fields and future versions are refused, not silently coerced.

## Verification and remaining work

Local source tests: 47 passed after recorded failing contract tests, including a sparse-array regression. Existing castle suite: 70 passed. These are not a full build or browser result. Local `npm ci --offline` failed because youch-core 0.3.3 was not cached; no dependency versions were changed. The PR's exact-head CI and independent review remain gates.

#441 owns the original playable specimen and semantic model. #442 owns any future adapter to an existing save domain and optional content delivery. #443 owns reusable semantic counterexample tooling. The production catalogue, routes, storage, hints, application budgets and all published puzzle definitions remain unchanged.
