# Alibi 0.14.1: core cabinet QA (condensed by coordinator from the agent's full report)

Setup: 0.14.1 snapshot on 127.0.0.1:8792, Python Playwright headless Chromium; phone 390x844 touch DPR2 (state kept across runs: 14 solves) and desktop 1280x800 fresh; external hosts and Pulseboard SDK aborted. Completed one puzzle per family (13) on phone via real controls with lesson/hint/check/undo/completion; six repeated on desktop; library filters, casebooks, journal, settings backups, workshop, info pages, 404s. No page errors. Evidence: `shots/`, `logs/`, `scripts/`, `downloads/`. 0 blocker, 8 major, 24 minor, 16 polish.

## Major
- M1 Journal unreachable on phone: phone nav Desk/Puzzles/Cases/Games/Space/Castle has no `#/journal` link anywhere, yet completion says "Saved in your journal". `app.js:484-501` (list 487-493), `app.js:482`. Fix: reachable from phone (nav/Space/completion), or merge with the Club journal.
- M2 Library filters carry across families (Sudoku Expert+Solved → Lanterns shows "0 puzzles"). `app.js:271-280`. Fix: reset on family change or keep per family.
- M3 Crime scene: after everyone is placed the banner still gives placement instructions; the accusation panel sits a screen below 8 mode buttons, tool row and Restart; Alibi files gated similarly. Fix: banner changes when the board is complete; conclusion panel moves up/highlighted.
- M4 Unknown deep URL with SW installed (`/a/b/x.html`) shows an unstyled "Opening the puzzle cabinet…" forever; `/404.html` shows home; without SW a different unstyled 404. `tools/build.cjs:433, :457`. Fix: shell only for in-scope extensionless URLs or absolute asset URLs; style the static 404. Hosted unverified.
- M5 Casebook chapter 1 of 6 says "Case closed." and "completed another chapter"; "Read the next page" returns to chapter 1 (revelation shown three times). `app.js:1480, 1484`. Fix: chapter-aware title; next → next chapter; show revelation once.
- M6 Phone home buries puzzles: section 03 (6 of 13 families) starts ~6,650 of 7,535px; fresh profile's "Find my first puzzle" hidden below 900px width; "Continue your puzzle" at y≈866 under a full-screen hero. `club.css:2172`, `club.js:504`.
- M7 Settings has three backup systems (combined, Club, cabinet): 3 exports, 3 restores, 3 recovery buttons; journal has another "Back up progress". Fix: combined export primary; per-store tools under Advanced.
- M8 Two homes with two navs ("Try the Wrenmere desk →" `#/home?ux=house` with Desk/Puzzles/House/Notes/Comfort; `src/house/view.js`).

## Minor
- m1 Home news "Explore all 27" Sun & Moon (library shows 55) `curation.js:28`.
- m2 All 7 game cards "01 / ALIBI" `club.js:507, 462`.
- m3 Home category cards lack padding; uneven tops.
- m4 "Clear the filters" in Browse-all returns to landing and drops the collection filter `app.js:2558-2561`.
- m5 Empty state "0 puzzles · No locked levels. Follow your curiosity."; same action labelled "Reset filters" and "Clear the filters" `app.js:634`.
- m6 Filter selects truncated at 390 ("Every difficu"); "Reset filters" wraps; puzzle type offered 3 ways.
- m7 Museum painting above content says "Your puzzle and its clues are below" on the casebooks page and pushes content ~1.5 screens down `atmosphere.js:44`, `app.js:639, 602`.
- m8 Phones told "Right-click…", "Shift+Enter…", "Arrow keys…"; network instruction twice `presentation.js:117, 242`.
- m9 Hint on a solved board still offers "Reveal one step".
- m10 Wrong scene accusation: no explicit "wrong" message (witness has a red explanation).
- m11 Selected suspect under sticky hover: white on #e2ece8 (~1.2:1) on phones (emulated).
- m12 Journal "A fresh page. Start any puzzle…" under "14 Puzzles solved" `app.js:711`.
- m13 About/Login button rows wrap one word per line at 390 `app.js:738-742`.
- m14 Zen on home keeps nav and hero; "Exit Zen" pill covers Install/Settings.
- m15 Moon icon toggles Zen (not dark mode); Castle and Desk share the house icon; "Space" uses "…"; 3 unlabelled top-bar icons `app.js:493, 482`.
- m16 Naming: Your space/Space/Settings & saves/Settings; three journals; Games room/Club/After Hours; Castle/Wrenmere Castle/Quiet Wing/Wrenmere desk; Evidence vs Guide; Pencil mode vs Cell notes; collections also called "settings".
- m17 Puzzle card art inconsistent: offsets, icon+heart overlap preview, same preview per family regardless of size, "Solved" covers art.
- m18 Tiny text 7–11px (room codes 7px, "Offline ready" 8px, axis labels 9px); 79 runs on one play page; desktop sidebar 10px while playing `app.css:1315-1317`.
- m19 Workshop "Remove clue" 27x27px.
- m20 Workshop draft editor two cards below the form; "Verify the logic" stays primary after verifying.
- m21 Issue report from home promises puzzle/solution but exports `puzzle: null`.
- m22 No daily cabinet puzzle (only Borough seed) though PROJECT-MAP claims daily picks.
- m23 ~110px room banner above every page; unclear labels ("Room sound off", "Still the room", "Rich edition"); default-blue slider.
- m24 Casebook play bar says "Collection" but returns to the casebook `app.js:485`.

