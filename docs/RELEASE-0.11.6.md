# 0.11.6: A larger picture collection, clearer hints

## Published web release: 25 September 2026

The reviewed Cabinet restore fix [PR #335](https://github.com/Chris0Jeky/Alibi/pull/335)
merged as `aa93c3340c108a4d90afcd0d955f551ce35da3b1` and closed
[issue #333](https://github.com/Chris0Jeky/Alibi/issues/333). The final PR head
`8c1b219221f531b053c16e8a008783c9a9654e37` passed
[exact-head Verify](https://github.com/Chris0Jeky/Alibi/actions/runs/36122242738)
and all other applicable checks. The focused second independent review found no
new direct blocker. The merge preserved commits after the three-minute head age.

The clean merged-source build is `db7e68c1bfa6`: 382 puzzles, 292 emitted files,
130,271 JavaScript gzip bytes and `sourceDirty: false`. Local `npm.cmd ci`,
`npm.cmd run verify` (529 passed, 3 skipped), example-pack validation,
`node observatory/check.mjs`, Cloudflare dry run and `npm.cmd run bundle` passed.
The Windows audio checks needed the installed Krita `ffprobe` directory on `PATH`;
the first bundle attempt without it failed, then the corrected run passed.
Local real-origin Chromium passed 214 checks. The
[public release](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.11.6)
and annotated tag `v0.11.6` point to the merged source; the downloadable ZIP
SHA-256 is `d9710717dd955c6dd35f1778433214dc7b91ed0cc90a11ae2b8c33616d6977ae`.
The standalone HTML SHA-256 is
`e31c5c748704576f7bdead6e6deeca2069aa6a087f9012f571365782172a545e`.
The public release includes `SHA256SUMS` for its downloads; the local bundle
also retained verification reports.

| Origin | Publication receipt | Actual response proof |
| --- | --- | --- |
| [Cloudflare primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/) | Worker version `107707f3-1e5d-442c-94b3-c87c6ec73ae6` | 214 hosted real-origin checks; 291 public files HTTP 200 and byte-identical to the local build; HTTP CSP and sampled WebP MIME present. |
| [Sites fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/) | Saved version 22, deployment `appgdep_6ab64e1a75ac8191b8308d22bdb4cb15`; archive content digest `sha256:92521e5f85939139d4f5a9c59d6dd82fa6ff39c3efc1e665d509c2acb2dd3835` | 214 hosted real-origin checks; all 291 public files HTTP 200, all non-HTML bytes identical; Sites transformed ten HTML pages. |

The two source builds matched all 292 emitted files before Sites packaging. Each
hosted browser run used disposable profiles and exercised actual IndexedDB,
backup restore/recovery, saved moves after offline reload, service-worker
control and shared-link navigation. The Sites host still omits the repository
HTTP CSP header and returns the sampled WebP as `application/octet-stream`,
consistent with the existing hosting limitation tracked by issue #6. The
previous 0.11.5 Worker and Sites versions remain rollback references in
[RELEASE-0.11.5.md](RELEASE-0.11.5.md); rollback was not executed.

Physical Android freeze recovery, TalkBack, sustained device performance, and
human recognition/difficulty calibration are **not verified**. The six new
Picture Logic labels remain provisional in `HUMAN_TODO.md` q-8. The Android
build remains a non-publishable preview; no store publication is claimed.
The pre-publication notes below are retained as dated history.

## Source candidate history

Source release candidate prepared 2026-09-25 from the changes merged after 0.11.5.
It contains six original 15×15 Picture Logic studies, the Lantern and Tents hint
improvements, Archive boundary corrections and a bounded Reversi depth fix. The
source catalogue now contains 382 puzzles across 23 packs.

The four Tricky and two Expert labels on the new pictures remain provisional. Human
calibration, recognizability, physical touch and TalkBack acceptance remain open under
`HUMAN_TODO.md` q-8. Existing puzzle IDs, revisions, save formats and database versions
are unchanged.

## Candidate verification

The local `npm.cmd run verify` gate passed on 25 September: formatting, the Android preview
build, 526 Node tests (523 passed, 3 skipped, 0 failed), and both Quiet Wing suites (581,847
and 29 assertions). The emitted 0.11.6 Android preview records `sourceDirty: false`, 382
puzzles and 130,014 JavaScript gzip bytes, 34 bytes below the fixed cap.

Pulseboard PR #86 merged the release contract at `b01624b`. Its sync and check commands now
register 0.11.6, require the matching `v0.11.6` catalogue tag, and verify the bundled adapter
hash. The candidate's generated Observatory checker and browser bridge were refreshed from
that contract. From Pulseboard's `observatory` directory,
`npm.cmd run check:alibi -- <Alibi checkout>` confirmed the registration. From this Alibi
checkout, `node observatory/check.mjs` and `PYTHONUTF8=1 python tests/browser_observatory.py`
passed; the browser suite reported 24 assertions. The previous hosted Verify run was on pre-fix
head `9ebf813` and failed the real-origin assertion that the initial page view uses the
registered app release. Corrected head `3adfde9db7c68c2c78741a1e99c6090ec0f4cc9c` passed
[Verify puzzle cabinet](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890060) and
[Verify Android payload](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890051). PR #330
merged that source as merge commit `287fc38757d8628bfa8a0b6912adf90aadca0219` after the
independent review found no confirmed CRITICAL/HIGH issue. These checks do not claim a new
deployment, a physical-device check or human difficulty acceptance.

## Pre-publication source checkpoint

The 0.11.6 source merged to `main` as `287fc38757d8628bfa8a0b6912adf90aadca0219`; no tag,
deployment or public GitHub release has been created. The 0.11.5 Cloudflare and Sites receipts
remain the latest verified deployments.

## Pre-publication check: 25 September 2026

On `main` at `84be37f7ae8c67545200866df189ea98d065bec5`,
`npm.cmd ci`, `npm.cmd run verify`, `node tools/validate-pack.cjs
examples/twelve-families.json`, `node observatory/check.mjs`, and
`npm.cmd run cloudflare:check` passed locally. The Windows test run added Krita's
installed `ffprobe` directory to `PATH` for the audio asset checks. The clean
build identifies version `0.11.6`, build `024c5bc9bd9d`, 382 puzzles,
`sourceDirty: false`, and 130,014 JavaScript gzip bytes. The same main head
passed [hosted Verify](https://github.com/Chris0Jeky/Alibi/actions/runs/36092124637).

Read-only HTTPS checks still found build `d6862c274553` on Cloudflare and
`b8c6f194c5a4` on Sites; neither origin serves 0.11.6 yet. PR #332 merged
curation regression tests as `da19969`. PR #329's binary hint change
remains a separate draft with a failing size gate. Before publication, recheck
the final merged head and build, create the matching tag, deploy both existing
origins from one validated build, and verify their actual files and offline
behavior. Physical play and difficulty calibration remain open in
`HUMAN_TODO.md`.

Real-origin Chromium also reproduced [Cabinet restore issue #333](https://github.com/Chris0Jeky/Alibi/issues/333):
a run saved by another tab between the recovery snapshot and replacement was
absent from both the restored runs and the recovery copy. The release remains
unpublished while that data-loss boundary is repaired and reverified.

The fix candidate at `cbfdf0e30688c4c6ed6acc05adec4ee427b32b12`
serializes the recovery snapshot and replacement in one IndexedDB write
transaction, rejects stale merges, and aborts queued writes on malformed
input. The first independent review exposed a stale-preferences merge path;
the fix now uses the guarded fresh snapshot for that payload too. Both browser
regressions failed before their fixes and passed afterward. Local Verify passed
with 529 Node tests passing and 3 skipped; the full real-origin browser suite
passed 214 checks. Clean build `7af1c8978307` contains 130,271 JavaScript
gzip bytes. The measured safety change adds 257 bytes to the previous
130,014-byte bundle, and the strict cap rises by 256 bytes to 130,304. Fresh
review of the logic fix and exact-head CI remain pending; no tag or deployment
has been made.
