# Collection adder CI wiring (#433)

The Workshop collection discovery workflow now runs when a pull request changes the
on-demand adder, its Node suite, or its browser fixture. Its source test command also
includes the adder's `.mjs` suite. The browser fixture remains exercised by the existing
discovery browser runner. No player code, save behavior, or budget changed.

The source snapshot matches main commit `848812edf6df1231684ffe52b966e80c8101e3a9`,
tree `f4433f0f028d26a4f2cdda1c52fa5769431e2aaa`.

Verification:

- Before the workflow change, both new wiring tests failed: the adder source did not
  trigger the workflow and the Node suite was not selected.
- After the change, both tests passed. Four independent mutations removing each new
  trigger or the Node-suite selection were each detected.
- The adder Node suite passed 7/7 with the existing dependency installation available.
  Workflow YAML parsed and the repository format check passed.
- `npm run verify` stopped during Android build: this isolated `git archive` snapshot
  has no Git repository for the required source-identity check. It did not reach the
  complete test suite. Hosted exact-head build, checks, and browser evidence remain
  required; the source-identity guard was not bypassed.

This is a CI coverage correction, not completion of #433. The installed-state index,
download cancellation, concurrent installation, old/future content behavior, memory
measurements, and wider recovery acceptance remain open. Physical acceptance remains
in `HUMAN_TODO.md`.
