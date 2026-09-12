# 0.11.2 — Faster hints, steadier controls

Published on both existing origins from merged source
`28e71ec9f434c404b4fff8e5468b66599b159c22`, build `840cdae3fee4`, on 2026-09-12.
[PR #142](https://github.com/Chris0Jeky/Alibi/pull/142) passed both Castle and both full verification
jobs at its final head before merge. The merged rebuild reproduced the same release files.

The release includes the opt-in mobile Wrenmere Desk, faster Nonogram hints and larger clue text,
Lantern Garden touch/pan improvements, Castle notebook import deduplication and return focus,
and Games Room keyboard/pan corrections. The desk remains at `#/home?ux=house`.
Published puzzle IDs, revisions, legacy definitions and save schemas are unchanged in this release.

## Publication and delivery

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `1f88ec05-b78c-46be-9b7b-e70b54cc98b2`. All 282 public files match exact build bytes. HTML,
  JavaScript and manifest MIME types, CSP, no-referrer and nosniff response headers were verified.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 14, deployment
  `appgdep_6aa56ab4766c8191add62b61e113976a`. All 278 non-HTML files match exactly; each of the
  four HTML pages retains exact source plus the known 938-byte hosting challenge. Provider
  response-header/MIME behavior remains the documented [#6](https://github.com/Chris0Jeky/Alibi/issues/6) limitation.
- The fallback source branch matches the full merged SHA above. Its validated archive contains
  284 files: the complete release plus the normalized hosting manifest. No runtime bindings changed.

## Verification

Full local verify passes 243 Node tests plus supplementary suites; initial JavaScript is 127,524
gzip bytes, within the unchanged budget. Each HTTPS origin passes 92 real IndexedDB/offline
checks. Hosted primary controls pass 177 Gardens, 281 Dominoes and 84 Mahjong assertions at
phone-size and desktop viewports, with no browser errors or retries.

Disposable Chromium contexts stayed open across publication. Primary 0.11.1 and fallback 0.11.0
both retained their old build while an update waited, accepted another real Sudoku move, and
preserved exact state and the pinned revision-1 definition through Save & update and offline reload.
The completed `run3` receipts provide this evidence; earlier closed profiles are not the live update proof.

The initial Castle CI failure was a test synchronization error: deduplicated restore left unchanged
text visible before the modal closed. The corrected check waits for completion; all nine recovery
scenarios pass without changing runtime save behavior or weakening preservation assertions.

Evidence, screenshots, validated release archives and restart notes are retained locally under
`release/goal2-2026-09-12/`. Rollback references are primary Worker
`38a1ca89-cbb5-4428-bbc3-0390c613bb46` and fallback Sites version 13. No rollback was executed.

Physical Android recovery, TalkBack, difficulty, narrative and audio-comfort acceptance remain
open in [HUMAN_TODO.md](../HUMAN_TODO.md). Browser viewports do not close those human checks.
