# 0.17.0 qualification checkpoint

Queue snapshot at 20:40 UTC on 11 November 2026; retroactive-review results were added later.
This is a checkpoint, not a release receipt.
Alibi main was `f089f65b08ff4733f7ab72e6fc0e7b47ce4f6bc5`; 0.17.0 was not published.
The live site remained on 0.16.0. Pulseboard #264 merged and its deployment run 43083778431
passed; `/readyz` reported ready, schema 6 and Alibi admitted. The public 0.16.0 receipt and
its SHA256SUMS were downloaded and verified outside the checkout as the prior Worker reference.

The required cabinet gate from #957 is merged. One product PR run took 11:57; an earlier
serial PR run on a different head took 37:01. Documentation-only, cancellation, corrupt
artifact, missing receipt and partial-rerun canaries were exercised; see #957 for receipts.
A separate Android renderer stall remains tracked by #785; the SwiftShader/SwANGLE canary
branch `codex/alibi-785-gpu-canary` is not a production change and has not produced a valid
comparison. Its corrected run 43095129458 reported an unexpected GitHub startup error.

| PR   | Head at snapshot                           | State                                                              |
| ---- | ------------------------------------------ | ------------------------------------------------------------------ |
| #956 | `e61308105fb5168b8eb9151079a7db12af11c239` | shadow failure evidence; checks incomplete                         |
| #960 | `c1d0887e7d518a005ddf8e88eec1b92846d3cfa6` | three Timeline cases; checks incomplete                            |
| #961 | `0f855fde76f704fc293ace23db9810f01c889d9b` | standalone uncertainty prototype; checks incomplete                |
| #962 | `20dc493860d5b52152d26e0172d0f9ddcb8e7d90` | Castle citation feedback; checks incomplete                        |
| #963 | `cb95c8e17d068f5b88853080155f2758c2936378` | Mirror hint-path tiers; checks incomplete                          |
| #965 | `c5cb1d49c5e3da4b151270c4667216616cf86fb9` | six-room Castle browser coverage; checks incomplete                |
| #966 | `b09a66d9241306adecdb1a45dd24b829e01d6cfa` | durable Escape saves; required run 43095471490 queued without jobs |

The save PR passed independent Terra and Sol reviews after two confirmed blockers were fixed.
Its preceding clean product tree passed the full local gate (2,707 pass, 21 skip) and real-origin
Escape/recovery suites; the only subsequent changes were a browser assertion and this evidence
history. Exact-head hosted checks still bind. A rollup showing success before the queued required
check appears is not a green gate.

To reduce work made obsolete by the intended save merge, 45 PR workflow runs on the six other
branches were requested cancelled, with their IDs saved outside the checkout. At this snapshot,
requests had not reconciled; two documented force-cancel samples returned HTTP 409 even though
one read as in progress. Treat all cancellations as incomplete checks. After GitHub reconciles,
qualify #966 first, then refresh and rerun each other PR at its new base; never merge on those
cancelled or old results. Reconcile conflicts, exact-head review attestations and budgets normally.
The GitHub Webhooks incident had cleared, while Actions status was reported operational; no cause
for this repository's queue was established.

Muse retroactive review of the four merged ranges through #964 completed with no confirmed
high-severity blocker. #967 tracks a verified family instruction inconsistency; #949 also records
the Eclipse file-selection follow-up. The CI inventory guardrail observation was triaged on #957.
The release-preparation branch is
`codex/release-0-17-0-prep-20261111`; its content record and Pulseboard registration exist but must
be reconciled with later merges before the release PR. The next publication steps remain the clean
merged-main Cloudflare release, hosted save/offline checks, tag and release assets, and receipt PR
in `docs/DEPLOYMENT.md`. Do not infer physical Android, TalkBack or human playtest acceptance;
see [HUMAN_TODO.md](../../HUMAN_TODO.md).

## Later local checks

At 20:48 UTC, GitHub still reported run 43095471490 queued with no jobs and the sampled
cancelled runs in their prior states. Both force-cancel samples returned HTTP 409; no further
force-cancel was attempted. GitHub's status page listed Actions as operational, so the cause
was not established and the billing-refusal exception does not apply.

On refreshed clean heads, #960 passed web and Android builds, 71 Timeline/worker/budget tests,
and Timeline browser journeys; #963 passed the web build, 58 focused/budget tests, and Eclipse
browser journeys; #965 passed the web build and six-room Castle browser journeys. These local
checks do not replace hosted qualification. Their evidence is in their PR comments.

The Muse batch through #964 completed and was triaged; its receipts and the CI consolidation
plan were copied outside the checkout under the current session's visualization directory.
