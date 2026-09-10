# 0.11.1 — Optional usage sharing

Built from the 0.11.0 release plus the Observatory pilot (PR #83). This point release adds one
thing: an opt-in **Usage sharing** control at the bottom of the page, off by default, that sends
content-free action counts to the maintainer's own collector at
`https://pulseboard-observatory.commit-atlas.workers.dev` (Pulseboard Observatory; owner
decision 2026-09-10, notice approved). Nothing else in the game changes. Published puzzle IDs,
revisions and saves are untouched.

## What the control does and does not do

The control is the generated Pulseboard adapter (`observatory/browser.js`, source Pulseboard
`main` 35b929d), loaded after the page's `load` event as its own hashed asset. It shows a native
`details` block titled **Usage sharing** with the text: "Optional: share a small set of action
counts with pulseboard-observatory.commit-atlas.workers.dev. No document text, filenames, form
values or browsing history is sent. Raw events expire after 14 days. Your choice lasts 90 days on
this browser." and the checkbox "Share basic usage for this site". When ticked it sends event
names (page view, error occurrence, and the registered puzzle start/completion/hint names once
engine hooks exist), a bounded page-area label (always `home` until the in-app hooks are wired),
a release label (always `unattributed` in this build) and a temporary page-session id. It
never sends puzzle answers, saves, notes, imported packs, workshop text or browsing history. It
does not mount in standalone exports (`ALIBI_CONFIG.standalone`), under Do Not Track or Global
Privacy Control, in automated browsers, or off the public origin. The in-app privacy page,
`docs/SECURITY-AND-PRIVACY.md` and the README describe it the same way.

## Budgets and offline shell

The adapter is an online-only asset: it is not in the initial bundle and not precached by the
service worker, so the 125 KiB initial-JavaScript budget and the 1.3 MiB offline shell are exactly
where 0.11.0 left them (initial JavaScript 127,227 bytes gzipped; core offline shell 1,970,977
bytes). `build-info.json` reports the adapter separately: 10,834 bytes, 4,013 gzipped. Offline,
the control does not appear, which is correct because nothing could be sent. The document policy
gains the collector origin in `connect-src` only.

## Local evidence at PR head

`npm run verify` (format, build, 177 Node tests) passes on the merged tree; `node observatory/check.mjs`
verifies the artifact hash against the lock, the exact endpoint once, the absence of server-only
constants, the standalone rejection on the public origin, the CSP in both `_headers` and the
`index.html` meta tag, that the endpoint is absent from the initial bundle, that the emitted asset
is byte-identical to the lock, that the service worker does not precache it and that the size is
reported. That check now also runs in CI after `npm run verify`.

## Published verification

Pending publication. This section is completed with the deployed Worker version, the hosted
response headers, the first consented payload admitted by the collector and a withdrawal check,
in the publication follow-up that references this PR.
