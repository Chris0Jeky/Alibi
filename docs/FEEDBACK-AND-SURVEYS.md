# Feedback, surveys and puzzle ratings (Voices, client half)

Players can send the maintainer a message, answer a short survey about what they enjoy, and rate
official puzzles as they finish them. All three go to Pulseboard, the maintainer's own collector,
and only when the player acts. This file describes what Alibi does on the device. The wire format,
the collector's validation, storage, retention and the Desk views are the Pulseboard contract
"Voices: player feedback, surveys and puzzle ratings (contract v1)": `pulseboard.feedback/1`
(`POST /v1/feedback/alibi`) and `pulseboard.survey/1` (`PUT /v1/survey/alibi`), with the survey
registry in Pulseboard's `observatory/src/surveys.mjs`. Pulseboard owns that contract; see the
[Pulseboard repository](https://github.com/Chris0Jeky/Pulseboard). Do not change a field name,
enum, status rule or survey option here without changing it there first.

## What the player sees

- **Feedback** is a quiet speech-bubble button in the top bar of every screen of the main shell
  (not inside the Quiet Wing or castle views, which have their own navigation). It opens a sheet:
  kind chips (something's broken, an idea, a puzzle, praise, something else), a message box with a
  2,000-character counter, one line saying what is attached, and Send. Settings also has a
  **Feedback and surveys** panel.
- **Report a problem with this puzzle** sits with Restart and How to play on the puzzle screen. It
  opens the same sheet with the puzzle kind chosen and the official puzzle id attached.
- **Puzzle rating**: after an official puzzle is solved, the completion panel shows "How was it?
  Too easy · Just right · Too hard" and a "More like this" heart. A tap sends; changing it sends
  the new answer, which replaces the old one. The heart alone is kept on the device until a
  difficulty is chosen, because the contract requires one. A Settings switch ("Ask how a puzzle
  felt") hides the row.
- **Survey** (`alibi-taste-1`): seven questions, two required (how often you play; how the
  difficulty feels), and an optional comment of up to 500 characters. It is always available from
  Settings and is pre-filled with the last answers sent from this device. An invitation card may
  appear on a completion screen, below the board, never over it and never mid-puzzle:
  - first after at least five official puzzles were completed on at least two different local
    days (counted from the device's own completion records);
  - after answering, "Update your answers?" at the earliest 30 days after the last answers, and
    only after ten more completions or a new app version;
  - "Not now" hides it for seven days; three "Not now" or one "Don't ask again" stop automatic
    invitations for good. Answering resets the "Not now" count. An invitation that is ignored
    (neither answered nor dismissed) shows again on the next qualifying completion.
- **Privacy** has a "Feedback, surveys and ratings" section and, once a survey key exists, a
  **Reset survey key** button.

## What is sent

Nothing is sent on load, on showing the rating row or the invitation, or while typing. A payload
is built when the player presses Send, submits the survey or taps a rating.

| | Carries | Never carries |
| --- | --- | --- |
| Message | a random message id (idempotency), app version, kind, screen (`home`, `puzzle`, `castle`, `quiet-wing`, `games`, `settings`, `other`), an official puzzle id or `''`, the cleaned text, the UTC day of Send, device class (`mobile` < 768 px, `tablet` < 1024 px, else `desktop`) | the survey key, saves, boards, notes, answers, names, e-mail |
| Survey | survey id, `''` subject, the survey key, app version, answers in registry order (unanswered questions omitted), `{}` meta, the cleaned comment, device class | puzzle ids, saves, usage data |
| Rating | `puzzle-rating`, the official puzzle id, the survey key, app version, `difficulty` and optionally `more: "yes"`, meta `{ family: puzzle.type, tier: lower-cased difficulty }`, `comment: ''`, device class | answers to the taste survey, saves |

Text cleaning matches the contract: control characters other than newline and tab become spaces,
then the text is trimmed; empty or over-length text is not sent. The client validates every
payload against the contract (and the registry copy in `src/voices-queue.js`) before queueing it,
so a contract error cannot silently drop a player's message. Every payload always has the
contract's full key set; the rating sends `comment: ''` because its survey takes no comment.

Imported and workshop puzzles are never named: the Report button attaches no subject for them,
and ratings appear only for official puzzles.

The Pulseboard consent switches, Global Privacy Control and Do Not Track do not gate Voices,
because a Send is an explicit submission rather than measurement.

## The survey key

`localStorage["alibi:voices:respondent:v1"]` holds a random UUID v4 created the first time the
player submits the survey or taps a rating (never for a message, never on load). It lets this
installation replace its own earlier answer instead of counting as another respondent. It is never
sent with usage counts, diagnostics or journeys; the collector stores only a one-way hash of it.
Reset in Privacy removes it (and the device's memory of its ratings); the next submission creates
a new one. Clearing site data does the same.

## Offline queue and delivery

- `localStorage["alibi:voices:queue:v1"]`: at most 20 items, each the exact payload plus
  `attempts`, `next` (next try, ms) and `queued` (ms). A 21st item is refused with a message, never
  by dropping a waiting one. A queued survey or rating for the same survey and subject replaces the
  older queued one; a message with the same id is queued once. Items older than 30 days are
  dropped unsent. Corrupt data is treated as empty; if storage is unavailable the queue lives in
  memory for the page (flushed by the same triggers), and so does the survey key.
- Flush triggers: after the first render when the browser is idle, on `online`, after a new item
  is queued, and on `visibilitychange` to visible. A browser that reports itself offline makes no
  attempt. Items are sent one at a time.
- Status handling: `202` removes the item (including `duplicate: true` and `updated: true`);
  `400` removes it and leaves a local "could not be sent" note shown in Settings (Dismiss clears
  it); a network error, a timeout (15 s), `429`, `5xx` or `503` keeps it and backs it off 1 minute,
  5 minutes, 30 minutes, 2 hours, then every 6 hours, honouring a longer `Retry-After`, and ends
  that pass. Other statuses (for example `403`, `404`, `415` while the collector is not yet
  deployed or admitting Alibi) are kept and retried the same way, bounded by the 30-day drop.
- The sheet waits up to four seconds for the collector's answer. It says "sent" only after a
  `202`, "not sent" after a `400`, and otherwise "saved on this device" (offline wording when
  the browser is offline).
- Settings shows "N messages waiting to send" with Delete.

Other local state (`alibi:voices:state:v1`): the rating-row switch, the last rating per puzzle and
the last survey answers (for pre-filling), and the invitation's snooze/stop state. None of it is
sent. The `alibi-device` IndexedDB database and backups are untouched.

## Where it works

Sending works only on the primary Cloudflare origin (`ALIBI_CONFIG.standalone === false`, the page
origin equal to the Pulseboard-registered origin, and a known collector). On the Sites fallback, the
standalone file and the Android preview the Feedback sheet explains that sending works on the main
site and offers the existing **Create issue report** export instead; ratings, invitations and the
survey are not shown. The CSP `connect-src` already allows the collector origin.

## Code and budgets

| File | Role |
| --- | --- |
| `src/voices.js` | Startup, in the application bundle: eligibility, the Feedback and Report buttons, places for the rating row, invitation and the Settings/Privacy panels, flush triggers, the chunk loader. The app calls `AlibiVoices(current, records)` after each render. |
| `src/voices-queue.js` | Pure payload builders, registry copy, queue, backoff, status handling, survey key and invitation timing. Tested in Node with fake storage, fetch and clock. |
| `src/voices-sheet.js` | The dialog (feedback and survey), rating row, invitation, panels and styles. |
| `tools/build.cjs` | Emits `assets/voices.<hash>.js` (queue + sheet), precaches it, inlines it in the standalone file, and writes `ALIBI_VOICES = { origin, collector, chunk }`. |

The chunk is deferred and precached like the Vault definitions chunk: it loads when a Voices place
appears or on first use, and works offline. Measured when added: chunk 19,704 bytes (8,543 gzip);
application bundle +1,015 gzip bytes including the journey family/tier props and their Privacy wording. See
`tests/budget.test.cjs` for the ceilings.

Proof: `tests/voices-queue.test.cjs`, `tests/voices.test.cjs`, `tests/browser_voices.py`
(intercepted collector, 320/390/1280 px), and the offline check in `tests/browser_origin.py`.

## Content demand

Separately from Voices, the Journeys events `puzzle.started`, `puzzle.completed`, `puzzle.failed`
and `hint.requested` carry `family` and `tier` for official puzzles (never for imported or workshop
puzzles, which stay `custom`), so the Desk can show what players start, finish and find hard per
family and tier. These follow the player's Pulseboard Journeys choice as before.
