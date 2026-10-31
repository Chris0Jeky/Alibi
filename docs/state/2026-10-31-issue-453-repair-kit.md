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
Browser completion and final hosted checks remain pending qualification.
Raw proof and source manifests are retained outside Git in the coordinator delivery
directory `deliveries/alibi-case-repair-kit` under the flagship-capacity workspace.

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
