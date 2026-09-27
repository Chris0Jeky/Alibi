# Wrenmere Castle (Chapter I): completability and usability audit

Build: 0.14.1 snapshot served locally on http://127.0.0.1:8791 (castle bundle `assets/quiet-castle.11c16dd47a9f.js`); source read at `cca6b18`. Headless Chromium via Python Playwright; phone 390x844 touch DPR2 and desktop 1280x800; real IndexedDB profiles; Pulseboard blocked; every puzzle solved with real controls, Worked answer never used. Screenshots: `shots/` (open `d07-desktop-map-after-chapter.png` first).

## Verdict
Completable yes, but only with hidden knowledge, and the player cannot tell they have finished. Minimum path: 5 checked questions + "Read the margin" (Library → Observatory → Gatehouse (or Bridges / Lo Shu) → Map Room → Keeper's Study → Unrecorded Stair), about 45–55 taps on a phone. Hidden knowledge: the chapter ends at the margin dialog, not at 100 points; the clock answer must be `HH:MM` with a colon; the thread card below the map is the only step-by-step guide; a map pin only selects a room, "Enter room" is in the panel below.

## Intended flow vs. player experience
| # | Intended (source) | Player sees |
|---|---|---|
| 0 | Keeper's letter "Start with the library…" (`content.mjs:121-122`), opens only on demand (`view.mjs:307-314`, `pages.mjs:45`) | Selection defaults to Gatehouse (`view.mjs:47`); thread card at y≈1700px phone / 1130px desktop (`pages.mjs:52`); no intro |
| 1 | Library shelves, always open; solving opens Observatory (`engine.mjs:205-209`) | Works; wrong Check gives generic message (`engine.mjs:193`); no "go to Observatory" after success (`view.mjs:543-557`) |
| 2 | Observatory clock must be exactly `'21:00'` (`engine.mjs:130-131`); input `inputmode="numeric"`, maxlength 5, prefilled 21:17 (`boards.mjs:34`, `puzzles.mjs:39`); required for Study (`engine.mjs:187-188`) | `2100`, `21.00`, `9:00` rejected with generic message; Enter does nothing |
| 3 | Map Room opens after Gatehouse/Bridges/Lo Shu (`engine.mjs:185-186`, `:210-214`) | Thread button visits locked Map Room (`exploration.mjs:103-107`, `:116`) → Close-only dialog; Gatehouse success says "You can now reach the Map Room" (`puzzles.mjs:17`) but Gatehouse has no door to it (`exploration.mjs:10`) |
| 4 | Route S→B→O→T, 7 minutes (`engine.mjs:132-133`) | Works; edge minutes ~9px (`boards.mjs:9`); on-route nodes not highlighted (`boards.mjs:13-18`) |
| 5 | Keeper's Study conclusion `possible-not-proven` | Works; success text doesn't name the Unrecorded Stair (`puzzles.mjs:177-178`) |
| 6 | Stair opens (`engine.mjs:220-224`); `resolution()` only shows a dialog (`view.mjs:381-387`) | Afterwards 50/100 (`view.mjs:124`, `engine.mjs:229-231`); thread still "Visit the unrecorded stair" (`exploration.mjs:114-117`); room 09 never done because its puzzle id `'reveal'` (`rooms.mjs:107`) isn't a question id (`engine.mjs:3-14`, `pages.mjs:52`) |
| opt | Lamps, Hanoi, Bridges, Lo Shu, Ur; museum labels; drawer; hypotheses; backup; film; conservatory | All work; film captions, backup export/merge, offline reopen kept 100/100 |

## Blockers and major issues
- **B1 Completion never recorded or shown (major; primary cause of "impossible").** Code: `view.mjs:381-387`; `exploration.mjs:114-117`; `rooms.mjs:107`; `pages.mjs:30-31,52`; `view.mjs:124`. Smallest fix without a save-format change: treat `E.has(state,'inference')` as chapter complete; final thread text "Chapter I complete. Optional: n/5 more questions."; persistent completion tag on the map; room 09 done once the Study is solved; relabel score e.g. "Chapter I 5/5 · Extras 0/5".
- **B2 Clock answer on phone numeric keypad (possible blocker; unverified on device).** `boards.mjs:34`; `engine.mjs:130-131,193`; `view.mjs:769-771`. Fix: normalise digits (accept 2100, 21.00, 21 00) or use hour/minute selects; format-specific feedback.
- **B3 Thread and locked-door dialogs are dead ends (major).** `exploration.mjs:103-107,116`; `view.mjs:172-175`. Fix: point to the room that unlocks the next one; add those links to the lock dialog.
- **B4 Guidance below the fold, contradicting the default selection (major).** `view.mjs:47`; `pages.mjs:52`; `view.mjs:307-314`; `content.mjs:122`. Fix: thread card above the map; default selection = thread's next room; show the keeper's letter on first visit.
- **B5 "Choose a room ↗" ejects to home (major).** `src/theatre.js:78`. Fix: hide the bar on castle pages or relabel "Change ambience (leaves castle)".
- **B6 22 of 32 directory rooms can never be entered (major confusion).** `pages.mjs:77-84,27`; `rooms.mjs:123-386`. Fix: show playable rooms by default; collapse planned ones under "Later chapters".

## Minor issues
- m1 Unlock messages have no "Go to…" button; Gatehouse has no door to Map Room (`puzzles.mjs:17,34,178`; `exploration.mjs:10`; `view.mjs:543-557`).
- m2 Map panel says "Enter room" for locked rooms; pins show no locked state; completed pins only a double border (`pages.mjs:32,52`; `native-style.mjs:12-13`).
- m3 Map ≥560px wide at 390px; pins 03 (clipped), 05, 10 off-screen (`native-style.mjs` `.map-stage`).
- m4 Bridges describes "the schematic" but none is drawn; the correct answer button spells out the reasoning (`puzzles.mjs:117`; `boards.mjs:24-25`).
- m5 Route minutes ~9px, ignore Larger text; on-route nodes not highlighted (`boards.mjs:9,13-18`).
- m6 Generic wrong-answer message everywhere except the Study; Hint repeats the last hint forever (`engine.mjs:193`; `view.mjs:526`).
- m7 Touch targets under 44px: header links 37px, footer notebook link 16px, notebook "Return to…" 19px, Bridges N/S/I/E 36–44px wide, Ur 0–4 41px wide, Quiet Wing links 26px (`style.mjs:6`; `html.mjs:12-13`; `boards.mjs:25,71`).
- m8 Margin record says it is from the Stair but links back to the Keeper's Study (`evidence-view.mjs:5`; `content.mjs:40`).
- m9 Merge message says "Distinct imported notes are labelled" when there were none (`view.mjs:260-265`).
- m10 Developer copy shown to players: "No close-up artwork.", "…rewards remain separate planned work…" (`view.mjs:565,393`).
- m11 Drawer and conservatory end in Garden/Realm/Companions links that leave the castle without warning (`html.mjs:12-13`).
- m12 Visit count counts only button visits (`view.mjs:177` vs `:835-839`).
- m13 Puzzle controls stay active after completion; Close scrolls out of view in long dialogs (`view.mjs:445`; `style.mjs` dialog rule).
- m14 Two "Wrenmere" experiences: "Try the Wrenmere desk →" opens a session-only study claiming "The full castle is ready to explore" (`src/house-loader.js:20`; `src/house/controller.js:7`; `src/house/view.js:114`; `src/house/model.js:158`).
- m15 With story off, the thread only says the museum and conservatory are open (`exploration.mjs:94-95`).

Checked fine: no horizontal overflow at 390px (incl. Larger text); dialogs keep scroll on redraw; Escape closes dialogs with focus return; keyboard-only Gatehouse; offline reopen; practice-shelf round trip; castle mount 36–54ms, pin select ~40ms, puzzle open ~250ms (desktop CPU).

## Needs redesign
Completion and scoring (what "done" means); phone map navigation (pin → panel below, pins carry no state, partial off-screen); Bridges exhibit (real diagram, non-revealing answers); the two "Wrenmere" experiences (merge or clearly separate).

## Not verified
Physical iOS/Android keyboards (B2 inferred), TalkBack/VoiceOver, physical touch, real-device CPU/thermals/memory, the 4s storage timeout on slow phones (`storage.mjs:22,125-131,160,185-187`), Pulseboard bar layout, hosted sites, `<dialog>` on older iOS, how real players read the thread and margin.
