# Eight-painting runtime qualification — 19 October 2026

Refs #696. Main9144bbfa already merged #654's five native SVG fallbacks. This branch activates only their remaining optional-delivery mappings and five catalogue records, preserving newer declared-image delivery handling. Historical #654 rejection remains a record of its old205248-byte/510-puzzle trial; it does not describe the current220KiB/570-puzzle gate.

## Measured runtime

Clean runtime head `1800aa2dd2f9b37c792d10a02f7cd3b298735af3` versus clean main `9144bbfab14eb51633d8e1730367c42efb8bc9fa`, same locked Node24.19.0 / Sharp0.35.5 / libvips8.18.7:

| Measure | Main | Runtime candidate |
| --- | ---: | ---: |
| Startup gzip | 201927 | 203109 |
| Current ceiling | 225280 | 225280 |
| Startup margin | 23353 | 22171 |
| Core shell | 1410870 | 1410870 |
| Deferred gzip | 21266 | 21266 |
| Optional enhancement bytes | 3384920 | 3507442 |

Five WebPs add122522 bytes outside core; eight total203482. All emitted image hashes match existing sources, remain outside precache, and masters stay outside release. Published content source trees and deferred payload bytes are exact:570 puzzles,167 deferred. The release content digest changes because it includes editorial.delivery; published puzzle IDs/revisions/definitions do not change.

## Executed checks

- Causal integration tests fail before and pass4/4 after; unselected catalogue records remain exact. Independent delivery/catalogue review passes17/17 with no actionable source finding.
- The full inventory exposed delivery-build's stale three-painting expected byte receipt (3384920 versus3507442). Its explicit inventory now names all eight and asserts203482 painted bytes; all9 cases pass, with provenance/mirror/precache/4MiB assertions retained. Independent follow-up review found no issue. No runtime code changed in this test-only repair. Prior failed evidence is retained.
- Actual Chromium390/1440: image decode at real aspect ratios, offscreen lazy fetch, decorative alt, labels/headings/routes/tabindex and keyboard Enter compared with clean main; compact mode, corrupt200/503 fallback, installed-core cold offline and warm cache collisions all pass. Actual app pixels were inspected. Existing standalone UI187 and adaptive-delivery16 checks pass.
- All 270 unchanged Node test files, plus original Quiet Wing engine/contracts scripts, complete through the resumable runner. TAP totals: {'tests': 1883, 'pass': 1878, 'fail': 0, 'skipped': 5}. Formatting and original pretest/build identity guards pass. Earlier monolithic runs were interrupted by executor loss and are not claimed as successful exits. Per-file runs retain original assertions and two-file concurrency, bound to the head/payload/lock/toolchain/test hash.
- All 18 unchanged official origin scenarios pass individually, 616 assertions, with fresh persistent profiles and real service workers/IndexedDB. The original per-scenario reports retain fullSuite=false; the aggregate proves complete scenario coverage and does not fabricate a monolithic exit.
- Separate editable source preview toggles eight existing WebPs/native SVGs at390/1440. Actual pixels were inspected; reproduced preview-only image overflow was corrected, with final geometry/decode checks passing. Saved source checkpoint is Library libfile_16cac00fa3888191a642f2abce5e45b0. Source/structural/browser success does not infer creative acceptance.

## Cache and remaining gates

Eight shared slots and1MiB/image are unchanged. These eight painting hashes collide in four slots: borough/gardens0,duel1,welcome/tic/archive2,cabinet/atlas3. Four painted hits are retained after sequential priming; replaced slots show the correct SVG offline. All eight are not guaranteed offline.

This documentation follow-up does not change the reviewed implementation. The final PR head still needs its rebuild/budget receipt and exact-head hosted checks, reported in the PR. No cap/codec/dependency/security change, generation, merge or deployment. Accepted R2 art,44 deferred LAS assets and original worktrees remain preserved. [HUMAN_TODO.md](../../HUMAN_TODO.md) physical Android/TalkBack, creative/licensing, native-editor and publishing acceptance remains open.
