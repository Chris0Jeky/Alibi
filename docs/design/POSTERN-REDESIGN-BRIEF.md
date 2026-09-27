# Postern: redesign brief

A brief for Claude Design (or any designer) to redesign Alibi as **Postern**: a puzzle club that
has quietly set up inside an abandoned castle, full of small mysteries, for people who love
logic puzzles. It is written from a code, content and QA audit of release 0.14.1 on
2026-09-27. The recommendations are starting positions for the designer, not settled decisions;
the owner decisions that are settled are marked as such (section 13 and the list below).

- Owner decisions already made: the product name direction is **Postern** (2026-09-27); the source
  is PolyForm Strict; player feedback and surveys go to Pulseboard; the Sites fallback is retired.
- Evidence behind this brief: the castle playthrough audit, the Games Room/challenges audit, the
  core cabinet audit and a design dossier (see [Evidence](#12-evidence-and-where-to-find-it)).

---

## 1. What we are asking for

Design one coherent product where today there are several. Players describe the current app as
beautiful in places but "incomplete": buttons, features, views and interactions look placed ad
hoc; the castle is hard to navigate and appears impossible to finish; advertised content is hard
to find. The redesign should make Postern feel like **one place** with rooms, where every screen
answers "where am I, what can I do here, and where does this lead".

Deliverables, in priority order:

1. **A navigation model and site map** (section 5) with the phone navigation, the route for every
   space, and the "always a way back" rules.
2. **A token set**: colour (two themes), type ramp, spacing, radius, elevation, focus, motion,
   expressed as CSS custom properties (section 7). This is also the consolidation plan for the
   current CSS (section 10).
3. **A component library**: buttons, navigation, cards, chips, sheets and dialogs, notices,
   board chrome, completion card, progress markers, empty and error states (section 8).
4. **Phone (390×844) and desktop (1280×800) mockups** for the priority screens in section 9, in
   both themes, including the first-visit and returning-visit states.
5. **An asset plan**: which illustration idiom survives, what each space needs, and where
   imagery may and may not appear (section 11).
6. **Interaction notes** for the signature moments (section 6) and accessibility annotations
   (section 10).

A good result can be implemented incrementally inside the existing byte budgets, starting with
tokens and the navigation shell, without changing save formats or puzzle identities.

## 2. The product today, in one paragraph

A mobile-first, offline, device-local puzzle web app (installable PWA, Android preview) with
**510 original logic puzzles** in **13 families** (crime scenes, logic-grid dossiers, witness
statements, picture logic, lanterns, tents, aquariums, signal paths, number trails, Sudoku,
sun & moon, Futoshiki, tidal bridges), **5 casebooks** (two continuous mysteries, three
anthologies), a **Games Room** with club games (Lantern Duel, Tic-Tac-Toe, Lantern Gardens,
Block Cabinet, Pocket Borough, Archive Heist), **95 curated challenges**, a **Quiet Wing** of
calm activities (a 3D realm, companions, a garden, calm puzzles, an art room), **Wrenmere
Castle**, a story campaign in which the player catalogues a castle and reconstructs what
really happened in the 1911 flood, a **workshop** for authoring puzzles, and **Settings** with
offline saves and backups. No accounts, no ads, no lives, no streak penalties. Two early
players "loved it"; one plays regularly and asks for more puzzles of particular families and
harder ones.

## 3. Vision

> **Postern.** A small side gate in the wall of an old estuary castle. Behind it, in rooms
> the trustees closed long ago, a puzzle club keeps the lamps lit. Come in quietly, pick up a
> puzzle, stay as long as you like. The castle has its own unanswered questions, if you want
> them.

Experience pillars:

1. **A place, not a menu.** Every feature is a room of one castle with a literal name and a way
   back. The player always knows which room they are in.
2. **The puzzle is the hero.** On a puzzle screen the board comes first, on paper, well lit.
   Atmosphere frames it and never competes with it.
3. **Warmth in stone.** Café comfort (lamplight, paper, a kettle on) inside something old and
   slightly mysterious (slate, brass, moss, a river at night). Cosy, never twee; mysterious, never
   spooky.
4. **Quiet by default.** No noise, no nagging, no fake urgency. Sound is off until asked.
   Celebration is brief. Nothing punishes absence.
5. **Every door leads somewhere.** Completion always shows what is next. Nothing important is a
   10-pixel link at the bottom of a long page.
6. **For people who care.** Rules explained properly, difficulty labelled honestly, solutions
   earned, notes that respect how enthusiasts think.

## 4. One world (resolving today's competing metaphors)

Today the app mixes a **desk**, a **club**, a **cabinet** (four different things are called a
cabinet), a **house**, a **castle**, a **wing**, a **harbour**, a **theatre** with eight
atmosphere "rooms", and a **museum**. The castle sits *inside* the Quiet Wing in the code
(`#/quiet/castle`), while the story places the Quiet Wing *inside* the castle. Recommended
single fiction:

- **Wrenmere** is the castle, on a tidal river where it meets the sea. This reconciles the
  coastal casebooks and harbour games with the countryside estate. **Postern** is the product
  and the gate you come in through. (Owner to confirm that Wrenmere survives as the castle
  name; recommended.)
- **The club** is the café life inside: the people who left notes, kept the lamps lit and set the
  puzzles. The club is why the castle feels inhabited.
- **Every space is a room of Wrenmere.** The theatre "atmosphere rooms" stop being a separate
  system: their weather and lighting become the lighting of the castle rooms, and the separate
  "Room settings / Choose a room" bar retires. It currently sits above every page, including the
  castle's own header, and inside the castle it throws players out to the home page.
- **"Cabinet", "desk" and "house" stop being product nouns.** Keep the literal words where they
  are literal (Block Cabinet, Number Cabinet as a room).
- **"Alibi" survives as a family name** ("Alibi files", the logic-grid dossiers) and can stay as
  the imprint of the crime casebooks. The `alibi-*` storage identifiers never change.

Space map (literal label first, place name second):

| Literal label | Place in Wrenmere | Contains today | Notes |
|---|---|---|---|
| **Home** | The Postern (gate lodge by the side gate) | Desk, "left on your desk", editions, news | Short, returning-player first |
| **Puzzles** | The Reading Room | 13 families, collections, filters, search | The café heart of the club |
| **Cases** | The Records Room | 5 casebooks | Boxed files; continuous cases |
| **Games** | The Card Room | Club games, curated challenges | Tables, not tiles |
| **Castle** | The Estate | Wrenmere map, rooms, museum, notebook, Quiet Wing | The Quiet Wing is a wing on this map |
| **Journal** | The Ledger | Four journals and stamp books today | One journal for everything |
| **Settings** | The Porter's Lodge | Five settings surfaces today | Also feedback, survey, backups, privacy |
| **Workshop** | The Clockmaker's Workshop | Authoring | Advanced; secondary navigation |

Fiction housekeeping for the writers (not the designer): several names collide across stories
(Mara Vale / Mara Voss, Iona Bell / Iona Reed, Celia Wren / Edmund Wren / Wrenmere). Decide
whether the casebooks share one universe with Wrenmere before new art depicts characters.

## 5. Navigation and information architecture

Problems to solve (all observed in 0.14.1):

- Six phone tabs (Desk, Puzzles, Cases, Games, Space, Castle); Desk and Castle share one icon;
  the Quiet Wing, both journals and the workshop have no phone entry; inside the Quiet Wing the
  main navigation disappears and the only way back is the logo.
- Two competing phone homes (the classic desk and the opt-in "Wrenmere desk", whose "House" tab is
  mistaken for the castle and whose study resets on reload).
- The 24 Archive Heist vaults and 12 Borough contracts advertised in 0.13.0 are reachable only
  through Quiet Wing › Classics › a 10 px "Curated challenges" link (5 taps and about 8,600 px of
  scrolling from the phone home).
- Four journals, five settings surfaces, three "rooms" systems.

Recommended model:

- **Phone bottom navigation, five items:** Home · Puzzles · Cases · Games · Castle, each with a
  distinct icon. Journal, Settings (the Lodge), Workshop and Feedback live in a header menu that
  is visible on every screen.
- **The Quiet Wing is reached through Castle** (it is a wing of the estate) and also from Home
  when the player uses it often. It keeps the same bottom navigation as everywhere else.
- **One back rule:** every screen has a visible "back to <place>" that goes where the player came
  from (puzzle → the shelf, filter and scroll position they left; castle room → map; game →
  Card Room). Leaving the castle never silently drops the player on Home.
- **Deep content lives where players look for it:** Archive vaults inside Archive Heist; Borough
  contracts inside Pocket Borough; castle practice puzzles linked from their rooms; curated
  challenges as a table in the Card Room.
- **One journal** with tabs or sections: puzzles, cases, games, castle, calm activities; one stamp
  book.
- **One settings surface** with sections: appearance and comfort, sound and atmosphere, saves and
  backups, privacy and Beta, feedback and survey, about. The castle and Quiet Wing read the same
  preferences.

## 6. Signature moments (interaction design)

1. **Arrival at the Postern (Home).** A returning player sees, above the fold at 390 px:
   *Continue* (the exact puzzle/game/case they left, one tap), *Today's puzzle*, and at most one
   club notice (new puzzles since the last visit, a new case chapter, or the survey invitation).
   A first-time player sees a two-sentence welcome and three doors: "Try a puzzle", "Open a
   case", "Explore the castle". No full-screen hero before the first action.
2. **At the table (the puzzle screen).** The board is a sheet of paper on a lit table: highest
   contrast, largest element, in both themes. Controls sit in one reachable bar (Undo, Notes,
   Check, Hint, More). Rules and lessons open in a sheet, never pushing the board down.
3. **Completion ritual, the same everywhere** (puzzles, cases, games, challenges, castle
   questions): a short stamp into the Ledger, the time/hints summary, the optional rating row
   ("Too easy · Just right · Too hard" and a "More like this" heart), and exactly one primary
   *Next* (next in the family, next chapter, next room, next vault) plus a secondary way back.
   Today completion ranges from a rich card to a line of status text, and the castle never
   shows that Chapter I is finished at all.
4. **Doors and keys (castle).** Solving opens doors; the map shows at a glance which rooms are open,
   locked (and what opens them), and done. The next suggested room is highlighted and one tap
   away. Planned rooms stay off the map until they exist.
5. **Notices on the club board.** New content, release notes, the survey invitation and replies
   to "what's new" live on one pinboard card on Home and in the Ledger, never as banners or
   popups over a board.
6. **Leave a note for the keeper (Feedback).** A pencil icon in the header opens a short sheet:
   kind chips (Problem, Idea, This puzzle, Praise, Other), a text box, one line saying what is
   attached (app version, screen, puzzle id; no saves, no name), Send. Offline it says "Saved. It
   will be sent when you're back online." Players can see and delete queued notes in the Lodge.
7. **The club asks (Survey).** A seven-question multiple-choice survey offered on a completion
   screen at a quiet moment (after the 5th puzzle on a second day; at most monthly after that),
   always available in the Lodge, pre-filled when updating answers. It is an invitation card,
   never a modal.

## 7. Visual language

Materials: wet slate, lime-washed stone, worn oak, aged paper, brass, cold glass, moss, a river at
night, and lamplight. The castle's existing art direction already names most of these.

Themes (recommended):

- **Lamplight** (signature, dark): slate and ink walls with amber light and brass details.
- **Daylight** (light): lime-wash and paper.
- In **both** themes, puzzle boards, casebook pages and forms sit on **paper** surfaces with ink
  marks. Legibility beats mood. Stronger contrast, larger text and reduced motion apply to every
  space, including the castle and Quiet Wing (today they each keep their own switches).

Starting palette for the designer to refine (current values in brackets for reference):

| Token | Lamplight | Daylight | Use |
|---|---|---|---|
| `--wall` | #141c1f | #efe9dc | page background |
| `--wall-raised` | #1d292c | #f7f2e7 | cards, sheets |
| `--paper` | #f4ecdb | #fffcf5 | boards, pages, forms |
| `--ink` | #1f2a2c | #1f2a2c | text on paper |
| `--text` | #ece3cf | #213c43 | text on walls |
| `--muted` | #a7b0a6 | #55666a | secondary text |
| `--line` | #3a4a4c | #d9ddd6 | dividers |
| `--estuary` | #3e7f82 | #235861 | primary action (current primary teal #235861) |
| `--brass` | #c9a15a | #b88a45 | accents, focus, keys (current #c29350) |
| `--lamplight` | #f0c67a | #dbac60 | highlights, the "lit" state |
| `--moss` | #7f9a6c | #4f6f43 | success, open doors |
| `--rust` | #d08a73 | #a34e43 | errors, conflicts (current #a34e43) |

Typography (system fonts only; no font files fit the budgets or the CSP today):

- Display: an old-style serif stack (`'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book
  Antiqua', Georgia, serif`). UI and body: `system-ui` stack.
- Seven steps already agreed in issue #219: display 44/40, h1 36/32, h2 28/25, h3 22/20, body 16,
  meta 13, eyebrow 11 (desktop/phone px). **Nothing smaller than 11 px anywhere** (today 443
  declarations are 11 px or less, some 7 px).
- Eyebrows use `text-transform` and one letter-spacing value; today there are five recipes and
  literal capitals in code.

Shape, space, depth, motion:

- Spacing on a 4/8 grid: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: four tokens (8, 12, 16, pill) plus a circle and one decorative arch; today there are
  43 radius values.
- Elevation: three levels (flat, raised card, sheet/dialog) and one focus ring (today eight).
- Motion: three durations (120 ms feedback, 240 ms transitions, 600 ms arrivals) and one easing.
  Lamp flicker, rain and dust only in establishing moments, never behind a board or clue text.
  Reduced motion removes all of it.

Iconography: one 24 px line set (stroke 1.6, round caps, `currentColor`), plus a small castle
glyph family for places (gate, lamp, book, card table, map, key, bell, kettle). Every navigation
item gets its own icon.

## 8. Components to design

- **Buttons:** primary (estuary), secondary (paper), quiet (text), icon (44×44), destructive
  (confirm step). Today one screen can show 14 to 20 button styles.
- **Navigation:** bottom bar (phone), side rail (desktop), header with place title, back link,
  menu, feedback and offline status.
- **Cards:** puzzle card (family recognisable before reading: emblem, size, difficulty, state),
  family shelf, collection shelf, casebook box, game table, castle room, notice, continue card.
- **Chips and badges:** difficulty (Gentle, Steady, Tricky, Expert, Master, Grandmaster, with
  "provisional" styling while uncalibrated), state (new, in progress, solved), family.
- **Sheets and dialogs:** bottom sheet on phone, centred dialog on desktop; one close pattern;
  never taller than the viewport without a pinned close.
- **Board chrome:** title row, status line (what is true now), control bar, notes toggle,
  hint/explanation panel, conflict highlighting, zoom/pan affordance for 15×15 boards.
- **Completion card** (section 6.3) and **rating row**.
- **Progress markers:** solved ticks on lists, room state on the map (open, locked with reason,
  done, suggested next), chapter progress ("Chapter I · 5 of 5" rather than "50 / 100 points").
- **Notices:** update ready, saved offline, storage warning, the moved notice on the old address.
  In flow at the top of the content, never over a board.
- **Empty, loading and error states** with one sentence and one action. No developer copy
  ("No close-up artwork.", "TRUSTED CHALLENGE · REVISION 1", "Illegal archive replay action.").
- **Forms:** feedback sheet, survey (seven multiple-choice questions and an optional comment),
  settings rows and toggles, backup import review.

## 9. Screens to mock up (priority order)

For each: phone 390×844 and desktop 1280×800, Lamplight and Daylight, first-visit and returning
states where they differ.

1. **Home (the Postern).** Continue, today's puzzle, one notice, three doors for new players.
   Today no puzzle is visible above the fold on a phone: header, atmosphere bar, a "Try the
   Wrenmere desk" button, two eyebrows, a heading and a full-screen photo come first.
2. **Puzzle screen + completion**, for a small board (6×6 Sun & Moon), a crime scene (placement +
   accusation) and a 15×15 Picture Logic board. Today a play page stacks up to 14 layers (label,
   instruction, grid, legend, progress, mode buttons, pad, repeated help, tools, restart, conclusion,
   inline completion, "Story, room & assistance", tabs) and repeats Undo, Hint, back and "How to
   play" in two places each; completion is worded three different ways with three button styles.
   On phones the text tells players to right-click or use Shift+Enter.
3. **Puzzles (the Reading Room):** family shelves, a family page, filters and search, a
   collection shelf; recognisable family thumbnails.
4. **Games (the Card Room):** the tables, one game page template (board-first on phone; today the
   room banner and heading push boards below the fold), Archive Heist with rooms and vaults
   (33 rooms), the curated challenges table grouped by game with progress.
5. **Castle:** the estate map on a phone (today the map is wider than the screen, pins carry no
   state, and the guidance card sits 1,700 px down), a room page, the notebook, the museum,
   chapter completion.
6. **Cases (the Records Room):** casebook list, a casebook opening, chapter list, epilogue.
7. **Journal (the Ledger):** one journal across puzzles, cases, games, castle and calm activities.
   Today there are four journals and the main one has no phone entry at all.
8. **Settings (the Porter's Lodge):** comfort, atmosphere, saves and backups, privacy and Beta,
   feedback queue, survey, about. One backup and one restore as the main actions (today three
   exports, three restores and three recovery buttons), per-store tools under Advanced.
9. **Feedback sheet, survey form, rating row** (section 6).
10. **Quiet Wing** inside the castle: realm, companions, garden, calm puzzles, art room.
11. **System states:** offline ready, update waiting ("Save & update", never mid-game), storage
    warnings, not found ("That door is not on the map."), the moved notice on the retired address.

## 10. Constraints the design must respect

- **Offline and budgets.** Enforced by tests. Main CSS has about 50 bytes of headroom under its
  33 KiB + 256 gzip cap, application JavaScript about 100 bytes under its cap, and the first-load
  payload about 2.6 KB under 200 KiB. A visual redesign is therefore also a **consolidation**:
  the current CSS has about 800 distinct hex colours, 96 font sizes, 43 radii, 234 padding values,
  three stacked root palettes and four unrelated token namespaces. The token set must *replace*
  these, not add to them. Optional packs (castle, Quiet Wing, films, enhanced images) have their
  own caps and load lazily.
- **No remote fonts, scripts or trackers**; a strict CSP (`default-src 'self'`; inline styles are
  allowed for board geometry). Imagery must be bundled or come from the existing verified
  mirrors.
- **Accessibility:** 44×44 px minimum targets; visible focus; complete keyboard paths; TalkBack
  and screen-reader order; reduced motion; stronger contrast; larger text that actually scales
  (today only +1 px in the main app); no information by colour alone; every hotspot or map pin has
  a named-button equivalent; no precision pixel hunts.
- **Phones first:** test widths 320, 360, 390, 430 and 844×390 landscape, plus 768 and 1440; safe
  areas; Android back button (one coordinator: gesture → dialog → sheet → route → system).
- **Saves and identities:** puzzle IDs and revisions, save formats, database and cache names
  (`alibi-*`) and the web origin do not change with the rename. Updates never activate mid-game.
- **Honesty:** no fabricated rivals, streaks, scarcity or countdowns; difficulty labels that are
  not yet human-calibrated are shown as provisional.
- **Separately built spaces:** the castle, Quiet Wing and house desk are separately scoped (Shadow
  DOM or prefixed variables). The token set must be shareable into those scopes.

## 11. Assets and imagery

Today at least seven illustration idioms sit side by side: painted gouache covers, stock
photographs, museum masterpieces, flat vector castle scenes, isometric toy vignettes, line
engravings and low-poly 3D. Recommended:

- **Places:** painted rooms (gouache or ink wash) with a consistent light source, used as room
  headers and the castle's room views. #46 already asks for bespoke layered castle paintings.
- **Families and UI illustration:** engraved line vignettes (one weight, one ink), recognisable
  at thumbnail size: a family must be identifiable before its title is read (player request).
- **Museum works** only inside the museum and art room, labelled as such.
- **Retire from primary surfaces:** stock photographs, isometric toy houses and generic realm
  props used as thumbnails. The 3D realm keeps its own look inside its own room.
- **Placement rules:** no imagery behind clues or boards; hero imagery never delays the first
  action; keep central subjects inside the middle 70% for phone crops; required clues are
  authored text or overlays, never baked into generated images.
- **Provenance:** every asset needs a source, licence and hash record before it ships; no paid
  generation or purchases without an owner decision.

## 12. Evidence and where to find it

| Evidence | Location | Headline |
|---|---|---|
| Castle playthrough (phone + desktop, 94 screenshots) | [CASTLE-PLAYTHROUGH.md](../qa/2026-09-27/CASTLE-PLAYTHROUGH.md) | Chapter I is completable but never shows completion; guidance below the fold points at a locked door; 22 of 32 directory rooms can never be entered; the clock answer needs a colon a phone number pad lacks |
| Games Room, challenges, Quiet Wing (185 screenshots) | [GAMES-ROOM-AND-CHALLENGES.md](../qa/2026-09-27/GAMES-ROOM-AND-CHALLENGES.md) | Nothing blocks finishing a game, but 33 findings: vaults and contracts hidden, the vault board looks like a debug harness, completion rarely leads anywhere, boards below the fold on phones, no phone entry for the Quiet Wing |
| Core cabinet audit (all 13 families completed on phone) | [CORE-CABINET.md](../qa/2026-09-27/CORE-CABINET.md) | No blockers, 8 major: the journal is unreachable on phones although every completion says "Saved in your journal"; library filters leak between families (a family opens with "0 puzzles"); crime scenes never prompt the accusation; casebook chapter 1 of 6 says "Case closed."; the phone home's puzzle section starts about 6,650 px down; three separate backup systems in Settings; two homes with two navigations |
| Design dossier | [DESIGN-DOSSIER-2026-09-27.md](DESIGN-DOSSIER-2026-09-27.md) | Surface inventory, lore, current tokens, recorded UX issues, constraints, player evidence, contradictions |
| Existing design work | `docs/castle/design/`, `docs/ux/`, issues #43–#56, #218–#221 | World bible, art and motion, typography, mobile components |

The reports are condensed copies; their screenshots (about 680) stay outside the repository on
the owner's machine. A curated pack of 30 (`postern-brief-screens.zip`, listed in
[SCREENSHOT-PACK.md](SCREENSHOT-PACK.md)) is provided with this brief.

Also consistent across all three audits: one concept often has several names (Settings is "Your
space", "Space", "Settings & saves" and "Settings"; three journals; "Games room", "Club" and "After
Hours"; "Evidence" and "Guide"), arrows mean different things (→ and ↗ both used for in-app
links), and text sizes of 7–10 px are common. A glossary of literal labels belongs in the design
system alongside the tokens.

## 13. Owner decisions on this brief

Settled by the owner on 2026-09-27 (walkthrough q-12, accepting all five recommendations):

1. **Wrenmere** stays the castle's name inside Postern.
2. **"Alibi"** stays as the logic-grid family name ("Alibi files") and the crime-casebook imprint.
3. Theme **follows the device** on first run, **Lamplight** (dark) when unknown; Daylight available.
4. One setting: an **estuary castle** where the river meets the sea (coast and river together).
5. The atmosphere **"rooms" bar retires**; its weather and lighting become the lighting of castle rooms.

Still open elsewhere: publisher identity (HUMAN_TODO q-3), not needed for design work.

## 14. How this lands in code (for the implementers, not the designer)

1. Tokens and consolidation first: introduce the token set, map existing declarations onto it,
   delete duplicates; this frees the bytes the rest needs. Continue #219/#220.
2. The shell: header, phone navigation, back rule, one settings surface, one journal.
3. Screens in the section 9 order, each shipped separately with browser checks at the test widths.
4. The name change (visible strings, manifest name, icons) as its own release once the new shell
   ships; storage identifiers stay.
