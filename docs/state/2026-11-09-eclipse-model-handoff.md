# Eclipse Lab model handoff — 9 November 2026

Changed: pure bounded model and 32 provisional experimental levels in four modes, deterministic
candidate tooling, independent row-enumeration tests, research and curation record. Existing family
IDs, revisions and saves are untouched. Public validation accepts bounded plain data and verifies an
optional answer's shape; play checking, hints, component actions and solving never read that answer.
Linked actions are atomic and reject altered fixed cells. Solver budget exhaustion is explicit.

Verified: focused Node suites exercise all 32 definitions against an independent solver, semantic
uniqueness, local hint paths, candidate symmetry, budget exhaustion, link conflicts, poisoned
answers, malformed definitions, and fixed-cell protection. A single local 6×6 timing sample is in
the research record. The coordinator is responsible for integrating and verifying UI, storage,
delivery and any feedback flow against the combined tree.

Not verified: player research, physical phones, screen readers, hosted release, accessibility in an
integrated UI, storage/backup migration and collector acceptance. No remote deployment was made.
Residual risk: a computationally unique puzzle may be unappealing or unclear; local hint completion
is not evidence of human difficulty or learning. `HUMAN_TODO.md` remains the authority for owner
and physical-device gates; this work does not resolve those existing items.
