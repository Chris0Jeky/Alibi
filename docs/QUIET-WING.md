# Quiet Wing integration and recovery

Source candidate: **0.6.0-lab.1**, built 2026-09-08. This is an integrated source candidate,
not a claim that the new release is hosted or has passed physical Android acceptance.
The existing Sites and After Hours preview configurations are unchanged.

## Changed

The current repository was inspected at `1f049a794609be04f29a91117fbd1a8701d28d08`, matching
the prototype's review anchor. Issue #11 remains open. All 209 supplied delivery-manifest
hashes were checked and match. The input bundle remains ignored; no combined deployment
was copied over source. `content/`, published puzzle revisions, the root database version,
hosting identities and optional room-service code are unchanged.

| Prototype material | Source disposition |
| --- | --- |
| `source/src/engine.js`, `realm.js`, `pets.js` | Formatted into `src/quiet-wing/`; reducers and procedural Canvas/OBJ geometry retained |
| `source/src/app.js`, `style.css` | Ported into a disposable Shadow DOM activity; source-native `#/quiet/…` routes and return navigation |
| `source/src/storage.js` | Separate version-1 namespace; CAS, bounded waits, raw recovery, future-schema protection and IndexedDB-only restore |
| `source/tests/engines.cjs`, `contracts.cjs`, `solutions.json` | Root test gate under `tests/quiet-wing/`; obsolete distribution-SW string checks replaced by integrated origin/update evidence |
| `source/tests/browser_acceptance.py` | `tests/browser_quiet.py`, now exercising a real local origin and all 13 classic configurations |
| Prototype smoke/combined-distribution integration scripts | Historical input; superseded by the root gates and `tests/browser_quiet_origin.py`, not claimed rerun against an obsolete distribution |
| `source/tools/fetch-art.mjs` | Rights-checked ingestion under `tools/`; official AIC field selection and application header; raw metadata receipts retained |
| Assets, NOTICE and handoff/review/checklist | Sprite, four optimized museum images and licences retained; original review documents archived under `docs/quiet-wing/PROTOTYPE-*` |
| `asset-library/`, sample exports | Reference outputs; geometry comes from the source engines and actual export controls, not a duplicated static model library |
| Combined deployment, bridge, standalone root, manifest, SW, hosting config | Not imported. The existing root build, manifest, service worker and public origins remain authoritative |

`src/activities.js` loads the optional script and styles only when entering the wing (or explicitly
opening combined backup tools). Mounts and exits serialize. Only the selected activity renders;
exit disposes its observer, timers, listeners, audio and object URLs. Failed mounts expose a
visible return link. Clean re-entry reads current storage; unsaved/session/protected state stays
available in memory for export. Rendered previews and transient selections are not saved as moves.

The root worker owns navigation and activation. Hash routes require no `/retreat` document or
second service worker. The optional `alibi-quiet-wing-pack-*` cache is filled on entry and retains
the current and previous pack. It is separate from `alibi-shell-*`, `alibi-device` version 1,
`alibi-afterhours-v1` version 1 and `alibi-quiet-wing-v1` version 1. All are same-origin, device-local.
The source-credit page has an explicit root-worker document exception and works offline.
An optional pack download failure does not prevent online activity; its offline readiness is
shown in Quiet Wing settings. The core's offline indicator does not certify an unvisited wing.

Combined backup discovery is in **Settings & saves → Export all saves / Review combined backup**.
The manifest identifies Cabinet, Club and Quiet Wing. Every available section is validated before
offering restore. The user then reviews one section at a time through its own restore flow and
recovery transaction. A cabinet restore reloads the app; reopen the combined file for subsequent
sections. There is no all-or-nothing transaction spanning databases. Local stamps and imported
state never enter trusted rankings; Zen hides the wing's stamps.

## Verified

- `npm run verify`: formatting, reproducible build, existing Node suites, the activity lifecycle
  race test, 95,459 Quiet Wing parameterized assertions and 20 storage/recovery assertions pass.
  Geometry samples dominate the large assertion count; it is not an independent gameplay count.
- `tests/browser_quiet.py`: **156** real-origin control checks. All 13 classic configurations
  solved through buttons; realm stack/undo/redo and JSON/PNG/SVG/OBJ ZIP export; all four companions
  and actions; garden/stroll timestamp fixtures; restore validation; touch confirmation; 13 routes
  at 360/390/768/1440px. No uncaught page errors. Mobile realm, companions, garden, desktop realm
  and journal screenshots were inspected. This is Chromium emulation, not a phone.
- `tests/browser_quiet_origin.py`: **34** checks: lazy entry under an already controlling root
  worker, committed saves, non-canvas plot selection/edit, disposal, untouched cabinet/Club runs,
  stale writer refusal and session export, combined backup staging, per-section recovery,
  synthetic A/B update with older cabinet and wing tabs, prior optional assets, process restart,
  offline original and new routes, four decoded museum images, source credits, future database
  raw export, and recoverable mount failure. No uncaught page errors.
