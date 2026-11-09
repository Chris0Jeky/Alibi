# Castle and Quiet Wing polish (#895)

## Changed

- The three Art Institute works show the public-domain status and collection credit recorded in `src/quiet-wing/assets/museum/rights.json`, rather than an internal verification instruction.
- Field notes model search exposes an empty-result status and clears it when matches return, while leaving keyboard focus in the search field.
- A locked Castle room deep link opens the existing map with a visible status explaining the existing unlock condition. The first-visit letter does not cover that notice; normal open-room and map navigation are unchanged. A few Castle export messages were shortened without removing their save/recovery instructions to fit the existing optional-asset ceiling.
- The new actual-browser regression runs in the full browser workflow.

## Verified

- Actual browser checks on the prior source failed for all three rights labels, empty-search status and the locked deep-link notice at 320 and 1280 pixels; the same checks passed after the changes (28 assertions). They check role=status, focus retention, the available Library route and viewport overflow. The 320px screenshot was visually inspected.
- Clean-source web and Android build passed at source `93845f81e1ef37fa687298916eddc353ff4ce0a8`. The unchanged budget and asset tests passed 20 checks: Castle script 101,092 / 101,120 bytes, shell 1,444,054 / 1,444,280.32, application gzip 135,365 / 135,680. No ceiling was raised.
- 64 focused Castle guidance, feedback, backup and engine/CI-scope tests passed. `npm run assets:catalogue` produced no tracked catalogue change; asset catalogue checks passed. Python syntax and diff checks passed.

## Integration follow-up

The browser regression now explicitly requires the first-visit letter to be absent over the locked-room notice, instead of dismissing it conditionally. All 30 checks passed at 320 and 1280 pixels. Independent source review found no blocker in the rights, search, route or recovery-copy changes.

A further browser pass reproduced four pre-existing overflow failures on both the earlier Club build and the combined candidate. With the platform's DejaVu Sans Bold fallback, long family headings exceeded their cards and the play toolbar's intrinsic grid minimum pushed a 320px document to 323px. Family headings now wrap within their cards, and the four toolbar tracks use zero minimum widths. The type scale, labels and actions are unchanged. The two affected existing browser methods passed across their covered viewports; the 320px document is now 320px and each toolbar control is 63.75px wide. The emitted CSS grows by 33 raw bytes and 5 gzip bytes. Independent source review found no blocker. Final integrated build budgets and exact-head CI remain merge gates.

## Not verified / remaining issue scope

Physical devices and screen readers remain unverified; role and focus checks do not prove spoken output. A separate attempt to open 3D in local Chromium timed out, so WebGL context-loss behavior was not changed. The generic Castle wrong-answer feedback, phone Realm toast overlap and post-context-loss controls remain open under #895. The existing HUMAN_TODO owner and deployment gates remain unchanged.
