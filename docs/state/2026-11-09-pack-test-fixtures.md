# Pack integration test fixture follow-up

Changed: updated the broadcast and rehearsal source-extraction anchors to select the actual
async saved-run listener after a separate pack listener was introduced; retained the production
save and listener code in the VM fixtures. Updated the completion assertion to the current copy.

Verified: the three focused Node suites passed 24 tests; `git diff --check` passed. The initial
run reproduced seven broadcast failures, six stale-copy failures and the rehearsal fixture
load failure. No production code changed.

Not verified: full build, full Node suite, hosted or physical-device checks. The coordinator is
running the integrated checks and separately handling the storage test failure. Existing
source-slicing fixtures remain sensitive to future structural changes. HUMAN_TODO.md remains
the authority for owner and deployment decisions.
