# 0.11.4 — A deeper Expert collection

Published on both existing origins from merged source
`a79b7eb13e4bd8ba4e61dfd8126c05511e0bad57`, build `159f34ae5948`, on 2026-09-17.
[PR #174](https://github.com/Chris0Jeky/Alibi/pull/174) passed both required full verification
jobs at the exact head before merge. [Downloads](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.11.4)
include the complete static ZIP and self-contained HTML preview.

The release promotes six additive Expert studies from the source registry: three original 15×15
Nonograms and three Sudoku layouts. They are uniquely solved by the independent hard-studies
oracle and remain explicitly provisional until human difficulty and curation work is complete.
The source catalogue therefore grows from the published 355 puzzles to 361 without rewriting
published definitions, IDs or revisions.

Compact 15×15 Nonograms now keep square cells and contiguous rows/columns on narrow screens,
with bounded local panning, larger-clue support, actual marking, history and offline reload
coverage. The journal counts unique puzzle identities while retaining each completed revision
record. Consent-gated Observatory context, revision-safe save boundaries, bounded Club/replay
recovery and isolated optional caches are covered by the merged regression suites.

The shared Observatory producer contract was updated additively in
[Pulseboard #51](https://github.com/Chris0Jeky/Pulseboard/pull/51), merged to Pulseboard `main` as
`e3c627a8ade5e6b382138c40b1deb00f796674c4`. The generated Alibi adapter accepts
`unattributed`, `0.11.3` and `0.11.4`; its lock SHA is
`e0f0480e03eae560599a9e6562390bfc318f5d02f0ace7d290be1fd2d9cf9bd3`.

## Publication and delivery

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Cloudflare Worker
  `alibi-after-hours-preview`, version `ef512e73-7e2d-4864-a90d-e938d468bdc9`. The deployment
  uploaded 11 changed assets on top of the retained 271 assets. Root HTML, manifest, service
  worker and the current hashed application script returned HTTP 200 with the expected HTML,
  manifest and JavaScript MIME types. Cloudflare returned the emitted CSP, `no-referrer`,
  `nosniff`, `no-cache` shell policy and immutable hashed-asset caching.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 16, deployment
  `appgdep_6aabac35f2f48191b5aa2f3e59150239`. The saved source is exactly the merged source SHA
  above. The provider accepted 284 archive files, `33,607,680` bytes after storage normalization,
  with content hash `sha256:6be5a58534e23a0148864f12569924912e022730641c13c13fd0fbe6d3531aff`.
  It remains public and active. Its HTML, manifest, service worker and hashed application script
  returned HTTP 200 and the expected MIME types. Sites did not emit the repository's CSP,
  `no-referrer` or `nosniff` response headers; this is the existing provider limitation tracked
  in [#6](https://github.com/Chris0Jeky/Alibi), not a claim of header enforcement.
- The local validated Sites archive is retained under
  `release/alibi-sites-0.11.4-a79b7eb.tar.gz`: 30,123,483 bytes, SHA256
  `37fda1b85bdd9ea488e14232f3e4777d0123de2f451f08fa2a48ccf0602453c7`, and 284 files including
  the normalized hosting manifest. The release bundle directory is
  `release/alibi-0.11.4-159f34ae5948-IVBm0w`; its Cloudflare ZIP is 30,268,965 bytes with SHA256
  `0b9ca4fadb806eac44a95a39f8022c4a9066ce20662da21e76c670d50148d4f6`.
- The generated `build-info.json` is retained in that local release bundle rather than served as
  a public static asset. Both hosted browser suites instead read the deployed runtime identity
  directly and confirmed version `0.11.4` and build `159f34ae5948`.

## Verification

The merged source reproduces locally with `npm ci` (zero reported vulnerabilities), `npm run verify`
and `node observatory/check.mjs`: 313 Node tests, 581,847 assertions, 89 private-room assertions
and 27 Quiet Wing adapter assertions pass. The build emits 361 puzzles, 13 engines, 5 casebooks
and 283 static files. `npm run cloudflare:check` passes Wrangler 4.129.1's assets-only dry run.

The required hosted CI runs both passed at the exact PR head: push run
[35199952286](https://github.com/Chris0Jeky/Alibi/actions/runs/35199952286) in 17m21s and pull
request run [35199955382](https://github.com/Chris0Jeky/Alibi/actions/runs/35199955382). Each existing
HTTPS origin passes 92 disposable Chromium real-origin checks with zero uncaught browser errors,
including IndexedDB durability, cross-tab conflict handling, service-worker offline reload,
backup/restore, malformed draft quarantine and newer-database refusal.

## Rollback and remaining limits

The immediate rollback references are the previous Cloudflare Worker version
`ed410dc7-bce9-4851-b8ad-0dab2569561c` and Sites version 15. No rollback was executed. The
publication archive and hosted reports remain in ignored local `release/` output; no credentials
or private saves were included.

Physical Android, TalkBack, human difficulty and curation, narrative sampling and audio-comfort
acceptance remain open in [HUMAN_TODO.md](../HUMAN_TODO.md). The six Expert studies remain
provisional: the source registry contains 361 puzzles, while the published origins before this
release contained 355. Browser and solver evidence does not close those human gates.
