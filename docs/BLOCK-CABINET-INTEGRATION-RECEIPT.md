# Block Cabinet integration receipt

Candidate verified locally; the hosted workflow remains authoritative before merge. Not deployed. Physical Android not tested.

Reviewed source fix: `9abfa3b` (the final review fix separates the local motion choice from mutable external floors and labels Cascade by its rendered heading; parent race fix `9e69a0a`). Build: `9245cce18870`. App version unchanged: `0.11.1`.

- Full `npm run verify` passed: formatting, build, all Node tests and supplementary suites.
- Enhanced actual-control matrix: **71 checks** passed at 390 and 1280 CSS pixels, including successful lifted touch drops, touch cancellation, legacy rules/save preservation, usable Undo/Redo focus, Cascade isolation, emitted-worker import, protected import races, local motion preference persistence across Club rerenders, live Zen/app-level and OS reduced-motion settings, the heading-labelled Cascade dialog, Zen presentation, stale-tab rejection, offline reload and route disposal.
- Retained legacy Block Cabinet browser suite passed **34 checks** at 390 and 1440 pixels.
- Existing real-origin storage/offline suite passed **92 checks**; the broader application UI suite passed **182 checks**.
- Optional game JS/CSS/worker/art: **49870 bytes**, outside initial precache. Initial loader: **841 bytes gzip**. Main JS: **127977 bytes gzip**. Existing main and offline budget caps remain unchanged; new pack has a separate 64 KiB cap.

Art provenance and checksum are committed under `assets-source/block-cabinet/`. The live tiles, previews, particles and locally synthesized sounds are code, not baked UI screenshots.

The native-feedback adapter is an extension point, not an implemented native Android host. No APK, Play submission, physical latency or battery result is claimed. Cascade remains an experimental rule set with a separate export and no blanket solvability promise. Follow-ups: #118, #119, #120.

Parent PR #115 is merged; child PR #117 remains the integration candidate until its final exact-head hosted checks and review state are rechecked before merge. See engine architecture and acceptance documentation.
