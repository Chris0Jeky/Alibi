# Native fallback-save counterexample

**PR #585 remains blocked.** This is a real source-library Chromium result,
not a passing mock, a physical-device result, or a demonstrated repair.
Refs #554. Keep the existing one-winner assertion and do not promote the
ordinary Verify result to acceptance of concurrent localStorage writes.

## Exact receipt

- Head: `34dd3641c97f3a8c02b31e9fabe88b2d39ec52ac`.
- Tree: `6eeda27172a34f4cd66238d3e9d830069822249a`.
- Workflow run: [37611343993](https://github.com/Chris0Jeky/Alibi/actions/runs/37611343993).
- Native job: `112759049185`.
- Artifact: `11477643383`, `fallback-cas-34dd3641c97f3a8c02b31e9fabe88b2d39ec52ac`.
- Artifact ZIP SHA-256: `a16ac62f2283dc1dc59c1db247e08d5aefc4afc7643d87343fb6ca5e19a467c6`.
- storage.js SHA-256: `053f30ae47d2b40606912e2ffe8c162ad69764085f7bb0b452d02d0b46cc455a`.
- core.js SHA-256: `508acbda79b606a89f206af8d78122ffb6340f6333cade5d8823dd29d543530b`.

The connector-downloaded ZIP digest was independently checked. Its source
archive matches all nine recorded input hashes. The stored formatter output
is byte-identical to committed storage.js. No speculative formatting repair
was applied from the earlier source-inconsistent job log.

## Observed failure

The independent-key case and the first two contested writes passed at 390px.
The third contested write, key `race-2@1`, returned two fulfilled saves:

```json
[
  {"ok":true,"value":{"key":"race-2@1","note":"A","rev":1,"schemaVersion":1,"updatedAt":"2026-10-07T11:03:40.259Z"}},
  {"ok":true,"value":{"key":"race-2@1","note":"B","rev":1,"schemaVersion":1,"updatedAt":"2026-10-07T11:03:40.261Z"}}
]
```

The fixture uses two same-origin pages in a fresh browser context, a held
native Web Lock and two pending save requests before releasing the lock. It
then requires exactly one success and one ConflictError. This assertion failed.
Only three of the planned 49 cases completed; the desktop and later timeout
cases were NOT executed. All values above are synthetic fixture records.

The same source's dedicated storage selection passed 31/31, preserving the
58 original storage assertions. Pinned format, web/Android build, unchanged
budgets, all 1,339 Node cases and both Quiet Wing suites passed in the full gate.
Build receipt: sourceDirty false; application gzip 132,643 bytes; complete
initial transfer 204,060 bytes. None of those results overrides the native failure.

## Interpretation and continuation

The immediate established defect is two successful revision-1 writes where the
promised contract requires one winner. The browser's internal cause is not yet
proven. Cross-process localStorage visibility is a hypothesis, not a certified
Chromium defect. The [HTML storage specification](https://html.spec.whatwg.org/multipage/webstorage.html)
does not define cross-agent-cluster interaction as a transactional store;
[WHATWG issue 403](https://github.com/whatwg/html/issues/403) describes the cache
synchronization question. Native Web Lock exclusion alone is not an observed
proof that this implementation reads the newest stored revision.

Next capture browser version, lock ownership and both storage views around the
failing boundary without suppressing the existing failure. Retain this negative
receipt even if a later run happens to pass. A supported fix must either prove
its full read/compare/write coherence in the native fixture or adopt the explicit
fail-closed local-write policy permitted by #554, retaining readable/exportable
records and separate session-only behavior. An arbitrary delay or weakened
one-winner assertion is not an accepted repair.

No player data, database migration, budget relaxation, automatic deployment,
physical Android or TalkBack acceptance is introduced. Independent review is
still required. This durable note supplements the original FALLBACK-CAS report;
its earlier source-only successes are historical evidence, not native acceptance.
