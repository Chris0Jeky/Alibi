# One phone session (about 45 minutes)

Owner decision 2026-09-27 (walkthrough q-11): the physical-phone parts of `HUMAN_TODO.md` q-2, q-4,
q-7 and q-8 are done in **one** scripted session instead of four separate checklists. Run it on
the affected Android phone **after the release that carries the castle, Games Room and feedback
fixes is live** (check Settings → "Version": it must show that release or later). Browser
emulation cannot do this part: it needs real touch, the real keyboard, TalkBack, large system text,
airplane mode and the phone's own performance.

How to record results: use the app's own **Feedback** button in the top bar (choose "Something's
broken" or "An idea") for each thing that goes wrong, one note per problem, mentioning the step number (for example "S3.2: the
clock keypad has no colon"). Notes queue offline and send when you are back online. At the end,
send one "Something else" note saying the session is complete, with the phone model and Android
version. Do **not** clear the phone's site data or uninstall at any point.

Open: https://alibi-after-hours-preview.commit-atlas.workers.dev/ in Chrome on the phone.

## S1. Install and offline (q-2) · 8 minutes

1. Chrome menu (⋮) → **Add to Home screen** / **Install app**. Open Alibi from the home-screen icon.
2. Wait until the header shows **Offline ready**.
3. Open any puzzle, place two marks, go back.
4. Turn on **airplane mode**. Close the app completely (swipe it away), reopen it from the icon.
   Expected: it opens, the puzzle still has your two marks, and you can keep playing.
5. Still offline: **Settings → Export cabinet, Club, Wing & castle**. Expected: a backup file
   downloads (check the Downloads notification). Turn airplane mode off.

## S2. Large text and TalkBack (q-2, q-8) · 10 minutes

1. Android **Settings → Display → Font size**: set the largest size. Reopen Alibi.
   Expected: text is bigger, nothing overlaps, every button still readable and tappable, the board
   still usable. Try a 15×15 Picture Logic board (Puzzles → Picture logic → a 15×15 study): pan,
   paint, cross, and auto-cross.
2. Set the font size back to normal.
3. Turn on **TalkBack** (Settings → Accessibility → TalkBack). Swipe through Home, open Puzzles,
   open one puzzle, place one mark by double-tapping a cell, and go back. Expected: every control is
   announced with a sensible name and in a sensible order. Turn TalkBack off.

## S3. The castle, Chapter I (q-7) · 12 minutes

1. Bottom navigation **Castle**. Expected: you can tell where to start without scrolling far.
2. Follow the suggested next room each time. At the Observatory clock, type the answer with the
   phone keyboard. Expected: the keyboard lets you enter it (with or without a colon).
3. Continue until the chapter's final record. Expected: after closing it, the map clearly shows
   Chapter I as complete (not "50 / 100").
4. Open one room object, try one museum label, revise one notebook hypothesis.
5. Play the captioned prologue film once. Expected: captions readable, sound only if you asked.
6. Note anything where the next step became unclear, and whether the visit felt rewarding.

## S4. Games Room and puzzles (q-8) · 8 minutes

1. **Games → Archive Heist**: open a vault (room 10 or later) and make a few moves with the D-pad
   and by tapping cells.
2. **Block Cabinet**: place three pieces; open the ⋯ menu. Expected: nothing overlaps; the menu is
   visible where you tapped.
3. **Lantern Duel**: pick a strength and play three moves. Expected: the selected strength is
   visibly selected.
4. Crime scene **"The last service"** (Puzzles → Crime scenes): solve it and make the accusation,
   then press **Another puzzle** and come back and solve it again. Expected: no freeze after
   completion either time (this is the repeated post-completion freeze from issue #11).
5. On a completion screen, tap a difficulty rating ("Too easy · Just right · Too hard").

## S5. Quiet Wing, sound and stamina (q-4) · 7 minutes

1. Castle → **Quiet Wing** (or the Quiet Wing entry on Home). Realm: pinch to zoom, pan, place one
   piece. Companions: open one.
2. Turn on room sound (rain or waves) at low volume, then normal volume, and listen across a few
   loop points. Report anything harsh, repetitive or distracting.
3. Switch to another app for a minute and back. Expected: the sound and scene resume sensibly.
4. Leave the realm running for three minutes. Report heat, stutter or battery drain you notice.

## S6. Close the session · 2 minutes

1. **Settings → Feedback and surveys**: check that no note is listed as waiting to send (if you are
   still offline, they wait there and send later).
2. Send the closing note (phone model, Android version, "phone session complete").
3. Optional: **Take the short survey** in the same section.

After the session an agent reads the notes in the Pulseboard Desk, records the results against
q-2, q-4, q-7 and q-8 in `HUMAN_TODO.md` (only what you actually confirmed), and files issues for
anything that failed.
