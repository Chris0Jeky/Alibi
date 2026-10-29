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

Bundle measurement and proof will be recorded here after the first admitted baseline and
candidate builds. All existing byte ceilings remain binding; a byte or recovery failure
prevents qualification. Native/physical acceptance, wording/fairness and promotion stay in
`HUMAN_TODO.md`. This mission includes source integration, not deployment.
