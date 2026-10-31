# Issue #453: creator repair kit

## Changed

Base `1c6cdf7a808f70ad716ee447b69e6e94b7011adf`; branch
`codex/case-repair-kit-453`. [The repair guide](../cases/REPAIR-KIT.md) and six
standalone JSON files provide an original three-stage case, four structurally
broken exercises, one editorially unsupported answer key and a repaired control.
The existing authoring CLI, session checker and portable preview are reused.
The case-workbench browser suite now rehearses both story modes at 390/1440;
workflow path coverage includes the fixtures and browser tests.

## Verified

From the preserved `alibi-ambiguity-comparison/Alibi` worktree:

- `node --test tests/case-repair-kit.test.cjs tests/case-authoring.test.cjs tests/case-preview.test.cjs`: 63 passed, zero failures/skips.
- Test sensitivity: before inserting the intended editorial fault, its rejection
  assertion failed (7 passed/1 failed); inserting that single wrong key produced
  the passing run. This is a fixture-test negative control, not a player defect.
- Focused Prettier, Python syntax and `git diff --check` pass.
- Each documented one-field repair restores the parsed control exactly. Invalid
  sources refuse preview output; the editorial fixture passes structural validation
  and rejects the independently worked custody answer.

Independent Terra review found no HIGH/CRITICAL blocker and reproduced all eight
repair-kit tests. One LOW partial-rerun artifact-mixing observation was declined:
qualification uses fresh output, and only a completed source-bound receipt and
manifest count as proof.

Hosted run `41162355258` passed the case Node suite but stopped in the new browser
helper: it used rendered `innerText` for an uppercase progress label while expecting
sentence case. The four progress checks now use `textContent`, matching the existing
suite and preserving the exact count assertions. The raw failure is retained.
Corrected head `1d1ea5f36f16afcd7cedd173044d1fb12c2e4c63` passes hosted case-workbench
run `41162565992`: 160 Node tests, zero failures/skips; all eight repaired/bad-key
journeys at 390×844 and 1440×900 in both story modes. Actual controls show the
editorial refusal with its draft retained and the repaired case accepting the
defensible verdict. Every journey completed three stages, made zero external
requests, logged zero script errors, and cleared progress/answers on offline reload.
Phone/desktop PNGs and accessibility trees were inspected directly.

Artifact `13027417937` contains 89 files (9,192,828 uncompressed bytes); ZIP SHA-256
`505526f20e230e82176cdb3c22d197fa7732b45dc0ba1630825792519696466d`, CRC verified.
All six archived JSON sources byte-match the checkout. The repaired source SHA-256
is `0f45f151d2bce6c7a7459ba5237cec0c261c497156f64611137184b1f377c796`; the wrong-key
source is `4eb56b964c17e23dc9f7b58985d949a46b1185f1a5b91b6b820ddd186c612fe8`.

The scoped second review found no defect in the progress-text correction. Two
review passes are complete; no new product logic was added by the correction.
The briefly assigned local MAIN slot was released **unstarted**. Equivalent local
full verification/browser work is omitted because hosted proof exercises the code.
Final repository-gate, head and merge identities are recorded in
[PR #902](https://github.com/Chris0Jeky/Alibi/pull/902) and the coordinator receipt.
Raw proof, failed-run evidence and file manifests are retained outside Git in
`deliveries/alibi-case-repair-kit` under the flagship-capacity workspace.

## NOT verified

No real consenting-author repair observations, physical Android/TalkBack acceptance,
subjective usability assessment or general natural-language entailment certification.
#453 remains open for the observed author exercise. No visual editor is justified by
these synthetic rehearsals. No deployment or sharing/publisher decision is inferred.

## Residual risk and ownership

The deliberately wrong fixtures must remain clearly labelled author exercises.
The preview trusts the authored key; a green validator or accepted answer does not
certify truth. No runtime source, schema, backups, published content, startup bytes
or performance ceilings change. Existing [human gates](../../HUMAN_TODO.md) remain.

The managed checkout's prior archive refusal remains binding; its identity, prior
branches and external evidence are preserved. Foreign #579/#807 residue and current
#899/#900 ownership are untouched. Historical Windows EPERM browser proof limitations
are retained as historical evidence, not reported as a regression of this change.