- Existing browser gates rerun: **182** original UI, **106** Club, **92** origin, **247** expedition,
  **28** restart, **6** boot recovery and **18** update checks; **3** two-browser room checks against
  the local Wrangler runtime. All passed. Node room protocol tests also passed in `verify`.
- Build `ba0a721c3f89`: **116** unchanged catalogue puzzles, **13** original families, **4** casebooks;
  30 emitted files. Initial JS gzip **123,919 bytes**; core offline files **1,158,505 bytes**;
  optional wing **595,152 bytes**; complete static output **1,753,657 bytes**. Budget gates retain
  125 KiB initial JS / 1.3 MiB core, adding a separate 750 KiB optional-pack ceiling.
- Independent Terra high review found no confirmed CRITICAL/HIGH defects. Browser verification
  subsequently added a visible fallback for failed Shadow DOM mounts and directly proved it.
- Local evidence: `test-results/quiet-wing/{controls,origin}-results.json`, screenshots and actual
  downloaded exports; `tests/quiet-*.log`; existing suites' named reports. CI uploads the wing
  evidence alongside the existing reports. Consult the PR for current hosted CI status.

One local rebuild encountered Windows `EPERM` while Wrangler watched `dist`. Stopping that
temporary runtime released the directory; the build and changed-seam suite then passed. No
force-delete or source reset was used. The update fixture initially assumed `ALIBI_CONFIG` was
the first generated line; that existing build contract was preserved and all 18 checks passed.

## Asset receipts

All four actual museum API records returned explicit public-domain flags. The initial bare AIC
requests returned 403; field-selected official API GETs with its application header succeeded.
Original files and full API records live in `assets-source/quiet-wing/museum/`. The optimized ledger
in `src/quiet-wing/assets/museum/rights.json` records both hashes, dimensions, source URLs, dates,
credits and recipe. The four WebPs total **402,458 bytes**, decode successfully and were inspected.

The acquisition and optimization commands are `node tools/fetch-art.mjs` and
`node tools/optimize-quiet-art.cjs`; fetch is opt-in, never a build/network dependency. The optimizer
checks original hashes and rights, decodes, fits inside 960×960 without enlargement and emits
quality-82 WebP. The optimized rights ledger and Kenney licence are also emitted with the pack.

The supplied keeper sprite matches Git blob `e453368ed178fec5151f15f9f310166ee645501c` (2,324 bytes).
The downloaded `Downloads/kenney_castle-kit` contains Castle Kit **2.0**, with its actual CC0 licence
retained in `docs/quiet-wing/KENNEY-CASTLE-LICENSE.txt`. That newer 3D pack was inspected as reference;
its models are **not** imported or rigged. The small sprite is from the prototype's 1.0 mirror,
whose original creator/source links remain in the credits. No inspiration screenshots are shipped.

## NOT verified / promotion gates

[Issue #13](https://github.com/Chris0Jeky/Alibi/issues/13) and [HUMAN_TODO.md](../HUMAN_TODO.md)
track the remaining gates. No Quiet Wing deployment, hosted A/B test, or hosted rollback is claimed.
The affected Android freeze cause/resolution remains unconfirmed under issue #11. Physical
Android/iOS, TalkBack, large system text, pinch/pan, haptics/audio, long-session memory/CPU/thermal
behavior, real OBJ/MTL editor import and human difficulty/idle-pace calibration remain unverified.
No new public origin or replacement deployment was created. The source candidate is reviewable;
preview promotion stays behind these explicit checks rather than inheriting earlier hosted receipts.

## Recovery and next steps

1. Before testing a new release, export **all saves** on the existing origin and keep the JSON
   elsewhere. Origin/profile changes do not carry IndexedDB. Warnings in an export matter.
2. If a wing write fails or another tab has a newer revision, export **the wing session** before
   reload. A failed write is not labelled Saved. Close stale tabs, then reopen the committed save.
3. For unreadable/future data use Quiet Wing settings → **Export raw recovery**. This preserves
   unknown records, including newer database versions. Keep that file for the compatible app or
   diagnosis; raw recovery is deliberately not an automatic destructive restore format.
4. After a mistaken wing restore, choose **Export previous save**, retain the file, and review it
   through Import. Cabinet and Club retain their existing recovery controls. Each store recovers
   independently; a later section's failure does not undo earlier successful sections.
5. For issue #11, record device/browser/storage; cold-launch, finish The last service, return home
   and reopen, repeat three times, force-stop/relaunch, relaunch offline, change a note and export;
   then stage an update with an older tab open. Capture the exact failed step. Never clear site data.
6. After device acceptance, rebuild the reviewed source and promote through the existing preview
   configuration. Run hosted original and wing origin/update suites and inspect actual responses.
   Keep the last release archive and all three backups. Roll back app files only; do not delete,
   downgrade or migrate databases to make an older release open them. An older app cannot expose
   Quiet Wing progress, but must leave it available for the compatible build.
