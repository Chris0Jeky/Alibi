# Live development state

## Research-to-delivery work: 27 September 2026

This page is a current handoff index. The previous full state is preserved **byte for byte**, in the same directory so its relative links remain valid: [pre-research state](STATE-BEFORE-RESEARCH-2026-09-27.md). Historical measurements there describe their named sources, not automatic acceptance of newer branches.

### Main versus proposed work

The inspected baseline is `a3c6ad9bc3b27573d2f310a4313418c47a4b3f49`, matching the supplied archive and tree `073abac9117c3704953453f84d3e74372ccc5bf6`. It includes release 0.15.0 and the Voices reset merge. This research program does not itself ship new castle chapters, change production saves, install new packs, rename Alibi identities or raise budgets.

The approved direction remains [Postern / Wrenmere](design/POSTERN-REDESIGN-BRIEF.md): one coherent estuary castle, optional story, existing identifiers and origins preserved. Existing Chapter I evidence comparison and revisable hypotheses are foundations, not missing features to duplicate. The cabinet baseline has 510 built-in puzzles; unmerged expansion PRs are not counted as shipped.

### New program

[Program #436](https://github.com/Chris0Jeky/Alibi/issues/436) converts a bounded, primary-source corroboration into independently reviewable work. The available conversation contained the research brief and launch, not the finished Deep Research report; [#454](https://github.com/Chris0Jeky/Alibi/issues/454) retains the missing-report and reception-study task.

Start at the [research package](research/POSTERN-2026-09/README.md): product thesis, source ledger, six architecture decisions, 30 concepts, six original case treatments, roadmap, validation protocol and [20-issue dependency map](research/POSTERN-2026-09/BACKLOG.md).

The implementation lanes are separate:

- [#444](https://github.com/Chris0Jeky/Alibi/pull/444): bounded, dependency-free evidence-case authoring contract and source receipt. No production route or storage changes.
- [#441](https://github.com/Chris0Jeky/Alibi/issues/441): original Reading Room Blackout workbench and bounded semantic model, deliberately memory-only and outside official registration. Its implementation PR must supply actual-control evidence before acceptance.
- Existing [#389](https://github.com/Chris0Jeky/Alibi/issues/389): complete aggregate identity across initial and deferred official definitions. The loading/delivery remainder stays open under #389/#433.

Authoring, proof, editorial approval, interaction tests and human/device testing are distinct gates. Do not promote a successful structural receipt into a claim that a mystery is fair, unique or enjoyable. Do not treat a self-contained preview as a durable save implementation. [#442](https://github.com/Chris0Jeky/Alibi/issues/442) owns a future adapter to an existing host/save domain.

### Evidence and continuation

Local baseline castle tests passed 70/70. The first authoring contract passed 47/47, with follow-up reader hardening tracked in the PR. GitHub CI ran those tests and exposed formatting differences; its exact-source formatter artifact was used for correction. Full local package installation was unavailable because the offline cache lacked `youch-core@0.3.3`. Chromium navigation in the local environment blocked file and loopback URLs; no local browser acceptance is claimed. Check each PR's current head and CI for later evidence rather than reusing this initial snapshot.

No independent reviewer was available to the executing session. Existing CI, independent-review and head-aging requirements remain in force. Work stays in focused draft PRs until those requirements are met. Other open PRs, including the content, challenge, completion-hook and backup lanes, retain their existing ownership and evidence.

Before continuing: refresh main, PR heads/reviews and issue state; do not blindly replay a previous patch. Preserve all save domains, revision pinning, CAS/recovery, startup ceilings and the two existing origins. Read [AGENTS.md](../AGENTS.md), [PROJECT-MAP](PROJECT-MAP.md), [HUMAN_TODO.md](../HUMAN_TODO.md), [PHONE-SESSION](PHONE-SESSION.md) and [CALIBRATION](CALIBRATION.md). Physical phone/TalkBack, new-player, audio-comfort and difficulty-calibration gates remain human work, not inferred from CI.

## Escape-room extension: 27 September 2026

[Program #460](https://github.com/Chris0Jeky/Alibi/issues/460) adds a dedicated escape-room research and delivery direction. Read the [escape-room portfolio](research/ESCAPE-ROOMS-2026-09/README.md), its [twelve original treatments](research/ESCAPE-ROOMS-2026-09/ROOMS.md), [quality gates](research/ESCAPE-ROOMS-2026-09/QUALITY.md) and [fifteen-issue map](research/ESCAPE-ROOMS-2026-09/BACKLOG.md). The earlier research handoff above is preserved unchanged. These treatments are not new shipped rooms or canonical Wrenmere chapters.

A separate local foundation for #464/#465 has 52 passing new tests and a six-test existing Castle-object baseline. It validates finite room states, separates action availability from mechanism success, and detects reachable states that cannot finish, even when another route wins. Code publication was blocked before GitHub execution; the retained implementation is not represented as a published code PR. No full build/formatter/browser or independent-review pass is claimed. Ten example deductions in the treatment document were independently checked, not complete room implementations.

Next: review/publish the retained foundation through an authorized functioning workflow; finish #466's actual room sources and player UI; then integrate through #467/#47 and #442, with optional delivery under #433. Preserve existing saves, revisions, origins and byte ceilings. Do not substitute this finite-model evidence for clue fairness, current-head CI, physical-device accessibility or human difficulty calibration.

## Published escape implementation: 27 September 2026, continuation

This entry supersedes the earlier publication blocker, without deleting that historical handoff. [PR #480](https://github.com/Chris0Jeky/Alibi/pull/480) now publishes the recovered finite-state foundation on inspected live main `ba8c888`; [PR #481](https://github.com/Chris0Jeky/Alibi/pull/481), stacked on #480, implements six original rooms and a shared standalone player. Foundation head `f579317`; anthology formatting follow-up `2846aaff`. Both remain drafts, not merged or deployed. The earlier research PR #478 remains documentation-only and is still stacked on #457.

Implemented room sources: Tidekeeper's Workshop, Printmaker's Cabinet, Moonseed Conservatory, Herbarium Lift, Counterweight Loft and Clockmaker's Rehearsal. The first pair advances #466; the next four are partial delivery of #472/#473/#474, not completion of those batches. The other six treatments remain unimplemented. The player supports native object/action controls, room switching, scratch notes, retained drafts, 64-step undo, deliberate current-room restart, staged hints, explicit whole-room solutions and story/light presentation modes. All player state is memory-only; refresh or close resets it, as disclosed in the UI.

Evidence: 93 source tests passed; every one of 648 reachable states across the declared models retains a winning path, with 5745 successful-or-no-op edges. Independent graph enumeration and clue derivations are source-bound. On anthology head `03e9e85`, workflow 36338803310 passed all 18 actual offline-file room/viewport scenarios and hostile-text checks before failing source formatting. Its artifact and source head were verified. Formatter output was applied as `2846aaff`; 93 tests and 18 DOM-only controls passed again locally. Fresh file/full application CI for that newer head is still required; earlier-head results are not final-head acceptance.

The foundation's dedicated workflow and numbered-import checks passed on `f579317`; consult the current PR for the broader cabinet result. No independent code/editorial review, human calibration or physical-device acceptance has occurred. No new save owner, production route, content registration, dependency or byte-ceiling change. Existing #467/#47, #442 and #433 still own spatial, durable-save and optional-delivery integration. Read the implementation's ANTHOLOGY.md in PR #481 for exact commands and remaining gates; this research branch does not contain its executable files.
