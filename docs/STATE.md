# Live development state

## Source maintenance checkpoint: 23 September 2026

Reconciled against `main` at `bc9d4c0ac67310903183f8dc0d56bcb80d2f564e`.
This checkpoint records repository work, not a deployment. Source merges do not update either
hosted origin automatically. Use live GitHub for later PR/issue status and exact-head checks.

| Work | Evidence and continuation |
| --- | --- |
| #264: stale test artifacts | #286 merged as `3c37667c97ba9023cd0a110ab322c4a227f5229b`. `npm test` checks source, payload identity and receipts before artifact-dependent suites. Both full verify run `35916329920` and Android run `35916329976` passed head `4f9625cc46898291441ed66039a159a3f783c09b`. |
| #285: named routes | #287 merged as `bc9d4c0ac67310903183f8dc0d56bcb80d2f564e`. Known page casing is normalized without altering puzzle IDs or queries; browser tests assert actual about/login pages and working exits. Full verify `35917035567` and Android `35917035553` passed head `d70b5e4031baea71853f5f7c67effeb7a65a705b`. |
| #276 / #278: Cabinet landscape and exit target | #288 contains the bounded board/tray layout, 44px return target and real placement/undo/menu/keyboard regressions. See that PR for its current head, required CI and merge decision. Local source-DOM checks cover 667x375, 844x390, portrait and desktop; they do not establish physical-device acceptance. |
| #282: local-first architecture skim | #281 now contains a self-contained Alibi decision candidate and acceptance matrix. It no longer depends on machine-local ADR files. Thirteen focused source tests passed. Keep the draft/maintainer-skim gate: no sync server, outbox, replication runtime or accepted ADR is implied. |
| #257: historical source heading | Already satisfied on the reconciled main source; closed after checking the explicitly earlier checkpoint and retained evidence. |

The maintenance workspace came from an uploaded source ZIP verified against original main
`bda28b1dad5ec500808ef758ed1d05c0425868e2`. Local dependency installation failed with DNS
`EAI_AGAIN`; local browser HTTP navigation was blocked. Source tests and isolated inline Chromium
fixtures were used for reproduction, with full build/HTTP/platform proof taken only from the
relevant exact-head GitHub Actions runs. No local fixture is a deployment or persistence receipt.

## Published browser baseline and dated receipts

Version **0.11.5** contains 376 catalogue entries across thirteen puzzle families. The latest
receipts present in the [release record](RELEASE-0.11.5.md), reviewed on this date, are:

| Origin | Receipt date | Build | Recorded source |
| --- | --- | --- | --- |
| Cloudflare | 23 September 2026 | `d6862c274553` | `a3b48daddb0eae1832c61d3358a603593d980da9` |
| Sites | 22 September 2026 | `b8c6f194c5a4` | `c8a613a6278845ce7e3df8fe8adff1c505942cdf` |

These are dated document readbacks, not new live-origin probes. Older `df04399c4ee7`,
`ce60bde20b83` and `b8c6f194c5a4` Cloudflare checkpoints are historical. Preserve their
checksums and rollback evidence; never infer that every origin has the same current build.
The hosting CSP/WebP constraints remain #6. No deployment or rollback was executed here.

## Android source preview, not a production release

CAP04 has pinned browser/Capacitor flavors, a strict native bootstrap, sync/build receipts and
sampled Android 36 emulator evidence for debug and release-like preview APKs. See the
[archived CAP04 record](STATE-ARCHIVE-2026-09-23.md#cap04-offline-android-preview-candidate-2026-09-22)
for the exact scope. These use local debug signing and the unapproved preview application ID;
they are not a production-signed AAB or a Play Store release.

Every-feature offline play, minimum-WebView compatibility, physical devices/accessibility,
recovery, transfer, production identity/signing and owner release approval remain open under
#126 and the dependent [Capacitor packages](capacitor/README.md). Source, emulator and human
acceptance are separate. [HUMAN_TODO.md](../HUMAN_TODO.md) retains the owner/device gates.

## Next focused work

- #277: Bridges on short landscape still exposes only two of four islands after the lesson.
  Preserve 44px island targets and zoom/pan while reducing surrounding chrome; do not treat the
  Cabinet layout in #288 as a Bridges fix.
- #272: complete dossier/witness arrow-key semantics without breaking their Tab/Enter paths.
- #270 / #274: correct the optional journey receipt boundaries around retry, undo and session
  rollover; do not count restoring/rendering a board as a fresh player attempt.
- Continue #218 / #160 phone QA and player-led curation. Automated layout and replay evidence
  does not replace comfort, editorial, accessibility or difficulty calibration.

## Historical evidence

[STATE-ARCHIVE-2026-09-23.md](STATE-ARCHIVE-2026-09-23.md) preserves the previous state file
byte for byte, including publication, source, QA and rollback receipts. Its title, present-tense
wording, worker activity and PR statuses belong to those historical checkpoints, not live state.
The [roadmap](../ROADMAP.md) separates published browser capability from native preview work
and future services.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The earlier candidate and proving checks remain in the archive. In particular,
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Do not convert that historical source proof, or the newer landscape regressions, into a native
release signoff.
