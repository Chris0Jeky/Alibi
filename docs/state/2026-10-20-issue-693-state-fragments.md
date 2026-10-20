# Per-change handoff for #693: state fragments

Issue #693 reports repeated conflicts when parallel pull requests prepend per-change evidence to
`docs/STATE.md`. Routine pull-request handoffs now belong in uniquely named files under
`docs/state/`; the existing `docs/STATE.md` remains the shared project history and overview.
`AGENTS.md` and [the fragment guide](README.md) define the new practice.

The proposed `merge=union` rule was not adopted. The current `.gitattributes` has no such rule;
more importantly, the local union driver can retain both versions of a changed status under one
heading, while its behavior on a GitHub-hosted merge is not a contract to depend on. The local
fixture for this case produced both “Hosted checks pending” and “Hosted checks passed” beneath
the same PR heading.

The GitHub connector confirmed that #693 is open and has no comments. Its initial main `c89622b718a68590501e6f80d36e6d6c9df7542e` copies of
`AGENTS.md` and `docs/STATE.md` match the supplied source snapshot; the `docs/STATE.md` blob SHA is
`beee264fe9c67b0525f195f8a4de966f4ea8d0b8`.

Validation is limited to the local document-link/history checks and a local Git merge-driver
fixture. This change has no hosted CI, device, deployment, or release evidence.
