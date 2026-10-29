# Issue #219: Desk news card typography

## Scope and outcome

This follow-up closes one remaining Desk typography drift under the shared type ramp. The two
feature cards in “Recently at Alibi” used standalone 23px titles, 15px descriptions, and 14px
actions. Their title, copy, and action now consume the existing `--text-h3`, `--text-body`, and
`--text-meta` roles. The titles retain their Georgia display face and line-height; the eyebrow
already computed to the shared 11px eyebrow role, so it needed no local rule. The action's extra
5px top margin was redundant with the text stack's 7px gap and was removed as part of the same
card mapping.

The existing Desk hierarchy remains intact: page title, feature title, and supporting copy render
at 36/28/16px on desktop and 32/25/16px on phone. This is a bounded completion slice for #219;
the issue can remain open for any other still-drifting surfaces.

## Validation

- `node tests/type-ramp.test.cjs`: 4/4 pass, including token mappings for the feature cards.
- `node tests/type-scale.test.cjs`: 10/10 pass.
- `node tests/budget.test.cjs`: 15/15 pass against existing ceilings.
- Local Playwright 1.62 with cached Chromium 141, `MobileQA.test_desk_news_feature_cards_follow_type_ramp`: pass at 390px and 1280px. Computed title/body/action/eyebrow sizes are 20/16/13/11px on phone and 22/16/13/11px on desktop. All feature buttons are at least 44px high and the document has no horizontal overflow.
- Prettier, Python bytecode compilation for the browser test, and `git diff --check`: pass.
- Clean build on commit `3ec1b1ef31d5e7326de1e9e10d3d93be4fd3c00f` completed as build `4a8c3079945b`. The emitted shell is 1,419,724 raw bytes against the unchanged 1,419,736.32-byte limit (12.32 bytes of headroom). Application JavaScript gzip is 135,753/135,808 bytes, application CSS gzip is 33,040/34,464 bytes, platform plus identity gzip is 5,092/6,144 bytes, and initial code plus content gzip is 204,976/225,280 bytes. No budget ceiling was changed.

The browser captures and computed measurements are in the ignored local directory
`test-results/mobile-qa/desk-news-ramp-{390,1280}.png` and
`test-results/mobile-qa/desk-news-ramp-metrics.json` for review. This is a local browser check using
the cached Chromium version; it does not claim physical Android or hosted Chromium 151 validation.
