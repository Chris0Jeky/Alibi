# Live development state

## Source maintenance checkpoint: 24 September 2026

Reconciled against `main` at `43319e52db12310b8b8a20f9633fbdfc7a2863a4`.
This checkpoint records repository work, not a deployment. Source merges do not update either
hosted origin automatically. Use live GitHub for later PR/issue status and exact-head checks.

| Work | Evidence and continuation |
| --- | --- |
| #277: Bridges landscape | #290 merged as `e721a3b7663b2faf494b7585ecca2fd9a26cc3e0`. PR-head cabinet run `35930469160` passed head `f67c6e03bf3cd24c2e642fcde5c2e740f954ca45` (height-aware board plus the 33-rule expedition.css removal); the main-head run was cancelled by a superseding push. Physical-device acceptance remains separate. |
| #293: README release line | Merged as `d136f1eed26ec7dd094ceb35940c9aa9176ada81`. Main-head cabinet run `35932894357` passed. README now reconciled at 0.11.5. |
| #274 / #270: journey receipt boundaries | #291 merged as `250a509e6102c2a5d290aaf053d062882d3e2c1f`. PR-head cabinet run `35933288366` passed head `f0215447024f04c8eb704cd02bcd1de359c47f51` (includes the owner restart-boundary tests); the main-head run was cancelled by a superseding push. Undo-retry and restart boundaries are in source. |
| #296: transitive uuid pin | Merged as `554d298f166ef5343f7a9d7b92033a7d6d3f4cd0`. PR-head cabinet run `35934028891` passed head `825e79219777098567d7189086311ca4c62c3b9f`; the main-head run was cancelled by a superseding push. Transitive uuid pinned to 11.1.1 for the xcode subtree. |
| #297: single-source pack cap | Merged as `0896d5388db908d2a52ec1252e7cd39b5f88ef82` after PR-head cabinet run `35937381890` passed head `5ada0994acc52574728661764d0a8fd4f5eca5de`. The main-head cabinet run `35976744344` then failed the 126 KiB gzip budget (red main); #298 below resolved it. |
| #272: dossier/witness arrow keys | #292 merged as `d71d241c85517335cfdf564b9775343962f9e07b`. PR-head cabinet run `35979342079` passed head `2ab81e33639b753d08eb0dabb22f6e5712889652` (an earlier failed attempt on the branch re-ran green and was diagnosed as a flake); the main-head run was cancelled by a superseding push. Tab/Enter paths preserved. |
| Bundle budget restoration | #298 merged as `43319e52db12310b8b8a20f9633fbdfc7a2863a4`. Main-head cabinet run `35984246288` and storage run `35984246356` passed. The application budget is 127 KiB gzip; the merged tree is green. |
| #270 fixture follow-up | #295 open at `adea099922e6005b18b2c02582d0b4685afa84e5`: test-only row-or-column conflict peer. Its verify run `35933404822` failed once on the september-feedback race below; a rerun was in progress at checkpoint time. This closes the last in-repo #270 item; session rollover stays collector-side. |
| september-feedback race | Second occurrence of the `browser_september_feedback` KeyError on identical code (first: 23 September archive). The scene engine trace is deterministic, so the race is test-side (immediate state read after tap). Planned hardening: wait-for-observable-state guards plus tap/width diagnostics on the cycle-loop asserts. |
| #282: local-first architecture skim | #281 still draft behind the maintainer-skim gate; no sync runtime implied. No change since the previous checkpoint. |

This checkpoint was reconciled from live GitHub state (merge commits, exact-head
workflow runs and open PR/issue records) against a clean local checkout of the
reconciled SHA with a fresh local build. No deployment, rollback or device
acceptance was executed here.

## Published browser baseline and dated receipts

Version **0.11.5** contains 376 catalogue entries across thirteen puzzle families. The latest
receipts present in the [release record](RELEASE-0.11.5.md), reviewed 23 September 2026, are:

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

- Merge #295 once its verify rerun is green, closing the last in-repo #270 item.
- Harden `tests/browser_september_feedback.py` (waits plus tap diagnostics) after the rerun
  verdict lands, so the race above cannot silently recur.
- Continue #218 / #160 phone QA and player-led curation. Automated layout and replay evidence
  does not replace comfort, editorial, accessibility or difficulty calibration. The landscape
  source fixes above still need physical Android/TalkBack and enlarged-system-text acceptance.
- Scope bounded slices of the design-system debt (#219 type ramp, #220 radii, #221 button
  recipes) with visual verification; do not start them as one mega-PR.

## Historical evidence

[STATE-ARCHIVE-2026-09-24.md](STATE-ARCHIVE-2026-09-24.md) preserves the previous state file
byte for byte. [STATE-ARCHIVE-2026-09-23.md](STATE-ARCHIVE-2026-09-23.md) preserves the earlier
checkpoints in the same way. Archive titles, present-tense wording, worker activity and PR
statuses belong to those historical checkpoints, not live state.
The [roadmap](../ROADMAP.md) separates published browser capability from native preview work
and future services.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The earlier candidate and proving checks remain in the archive. In particular,
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Do not convert that historical source proof, or the newer landscape regressions, into a native
release signoff.
