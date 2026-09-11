# Block Cabinet integration receipt

Candidate verified locally; the hosted workflow remains authoritative before merge. Not deployed. Physical Android not tested.

Reviewed source fix: `91e1303832465cd6cec6797545125d07d86c1d18` (app reduced-motion `e80c451`, parent race fix `9e69a0a`). Build: `3284c5f4044f`. App version unchanged: `0.11.1`.

- Full `npm run verify` passed: formatting, build, all Node tests and supplementary suites.
- Enhanced actual-control matrix: **57 checks** passed at 390 and 1280 CSS pixels, including successful lifted touch drops, touch cancellation, legacy rules/save preservation, usable Undo/Redo focus, Cascade isolation, emitted-worker import, protected import races, app-level and OS reduced-motion settings, Zen presentation, stale-tab rejection, offline reload and route disposal.
- Retained legacy Block Cabinet browser suite passed **34 checks** at 390 and 1440 pixels.
- Existing real-origin storage/offline suite passed **92 checks**; the broader application UI suite passed **182 checks**.
- Optional game JS/CSS/worker/art: **49207 bytes**, outside initial precache. Initial loader: **841 bytes gzip**. Main JS: **127977 bytes gzip**. Existing main and offline budget caps remain unchanged; new pack has a separate 64 KiB cap.

Art provenance and checksum are committed under `assets-source/block-cabinet/`. The live tiles, previews, particles and locally synthesized sounds are code, not baked UI screenshots.

The native-feedback adapter is an extension point, not an implemented native Android host. No APK, Play submission, physical latency or battery result is claimed. Cascade remains an experimental rule set with a separate export and no blanket solvability promise. Follow-ups: #118, #119, #120.

The temporary `codex/block-cabinet-delivery` branch runs scoped preparation only and is not part of either product PR. Merge/review #115 then #117; recheck current main and CI before merging. See engine architecture and acceptance documentation.
