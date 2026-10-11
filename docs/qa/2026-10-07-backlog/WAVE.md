# Older backlog wave, 7 October 2026

Eight bounded Grok 4.7 high worker tasks ran alongside two GPT 6.1 Sol medium
coordinators. Grok receipts identify the live model as grok-4.7-build. Turn-limit
exits were treated as incomplete; coordinators inspected and finished useful
diffs. Workers could edit their own checkout, but push, GitHub, MCP, web search
and nested agent tools were denied. A harmless deny canary remained blocked
under the session-only approval mode required for ordinary worker shell calls.

Muse lane creation was attempted by both coordinators and refused: host
kraspyon differs from registry owner desktop-ihkoojs. No Muse swarm started,
and no registry or trust setting was changed to bypass that refusal.

## Changed and verified

| Issue       | Result                                                                                                                                                                       | Direct evidence                                                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #417        | [PR #587](https://github.com/Chris0Jeky/Alibi/pull/587): wait for service-worker control and offline readiness in actual-origin mobile QA; retain landscape failure context. | Actual-origin Block landscape and six Borough viewports pass; isolated landscape passes. A modeled nine-second readiness delay succeeds with the retained 30-second timeout; the former seven-second candidate fails that negative control. Independent review found that timeout defect; the correction passed a second review. Original intermittent CI timing was not reproduced. |
| #219        | [PR #588](https://github.com/Chris0Jeky/Alibi/pull/588), merged as ea47351a: Desk theatre h3 uses the shared heading scale.                                                  | Seven typography/radius regressions pass. Built-origin measurements at 320/390/1280 show h3 20/20/22 pixels beneath h2 and h1, without horizontal overflow. Own full verify passes 1275 Node tests, three intentional skips, and Quiet Wing checks. Independent review has no finding.                                                                                               |
| #476        | [PR #589](https://github.com/Chris0Jeky/Alibi/pull/589): request AbortError delivery and transaction error bubbling in the restore fixture.                                  | 32 restore/Club tests pass; new request ordering fails before the fix. Independent review has no blocker; one LOW additional callback coverage suggestion is explicitly declined. No production save logic changed.                                                                                                                                                                  |
| #420 item 3 | [PR #590](https://github.com/Chris0Jeky/Alibi/pull/590): clip touch-only keyboard help while retaining accessible text; fine-pointer help remains visible.                   | Copy suite 3/3 and real Chromium touch/desktop geometry, accessibility tree and display:none negative controls pass. Android build passes. Both bounded reviews completed with no confirmed actionable finding. Merge is blocked by CSS gzip 34181 against strict ceiling 34176, incomplete full UI and an unwired new browser helper. No ceiling was raised.                        |
| #389        | [PR #591](https://github.com/Chris0Jeky/Alibi/pull/591): practice completion listing identity and complete content revision, including Android receipts and artifact checks. | Current-base focused suites30/30 pass. Review found a HIGH Android startup-only hash mismatch; a new regression reproduced it, and the fix passed a fresh final review. Android/identity/content/budget suites24/24 pass; final committed-head Android build, artifact check, budget and format all exit0. JavaScript gzip134939 has only five bytes of headroom.                    |

PR #588 merged at 02:43 UTC after all seven exact-head CI jobs passed, including the full UI and curated phone/desktop runs. Its independent review and three-minute head-aging gate were satisfied; the next-checkpoint late review/comment audit is empty. Other fix PRs are ready for review. Hosted checks and unresolved reviews must be
reconciled at the exact head before merge; publication alone proves neither.
Broader #219 typography adoption and #420 offline/alias work remain open.
No release or deployment was made.

At head dd636a5d, four #590 CI runs each fail the same two checks: the CSS budget and browser-wiring for browser_keyboard_help.py. These are candidate regressions, with logs inspected and findings posted on the PR. The browser stages in those four runs never started. The next bounded correction must fit the existing ceiling and wire the helper; this wave parks the candidate.

## Reconciled without runtime edits

- #347's requested strength and fresh-seed behavior already exists on main
  2758d91. Fresh 49-test Node proof, ten standalone gameplay scenarios with real
  worker responses, and 78 standalone Block assertions pass. Root additionally
  ran 80 actual-origin Block assertions. The issue remains open: explicit
  Cancel/Escape and finished Block journal coverage still need reconciliation.
  These gaps are not reproduced runtime defects.
- #401 remains blocked by the upstream PulseboardSDK pre-start consent hook
  and rebuilt byte-exact pin. Nineteen current host tests pass; the existing
  post-start all-off safeguard does not prove the requested pre-start guarantee.
- #407 still needs the owner decision for a durable per-room completion set
  and backup validation. The audit confirmed journal pruning can remove derived
  markers; it did not show lost replay bodies or completed runs.
- #220's radius approval remains a human visual decision. No implicit approval
  or token consolidation was recorded.

Evidence and coverage limits were posted directly on #347, #401 and #407.
Other active PR lanes were reserved rather than duplicated.

## NOT verified and residual risk

Local full UI is not green: typography's run passed 179 assertions before the backup
import timing assertion failed; touch help's run passed 177 before a dialog-close
race. The close race was reproduced against unchanged product source. The
typography import failure was not independently reproduced on the baseline.
Runner-only screenshot timeouts were increased without changing tracked test
assertions. Targeted browser passes do not replace these full UI gates. For #588, the later hosted full UI and curated phone/desktop passes satisfy the publication gate; its local failure remains recorded.

Physical Android, TalkBack, mixed-input tablet behavior and deployment remain
unverified. [HUMAN_TODO.md](../../../HUMAN_TODO.md) retains owner/device gates.
No saves, public IDs, database version, production telemetry or origins changed.
Practice and touch-help byte budgets must be re-proved together before any
combined integration; the practice candidate has very little JavaScript headroom.

Raw receipts, logs and screenshots stay ignored under primary
`test-results/backlog-wave-20261007/`; curated source notes and PRs are the
restartable record. Earlier worktrees and branches belonging to other sessions
are preserved.

Evidence-only branches codex/maint-347-proof (2aadbf85) and codex/maint-401-proof (0ce60399) preserve the detailed investigations remotely; findings were posted on the issues and no runtime PR was needed for those lanes. All worker worktrees were removed through plain Git after their proof was archived and source refs preserved. The initial420 removal reported a directory permission error; its registration is gone and only an empty directory residue may remain. No force or recursive deletion was used. The primary tracked/untracked Git status is clean; older worktrees are preserved.
