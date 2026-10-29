# ADR: one revision-pinned experimental case in Castle (#442)

29 October 2026. Implementation decision; not editorial or release acceptance.

The specimen is `content/cases/reading-room-blackout.json`, ID
`reading-room-blackout`, revision 1, SHA-256
`6b86c2495fdf4b8c720203b00b4765772aeac0505614b31be4b1aa378cfb6a2c`.
Its independent twenty-world model and story-mode comparison already exist. Chapter I's
clock, route and OR-access predicates cannot be represented by this case contract;
`case-chapter-one.cjs` remains a diagnostic. The memory-only escape-room adapter (#467)
is a different format and remains separate.

`src/castle/view.mjs` owns `#/quiet/castle/case`. Its route disposer cancels the
optional player and invalidates asynchronous work on every departure, including A/B/A.
The player uses native controls and the existing Castle story preference. No prototype
HTML, points, accounts, chapter replacement or automatic installation is introduced.

The existing `CastleStore`, database `alibi-castle-v1` version 1, `records` store,
`chapter-one` key and revision CAS remain the sole authority. An optional `caseStudy`
field carries source identity, accepted answers and unfinished drafts. Its small fixed
validator is bound by tests to the unchanged source; it does not interpret narrative.
Old saves omit the field and remain unchanged until an explicit case install. Older
readers reject the unknown field and preserve the raw record. Unknown case revisions
or fingerprints protect the whole notebook instead of clearing or migrating progress.

The existing bounded validator worker validates this field during standalone and combined
backup review and restore. Merge keeps a sole case; divergent case saves refuse the merge
and require an explicit reviewed replacement. Replacement retains the existing atomic
pre-restore recovery copy. Preview and cancellation write nothing. Update flush and
explicit export acknowledgement include the case through the same CastleStore snapshot.

Delivery follows #433's on-demand, size-bounded, SHA-256-verified fetch. The player and
frozen JSON are separate optional assets, outside startup and core precache. Installation
requires an explicit button, complete verified assets and a successful save; interruption
cannot claim readiness. The existing service worker serves the owned optional cache on
offline return. Saved source identities are never advanced automatically.

The clean implementation head `40c6e21b` produces web build `908b3d8cea7f`:

| Measurement | Baseline | Candidate | Existing ceiling |
| --- | ---: | ---: | ---: |
| Castle activity JavaScript | 99,515 | 101,052 | 101,120 |
| Core shell, excluding official content | 1,419,719 | 1,410,174 | 1,419,736.32 |
| Application JavaScript gzip | 135,749 | 135,777 | 135,808 |

The optional player is 12,380 bytes and its frozen JSON is 15,469 bytes; both are counted
in Castle delivery, outside core precache. Named evidence imports keep unused exhibition
prose out of the backup worker. No ceiling changed. Full `npm run verify` passes 2,131
tests with 22 platform skips; source-specific browser evidence is recorded in the PR handoff.

After a future release changes the hashed player URL, an installed case needs one online
visit to retain that new player before it can open offline. The saved case is preserved.
There is no automatic migration or promise that an uncached reader is available offline.

Native/physical acceptance, wording/fairness and promotion stay in `HUMAN_TODO.md`.
This mission includes source integration, not deployment.
