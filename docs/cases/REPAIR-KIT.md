# Repair an evidence case

This kit for [#453](https://github.com/Chris0Jeky/Alibi/issues/453) is an authoring
exercise, not a published player case. **The parcel before the bell** is original
fiction: three stages, five sources, three verdicts. Each broken file differs from
the repaired control in one field. No account, server, import or installation in
Alibi is needed. The existing authoring tools require Node 22 or later.

Start with a broken file, diagnose it, repair a copy, then play the preview. Leave
the originals intact so another author can repeat the exercise. The answer table
below is a facilitator's key; try the diagnosis first if you want an unaided run.

## Make a working copy

Run these PowerShell commands from the repository root. They create a fresh
temporary directory, so a previous exercise or preview is not overwritten.

```powershell
$work = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('alibi-repair-' + [guid]::NewGuid()))
$exercise = Join-Path $work.FullName 'exercise.json'
Copy-Item examples/cases/repair-kit/bad-record-id.json $exercise
node tools/case-authoring.cjs $exercise
```

The first check should fail. Open `$exercise` in your text editor. Diagnostics use
zero-based array indexes: `steps[0]` is the first step. Correct the named field,
save, and run the command again. A success receipt says `scope: "structure-only"`;
it does **not** certify the reasoning, prose, difficulty or accessibility.

```powershell
node tools/case-preview.cjs $exercise (Join-Path $work.FullName 'preview.html')
Invoke-Item (Join-Path $work.FullName 'preview.html')
```

The preview is a portable, offline HTML file. Its source hash identifies the exact
JSON bytes used to build it. After editing the JSON, generate a **new output name**
and open that file; an already open preview does not read source changes. The
preview command refuses an existing output. Reloading discards preview answers,
notes and progress; it does not save into Alibi. Keep the edited JSON if you want
to keep your repair.

Repeat in a fresh temporary directory with each file in
[`examples/cases/repair-kit`](../../examples/cases/repair-kit/). The same validator
and preview commands apply. No malformed file needs importing into the player.

## Diagnose and repair

| Source file | Expected diagnosis | Smallest repair |
| --- | --- | --- |
| `bad-record-id.json` | `case.steps[0].claims[0].evidence[0]: unknown record receiving-slpi` | Change that citation to `receiving-slip`. Do not create a duplicate source to satisfy a typo. |
| `hidden-future-premise.json` | `case.steps[0].claims[0].evidence[0]: record clock-test is not visible in this step` | Change `records[1].at` from `custody` to `arrival`. The clock comparison is needed before the first verdict. |
| `prerequisite-cycle.json` | `case.steps.arrival.requires: prerequisite cycle` | Set `steps[0].requires` to `[]`. Arrival comes before route; it must not also require route. |
| `missing-story-off.json` | `case.records[0].text.storyOff: missing field` | Restore: `At the exact instant the parcel arrives, the desk clock reads 18:02.` |
| `unsupported-verdict.json` | **No structural error.** The preview rejects the defensible custody verdict because the answer key says `supported`. | Change `steps[2].claims[0].answer` to `not-established`; verify against both records, both modes, hints and the worked answer. |

The first four are machine-detectable structural faults. The fifth is an editorial
task. A green validator, a generated preview, or an accepted authored answer does
not establish that the verdict follows from the evidence. Do not “repair” it by
removing Nell's possibility or inventing a new witness: that changes the case.

[`repaired.json`](../../examples/cases/repair-kit/repaired.json) is the worked
control. Each repair above restores the same parsed definition; whitespace can
still give your working copy a different source hash.

## Play and inspect the repaired case

Use the visible labels and ordinary keyboard controls: Tab to a verdict selector,
arrow keys to choose, Tab to the source checkboxes, Space to toggle, then activate
**Check reasoning**. A refused answer identifies its control and retains the draft.
**Continue** opens the next stage. **Story: on/off** changes prose without changing
the sources needed or the answer. Check both modes, including the hints and the
optional worked answer, before treating your repair as ready.

| Stage | Defensible verdict and smallest source set | Independent reasoning |
| --- | --- | --- |
| Before the bell | Supported; Receiving slip + Clock comparison | 18:02 minus four minutes is 17:58, before the 18:00 bell. |
| Which entrance | Contradicted; Complete entrance register | Exactly one entrance was used, and the complete, stipulated-accurate register says south. This excludes north. |
| Who put it away | Not established; Handover note + Custody possibilities | Rowan receiving the parcel is compatible with Rowan storing it or Nell storing it. The claim is true in one possible account and false in the other. |

All sources are explicitly stipulated accurate for this small exercise. This is
not a general claim that testimony is reliable. Review the wording that carries
the assumptions: “exactly”, “complete”, and the absence of further custody
evidence matter. Structural story-mode parity cannot certify semantic parity.

For the fifth exercise, play to custody and submit **Not established** with both
custody sources. It should be refused in the broken preview, then accepted in a
new preview made from your repaired JSON. That counterexample is the point of the
exercise; the broken preview's success message is not a truth oracle.

## Observe an author, without inventing results

No real author repair observations have been collected for this kit. #453 remains
open for that work; automated/browser results are synthetic rehearsals only. A
visual editor is deferred until observed friction supports one.

With a consenting author, ask them to diagnose, repair and preview each exercise.
Explain what you will record before starting, let them decline or stop, and record
only agreed observations. A useful manual note has: fixture and source hash;
diagnosis in the author's words; repair attempted; validator/preview outcome;
whether the key or hints were seen; where the command, path, wording or controls
caused confusion. Separate facilitator help from unaided repairs. Do not collect
private source material or personal identifiers, and do not infer timing or
productivity gains from the automated runs.

The optional preview playtest receipt is off by default and records only activity
inside that page after consent. It cannot observe JSON editing or validator use;
it does not replace the agreed manual repair notes. Nothing is sent automatically.

## Reproduce the automated rehearsal

```powershell
node --test tests/case-repair-kit.test.cjs
.venv\Scripts\python.exe tests/browser_case_workbench.py
```

The browser command needs the repository's existing Playwright environment and
writes `test-results/case-workbench/repair-kit/`. Preserve old evidence elsewhere
first if you need it; a test run replaces its previous artifacts.
The existing case-workbench workflow also runs this rehearsal. It preserves exact
fixture hashes, portable previews, 390/1440 screenshots and accessibility trees,
both story modes, the editorial refusal, repaired success, offline network/error
counts and the memory-only reload behavior. These checks certify the exercised
controls, not real author usability, physical-device/TalkBack acceptance, or
arbitrary natural-language entailment.
