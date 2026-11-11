# Mirror Ledger tiers

The Eclipse Lab lobby groups the existing Mirror Ledger levels by their provisional
hint paths. **Local clues** contains levels 1–3 and 6–8. **Whole-pair deductions**
contains levels 4–5, each of which uses one bounded whole-pair proof on the current
hint path. The grouping lives in presentation metadata. All forty Lab definitions
and their IDs and revisions match the starting source `e8a3430663c3d784f761024c7bcc0f44809c4009`.

## Evidence

- `node --test tests/eclipse-content.test.mjs tests/eclipse-model.test.mjs tests/eclipse-storage.test.mjs tests/mirror-ledger.test.mjs`
  passed 33 tests. The new tier test failed before the metadata was added. It poisons the
  stored answer and follows actual mark operations. The independent pair oracle confirms
  one solution, ambiguity on each board alone and the necessity of every numbered link.
- An in-memory mount verified both named groups, all eight original routes and the
  existing solved marker. An in-memory bundle with esbuild 0.28.2 measured 60,302 raw
  bytes and 17,711 gzip bytes, up from 59,900 and 17,547. The lazy asset remains below
  the 65,536-byte limit.
- `npm.cmd run build` emitted web build `11ea215d095a` at the source SHA above with
  `sourceDirty: true` for the uncommitted candidate. `node --test tests/budget.test.cjs`
  passed all 17 checks. Startup JavaScript was 135,650 gzip bytes, initial code and content
  207,354 gzip, deferred definitions 24,217 gzip and core offline 1,981,857 raw bytes.
  The emitted Eclipse asset matched the in-memory measurement.
- `python tests/browser_eclipse_lab.py` passed at 320, 390 and 1280 pixels with Playwright
  1.62.0 and Chrome 157.0.8103.39. Both groups were visible, the original routes were
  retained and the first whole-pair level opened from the keyboard. The 390px and 1280px
  lobby screenshots showed the two groups without clipping. Python syntax, targeted
  formatting and `git diff --check` passed.

Recheck the emitted bundle and browser suite after integrating the separate Lab backup
changes. Android output, physical accessibility and player difficulty remain unverified.
[Owner actions](../../HUMAN_TODO.md)

## Integration with Lab backups

After merging `be74108b`, the combined build passed with the Eclipse asset at 62,680 raw
bytes and startup JavaScript at 135,644 gzip bytes. The 58 focused and budget tests and the
Eclipse browser journeys at 320, 390 and 1280 pixels passed, including backup controls.
Hosted CI and physical accessibility remain unverified.
