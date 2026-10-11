# Gameplay and Workshop delivery verification

This is a source/evidence handoff, not a deployment receipt. PR #569 provides the
source policy; #570 supplies discovery and the existing-import handoff. Recheck
current GitHub state before merging; evidence below is bound to named sources.

## Source identity

| Source | Identity / status when checked |
| --- | --- |
| #567 final head | `6d0d55ab2cd52b0ee6c08f23d059ff520eea2c92`, merged as `4829a9a8f0e3767b5052ab51c694359c9ac40086` |
| #568 final head | `f1dc4d04326710243e8f0c356be8842b73a49859`, merged as `236c7ba72d9bd1b84a8f75f8f5ff04692bc2b57d` |
| #569 final head | `d243d8967962cb3f0eb1d1e59710a647f2e7e912`, merged as `d9ac0b3b311c314193a12567eaff30635d1c064e` |
| #570 initial browser source | `e69300c0d6add4a0a591e4494e4ade2de1006bad` |
| #570 accounting-corrected source | `241e332a433eff80e49ae9b9e3f8e71f0712f979`, tree `54094aa11ff1f6cd94033a621af661f99d63c530` |

The two existing optional pack definitions remain unchanged:
Lattice 18,509 bytes, SHA-256
`7200ef48ef055cb5f385d9f197a84674e50926c6cb7b1eee193fcd70dadcce79`;
Afterlight 12,634 bytes, SHA-256
`b8c69faa5e2b43b1daee5c2d318b912f87b4262678b2582895952d0d8ef7bceb`.
Their catalogue names include full hashes; public metadata excludes solutions.
The JSON itself contains solutions and the shelf explicitly discloses this.

## Downloaded CI evidence

- #567: full run 37145132434 and dedicated run 37145132332 passed, as did all
  twelve applicable workflows. The dedicated artifact 11281733451 has ZIP SHA-256
  `ccca8ce6883d1a45f6067911e762defbb422a0602ab527ea33294649ec7d2175`.
  Exact source, all eight cases and narrow loading screenshot were rechecked.
  Independent review 5972330224 was clean; merge-ref tree matched the reviewed tree.
- #568: all four applicable workflows passed, including full run 37145461492.
  Independent final-head re-review 5972361470 was clean. Four strengthened cases
  were rerun against the current main engine. The 500-move limit did not change.
- #569: all six workflows passed, including full run 37147675463. Dedicated
  run 37147675523 artifact 11282952471 has ZIP SHA-256
  `1a119e4bc08cb4e4fc70ee302a7b615353eeff2db546fc5592fbeeed5e03eb5e`.
  It binds exact source, 116 passing/zero-failed/zero-skipped tests and the complete
  34-study metadata. Independent review 5972704670 was clean.
- #570 initial source: dedicated run 37149120638 artifact 11283008414 has ZIP
  SHA-256 `2a19188cdc5209f7aff941afd9f755cee0936259bf8d6825b240f437bcde7266`.
  Its source-head, all fourteen successful browser entries, 79 source tests,
  downloaded pack bytes and representative screenshots were inspected. This
  remains evidence for e69300c, not a substitute for corrected-head full CI.
- #570 corrected source: dedicated run 37149747493 artifact 11283870835 has ZIP
  SHA-256 `2b2cc1adf7fd1d78ef749915be30f0261b5f8d1676ddebc7931f81e96d63e802`.
  Exact source-head 241e332, all fourteen distinct successful browser cases,
  79 source tests, both downloaded packs at both widths and the desktop shelf
  screenshot were independently checked. Clean hosted core bytes are 1,892,617;
  total output is 33,400,942; the optional shelf is 38,389 bytes. All 510 official
  definitions remain registered. Full repository CI is a separate pending gate.

Artifact retention is finite. The repository retains executable tests, source
hashes, run/artifact identifiers and scope here so the evidence can be reproduced;
it does not promise that remote binary artifacts will be available permanently.

## Regression and integration checks

The foundation has 38 source-policy cases plus 78 retained Lattice/Afterlight
cases, 116 total. The pre-implementation module-missing failure was observed;
not all adversarial cases were individually observed failing. Tests include a
well-formed ambiguous 5x5 nonogram whose matching hash cannot bypass uniqueness.

Seven shelf/render/composition tests and five emitted/Android tests pass. The
combined Workshop/budget selection passes 79 cases. Native indexing accounts for
all five files even though the unsupported native shelf entry remains hidden.
The initial four output tests had three failures before integration and passed
after it. No existing ID, worker import rule or numerical ceiling was relaxed.

Broader verification exposed three omitted integration expectations:

1. The shell fixture treated the new assets/workshop directory as a precached
   file. Its two original filters now exclude that exact directory. A separate
   fixture verifies all five optional resources require network, while preserving
   the original navigation zero-network assertions. The original 23-case
   discovery/storage selection had one failure; all 23 pass after this repair.
2. The experience distribution sum omitted workshopCollectionBytes.
3. The house distribution sum omitted the same new category.

The last two assertions failed by exactly 38,389 bytes (three passes, two failures).
Adding the category to each existing sum gives eleven passing accounting, shell
and emitted/Android cases, zero failures/skips. Every old category and numerical
limit remains. The native-published tree matches the locally tested tree exactly.
Review finding 4174591640 is addressed by the accounting-corrected source.

## Browser coverage and limits

At 320 and 1280 CSS pixels, the dedicated fixture uses real service workers,
IndexedDB, JSON downloads, native chooser automation and the existing validator
worker. Per viewport it checks explicit keyboard entry without auto-fetch/install,
Lattice download/import/duplicate refusal, Lanterns and Futoshiki undo/redo/offline
resume, Afterlight download/import/duplicate refusal, Picture Logic offline resume,
and script-disabled 844x390 shelf rendering. It requires fourteen cases and no
reported failures. Existing Lattice/Afterlight suites retain every-board completion
coverage; the new fixture tests acquisition and one board per delivered family.

Local Chromium navigation returned ERR_BLOCKED_BY_ADMINISTRATOR before any UI
checks. No policy workaround was attempted and there is no local browser pass.
The hosted run supplies browser evidence. Physical Android picker behavior,
TalkBack, player difficulty and enjoyment were not tested.

Local full npm run verify reached the execution time limit after a clean build
and partial Node output. It is not a complete verification pass. Final hosted
full verification is required even when focused and dedicated browser checks pass.

## Reproduce and continue

```sh
npm ci
npm run verify
node tools/workshop-catalogue.cjs --check
node --test tests/workshop-*.test.cjs tests/experience.test.cjs tests/house.delivery.test.cjs tests/sw.test.cjs tests/budget.test.cjs
npm start
# In a separate terminal, after installing requirements-dev.txt and Chromium:
ALIBI_URL=http://127.0.0.1:8787 python tests/browser_workshop_discovery.py
```

Use native GitHub tools to compare main, PR head, review threads and workflow
source. Treat local reconstructed commit metadata as noncanonical; compare trees
and source hashes before publishing. Never count cancelled or preceding runs as
the current head's acceptance. Keep #433's direct installer, #389's other items,
#404's cap/device work and HUMAN_TODO open. No deployment occurred in this pass.
