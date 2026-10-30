# Scene Maker draft history

Source checkpoint for [#811](https://github.com/Chris0Jeky/Alibi/issues/811), based on
main `090dee0d784d6fd401a46998a0ca7e117eebd449`. Runtime and tests are in
`ae3184a7c66ad95cde538ef64b771adfd67914dd`. The eventual PR qualification receipt supersedes
the pending gates below; this file does not claim those gates have already passed.

## Changed

Scene Maker has keyboard-operable Undo and Redo for clue additions/removals, room painting,
furniture and room names. It retains up to 50 edit snapshots in memory, groups one room-name
editing session, ignores unchanged/refused edits, and discards Redo after an actual new edit.
The buttons reuse the existing controls and focus fallback. Native text shortcuts are unchanged.

Undo/Redo restores draft content through the existing `workshop-draft` save, increments the
worker epoch and clears verification/comparison. Restoring a formerly verified draft still
requires verification before playing or exporting. Reverification leaves history intact;
successful generation and reload clear it. Failed/malformed/stale generation preserves history
and keeps publication refused. No storage schema, backup format, published content, gate or
byte ceiling changes.

## Verified at this checkpoint

- Before implementation, the A-to-B-to-Undo regression failed while B's worker check was pending:
  the edited draft remained. The baseline log is retained outside Git.
- `node --test --test-concurrency=1 tests/workshop-history.test.cjs tests/workshop-worker-race.test.cjs tests/workshop-ownership.test.cjs tests/scene-ambiguity.test.cjs`:
  52 passed, zero failures/skips. This covers exact snapshots/persistence, redo branching,
  the 50-step cap, no-op/refused edits, name coalescing, generation and stale unique/ambiguous results.
- Changed JavaScript is formatted; `py -3 -m py_compile tests/browser_ui.py` and `git diff --check`
  pass. The generated asset catalogue records the changed app source hash. All 136 installed
  packages agree with the existing lockfile; no dependency changes or install.
- One fresh read-only Terra review found no HIGH/CRITICAL blocker. Its non-blocking cap/coalescing
  finding is tracked as [#812](https://github.com/Chris0Jeky/Alibi/issues/812): cancelling a name
  session at a full history can leave only 49 older undo steps. Current draft content is retained.

## NOT verified at this checkpoint

Full build/Node and actual browser checks require the coordinator's new finite allocation.
The prepared browser journey covers 390/1440px ambiguity comparison, keyboard Undo/Redo,
fresh verification, exact export, and reload persistence in disposable real IndexedDB contexts.
Exact-head hosted CI, artifact inspection, review-comment reconciliation and merge remain pending.
The known local Windows symlink `EPERM` is [#810](https://github.com/Chris0Jeky/Alibi/issues/810);
it is not waived or converted into a pass. Supported Linux CI must qualify that lane.

## Residual risk and ownership

History is intentionally lost on reload/new generation; only the current draft persists. The
coalescing edge above remains a tracked limitation. Browser evidence cannot certify physical
Android, TalkBack, enjoyment, publisher identity or native promotion. Those remain in
[HUMAN_TODO.md](../../HUMAN_TODO.md); no owner acceptance or deployment is claimed.

The clean owned ambiguity checkout is reused on `codex/scene-draft-history`; its previous
branch/commits and external proof remain preserved. Its managed archive previously refused
the task-primary classification, so the directory/identity stay intact with no retry. The clean
stale primary, foreign draft PRs #579/#807 and older Aquarium residue remain untouched.
