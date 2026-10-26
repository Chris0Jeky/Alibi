# Editorial side-by-side parity checklist

This is the #447 parity harness, separate from #49's voice editing and #56's human accessibility
testing. Mechanical success does not approve clue meaning, a translation, fairness or accessibility.

Generate the receipt with `node tools/case-parity.cjs content/cases/reading-room-blackout.json`.
The `editorial.rows` entries put story-on and story-off prose side by side under stable paths.
The browser suite exports the worksheet separately as `editorial-comparison.json`. Retain an
editorial result separately from `mechanical-parity.json`; never replace `required` with a
machine-generated semantic pass.

For each pair, copy both full texts into a review table. Include intro, ending, every record,
step prompt, claim, all three hint levels and each worked answer; do not review only changed
sentences. Shared record titles, source attribution and case provenance must also be carried
forward faithfully in any future locale specimen.

| Stable path | Story-on / source text | Story-off / candidate text | Numbers and units | Negation and scope | Uncertainty and attribution | Verdict, citations and help unchanged? | Editor / result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `records.checks.text` | Paste complete source | Paste complete candidate | Verify 18:02 / 18:08; instantaneous and synchronized | Presence followed by absence | Direct observations, not estimates | Same bounded-window evidence | Pending |
| `records.maintenance.text` | Paste complete source | Paste complete candidate | 18:03 through 18:07 inclusive | Could open; could **not** sound | A silent bell does not establish a closed door | Same alarm verdicts and sources | Pending |
| `claims.exact-five.text` | Paste complete source | Paste complete candidate | Exactly 18:05 | No implied exclusion of other times | Possible is not established | `not-established`; checks + model | Pending |
| Remaining exported paths | Paste complete source | Paste complete candidate | Check each value/range | Check each no/not/only/exactly | Check each may/could/must and who knows it | Check against the source contract | Pending |

- [ ] Bind case ID, revision, actual locale, exact source SHA-256 and candidate SHA-256, editor,
  review date and disposition. New bytes require a new editorial disposition.
- [ ] Numbers: preserve times, quantities, units, strict/inclusive bounds, ordering and precision.
- [ ] Negation: preserve no/not, only, exceptions, actor, action and the scope of each qualifier.
- [ ] Uncertainty: preserve possible versus certain, observed versus inferred, access versus action,
  alternative worlds and unresolved attribution. Never turn absence of evidence into evidence of absence.
- [ ] Evidence: story-off removes optional narrative only; retain every needed fact, model premise,
  source attribution and distinction between witness statement and author assumption.
- [ ] Claims and answers: independently reason through each pair, the supported/contradicted/
  not-established classification and each sufficient citation set. Check both true and false
  examples for uncertainty. A matching answer key is not evidence that the prose still supports it.
- [ ] Hints: same ordered orientation/constraint/method help and cited sources; no extra reveal in
  either mode. Worked answers remain separately requested and do not award completion.
- [ ] Controls: attach the browser receipt for completion, focus, drafts, progress and visibility;
  keep simulated controls separate from physical-device or accessibility acceptance.
- [ ] Future locale: review the complete specimen and shared labels, keep the non-prose contract
  identical, and test explicit missing/unreviewed-translation fallback before enabling it. Record
  translator/editor provenance; AI output alone is never authoritative clue text.

## Specimen observations (not editorial approval)

For `reading-room-blackout`, revision 1, locale `en`, source SHA-256
`6b86c2495fdf4b8c720203b00b4765772aeac0505614b31be4b1aa378cfb6a2c`:
the worksheet contains 32 pairs. Thirty are text-identical; intro and ending differ. The
story-on intro includes the committee/supper framing; story-off gives exercise instructions.
The endings both leave attribution unresolved. These observations direct review; they do not
complete the checklist or infer a human editor's approval.

The adversarial tests replace, only in story-off evidence, `18:08` with `18:01`, `it was absent`
with `it was not absent`, and `it was absent` with `it might have been absent`. Each changes
meaning while leaving IDs, graph, verdicts, citations, hints and reveal access identical.
Mechanical parity passes all three and reports editorial status as `required`, demonstrating
why separate editorial review remains necessary. No mutated specimen is published as playable content.

Editorial disposition: pending named human review. Existing owner/device actions remain in
[HUMAN_TODO.md](../../HUMAN_TODO.md); this harness does not close #49 or #56.
