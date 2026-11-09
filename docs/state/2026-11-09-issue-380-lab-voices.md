# Eclipse Lab feedback through Voices

## Design and implementation plan

The owner requested experimental games with player feedback. The existing primary-origin Voices
channel already accepts explicit messages and provides owner triage; the Lab only offered local
notes and a GitHub issue handoff. Reuse the existing composer, queue and feedback contract. A new
collector or a new structured survey would duplicate infrastructure or require a separately
versioned upstream vocabulary. The selected client-only adapter sends the saved Lab impressions as
reviewable message text, with an empty official-puzzle subject, after a separate Send action.

- Add a bounded adapter that reads only experiment ID/revision/mode and saved rating/difficulty/note.
- Add optional prefill text and originating control to the existing composer, preserving normal callers.
- Disable review for unsaved drafts; cancel a late load after an edit, route change or disposal.
- Show loading and length errors beside the feedback controls. Preserve overlong notes and allow retry.
- Verify the closed message shape, origin admission, escaping, focus, draft freshness and no automatic send.
- Keep local saves, puzzle definitions, queue formats, limits and all byte budgets unchanged.

## Changed

The primary-origin Lab offers **Review and send saved feedback**. The player reviews or edits the
prefilled message, then explicitly sends it through Voices. Lab feedback does not enter the official
rating survey or create a respondent key. Preview/fallback/standalone/Android copies retain local
feedback and the explicit GitHub handoff. Oversized combined text is refused without truncation.

The upstream contract was checked against Pulseboard's `observatory/docs/VOICES.md` on 9 November
(blob `cfd803432dc587e9f81a46861a00c1a24a104b3d`). This change adds no contract fields or upstream code.
The optional adapter and UI remain in the separate Lab asset. A small composer API extension and
shorter equivalent disclosure copy preserve the existing core limit.

## Verified and pending

The clean web and Android builds pass. All 93 focused adapter, Voices, queue and budget tests pass,
including private-field poison getters, a late download, an ineligible origin, an overlong note and
a failed-load retry. Python compilation and formatting pass. The Lab asset is 52,319 raw bytes
(15,836 gzip), the Voices chunk 20,458 (8,978 gzip), and startup JavaScript 135,473 gzip bytes.
All existing ceilings remain unchanged.
Independent review identified a delayed-load/draft-edit race and distant error placement; both have
been corrected, with a hosted browser regression holding the actual composer download during an edit.
The existing Voices browser fixture now covers the Lab at 320/390/1280px and keeps its collector
intercepted. Follow-up independent review found no remaining blocker. Complete integrated Node
suites, current-head CI and screenshot inspection are pending.

Integrated runs 42600364396 and 42600372455 reached the delayed-load regression and correctly
refused its stale draft, then timed out reopening the composer. The fixture waited for the previous
save's still-visible message; that did not establish that the second asynchronous save had finished.
It now waits for Review to become enabled after each save and verifies focus before native Enter.
Save, focus and composer state are recorded even on failure. The fresh-head browser run remains the
qualification gate; there is no retry, longer timeout or production behavior change in this fix.

This is not live collector or production evidence. Human calibration, Android/TalkBack and a
structured experiment-rating registry remain open. Issue #380's optional reviewed diagnostic-state
attachment is separate: ordinary feedback still never attaches boards, answers or recovery bytes.
Production release remains an owner decision in `HUMAN_TODO.md` (`alibi-release-20261030`).
