# Issue #829: share board analysis within each render

Changed: `src/app.js` computes lighting, aquarium water cells or network connectivity
once inside `board()`, then passes that result to cells and the legend. Aquarium
headers share the same water cells. The value is local to the render; nothing is
cached between moves. Engines, saves, definitions and output markup are unchanged.
The driver owns committing these uncommitted changes. Starting HEAD:
`aeb6656ef51bef6c8ae69d48ab4c22a2b06a6cd7`; the initial worktree was clean.

## Measurement and decision

Node v24.13.1, Intel Core i5-13600K, Windows. Each timing is the median of 50
samples, each containing ten invocations and normalized to one render, following
100 warmup invocations. Measurements ran in throwaway `tmp-829/` scripts.
Core and engines were required directly. Actual `boardCell`, `board`,
`boardLegend` and `enabledCell` source was extracted into a minimal VM, following
the existing source-extraction test pattern. Render timing includes string
generation and analysis, with deterministic SVG icon stubs; it excludes the
player shell, DOM, layout and paint. Analysis-only timing directly invokes the
relevant engine function as often as the instrumented board render calls it.
Checking and zoom were disabled for timing.

`content/official-packs.json` is the authority for official content, including
deferred packs. All affected official boards are at most 7x7. Measured initial
and solved states for every largest board: 31 lightup, 19 aquarium and 19 network
boards, 138 states total. Below, official rows report the slowest analysis state
before and the larger initial/solved median after on that same puzzle. The
aquarium after row is initial rather than solved, a conservative comparison.

| Family | Board | Analysis calls before -> after | Analysis ms before -> after | Board string render ms before -> after |
| --- | --- | --- | --- | --- |
| Lightup | Official 7x7 | 50 -> 1 | 0.205 -> 0.004 | 0.280 -> 0.080 |
| Aquarium | Official 7x7 | 50 -> 1 | 2.282 -> 0.039 | 2.378 -> 0.156 |
| Network | Official 7x7 | 50 -> 1 | 0.494 -> 0.008 | 0.671 -> 0.159 |
| Lightup | Synthetic 9x9 | 82 -> 1 | 0.597 -> 0.007 | 0.872 -> 0.136 |
| Aquarium | Synthetic 9x9 | 82 -> 1 | 5.057 -> 0.063 | 5.516 -> 0.312 |
| Network | Synthetic 9x9 | 82 -> 1 | 1.131 -> 0.017 | 1.492 -> 0.326 |
| Lightup | Synthetic 15x15 | 226 -> 1 | 3.997 -> 0.016 | 5.457 -> 0.389 |
| Aquarium | Synthetic 15x15 | 226 -> 1 | 59.031 -> 0.219 | 64.771 -> 0.728 |
| Network | Synthetic 15x15 | 226 -> 1 | 9.499 -> 0.041 | 10.979 -> 0.803 |

Official worst fixtures, all solved before:

- `vault-lightup-10`, `content/extra/vault-lightup.json`.
- `interlock-aquarium-01`, `content/extra/interlock-gardens.json`.
- `interlock-network-08`, `content/extra/interlock-routes.json`.

Synthetic fixtures exercise scaling, not published puzzles: lightup has an open
board with diagonal bulbs, aquarium has one full vertical tank per column, and
network has every orthogonal neighbour connected. They are not claims about
official content or solvability.

Each old cell calls its family's analysis once, including lightup walls. That
means n-squared calls, plus one for lightup/network legends or aquarium headers.
`lineCounts` already ran once. Validation during Check and progress elsewhere in
the player remain separate operations; this change bounds board presentation
analysis, not every engine call throughout the full player shell.

Decision: refactor. Aquarium exceeds the approximately 2 ms desktop criterion
on actual official content. At the requested 4-6x phone multiplier its old
analysis cost estimates 9.1-13.7 ms, versus about 0.16-0.24 ms after. These are
estimates, not physical-device measurements. Official board string render times
dropped approximately 71%, 93% and 76%, respectively.

## Verified

- `node --test tests/render-analysis-once.test.cjs`: before editing production
  source, 3 markup tests passed and 3 call-count tests failed at `50 !== 1`.
  After the change, 6/6 passed. The reference discards the shared result and
  invokes the real engine analysis per cell/legend. It compares full markup
  before a real reducer move, after it, and again on the earlier state, with
  checking both off and on; rendering leaves puzzle/state inputs unchanged.
- `node tmp-829/parity.cjs`: compared the saved untouched app source against
  the modified app using real presentation icons for all 140 affected official
  puzzles, initial and solved, checking off/on: 560 byte-identical full-board
  comparisons passed.
- `node --test tests/render-analysis-once.test.cjs tests/engines-dimensions.test.cjs tests/lightup-conflicts.test.cjs tests/lightup-insights.test.cjs tests/aquarium-insights.test.cjs tests/network-hints.test.cjs`:
  32/32 tests passed, zero skipped or failed.
- `node --check src/app.js`, `node --check tests/render-analysis-once.test.cjs`
  and `git diff --check` passed.
- App source raw bytes: 220,024 -> 220,176 (+152). Source gzip:
  60,599 -> 60,638 (+39). No budget ceiling was changed.
- Temporary measurement scripts, results and original-source copy were removed.

## NOT verified

No installs, builds, servers, browsers, hosted checks or physical-device tests
were run, as requested. `tests/budget.test.cjs` requires emitted artifacts;
`dist/assets` is absent, and the user prohibited building. The source gzip delta
does not prove the emitted release budget. No Git writes, commits or publication.

## Residual risk

The remaining qualification is the driver's normal built-asset budget and browser
gate. Timing is Node string-render evidence and does not establish frame time on
a phone. [HUMAN_TODO.md](../../HUMAN_TODO.md) retains its existing device,
assistive-technology and owner acceptance items; no owner decision was inferred
or changed for this issue.
