# 0.11.1 — Optional usage sharing

Built from the 0.11.0 release plus the Observatory pilot (PR #83). This point release adds one
thing: an opt-in **Usage sharing** control at the bottom of the page, off by default, that sends
content-free action counts to the maintainer's own collector at
`https://pulseboard-observatory.commit-atlas.workers.dev` (Pulseboard Observatory; owner
decision 2026-09-10, notice approved). The deployed tree also carries one small accessibility
correction merged into `main` just before publication: occupied Block Cabinet cells now expose
when they are legal piece origins (PR #105, `a7133be`). The rebuilt in-app "What's new" entry
names both changes. Published puzzle IDs, revisions and saves are untouched.

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
service worker, so the declared 125 KiB initial-JavaScript budget and 1.3 MiB code-and-shell budget
excluding official content remain unchanged; the total core offline release cap is 2.3 MiB. The
measured artifacts grew slightly from 0.11.0 (initial JavaScript 127,082 to 127,227 bytes gzipped;
total core offline release 1,970,010 to 1,970,977 bytes). `build-info.json` reports the adapter
separately: 10,834 bytes, 4,013 gzipped. Offline,
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

Published 2026-09-10 from `46a3eb1db98d61ff085e9d150248f7a46a94caff` (PR #83 merged with the
0.11.0 `main`), build `ce47924a1cd5`: `npm run verify` 178 tests and `observatory/check.mjs`
green on that commit, `npm run cloudflare:check` read 278 assets, `npm run cloudflare:deploy`
uploaded 5 changed files (270 unchanged).

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `38a1ca89-cbb5-4428-bbc3-0390c613bb46`. The response CSP header lists the collector origin in
  `connect-src`; the bundle `assets/alibi.3c55be01aa3a.js` names `assets/observatory.cedd32490510.js`,
  which is served with 200, 10,834 bytes and sha256 `cedd3249…` equal to the lock; `sw.js` has no
  observatory entry.
- Real browser (Chromium, this box): the **Usage sharing** block sits at the end of the page after
  the app content. Ticking the box set the status to "Sharing is on. Untick to stop future
  collection." and the collector admitted one `page.view` (route `home`, release `unattributed`) at
  18:03:56Z; the first request took 5.4 s on a cold path and hit the adapter's 5 s abort, so the
  client counted it failed while the server had admitted it (tracked as Pulseboard#32 item 7); a
  reload sent a second `page.view` in about 1 s, client `sent: 1`, collector total 2 with two
  distinct page sessions. Unticking set "Sharing is off. The app works normally." and stored
  `allow: false`; a further reload made no collect request and the collector total stayed at 2.
- Fallback (ChatGPT Sites): **not updated**, remains on 0.11.0. Publishing there follows the
  release procedure's Sites steps with the owner's short-lived credential.

Not verified here: the Python browser suites on this machine (CI ran them on the PR head), a
physical phone, a real Global Privacy Control signal in a shipping browser, and the fallback origin.
