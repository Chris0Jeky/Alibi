# Theatrical edition 0.8.0

Published on 2026-09-09 from [PR #26](https://github.com/Chris0Jeky/Alibi/pull/26), integrated
with PR #27. Source merge: `adb4f5dcfdf5b3352616c612b0d21a0e9b05cb4e`.
Primary and fallback identities remain those in [DEPLOYMENT.md](DEPLOYMENT.md).

## Publication and hosted acceptance

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `5ef347d8-0dfa-4229-b186-f43394397664`.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 6, deployment
  `appgdep_6aa1809adbd48191ae7164da33b05426`, status succeeded.
- Exact-head CI [34371341883](https://github.com/Chris0Jeky/Alibi/actions/runs/34371341883) and
  [34371343936](https://github.com/Chris0Jeky/Alibi/actions/runs/34371343936) both pass.
  The first retains the `alibi-release-and-evidence` artifact.
- Both origins pass all 92 real-origin storage/offline checks. Disposable games seeded on live
  0.7 build `447f3b3b8ddc` accepted a second move while the update waited, then used the actual
  Save & update control. The exact state and pinned definition survived activation and offline reload.
- All 254 public primary files match release bytes; `_headers` is host configuration, not a public asset.
  All 250 fallback non-HTML files match. Its four HTML files preserve the original document and add
  938 bytes of host challenge code referencing `/cdn-cgi/challenge-platform/scripts/jsd/main.js`.
  The first bulk fallback read timed out at 20 seconds; the bounded retry completed with these results.
- Primary theatre: 88 checks pass. All five real photo providers return the pinned bytes with readable
  CORS from both app origins. Sites serves WebP/Ogg/GLB as generic binary, so the theatre test that blocks
  providers and demands a same-origin photo upgrade times out there. This is the known #6 host limitation;
  the loader retains complete painted artwork. Do not label that test green.

Local receipts are preserved in the coordinator's ignored `test-results/theatrical-edition/` folder.
The packaged release includes matching full origin, UI and two-tab update reports and SHA256SUMS.

## Changed

Eight complete local rooms, five credited photo alternatives, original SVG emblems and weather,
procedural offline sound, four deliberate short-film choices, and the existing interactive Field
notes library. Images are verified before display and use a separate eight-slot cache. The known
old image cache is retired without blocking play. All core libraries and artwork remain bundled.

Night contrast and stylesheet order from the original review are corrected. Quiet Wing receives
root comfort preferences, bounds classic history, clamps city keyboard movement, exposes Lo Shu
selection and carries an inline standalone source ledger. Partial offline exports carry explicit
missing-section warnings; challenge replays are clearly separate. Duel/Borough controls name their
coordinates and state. Validator downloads and Club recovery reads are bounded; abandoned
challenge opens are closed, and explicit unavailable storage can use its retained session store.
Packaging runs all Node suites and includes only matching, complete origin receipts in fresh folders.

## Verified source checkpoint

Build `c8ea40a83be7`: 324 puzzles, 13 families, four casebooks, 255 emitted files.
Core offline bytes: 1,872,667. Initial JavaScript gzip: 110,647 bytes; initial code and official
content gzip: 149,132. Quiet Wing: 2,281,378 bytes. Image enhancements: 3,303,960 bytes outside
core installation. All existing core/JS/CSS/Wing budgets pass; optional images are below 4 MiB.

Local format/build gate: 91 Node tests, 581,834 Quiet engine assertions and 22 contract assertions.
The new theatre suite passes 88 checks at 390/1280px, including every room offline, real local
audio, film playback, autoplay refusal recovery, Night contrast and synchronized weather.
The 16 delivery checks cover useful cold fallbacks, cached detail, actual offline saved moves,
failure/reconnection and preference persistence. Real provider browser requests match all five
pinned WebP fingerprints with readable CORS. Screenshots were visually inspected. Broader
UI, storage and update results are retained under `test-results/` and in the final CI artifact.

Two independent bounded review slices covered multimedia/integration and reliability respectively.
One scoped verification confirmed the media review fixes. Review details and hosted CI are on PR #26.
The final backup confirmation names only exported sections and immediately identifies an omitted
Quiet Wing. The autoplay test waits for service-worker startup before opening its film shelf;
the failed CI trace showed the startup render closing that disclosure during the click.

## NOT verified / residual risk

Physical Android relaunch, TalkBack, sensory comfort, sustained GPU/battery behavior, actual 3D
editor interchange and subjective puzzle calibration remain [HUMAN_TODO.md](../HUMAN_TODO.md).
No phone data was cleared. Optional-media caches can be denied or evicted; complete local art
and saves remain independent. Films require connectivity and are not represented as offline video.

Sites continues to omit response CSP/nosniff/permissions headers; the document now supplies its
supported CSP/referrer policy. Response-level limitations remain issue #6. Cloudflare remains
the primary host. No new domain, account, backend, paid generation or package-CDN runtime was added.

[Issue #36](https://github.com/Chris0Jeky/Alibi/issues/36) tracks a MEDIUM preference bug found in late
review: mounting Quiet Wing can re-enable its separate Companion motion choice when root Reduce motion
is unchecked. Root Reduce motion still suppresses animation. The bounded review policy retains this as
a follow-up rather than a new fix loop; this release does not claim physical sensory acceptance.

Pillow tooling is pinned and renderer-tested at 12.3.0; sharp is already 0.35.4. These meet the patched
versions in the fourteen reported dependency advisories. GitHub still listed those alerts open immediately
after merge; scanner reconciliation was not represented as complete and no alerts were manually dismissed.
