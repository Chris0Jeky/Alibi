## 2026-10-20: qualify README publication-status edits (#665)

The CI scope classifier now admits a README-only publication update only when the base/head
comparison changes the version and release-link fields in the three existing status lines, with
all other README bytes unchanged. The updated version must match `package.json` and a same-version
published release record with its source SHA, build ID and public release link. Local links,
regular-file and repository-containment checks remain active; ambiguous, mixed, manual or unknown
comparisons keep full verification.

Verified: 21 focused CI-scope tests, including a committed temporary-Git CLI regression through
classification and `--verify-docs`; mixed runtime changes, uncommitted README bytes, missing refs
and manual runs fail closed. Pinned Prettier 3.9.6 and independent source review pass. The full
runtime acceptance workflow and hosted exact-head qualification have not run for this implementation
change and remain required before merge. Physical Android, Play Store and other owner gates remain
as recorded in HUMAN_TODO.md.