## Polish
p1 "exactly 1 statements true" (`app.js:1477`). p2 "Another crime scenes puzzle"; three different completion phrasings; three follow-up button styles. p3 "Optional short films · four short films" oversized/repeated. p4 ↗ used for in-app links; "All 510 puzzles ↗" orphaned arrow. p5 home eyebrows on different baselines; whole home labelled "PREVIEW". p6 footer version floats; About 30x36 target (`app.js:503-505`). p7 heavy focus box on the first lesson title hits close. p8 Futoshiki signs overlap borders. p9 Alibi files lowercase headers. p10 Bellweather rows show time twice; continuous casebooks omit puzzle type. p11 Casebook 05 cover flat vector vs painted 01–04; fifth card alone. p12 Wrenmere desk preview always sun/moon (`src/house/view.js:56`). p13 default-blue search clear and slider. p14 "Check" only checks conflicts ("Check conflicts" clearer). p15 Desk assistant options look like links; "Fill next forced" missing in Settings.

## Feels ad hoc
1. Home is a feed of every feature (~12 blocks, six visual styles); puzzles are block 10.
2. Play page repeats controls (Undo/Hint in bottom bar and tool row; How to play icon and link; back arrow and "Collection"; duplicate Guide/notes sheets; 8 crime-scene mode buttons; "Story, room & assistance" with no story on Sudoku).
3. Settings collects every subsystem's saving (four stores), plus Workshop's only phone entry, lessons, reports, install, updates.
4. One concept, many names; → vs ↗.
5. Decorative inserts push content down (museum paintings with mismatched copy).
6. After finishing, the next step is unclear (M3, M5, p2).
7. Illustration styles clash (stock photos, museum paintings, painted covers, flat vector, isometric, SVG previews, line icons, Unicode ☀ ◐ ✎ ◈ ✦); three card-title treatments.

## Pattern inventory (summary)
Main palette bg #f1eee7, paper #fffcf5, ink #213c43, muted #55666a, line #d9ddd6, teal #235861/#173f49, mint #e2ece8, accent #c29350, red #a34e43/#f9e4df, sidebar #132f3a; parallel club palette; 8 pastel room colours; Evening theme; browser-blue leaks. Georgia headings, system sans body, uppercase 8–11px labels everywhere. Buttons: filled teal, outlined cream, ghost, cream pill, cream/yellow rectangle, outline-on-dark, 44px round icons, pill chips, grey tools, outlined modes with mint selected, grey number keys, toggles, selects, default slider, 12px footer links. Five back-control styles. Board page stack (14 layers from label to "Saves as you play").

## Site map
`#/home` (heroes → casebooks/salon/quiet; `?ux=house` alt home) · `#/library` → `/<type>` → `#/play/<id>@<rev>` → completion · `#/casebooks` → `/<book>` → `#/story/…?book=` → `#/play/…?book=` → completion → story → next chapter · `#/journal` (desktop only) · `#/settings` → workshop, club, privacy, lessons, backups · `#/workshop` · `#/club`, `#/lab`, `#/salon`, `#/quiet…` · `#/privacy`, `#/about`, `#/login`, `#/changelog`.

## Not verified
Physical devices, real touch, iOS/Android, tablet widths, hosted site, Beta notice, external photos, sound/film/haptics, keyboard/screen readers, most of Evening theme, destructive restores, imported pack play, workshop auto-scroll, m11 on device.
