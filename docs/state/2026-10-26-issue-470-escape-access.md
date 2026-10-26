# Issue 470: escape anthology keyboard and nonvisual parity (first slice)

Branch `feat/470-op` from `origin/main` a1d7c71. Refs #470 under #463. Scope is the standalone
anthology player only (`tools/escape-ui/`). No room source, published content, save or production
route changed. The Castle object/inventory adapter (#467) is untouched.

## Outcome

- Audit result: every existing escape mechanism (levers, placements, rotations, tool uses, reveals)
  is already a native submit button or text form. There is no drag, hover-only, colour-only or
  audio-only control, so WCAG 2.2 2.5.7 needs no new single-pointer alternative.
- Feedback used a `role="status"` node recreated on every render, which screen readers often skip.
  A persistent polite live region (`#escape-announcer`) outside the re-rendered tree now repeats
  exactly the visible feedback. Successful actions, undo and restart announce. A refused action
  already moves focus to the visible feedback, so it is not announced twice.
- A successful action or undo now also reports the selected object's newly true observations
  ("Now: ..."), visible and announced alike. It reads only the current projection, never hidden
  objects, other objects' state, success predicates or the worked solution.
- Revealing a hint announces that hint's text. The hint list and observation list are named groups.
  An `aria-label` previously sat on a role-less `div`.
- Room and object selects keep focus after a change. Before, the first arrow key moved focus to a
  heading, so a keyboard user at 320px could not arrow through objects (WCAG 3.2.2).

## Evidence

- `tests/browser_escape_rooms.py` `keyboard_pass`: all six rooms completed by keyboard alone
  (Tab, Enter, Space, arrows, typed answers with Enter) at 1280x900 and 320x780. Each step checks
  that the announcer equals the visible feedback and contains every newly shown observation, names
  for all buttons/textboxes/comboboxes, the named groups and undo. Result: 12/12 keyboard cases
  plus the existing 18 pointer cases passed locally in file transport, Chromium (Playwright 1.62).
- Red before the change: the same test against unchanged `view.js` failed at the missing announcer.
  Five targeted mutations of the new code were each caught: both select focus moves, the
  observation group role, the "Now:" description and the hint announcement.
- `node --test tests/escape-*.test.cjs`: 93 passed, 1 skipped (named pipe on Windows).
- Prettier check on the escape workflow's file set: clean.

## Not verified / remaining

- Real screen readers (NVDA, TalkBack, VoiceOver), physical phones, forced-colours and 200% text
  rendering were not exercised; live-region timing varies by reader. These stay with #56.
- 844x390 landscape keyboard run (the pointer pass already covers that viewport), Android build
  and the full app UI suite were not rerun for this tooling-only change.
- Remaining #470 work: no target-size audit beyond the existing 44px rule, no representation
  check for a future spatial scene or Castle inventory (#467), and authored clue prose was not
  reviewed for orientation/colour wording (#468/#469 editorial review).
