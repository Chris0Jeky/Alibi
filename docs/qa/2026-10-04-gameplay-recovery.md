# Gameplay recovery, 4 October 2026

This report records the first recovery checkpoint. Current integration status is
in [STATE.md](../STATE.md); later final-head receipts supersede earlier pending
statements, without turning historical results into a changed-head pass.

This continuation recovered the branch-only handoff as #571, corrected #570's
immutable metadata URL, and submitted practice familiarity work separately as
#572. It did not deploy or change any accepted puzzle definition or save schema.

## Workshop implementation source

Head `7e4a565b1517c1ec43707c4d530a989a08e3e570`, tree
`3dacb34877e30d416efea664d334dfdbdf3057f0`, contains the two existing accounting
repairs plus full-hash catalogue metadata filenames. There is no stable alias
under the immutable assets header. A description-only change gets a new URL;
a stylesheet-only change does not rewrite catalogue identity or accepted packs.

Three cache-identity cases produced two failures and one pass before correction;
all three plus seven existing shelf/composition tests pass after it. These local
unit tests used a small stylesheet fixture, not a full build. The actual hosted
builder is verified separately below. See [the correction](2026-10-04-workshop-cache.md).

Dedicated run 37161787848 passed at the exact head. Downloaded artifact
11288345218 has archive SHA-256
`4e11d738a938645621d038eb9d4855deb6d2fe6a3abf4c95b770f747575f5b5c`.
Its source-head, all fourteen unique viewport/scenario pairs, zero failures,
82 passing source cases, all four JSON downloads and Android index were checked.
The narrow shelf screenshot was inspected. The metadata's filename digest
matches its indexed SHA-256:
`ed16d75d5e555986867c11ee32005bbaea4700b04173a70ced52a6b7835cfe2e`.

Five optional resources remain indexed. Accepted Lattice and Afterlight bytes
retain their published full hashes, at 18,509 and 12,634 bytes respectively.
Measured hosted values: optional shelf 38,389 bytes, total output 33,400,942,
core offline 1,892,617, JavaScript gzip 134,910 and initial code/content gzip
204,251. Existing numerical ceilings and 510 official definitions are unchanged.
These source/build/browser receipts are not deployment or physical-device proof.
Full repository CI and independent review were separate gates at this checkpoint;
#570 subsequently merged at f084aa6, as recorded in the current state index.

## Handoff recovery

The four original handoff files came from saved commit
`962463f38b203546355ea75221bbe445e5b8034f`. The old state ledger is preserved using
its exact original Git blob, not reconstructed prose. The archive and its
checksum/link tests are retained; the current index receives dated recovery
updates. The original 3 October report remains historical evidence, not rewritten
results. The current integration incorporates this history in #459 so the live
ledger and audit correction cannot land separately with contradictory status.

## Practice familiarity candidate

PR #572 originally at `9e5287d867d929dad8b74d46df77ff443ef41a05` retains exact
full-definition matching and explains partial counts as lower bounds while
missing definitions are deferred. It credits no unverified saved rules and
preserves already earned details and practice controls. The next snapshot after
validated loading is exact; no new observer or blocking download is added.

Seven source tests failed before the fix and pass after it. They use actual
emitted definitions but shaped committed-run inputs. The separate browser lane
proves actual solves, real IndexedDB and failed/retried network delivery in six
phone/desktop scenarios. Those scenarios and full CI later passed on the original
head, but the integrated candidate still requires its own final qualification.
#572 remains unmerged at this checkpoint; item 1 is not complete merely because
its previous-head tests passed. See its PR and current STATE for the latest head.

## Outstanding boundaries

Keep #433 open for an actual direct installer, #389 for BOTH unmerged item 1/#572
and item 3/#459, and #404 for at-cap and device performance qualification. A
retained assertion that an encoder might save startup bytes is not a published
or applied codec change. No codec patch was recovered in this continuation.
HUMAN_TODO.md still owns physical Android, TalkBack and player-data difficulty
calibration. No production deployment or permanent remote-artifact retention is
promised. Every implementation, test, plan and handoff above is in a repository PR.
