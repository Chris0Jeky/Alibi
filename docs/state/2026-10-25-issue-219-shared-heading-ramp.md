# Issue #219: shared heading ramp

Base: `4988d174b69346a6ba59fe7e1368513704d55d2a`; branch: `sol/alibi-219`.
This is a focused continuation of the earlier Library-only adoption, not a release.

## Changed

Step 0 confirmed the Desk inversion is already guarded by `tests/type-ramp.test.cjs`,
but the shared defaults, page titles, family/puzzle cards and collection titles
still carried numeric sizes and breakpoint overrides. This slice maps those
roles to the existing h1/h2/h3 ramp: 36/28/22px on desktop, 32/25/20px at 600px
and below. It removes redundant override rules rather than adding another layer.
The seven ramp values and deliberate 58px wordmark exception remain unchanged.
Explicit display-serif and UI-sans tokens retain the existing faces.

The source contract checks the mappings and every remaining size declaration,
including font shorthands and breakpoint overrides. The new browser scenario
checks actual page, section, family, collection and puzzle heading sizes and
containment at 320/390/600/601/768/1280/1440px, using Browse all puzzles to reach
the actual puzzle cards.

## Verified

All commands run from this worktree; no Git-writing commands are used.
Dependencies installed with `npm.cmd ci` (136 packages; 0 reported vulnerabilities).

Before CSS edits:
- `npm.cmd run build`: exit 0, build `f0273fabfddc`.
- `node --test tests/type-scale.test.cjs`: 6 pass, 4 fail against unfixed CSS.
- With `ALIBI_QA_HTML=test-results/type-scale/before.html` and `PYTHONUTF8=1`,
  `py -3 tests/browser_mobile_qa.py MobileQA.test_shared_library_headings_follow_type_ramp`:
  1 scenario fails with 295 assertion failures, including 16px phone family
  titles versus the required 20px and the other drifting role sizes.

After CSS edits:
- `node --test --test-reporter=tap tests/type-scale.test.cjs tests/type-ramp.test.cjs`:
  13 pass, 0 fail, 0 skipped.

- `npm.cmd run verify`: exit 1. Formatting passes; its web build passes as
  `1286c1b5950a`, then Android packaging refuses the uncommitted tree with
  `Android builds require a clean source tree.` No guard is bypassed.
- `npm.cmd test`: exit 1 in pretest; it likewise requires clean, matching web
  and Android build identities. The aggregate Node suite does not start.
- `node --test --test-reporter=tap tests/type-scale.test.cjs tests/type-ramp.test.cjs tests/budget.test.cjs`:
  exit 0, 28 pass, 0 fail, 0 skipped. Emitted shell is 1,416,118 bytes versus
  the unchanged strict ceiling 1,416,440.32 (322.32 bytes headroom). The baseline
  shell was 1,416,422 bytes: this slice saves 304 bytes.
- `npm.cmd start` on `PORT=2219`: serves this worktree's built HTTP origin.
  Default port 8787 was occupied; no existing service was stopped.
- `PYTHONUTF8=1 py -3 tests/browser_ui.py`: exit 0, 187 checks pass, including
  all thirteen games completed through controls and no uncaught exceptions.
- `PYTHONUTF8=1 ALIBI_URL=http://127.0.0.1:2219 py -3 tests/browser_mobile_qa.py`:
  exit 0, all 19 scenarios pass in 102.350s, including the new seven-width
  type-ramp scenario and the existing four-edition Desk hierarchy scenario.
- Twelve additional HTTP-origin captures at 390/1280px cover Library, Settings
  and Workshop in paper/night themes; none has document overflow. Library and
  puzzle-card phone/desktop captures and representative Settings/Workshop views
  were visually inspected: headings wrap within their cards and retain the
  established serif/sans roles. Actual computed body face matches the UI token.
- `git diff --check`: exit 0. No budget, gate, engine, save, content or dependency
  declaration is changed.
Raw build, source-red/browser-red and verification logs are ignored under
`test-results/type-scale/`; generated screenshots/measurements are ignored under
`test-results/mobile-qa/`. No operational outputs belong in the PR.

## NOT verified

Full aggregate verification remains uncompleted because Android packaging and
npm pretest require a clean committed tree. The coordinator's exact next step is
to commit this focused diff and rerun `npm.cmd run verify`; this implementation
session is explicitly forbidden Git-writing commands. The completed changed-seam
and browser checks above do not replace that full gate.
No hosted CI, deployment, native runtime or physical-device acceptance is claimed.
No commit, push or PR is created: the coordinator owns those steps under this task.

## Residual risk

This completes the shared-heading slice, not the entire cross-room migration in
#219. Existing room-specific typography (for example the Cabinet feature, case,
play, dialog and other bespoke headings) still has overrides outside this slice.
Keep #219 open for that remaining adoption. Existing
[HUMAN_TODO.md](../../HUMAN_TODO.md) physical Android/TalkBack, publisher and other
owner acceptance remains authoritative; no owner decision is inferred complete.
The Impeccable scan reports only the unchanged Cabinet side-border decoration;
it is skipped because it is outside the typography issue.
