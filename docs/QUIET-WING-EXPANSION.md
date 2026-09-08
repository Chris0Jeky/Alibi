# Quiet Wing expansion

Owner request, 2026-09-08: carry the expanded game through to the existing website. The source
integration is the starting point, not the definition of completion. Keep incremental commits.

## Intended experience and evidence

- A full creative city builder: modular castles, homes and roads, reproducible landscape/town
  generation, larger maps, move/copy and area tools, reversible edits, useful town feedback,
  polished lighting and animated life. Prove generated layouts and edits with reducer tests,
  actual controls, save/reload, mobile visual inspection and measured rendering performance.
- Better companions: expressive, quality animal assets and animation for every existing action;
  preserve names, bonds and walks. Record redistribution rights and animation provenance.
- More relaxing games and deeper garden/idle interactions with bounded, clock-safe progression,
  accessible controls, explanations and meaningful completion tests. Preserve all earlier games.
- A coherent visual refresh across Quiet Wing, Club and the puzzle/casebook surfaces. Use curated
  assets or specifically art-directed imagery; inspect phone and desktop renders, not just files.
- A release on the existing public website: all local and CI checks, independent review, saved
  recovery artifacts, exact hosted responses, persistence, offline and update checks. Public
  origins and all existing database identities remain unchanged.

Physical-device checks, accessibility certification, subjective difficulty and the Android freeze
remain honestly separate in HUMAN_TODO.md. The owner has authorized website deployment; do not
turn those unperformed checks into claims of certification or abandon the authorized hosted work.

## Current checkpoint

- Existing source PR #14 passes both GitHub verify runs at 0672754. Independent review is recorded.
- Automated feedback: the harbour starting-place option is malformed (confirmed medium); the
  unversioned credits page can remain stale after an update (confirmed medium). Both overlap the
  requested city controls/asset-pipeline expansion and are fixed with actual-control/A-B tests.
- Implemented: seeded larger worlds and reversible city planning tools, 24 curated CC0 models,
  houses assembled from walls/doors/windows/roofs, six additional castle modules, a locally bundled
  Three.js renderer with directional lighting, cached soft shadows and subtle water motion.
- Rendering uses two geometry batches. Motion pauses for reduced motion, hidden documents, or
  eight consecutive frames taking over 50 ms to submit. Actual context loss switches to Canvas;
  editing remains available, and restored WebGL retains those edits. Both paths share export geometry.
- Portable model colours sample atlas face centres; the original UVs/atlases are retained in
  `assets-source/quiet-wing/city`. This approximates texture details rather than claiming a full
  textured material conversion. The downloaded Fantasy Town archive receipt is retained there.
- Credits now have content-versioned URLs. An A/B browser test proves changed credits are cached
  for the new release and the older page remains available for older tabs.
- At source build `5f6c84697208`: `npm run verify` passes, ten focused city/model tests pass,
  28 city controls, 14 GPU/fallback/lifecycle checks, all 156 earlier Quiet Wing controls and
  36 origin/restart/update/recovery checks pass. Mobile, desktop and fallback captures inspected.
  Independent Terra high review found no confirmed blocking or non-blocking defects.
- Local headless rendering measured about 64 ms submission for the default scene (51,258 triangles,
  two draw calls after shadow caching). This is not a physical-phone FPS claim; ambient motion's
  automatic pause is deliberate. Sustained real-device GPU/memory/thermal checks remain open.
- Optional pack: 1,263,766 bytes. Core offline pack: 1,158,719 bytes. Initial JavaScript gzip:
  123,961 bytes. The optional budget is now 1,500 KiB for the renderer and models; the existing
  initial-script and core budgets remain. No CDN scripts, account or remote player data added.

## Next work toward the full request

1. Town construction now includes assembled homes, separate stackable castle modules and
   reproducible landscapes. Connected paving and height transitions share the Canvas/WebGL/export
   geometry. Water and companion motion have lifecycle guards. Further simulation/economy is not
   claimed; this is an open creative builder. Final renderer regression and hosted checks follow.
2. Companion integration is implemented: licensed cat/fox/owl skeletons, original articulated
   Nimbus, all five interaction presentations, retained saved identities and offline assets.
   Local control, persistence, reduced-motion and graphics-fallback checks pass; hosted and
   physical-device checks remain with the release gates. See STATE.md for measured pack size.
3. Two new relaxing families now have four complete boards: Tideglass colour pouring and
   botanical/coastal pair matching. Rules, replayed saves, actual controls and offline completion
   are verified. Garden expansion also has six species, an identified collection, arrangement
   undo, batch sow/gather and exported postcards, with local clock, save and actual-control tests.
4. Cross-app art direction is implemented: a botanical Club invitation, credited atmosphere
   across puzzle-family/casebook browsing and the garden, retaining the original illustrated
   mystery covers. Three new Met works have explicit public-domain records, original bytes,
   decoded WebPs and phone/desktop inspection. Adobe/image generation/AIC failures were worked
   around with successful direct Met acquisition, not bypasses or unverified stock images.
5. The complete source passed CI and independent review and merged as `6696546`. Sites version 4
   now serves 0.6.0 at the existing public origin. Hosted saves, offline and old-to-new upgrade
   evidence is recorded in RELEASE-0.6.0.md. The prior release remains available for file rollback;
   no production rollback was executed and no physical-device acceptance is implied.

Recovery: export all saves before release testing. Never clear site data. Roll back application
files while preserving the cabinet, Club and Quiet Wing databases and raw recovery exports.

Independent relaxing-games/garden review found no CRITICAL/HIGH defects. One MEDIUM malformed
crop-identifier import issue is tracked at https://github.com/Chris0Jeky/Alibi/issues/15; named seed
controls and ordinary saves do not produce those identifiers. Kept outside the current fix round
under the bounded review policy. The primary completion, clock and persistence checks pass.
