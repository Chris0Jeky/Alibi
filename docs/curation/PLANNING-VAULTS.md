# Planning vaults: continuation checkpoint

Refs #346 and #348. This draft continues the owner's request for many more, harder Archive Heist and Pocket Borough challenges. It is separate from the 80 logic boards in #354.

## Scope

24 original Archive maps, twelve with three crates and twelve with four, have legal production replays and independently verified minima of 18–21 pushes. They require at least six pushes beyond the independent crate-to-goal Manhattan assignment bound. That bound is a screening observation, not a human difficulty rating. The original nine regular rooms and twelve earlier Archive challenges are preserved.

12 Borough contracts combine the existing eighteen-placement game with explicit neighbourhood requirements. Meeting the score alone is insufficient. Original offer decks and scoring stay unchanged. Reference towns prove attainability, not optimality. An unconstrained greedy town may score higher while failing the brief; compare objective completion rather than raw score alone.

## Architecture

Keep the release-owned JSON packs and replay-based challenge store. Add bounded optional Borough requirements to its objective and starting-state identity. Definitions without requirements keep exactly the same identities. A single source registry feeds both the optional launcher and the backup worker. At most 128 trusted challenges and 16 source files are admitted; player puzzle import limits are unchanged.

Authoring certificates, provenance and comparison replays remain in source but are omitted from runtime payloads. All functional definition fields, titles, instructions and reference solutions are preserved. Runtime projection is checked against every original and new save identity and successful replay, not just a byte count. No resource cap is raised.

## In-progress publication

This first checkpoint contains the requirement validator/evaluator and build-time source loader. Pack data, build wiring, controls, tests and independent proof tooling follow in this draft. It is not yet an integrated 36-challenge release. Consult subsequent commits and PR comments for the final tested head.

Local work used the uploaded source tree 236107167e34b63479ce1f386b9d4dab12c6b71c. Live main 9c4e7a33d065b9bd42a3b22137c8f92e588e0597 was compared through the connector; the runtime and build files changed here were byte-identical in that comparison. Publication preserves main's newer CSS, Block Cabinet rendering and other unrelated work.

Machine correctness, source-isolated browser controls, built-origin storage/offline checks, physical Android/TalkBack and human difficulty are separate evidence categories. Local browser navigation to loopback is blocked by policy; no hosted/browser integration pass is inferred from a successful source replay or build. Keep human calibration under #161 and HUMAN_TODO q-8. No merge or deployment.

## Integrated recovery checkpoint: 25 September

The final recovery integrates the source registry, both delivery paths, family
filter, labelled Borough progress and all 36 reference replays. The two data
files from c60c3285a94e0ce223bc92ce74623890edd572cb remain unchanged; this does
not replace them with the different maps from the older downloadable handoff.
The full main baseline is 19f45ebd880fc3f0d828688978dc028bbb789306.

The independent forward push-region BFS checks all 24 recorded minima, and tests
recompute their map hashes and Manhattan assignment lower bounds. These are
18–21 pushes, at least six above the lower bound. Native reducers replay the
references without input mutation. The original reverse-generation script named
in the historical provenance was not recovered; these new checks reproduce
solvability and minimum pushes, not the original candidate-selection run.

All 12 Borough references meet their score and visible neighbourhood objectives.
All recorded greedy references fail the full objective, even when their raw score
is higher. There are twelve distinct decks and briefs across ten river footprints,
not twelve different river geometries. Targets span 78–104; reference scores span
80–106. Scores are not cross-layout difficulty ratings or optimal-town claims.

The normal challenge audit now covers all 95 definitions instead of silently
stopping at the previous 59. The emitted backup worker is separately exercised
with all 95 reference saves and rejects a contract whose requirements disappeared.
The worker omits duplicated presentation strings only; the UI retains them, and
all objective/start identities are checked against the unprojected source.

Seventy-two isolated-document scenarios pass, including actual controls, Undo,
completion, memory remount and restart at 390px and 1280px. They do not prove
origin reload, IndexedDB, service workers or the integrated family selector. The
read-only workflow runs the actual-origin matrix with isolation explicitly off.
Full exact-head Verify, origin evidence, independent review and human/physical
acceptance remain required. No merge or deployment.
