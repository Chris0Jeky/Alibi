# Block Cabinet integration receipt

Candidate verified locally; the hosted workflow remains authoritative before merge. Not deployed. Physical Android not tested.

Implementation commit: `f9bced5ba9265472da9ba0a03eb238d3acad9771`. Build: `175a39090ec7`. App version unchanged: `0.11.1`.

- Full `npm run verify` passed: formatting, build, all Node tests and supplementary suites.
- Enhanced actual-control matrix: **44 checks** passed at 390 and 1280 CSS pixels, including successful lifted touch drops, touch cancellation, legacy rules/save preservation, undo/redo, keyboard focus, Cascade isolation, emitted-worker import, stale-tab rejection, offline reload and route disposal.
- Retained legacy Block Cabinet browser suite passed **34 checks** at 390 and 1440 pixels.
- Existing real-origin storage/offline suite passed **92 checks**; the broader application UI suite passed **182 checks**.
- Optional game JS/CSS/worker/art: **48844 bytes**, outside initial precache. Initial loader: **842 bytes gzip**. Main JS: **127978 bytes gzip**. Existing main and offline budget caps remain unchanged; new pack has a separate 64 KiB cap.

Art provenance and checksum are committed under `assets-source/block-cabinet/`. The live tiles, previews, particles and locally synthesized sounds are code, not baked UI screenshots.

The native-feedback adapter is an extension point, not an implemented native Android host. No APK, Play submission, physical latency or battery result is claimed. Cascade remains an experimental rule set with a separate export and no blanket solvability promise. Follow-ups: #118, #119, #120.

The temporary `codex/block-cabinet-delivery` branch runs scoped preparation only and is not part of either product PR. Merge/review #115 then #117; recheck current main and CI before merging. See engine architecture and acceptance documentation.
