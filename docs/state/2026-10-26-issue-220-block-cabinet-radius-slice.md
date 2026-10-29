# Issue #220: shared large radius in Block Cabinet

## Scope

This slice keeps the published radius tokens unchanged: small 8px, medium 12px, large 16px, and
pill 999px. It removes the final shared `--radius` alias and maps `.empty` directly to
`--radius-lg`; its resolved radius remains 16px. In the lazy Block Cabinet stylesheet, the
`.bc-studio`, `.bc-modal`, and compact `.bc-studio` surface declarations now use the shared
16px large-surface token.

The fullscreen portrait and short-landscape studio rules still use `border-radius: 0`, so the
game remains edge-to-edge on narrow screens. The board frame stays 14px at the measured 390px,
667px, and 1280px widths; its existing responsive rule keeps it at 9px at widths of 370px or
less. Board cells stay 6px and filled blocks 5px. The return target remains at least 44px wide
and high, and the studio's visible focus ring remains unchanged. No game logic or save code
changed. House and Quiet Wing keep their component-owned styles in this slice.

The older inventory comment on #220 reported 16 large literals in the shared bundle. That count
is stale for this base: the shared large literals had already been migrated by the time this
checkout was prepared.

## Comment-stripped source inventory

Counts are `border-radius` declarations from the assigned base `7ad2992` (current main
`b099e7f` plus reviewed #777 type work) versus the radius-change source. The stylesheet contents
relevant to the earlier `39e9303` inventory are unchanged between those bases. Counts are source
counts, not computed browser values.

| Scope and category                                           | Before | After |
| ------------------------------------------------------------ | -----: | ----: |
| Eight shared stylesheets: 1–6px details                      |     38 |    38 |
| Eight shared stylesheets: 18/19/20/22/24/30px scalars        |      0 |     0 |
| Eight shared stylesheets: 50% circles                        |     35 |    35 |
| Eight shared stylesheets: square 0                           |      3 |     3 |
| Eight shared stylesheets: `var(--radius)` uses               |      1 |     0 |
| Eight shared stylesheets: `--radius` definitions             |      1 |     0 |
| Block Cabinet lazy stylesheet: 1–6px details                 |      4 |     4 |
| Block Cabinet lazy stylesheet: large scalars                 |      3 |     0 |
| Block Cabinet lazy stylesheet: 50% circles / square 0        |  4 / 2 | 4 / 2 |
| All 14 `src` stylesheets: large scalars                      |     10 |     7 |
| All 14 `src` stylesheets: `var(--radius)` uses / definitions |  5 / 2 | 4 / 1 |

The seven large source values outside this change belong to `src/house/style.css` (`.hx-chip` at
24px and `#dialog.hx-sheet` at 20px) and `src/quiet-wing/style.css` (a 30px pill, a 20px stage,
and three 18px surfaces). The scoped Quiet Wing `--radius` alias and its four consumers remain
isolated from the shared app tokens. Small decorative details, circles, board shapes, asymmetric
casebook/letter/bottom-sheet shapes, and square edges remain unchanged.

## Build and browser evidence

The assigned clean verification checkout had no `dist` directory before the build. With Node
24.22.1, `node tools/build.cjs` completed successfully and emitted build `d4b31254b775` from
source SHA `3b0ccba8718f74755c50837bf24d28595cce74c9`, with `sourceDirty: false` and payload digest
`e714f1ed1f74f39a689de525730bfad80504f598e6c62878e0e931b8b8824cf1`. It emitted 307 files;
the later handoff update is documentation-only.
The existing budgets passed without changes: JavaScript gzip 135,753 bytes, initial code and
content gzip 204,978 bytes, platform gzip 5,093 bytes, core offline bytes 1,937,319, and accounted
shell bytes 1,419,700 against the existing strict limit of 1,419,736.32.

The actual host `#/salon/blockcabinet` was opened with local Playwright 1.62 and cached Chromium
141 at phone portrait 390×844, desktop 1280×900, and short landscape 667×375. The new browser
regression `MobileQA.test_shared_large_radius_on_block_cabinet_surfaces` passed all three views.
At each width, the root token and Cascade modal computed to 16px; `.empty` computed to 16px; the
studio computed to 0px for phone and short landscape fullscreen, and 16px on desktop. The measured
board frame was 14px and cells 6px. Return targets were at least 44px high, and the document had
no horizontal overflow. Return targets were at least 44px in both dimensions. The screenshots
and exact computed measurements from this changed build
are in the ignored local directory `test-results/mobile-qa/radius-block-{studio,modal}-*.png` and
`test-results/mobile-qa/radius-scale-metrics.json`.

I visually inspected all six post-change studio and modal captures. The phone, desktop, and
landscape compositions remain intact; the modals show the shared 16px panel corner, while the
fullscreen studio remains edge-to-edge. Separate pre-change captures from an earlier baseline
bundle remain under the ignored `test-results/radius-before/` path and are reference-only. An
earlier build attempt in the predecessor checkout collided with old generated `dist` tail files
being restored after removal; root diagnosis traced this to an external overlay/filesystem actor.
The fresh isolated checkout built cleanly, so no builder change was needed.

The radius contract passed 6/6 with `node tests/radius-scale.test.cjs`, and all 15 budget checks
passed with `node tests/budget.test.cjs`. The bounded platform identity checks passed 5/5 with
`node tests/platform-build.test.cjs` under scoped process permission after the default sandbox
denied its internal `git` subprocess with `EPERM`. The Block Cabinet phone-action contract passed
2/2. Prettier, Python bytecode compilation, and `git diff --check` pass for the changed sources
and handoff.

No hosted CI, physical-phone, or assistive-technology evidence is claimed. Issue #220 remains open
for the retained small details, independent House/Quiet Wing styles, and broader visual review.
