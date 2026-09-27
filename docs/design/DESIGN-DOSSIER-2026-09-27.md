# Alibi -> Postern: design-context dossier

Raw material for a Claude Design redesign brief. Compiled 2026-09-27 from the read-only checkout
`C:\Users\jekyt\Desktop\Printer Config\Others\Git\Alibi` (main `cca6b18`, version 0.14.1), GitHub
issues on `Chris0Jeky/Alibi`, and the existing QA screenshots under `C:\Users\jekyt\alibi-qa\*\shots`.
Paths are relative to the repo root unless they start with `alibi-qa/`. "#N" means a GitHub issue or PR.
Where the docs and the code disagree, both are cited.

Headline numbers (local `build-info.json`, build `e6f71ff5cdfa`): 510 puzzles across 13 families
and 30 packs, 5 casebooks, 293 emitted files. The 510 comes from `docs/STATE.md` 0.14.0
(80 Vault studies added). `AGENTS.md` and `README.md` still say 382. The name "Postern" appears
only in open PR #396, which "records Postern as the chosen name direction" under
`HUMAN_TODO.md` q-3. No trademark search is claimed.

---

## 1. Product surface inventory

### 1.1 Global shell (every non-castle, non-wing page)

Source: `src/app.js:482-525`, `src/boot.js:45`, screenshot `alibi-qa/castle/shots/01-phone-home.png`.

- **Desktop sidebar (22 buttons):**
  - Brand: `alibi:` wordmark with "A little room to think".
  - Primary items: Your desk, The puzzle collection (count), Mystery casebooks (count), The games
    room ("NEW" badge), Club journal, The quiet wing, Wrenmere Castle.
  - A "Find your kind of puzzle" section with 13 family links and their counts.
  - Bottom group: Your journal, The workshop, Settings & saves.
  - Footer lines: "Ready to play offline" or "No account. No hurry.", plus "Original puzzles. Yours to explore."
- **Top bar:**
  - Breadcrumb "The puzzle club / <page>".
  - Device-status chip: "Offline ready", "This session only" or "On this device".
  - Three round icon buttons: Zen (moon), Install (download), Settings.
- **Stacked banners, when present:** update ready ("Save & update"), save error, and "N stored records need attention".
- **Theatre bar** (`AlibiTheatre.bar()`), rendered above `<main>` on every non-play page:
  - The current atmosphere room's emblem and name, e.g. "The lighthouse".
  - Tagline "AN IMAGINED PLACE · YOUR OWN PACE", plus "Room settings +" or "Choose a room ↗" (`src/theatre.js`).
  - It also appears above the castle and the Quiet Wing (`alibi-qa/castle/shots/20-phone-quiet-wing-home.png`, `d03-desktop-gatehouse-room.png`).
- **Mobile bottom nav (6 tabs):** Desk, Puzzles, Cases, Games, Space (which is Settings, "Your space"), Castle.
  - Desk and Castle use the same `home` icon (`src/app.js:487-495`; #222).
  - Quiet Wing, both journals and the workshop have no mobile tab.
- **Play-mode mobile nav:** Collection, Evidence (or Guide), My notes, Undo, Hint (`src/app.js:485`).
- **Footer:** What's new, About, Privacy & credits, Report a puzzle issue, version (`src/app.js:498`).
- **Pulseboard Beta notice** (0.14.1): a one-line in-flow notice at the top of the page. A Beta button sits inline in Settings and Privacy (`docs/STATE.md`, `docs/SECURITY-AND-PRIVACY.md`).
- **Not-found page:** "That door is not on the map." (`src/boot.js:45`; #213, #224). Aliases `#/games`, `#/castle` and `#/space` were added in #224 because the visible labels did not match the routes (`#/salon`, `#/quiet/castle`, `#/settings`).

### 1.2 Spaces and features

| Space (route) | Purpose | Entry points | Moves to | Save store |
|---|---|---|---|---|
| **Your desk** (`#/home`), `src/club.js:504` | Club home. Eyebrow "THE ALIBI PUZZLE CLUB · AFTER HOURS / PREVIEW", heading "Make yourself at home.", a fictional weather line. The hero rotates **4 "editions"** (Bellweather/midnight, Glasshouse/garden, Night Train/sleeper, Cartographer/harbour) with Pin and Next edition buttons. Then, in order: the "LEFT ON YOUR DESK" letter card (continue or "Find my first puzzle"), curation news, theatre room panel, atmosphere invitation, "NO ACCOUNT · NO LIVES · NO RUSH", section 01 Games room cards, section 02 "Today's calling card" (daily Borough seed), section 03 "The original cabinet" (6 families), and more. Also a "Try the Wrenmere desk →" button (screenshot 01) | Brand, Desk tab, Your desk | Casebooks, salon, library, play | none (reads) |
| **Wrenmere Desk** (opt-in `#/home?ux=house`, since 0.11.2) | Mobile-first alternative home. A 5-destination dock (Desk, Puzzles, House, Notes, Comfort), one start/resume card before artwork, a finder with an Apply/Cancel filter sheet, 3 engraved room cards (Study, Library, Map Room), and a **session-only** "desk study" deduction. Eyebrow "WRENMERE / YOUR EVENING DESK", "A light is still on." (`docs/ux/README.md`, `docs/ux/MOBILE-COMPONENTS.md`, screenshot `21-phone-wrenmere-desk.png`) | "Try the Wrenmere desk →" | "Classic desk" link back | House pack cache only; study state is session-only |
| **The puzzle collection** (`#/library`, `#/library/<family>`) | Family-first landing (13 families), then levels. Browse all, search, and filters (collection, favorites, level, progress). Removable filter chips, pagination of 12, compact rows (`docs/PLAYER-QA.md`, `docs/POLISH-QA.md`) | Sidebar, Puzzles tab, desk section 03 | Play | `alibi-device` v1 |
| **Player** (`#/play/<id>`) | Board-first on phones since 0.11.5. Behind one disclosure: optional story, room controls and assistant. Also lessons, reasoning hints, labelled reveal, notes, undo/redo, Check, zoom/pan, Zen, and opt-in assistance (`assist.js`) (`docs/ux/MOBILE-QA-2026-09-21.md`, CHANGELOG 0.11.5) | Any card | "Collection" back; "return-to-castle" context | `alibi-device` (revision-pinned runs) |
| **Mystery casebooks** (`#/casebooks/<id>`) | Five books (1.3). Opening → chapter → Continue → epilogue pages. Chapters playable out of order; unsolved endings hidden (`docs/PLAYER-QA.md`) | Cases tab, desk hero | Play | `alibi-device` |
| **Curated collections** (inside the library) | Four 52-puzzle anthologies: **The Salt Observatory, The Copper Conservatory, The Nocturne Gallery, The Winter Post Office** (`content/curation/editorial/collections.json`). Also Night (48, 0.12.0), Vault (80, deferred chunk, 0.14.0), Keeper's picture studies, Expert, Master/Grandmaster studies and crime-scene variations | Library collection filter; desk "news" | Play | `alibi-device` |
| **The games room** (`#/salon`, alias `#/games`) | "AFTER HOURS · EXPERIMENTS", "Different rules. The same room to think." Offered: Lantern Duel, Tic-Tac-Toe, Lantern Gardens, Block Cabinet (plus the experimental Cascade surface), Pocket Borough, Archive Heist, and "The living atlas" (a Canvas harbour playground). Legacy, reachable but not discoverable: Dominoes, Mahjong (#196) (`src/club.js:596-607`) | Games tab, desk section 01, desk hero edition 4 | Club journal | `alibi-afterhours-v1`; Cascade separate |
| **Club journal** (`#/club`) | Personal bests, stamp book, daily seed; "No fabricated rivals, no vanishing streaks" | Sidebar, Games room panel | Salon | `alibi-afterhours-v1` |
| **Your journal** (`#/journal`) | "No league tables. Just the puzzles you've enjoyed…"; solved and in-progress counts | Sidebar bottom | Play | `alibi-device` |
| **The quiet wing** (`#/quiet/<tab>`) | A lazy **Shadow-DOM app within the app** (#62). Its own header: `alibi:`, "AFTER HOURS / A PLACE OF YOUR OWN", "The quiet wing", with its own sound, fullscreen and theme buttons. Its own tab rail: Realm, Companions, Garden, Classics, Challenges, Art room, Journal, Field notes, and "← Puzzle cabinet" (`src/quiet-wing/app.js:231-250`). Realm heading: "01 / THE REALM STUDIO", "Make a little somewhere." (screenshot 20). No mobile tab | Sidebar; Settings "Quiet Wing recovery" | "← Puzzle cabinet"; `#/home` | `alibi-quiet-wing-v1`; pack about 2.30 MB |
| **Field notes** (`#/quiet/folio`) | Asset library as an experience: 3 realm scenes, 43 modules, 32 companion expressions, 24 sounds, 8 films, 10 editorial images, 6 fictional club portraits. Separate explicit offline copy of 7,393,439 bytes (`docs/EXPERIENCE-INTEGRATION.md`, `docs/THEATRICAL-EDITION.md`) | Wing rail; theatre | | Its own media cache |
| **Wrenmere Castle** (`#/quiet/castle/{map,room/<id>,museum,journal,directory}`) | Chapter I, "The Seventeenth Minute". Details below | Castle tab, sidebar, `#/castle` | "Leave castle" → `#/home`; practice shelf → puzzle → back to the room | `alibi-castle-v1` |
| **Theatre / atmosphere** (`content/theatre.json`, `src/theatre.js`) | 8 "rooms" that dress the whole app (table in 2.6). Controls: Room sound, Still the room, Painted/Rich edition, "Notice a little detail", and a screening room with 4 films | Theatre bar on every page | | Preferences only |
| **The workshop** (`#/workshop`) | Local authoring: scene drafts, validation, uniqueness where supported, JSON pack export/import (bounded worker) | Sidebar bottom, Settings | | `alibi-device` custom packs |
| **Settings & saves / "Your space"** (`#/settings`, alias `#/space`) | "Make yourself comfortable / Your space." Appearance (Paper, Evening, System), Stronger contrast, Larger clue text, Reduce motion, timer, sound, haptics, assistance, Beta and privacy. Export of the cabinet, Club, Wing and castle stores; Club save; persistence; install; updates; issue report (`src/app.js:733`) | Space tab, top-bar gear | Workshop, Privacy | Writes all four stores |
| **Privacy & credits, About, What's new, `/login`** | Static pages. `/login` explains "No accounts here." (#279) | Footer | | |

**Castle internals.** Source: `src/castle/view.mjs:122-126`, `src/castle/pages.mjs:45-84`, `src/castle/exploration.mjs`, `docs/castle/README.md`, screenshots `02b`, `d03`.

- **Castle header:** eyebrow "ALIBI · COUNTRYSIDE ESTATE", title "Wrenmere Castle". Nav: Grounds, Museum, Notebook, Room directory, Preferences (button), Leave castle. A score "N / 100 points".
- **Grounds (map):**
  - Eyebrow "A house of unfinished questions · Chapter I", with "Step through a door. Handle a question. Follow what the house has kept."
  - Today / 1911 survey toggles; a range zoom of 100–175% plus Reset; an "All rooms" link.
  - Numbered pins 01–10 on a 1200×760 estate SVG, with the help line "Choose a door. Pan or zoom."
  - A selected-room rail; "A thread to follow"; then "The doors of Wrenmere", a long list of 10 room cards (the phone page is about 4,600 CSS px tall).
- **Room page:**
  - Heading, one ambience line, then an illustration (1000×660) with hotspots and a "Show inspectable objects" toggle.
  - A side rail with the room description, a status ("The door is open" or "clue required"), "Inspect the puzzle" and the room method in italics.
  - "From here": nearby doors.
- **Museum:** "The Museum of Questions", with 3 exhibits and "Mara's exhibition drawer".
- **Notebook:** 8 revisable hypotheses, collected records, and a comparison of 2–3 records.
- **Room directory:** 32 locations; 10 playable, 22 labelled planned.
- **Practice shelves:** 13 families mapped to rooms, 39 starter puzzles (`docs/castle/PRACTICE.md`).
- **Media and settings:** an optional 18 s captioned prologue film, and castle Preferences (story on/off, sound, motion).

**How players move** (as the code and docs describe):

- Everything is hash routes under one root router (`src/app.js`, `src/activities.js`).
- The Wing and the castle are lazy "activities" with mount/flush/dispose (`docs/QUIET-WING.md`).
- Return contexts:
  - castle practice → puzzle → the originating room control (#79);
  - library → puzzle → the same finder depth and focus (`docs/ux/MOBILE-COMPONENTS.md`).
- Casebook "Continue" chains chapters (`docs/PLAYER-QA.md`).
- The desk hero CTAs deep-link into casebooks or the salon (`src/club.js:53-100`).
- The "Castle" tab goes to `#/quiet/castle`. The castle's "Leave castle" returns to `#/home`, not to the Quiet Wing (`src/castle/view.mjs:124`).
- The world bible specifies three scales, **estate → room → object**, plus an always-available directory and direct catalogue access (`docs/castle/design/WORLD-BIBLE.md` "A persistent place").

**Separate device-local stores** (never combined atomically), per `docs/castle/README.md` and `src/app.js:733`:

- `alibi-device` v1 (cabinet)
- `alibi-afterhours-v1` (Club / Games room)
- `alibi-quiet-wing-v1`
- `alibi-castle-v1`
- per-challenge replays
- the Cascade store
- the house desk (session-only)

### 1.3 Content families and books

- **13 families** (`docs/PROJECT-MAP.md`):
  - Tidal bridges (Hashi), Crime scenes (Murdoku-like placement plus accusation), Alibi files (logic grid), Witness statements;
  - Picture logic (nonogram), Lanterns (Akari), Tents & trees, Aquariums, Signal paths (network rotation);
  - Number trails, Sudoku, Sun & moon (binary), Futoshiki.
- **Casebooks** (`content/casebooks.json`):
  - *The Last Light at Bellweather*: 6 continuous records.
  - *The unfinished invitation*: 8 continuous records.
  - *The Briar House papers*, *The midnight departure*, *Secrets under glass*: 4 each, standalone anthologies (#61).
- **Quiet Wing content:**
  - 13 classic configurations, drawn from Tower of Hanoi, queens, knight's tour, Fifteen, river crossing and Lo Shu (`src/quiet-wing/engine.js`).
  - Calm families: Tideglass colour-pouring and pair matching.
  - Garden species incl. Bluebell, Clover, Daisy, Lavender, Poppy, Sunflower.
  - Companions (`src/quiet-wing/pets.js`):

    | Name | Species |
    |---|---|
    | Miso | Library cat |
    | Fern | Woodland fox |
    | Pip | Little owl |
    | Nimbus | Cloud dragon |

  - Challenges: 59 original plus 36 added in 0.13.0 (`docs/CURATION.md`; `docs/STATE.md`).

---

## 2. Lore and world

### 2.1 Brand layer

- **Name and promise:**
  - `alibi:` (a lowercase wordmark with a brass colon), "A little room to think" (`src/app.js:482`; manifest name "Alibi · A little room to think").
  - The world bible keeps "A little room to think" as the intimate promise and "A house of unfinished questions" for the castle campaign (`docs/castle/design/WORLD-BIBLE.md`).
- **The club:**
  - "The Alibi Puzzle Club" with its "After Hours" edition (`src/club.js:504`).
  - Style rule: "The club is a place to notice things." (`assets-source/library/STYLE.md`).
  - The audio brief: "paper lamplight at a coastal club" (`docs/ASSET-AUDIO.md`).
- **Product lines** (`README.md`):
  - **The Cabinet**: the catalogue plus casebooks.
  - **The House**: Wrenmere, the Games Room, the Quiet Wing, gardens and companions.
  - **The Workshop**: authoring.

### 2.2 Wrenmere Castle (canon: `docs/castle/design/WORLD-BIBLE.md`, `STORY-BIBLE-SPOILERS.md`, `docs/castle/CHAPTERS.md`, `STRATEGY.md`)

- **Premise.** The visitor is a cataloguer helping a countryside castle reopen. Its collection spans recreational mathematics, mechanical toys, games, astronomical instruments and local records. The official history turns out to be "an arrangement".
- **Tragedy.** The curator **Mara Vale** died in the **1911 flood**. The public account blamed the clockmaker **Rowan Finch**, using a ticket read against a clock that ran 17 minutes fast. The player recovers "a more accurate account of a preventable failure". There are no ghosts and no murder twist (`STORY-BIBLE-SPOILERS.md`).
- **Cast:**
  - Mara Vale: curator, exhibition "Questions We Share".
  - Rowan Finch: clockmaker and instrument keeper.
  - Edmund Wren: chair of the trustees, who deferred repairs.
  - Iona Bell: housekeeper, who separates what she saw from what she heard.
  - Ada Vale: Mara's sister.
  - The present-day **keeper**: dry, not omniscient.
  - Voice guide (`docs/castle/WRITING.md`): "The keeper can be dry, Finch exact, Iona practical".
- **Chapters:**
  - I, *The Seventeenth Minute*: implemented. A 21:17 ticket; the clock is 17 min fast; a 7-minute route beats the 21:10 bell. Feasibility is not proof.
  - II, *The Missing Passage* (#53): spec only.
  - III–V (#54, #76–78): warning network, the crossing, the public account.
- **Six fundamentals** (world bible): a record is not its explanation; a useful answer may be a limit; changing representation changes the problem; revision is progress; play belongs to many histories; understanding should leave something worth caring for.
- **Structure:**
  - A persistent estate, "not a daily reset". It is explicitly contrasted with Blue Prince: borrow the layered discovery, not its floor plan.
  - Three navigation scales: estate, room, object. Atmospheric navigation "is an option, not a tax on returning to a Sudoku."
- **32 locations in wings** (world bible room atlas):

  | Wing | Locations |
  |---|---|
  | Threshold | Gatehouse |
  | Thinking wing | Long Library, Map Room, Keeper's Study, Knight's Chamber, Number Cabinet, Balancing Hall |
  | Upper castle | Observatory, Chapel of Echoes, Paper Theatre, Rookery |
  | Gardens | Glass Orangery, Yew Labyrinth, Old Orchard, Sundial Court |
  | Working rooms | Clockmaker's Workshop, Old Kitchens, Scullery, Dead Letter Office |
  | Social rooms | Portrait Gallery, Long Dining Room, Court of Testimony, Music Salon |
  | Below the castle | Flooded Archive, Cistern Vaults |
  | Beyond the walls | Seven-Arch Bridge, Boathouse |
  | Between rooms | Unrecorded Stair |
  | "The Quiet Wing" | Museum of Questions, Winter Conservatory, Model Village, Companion Hearth |

  Only 10 are playable.
- **Room grammar.** Each room needs an identity sentence, a material/light/sound, a family or theme, one practised method, a local question, a longer secret, a connection to another room, and accessible alternatives.
- **Wing moods** (world bible):
  - Upper castle: "quiet, exposed and cool", brass instruments.
  - Social rooms: warm upholstery, "uncomfortable absences".
  - Working rooms: valves, stamps, bell wires.
  - Gardens: breathing space and changes of scale.
  - Below ground: a shared waterline, harder to trust.
  - Quiet Wing: "warm without being sugary".
- **Material vocabulary** (`docs/castle/design/ART-AND-MOTION.md`): "wet slate, aged paper, worn oak, cold glass, oxidised copper and patient vegetation". The palette shifts by wing "without making every room a different product".
- **Family → room bindings** (`docs/castle/PRACTICE.md`):

  | Family | Room | Status |
  |---|---|---|
  | dossier | Long Library | playable |
  | binary | Observatory | playable |
  | lightup | Glass Orangery | playable |
  | network | Clockmaker's Workshop | playable |
  | trail | Map Room | playable |
  | witness | Keeper's Study | playable |
  | aquarium | Old Kitchens | planned |
  | bridges | Seven-Arch Bridge | planned |
  | futoshiki | Balancing Hall | planned |
  | nonogram | Portrait Gallery | planned |
  | scene | Long Dining Room | planned |
  | sudoku | Number Cabinet | planned |
  | tents | Old Orchard | planned |

- **Museum** (`docs/castle/design/MUSEUM-EDITORIAL.md`): the rhythm "handle, notice, learn, transfer". Visible labels: "documented object", "legend", "modern model", "original adaptation", "castle fiction". The three exhibits are Königsberg bridges, the Lo Shu square, and the Royal Game of Ur board and die (British Museum records; no photos shipped).
- **Deferred progression** (#29–#37, `docs/castle/DEFERRED-REWARDS.md`): companion roles (owl, fox, cat, Nimbus), seeds, building kits (e.g. "Under the Dome", brass/indigo), and bounded realm expansion. No XP, streaks or neglect penalties.

### 2.3 Casebook worlds (coastal and domestic, not castle)

- **Bellweather:** a storm, a tidal causeway, a lighthouse, a harbour master, a missing logbook. "The harbour master left a light on for you." (`src/club.js:62`).
- **The unfinished invitation** (`docs/cases/invitation.md`):
  - Setting: Pike & Tide, a coastal print shop, 2026.
  - Cast: Orrin Pike, Iona Reed, Celia Wren, Mara Voss, Elias Bell.
  - Eight timed records, 07:50–09:35.
- **Anthologies:** Briar House ("A stolen key. A silent house."), the Night Train ("A stopped clock. A lost signal."), the Glasshouse ("Follow the water. Turn on the lights.").

### 2.4 Games Room fiction

- Section labels: "AFTER HOURS · EXPERIMENTS", "A TABLE FOR TWO", "YOUR OWN MEASURE", "THE KEEPER'S NOTE", "THE TOWN PLANNER'S NOTE", "THE ARCHIVIST'S NOTE" (`src/club.js:594-795`).
- Archive Heist room 1 is "The receiving room", headed "One crate. A little room to think." (`src/club-engines.js:953-954`).
- Pocket Borough: "A small place by the water." Club portraits are "fictional adult archetypes" (`docs/ASSET-LIBRARY.md`).

### 2.5 Quiet Wing fiction

- Header: "AFTER HOURS / A PLACE OF YOUR OWN".
- Realm: "Make a little somewhere." and "Place a house. Grow a street. There is nothing to keep up with." (screenshot 20).
- Companion notes, e.g. Miso: "An expert on warm books and inconvenient naps." (`src/quiet-wing/pets.js`).
- The world bible's four jobs for the Wing: the museum, the reading room, the conservatory, the companion hearth.

### 2.6 The eight atmosphere "rooms" (`docs/THEATRICAL-EDITION.md`, `content/theatre.json`)

| Room | Art / weather | Serves |
|---|---|---|
| Lighthouse | Storm painting, rain | Bellweather, scene, witness |
| Under glass | Conservatory, pollen | Glasshouse, tents, lightup, nonogram, garden |
| Midnight line | Train, passing lights | Night Train, trail, network |
| Map room | Map, tide | Cartographer, bridges, aquarium, realm |
| Lamplight & paper | Reading room, dust | Sudoku, futoshiki, dossier, classics, challenges, journal, Field notes |
| Drawing room | Briar House, dust | Archive Heist, companions |
| Winter gallery | Hiroshige's *Kanbara*, snow | Binary, calm, gallery |
| Little harbour | Town painting, tide | Borough, city, atlas |

The theatre's "Map room" and "Lamplight & paper" coexist with the castle's own Map Room and Long Library.

### 2.7 Tone of voice: short in-app samples (12 words or fewer)

- Castle ambience (`src/castle/exploration.mjs`):
  - "Rain on slate. A lantern against wet stone."
  - "Copper instruments beneath the night sky."
  - "The chair by the glass is warm from the afternoon."
- Castle rooms (`src/castle/rooms.mjs`):
  - "Four letters came back unopened. One was never posted."
  - "Each valve has two labels. The older set was scratched into the stone."
- Castle methods: "Start with constraints, not guesses."; "Possibility is not proof. Keep the difference visible."
- Desk editions (`src/club.js:56-92`): "The light went out. The story didn't."; "Please do not water the evidence."
- Desk letter: "You don't have to solve everything." and "The kettle is on." (`src/club.js:504`).
- System copy:
  - "That door is not on the map." (`src/boot.js:45`)
  - "No account. No hurry." (`src/app.js:482`)
  - "No league tables." (`src/app.js`, journal)
- **Writing rules** (`docs/castle/WRITING.md`):
  - Literal interface labels ("Undo, Check, Open notebook").
  - Cut "ornamental oppositions, repeated three-part phrases" and the "not X, but Y" turn.
  - No long congratulations.
  - Clues state what can be observed, with units and uncertainty.

---

## 3. Current visual language

### 3.1 How the CSS is assembled

- **Main bundle.** One hashed file concatenates `app → cabinet → expedition → club → atmosphere → curation → after-hours → theatre` (`tools/build.cjs:163-178`). The 33 KiB gzip cap applies (5.1).
- **Separately built surfaces:**
  - Quiet Wing: `src/quiet-wing/style.css` + `folio.css`.
  - House desk: `src/house/style.css`.
  - Castle: Shadow-DOM CSS-in-JS in `src/castle/style.mjs` and `native-style.mjs`.
  - Block Cabinet motion CSS.
- **Theme switching.** JS sets `html[data-theme=night|light]`, `data-contrast`, `data-large` and `data-reduced`, and maps "System" through `matchMedia` (`src/app.js:216-228`).
  - There are no `prefers-color-scheme` or `prefers-contrast` media queries.
  - The Quiet Wing uses its own `.night`, `.contrast` and `.large` classes (`src/quiet-wing/app.js`).
  - The castle and the theatre rail are always dark.

### 3.2 Tokens actually in the CSS

**Light palette ("Paper").** `app.css:1-43` is overridden by `cabinet.css:2-14`, which is overridden again by `expedition.css:2-12`. The Bellweather "expedition" values therefore win globally:

| Var | app.css | cabinet.css | **Effective (expedition.css)** |
|---|---|---|---|
| --bg | #f5f4ef | #f2f3ef | **#f1eee7** |
| --paper | #fffefa | #ffffff | **#fffcf5** |
| --ink | #25372f | #203c3b | **#213c43** |
| --muted | #67726a | #596e6a | **#55666a** |
| --line | #dfe3d9 | #d7e1db | **#d9ddd6** |
| --green / -dark / -soft | #315b46 / #213f32 / #e6eee1 | #23594f / #17443d / #e3eee8 | **#235861 / #173f49 / #e2ece8** |
| --sidebar | #233c30 | #163837 | **#132f3a** (gradient `165deg,#183c48,#102730`) |
| --accent (brass) | #bb8746 | **#c29350** | |
| --radius | 18px | **16px** | |

**Tokens defined only in app.css:**

- Status and elevation: `--red #a34e43`, `--red-bg #f9e4df`, `--shadow 0 6px 26px #213f3209`.
- Radius steps: `--radius-sm/md/lg/pill` = 8/12/16/999.
- Room tints `--room-0…7`: #ece3d3 #dfe8d5 #e8d9d0 #dbe5eb #e8e1ed #e6e8cc #ebdbdd #d7e6df.
- Board tokens: `--board-border #819080`, `--cell #fbfbf5`, `--num #2d644a`, `--water #95c4d4`, `--wall #34473e`.
- Suspect colours `--person`: #456b52 #9a7352 #a16c60 #58758b #766b60 (`app.css:1838-1852`).

Source for all of the above: the CSS audit of the files listed.

**"Evening" (night)** (`app.css:3241-3267`):

- bg #19251f, paper #223128, ink #e0e6d8, muted #a4b29f, line #3d4c3d
- green #87ab83, green-dark #a0c094, green-soft #324936, red #eda28f, sidebar #142119
- board: cell #29362b, num #bbe0a6, water #467c92, wall #0f1a13
- It does **not** override `--accent` or `--shadow`.
- Plus about 20 hardcoded component overrides spread over app, cabinet, club, after-hours and theatre.

**Stronger contrast** (`app.css:3323-3333`): muted #414f43, line #a7b0a1, board-border #334333, num #135331. It has a night variant.

**Per-space palettes.** Four token systems with unrelated names, plus a castle with no tokens:

| Space | Source | Palette |
|---|---|---|
| Club | `club.css:41-47` | `--club-navy #173943`, `--club-ochre #b99050`, `--club-cream #f4efe3`, `--club-sage #899d89` (navy, cream and sage have **0 uses**) |
| After Hours | `after-hours.css:2-13` | `--club-brass #c49a55`, `--club-shadow 0 24px 70px rgba(20,42,42,.14)`. Paper gradient #f4f0e7→#eee8dc→#e9e3d8 with radial brass/teal glows; 1px paper grain and 28px ruled paper |
| Lantern Gardens | `club.css:2-9` | `--garden-0…6` pastels #edd2a3 #b6d4c2 #bbcde5 #d8bedd #efbfb4 #d4d8a9 #b7dadd |
| Theatre rail | `theatre.css:8-9, 380-392` | Rail #15333b with text #f1e5cb. Per-scene rails: glasshouse #213e37, night-train #202e3f, reading-room/Briar #343327, winter #293d49 |
| Quiet Wing | `quiet-wing/style.css:1-53` | paper #f6f3e9, cream #fffcf5, ink #304b4b, muted #72817a, line #dbddd0, green #466d5c, gold #bb9356, pale #e8ece1, red #a56354, radius 18px. Night: #243330 / #2f423e / #f2efe4 / gold #e5bd6d |
| House desk | `house/style.css:24-57` (`--hx-*`) | bg #f4f0e6, paper #fffcf4, ink/dark #203e37, muted #59685e, line #c7c6b5, accent #81552e, soft #e8eadc, light #f9edcc, radius 16px. Night: #14231f / #1d322a / #f1eddf / #e2bc85 |
| Castle | `src/castle/style.mjs`, `native-style.mjs` (`:host`, `color-scheme:dark`) | bg #172c2e, text #eee5cf, controls #244044, border #70817a, card #223b39, primary #d3b477, pressed #e3c48b, focus #f1c97c. Contrast → #102124 |
| Curation | `curation.css` | 30 `var()` uses, 1 literal hex. The best-tokenised file |
| Asset style guide | `assets-source/library/STYLE.md` | petrol #173e49, ink #172d38, paper #f4ead4, lamplight #dbac60, sage #87a997, terracotta #b76d52 |
| Brand chrome | `src/index.html:6`, `build.cjs:365-366` | `<meta theme-color #17343e>`, manifest `theme_color #294937` (forest) and `background_color #f5f4ef`. Three brand values, none equal to the effective `--bg` |

**Colour sprawl.** About 802 unique hex values across these files, most used once. Per file (distinct / total):

| File | Distinct / total |
|---|---|
| app.css | 200 / 216 |
| club.css | 188 / 242 |
| quiet-wing | 144 / 161 |
| theatre | 66 / 69 |
| castle style.mjs | 50 / 65 |
| house | 37 / 41 |
| curation | 1 / 1 |

Alpha notation is split: after-hours uses `rgba()` 86×; every other file uses 8-digit hex.

**Typography.**

- **Font files and stacks:**
  - There are no `@font-face` rules and no font files anywhere; there are no font preloads.
  - UI: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, 15px/1.55 (`app.css:63-67`); cabinet raises body text to 16px.
  - Display: `Georgia, 'Times New Roman', serif` for h1/h2 and `--club-serif` (33 uses).
  - Other stacks: `system-ui` (house, theatre, castle 16px/1.65); `ui-sans-serif…` in the Wing at 14px; `ui-monospace` once, at 9px.
  - STYLE.md: "existing serif headlines and system sans-serif controls".
- **Ramp tokens** (`app.css:21-28`; phone values at ≤600px, `:44-51`):

  | Token | Desktop / ≤600px | Uses |
  |---|---|---|
  | display | 44 / 40px | 0 |
  | h1 | 36 / 32px | 1 |
  | h2 | 28 / 25px | 4 |
  | h3 | 22 / 20px | 6 |
  | body / meta / eyebrow | 16 / 13 / 11px | 0 |

  The base `h1 43px`, `h2 29px`, `h3 16px` rules (`app.css:125-137`) ignore the ramp.
- **Actual sizes:** 938 font-size declarations with 96 distinct values.
  - Most common: 11px ×145, 10px ×137, 12px ×113, 9px ×86, 8px ×52, 13px ×40, 14px ×33, 7px ×17.
  - 443 declarations are ≤11px, including 7px eyebrows (`app.css:4626`; `club.css:2243-2249`). after-hours raises some of these to 11px.
  - 16 one-off `clamp()` values, e.g. `clamp(48px,10vw,86px)`.
- **Line-heights:** 1.7 ×33, 1.6 ×22, 1.8 ×14, plus 24 other values.
- **Weights:** 400, 500, 550, 600, 650, 700 and 300.
- **Letter-spacing:** 46 values, with club in px and the others in em. The five eyebrow recipes differ (10–11px, .15–.19em, weights 650/700).
- **Capitals:** Club types eyebrows in literal capitals in JS rather than using `text-transform` (`src/club.js:504`).

**Radii.**

- 288 declarations with 43 distinct values.
- Token uses: `--radius-md` ×52, `-sm` ×37, `-lg` ×12, `--radius` ×7, `-pill` ×5, `--hx-radius` ×5.
- Literals: 50% ×42, 5px ×16, 4px ×13, 3px ×11, 10px ×9, 18px ×8, 20px ×5, 30px ×3, etc.
- 14 asymmetric shapes, e.g. the case-file card `5px 14px 14px 5px` and arches `120px 120px 8px 8px`.
- Distinct values per file: Quiet Wing 22, app 15, club and house 11.
- The castle uses 6/9/14/8/5px and 50%.
- #220's four-token plan covers the rest (4.2).

**Spacing and layout.**

- There are no spacing tokens. `gap` has 45 distinct values, `padding` 234, `margin` 109. Every integer 1–38px is used, so there is no 4/8 grid.
- **Containers:** main 1520 → 1460 → 1390px; playing 1330 (970 at ≤1050); Zen 1100 !important; Wing 1600; house 1160; castle 1150; reading measures 25–80ch.
- **Breakpoints:** 30 distinct media queries.
  - max-width: 1250 … 359.
  - min-width: 761, 1100, 1440, 1550, 1600.
  - Three short-landscape queries.
  - The castle uses its own 850 and 480.
- **Safe-area insets:** app 3× and house 4× (e.g. mobile nav, `app.css:3656-3669`).

**Shadows, borders, texture.**

- **Shadows:**
  - Tokens `--shadow`, `--club-shadow` and `--club-soft-shadow`.
  - Distinct box-shadows: app 13, club 21, after-hours 24, Wing 10.
  - Three idioms: soft elevation (`0 28px 100px #122b2b33`); Club's hard "stamped" offsets (`0 6px 0 #294d50, 0 12px 17px #17383e18`); After Hours brass glow rings (`0 0 0 4px rgba(196,154,85,.12)`).
- **Borders:** `1px solid` ×209, 2px ×20, dashed ×10, 3px ×7, plus one `3px double`. 109 use `var(--line)` and 122 use literal hex.
- **Textures, all CSS gradients (zero `url()` images in CSS):**
  - ruled notebook lines (`app.css:2179`), paper grain and ruled paper (after-hours);
  - a hero scanline with `mix-blend-mode:screen`;
  - hatching and stripes (club); wood rings and hatching (Wing).
- **Effects:** backdrop blur of 3–12px on dialogs, toasts, the mobile nav and pills.

**Motion.**

- **Keyframes:**
  - `spin` (app)
  - `club-lamp-breathe` 4.8s infinite (after-hours)
  - `room-rain`, `room-drift`, `room-track`, `room-tide` 7s, `room-breathe` 12s, `room-notice` 2.4s (theatre)
  - pet/realm: `breathe`, `headbob`, `tail`, `blink`, `hearts`, `hop`, `nuzzle`, `placed-glow` (Wing)
  - `arrive` .22s (castle)
- **Transitions:** 39, mostly 0.12–0.3s `ease`, plus two near-identical curves `cubic-bezier(.2,.65,.25,1)` and `(.2,.7,.25,1)`. There are no motion tokens.
- **Reduced motion** disables all animation and transition, including pseudo-elements, under `data-reduced` (`app.css:3350-3363`), and also via the media query. Per-space equivalents: after-hours 541-611, club 2838-2848, theatre 394-475 (particles hidden), Wing `.reduce` / `.hidden-tab`, folio 332, house 1189-1201, castle `:host([data-reduced=true])`.
- **Direction rules:**
  - STYLE.md: "slow settles, brief anticipation, no incessant celebration".
  - Castle (`ART-AND-MOTION.md`): "The first invitation may be cinematic. Routine navigation should be short. Puzzle solving should be stable."
  - No dust, parallax or video behind dense clues (world bible).

**Accessibility CSS.**

- **Targets:** there are 44px sizes in most files and 48px in house (16×). Sub-44 min-heights (30–43px) survive: app 23×, club 29×, Wing 10×. Examples: `.btn.small` 38px, `.round` 42px (raised to 44 in cabinet), and Wing `button` 42px.
- **Focus rings:** 8 different recipes. Examples: app 3px #b48c45 offset 4; Wing 3px #bc9656; house 3px #a05928; castle 3px #f1c97c; club cells 3px #b67854 offset −5.
- **Large text:** only +1px in the main app (17px vs cabinet's 16; clues to 18px). House 15→18, Wing 14→16, castle 16→19.
- **Forced colors:** handled in 3 places (nonogram crosses, toggle switch, house).

### 3.3 Themes and chrome

- **Settings theme options:** Paper, Evening, System (`src/app.js:733`).
- **Visual register by surface:**
  - Main pages: cream paper and teal.
  - Theatre rail: dark per scene.
  - House desk: cream with forest cards and cream CTAs (screenshot 21).
  - Quiet Wing: cream with sage-green primaries (screenshot 20).
  - Castle: always dark teal with brass controls (screenshots 02b, d03).
  - Desk hero: dark photo card with a cream pill CTA and "A CLUB" wax-seal roundel (screenshot 01).
- **Wordmark:** `alibi:` in Georgia with a brass colon. The house variant adds a "WRENMERE" subline.

### 3.4 Icon style

- **UI icons** are inline SVG generated in JS: 24×24, stroke-only, `currentColor`, round caps.
  - Main: stroke 1.6 at 20px (`src/presentation.js:341`).
  - House: 22px, with 15 named glyphs (desk, grid, house, notebook, controls, arrow, check, mail, sun, moon, search, close, key, scene, bridge) (`src/house/components.js`; `docs/ux/ASSETS.md`).
  - Wing: stroke 1.5 (`src/quiet-wing/app.js:70-89`).
  - The main nav reuses `home` for both Desk and Castle, and `sun` for the Games room.
- **No emoji.** Unicode glyphs serve as board marks (× ●) and CSS content (✓ ◇ − · +).
- **Install icon:** a dark forest square with a cream rounded tile split into four pastel panels (sage, sand, blush, pale blue) and two green ring markers. It shows a puzzle board, with no castle or gate motif (`src/icons/icon-192.png`, viewed).
- **Family/place illustrations** (`src/illustrations/*.svg`, 22 files, about 85 hexes):
  - 10 flat isometric place vignettes (160×130; e.g. `cafe.svg` is a toy house with a striped awning).
  - 12 puzzle-card arts (320×180): pastel ground with a mini board.
- **Stamps:** 31 earned/locked silhouettes on a 100-unit medallion-and-ribbon master (`docs/ASSET-LIBRARY.md`).

### 3.5 Art, media and sound available, with provenance and licence constraints

| Asset set | Location | Style | Provenance / licence |
|---|---|---|---|
| 7 casebook/desk covers (Briar House, night train, glasshouse, Bellweather, evidence, cartographer, quiet town) | `src/artwork/*.webp`, 1024×683, 418,376 B total | Textured gouache; "deep ink/petrol blue, warm amber light; no people, lettering or logos" (the Bellweather lighthouse was viewed: painterly storm, amber beacon) | OpenAI image generation 2026-09-08 (`docs/ASSETS.md`). Original project work with **no reuse licence granted** (`NOTICE.md`; HUMAN_TODO q-1 open; PR #396 proposes a licence) |
| 3 editorial room paintings (coastal light, conservatory study, reading room) + 12 "highlight" vignettes | `src/artwork/`, `assets-source/atmosphere/` | Illustrated rooms; editorial SVG vignettes: "cut-paper silhouettes, restrained stipple", "no lettering, grids, numbers" | Original local production (`docs/ASSET-LIBRARY.md`, `assets-source/library/STYLE.md`) |
| 5 photos (lighthouse, glasshouse, train, cartographer, listening room) | Optional enhanced delivery; same-origin mirrors | Stock photography | Pexels/Unsplash licences checked 2026-09-09 (`docs/ONLINE-ASSETS.md`). Loaded from images.pexels.com / images.unsplash.com (CSP allow-list) |
| Museum works | `src/quiet-wing/assets/museum/` (AIC: Hokusai *Great Wave*, Van Gogh *Self-Portrait* and *The Bedroom*, Seurat *La Grande Jatte*); `src/curation-assets/museum/` (Met: Hiroshige *Kanbara*, Van Gogh *Irises*, Dürer *Melencolia*, a celestial work) | Masterpieces as museum interludes | Public-domain API records with hashes (`rights.json`; `docs/QUIET-WING.md`, `docs/QUIET-WING-EXPANSION.md`) |
| Castle scenes: 2 estate eras + 10 rooms | `assets-source/castle/rooms/*.svg`, 137,225 B delivered (180 KiB cap) | Flat vector. The estate is a moonlit teal/green night castle with amber windows, a glasshouse and a river. Rooms are dim olive/stone interiors, e.g. the gatehouse door with three brass wheels (both viewed) | Original proposal material; no third-party art or fonts (`docs/castle/ASSETS.md`, `assets-source/castle/NOTICE.md`). #46 wants bespoke layered paintings (open) |
| Wrenmere prologue | `assets-source/castle/prologue/`: 828,098 B MP4, poster, VTT, transcript | 18 s silent, captioned mood film, 1280×720 | Original; on-demand only (`docs/castle/design/ART-AND-MOTION.md`) |
| House engravings | `src/house/components.js` | Line engravings (Study, Library, Map Room) | Original in-code SVG (`docs/ux/ASSETS.md`) |
| 8 theatre emblems + 6 CSS weathers | `src/theatre.*` | Line emblems; particle weather | Original (`docs/THEATRICAL-EDITION.md`) |
| 3D realm kit | `src/quiet-wing/assets/*.json`, `assets-source/quiet-wing/city/` | Low-poly isometric town; Three.js renderer | 24 Kenney CC0 modules plus 16 original; Kenney keeper sprite CC0 (`docs/quiet-wing/NOTICE.md`, `KENNEY-CASTLE-LICENSE.txt`) |
| Companions | `src/quiet-wing/pets.js`, `pet-view.js` | Rounded layered vectors plus animated 3D portraits; 8 expression states each | Original; licensed cat/fox/owl skeletons (`docs/QUIET-WING-EXPANSION.md`) |
| Audio | `assets-source/library/audio/` (20 cues + 4 loops), `assets-source/ambience/` | "felted wood, restrained plucks, rounded bells, air and water" | Locally synthesised originals (`docs/ASSET-AUDIO.md`). CC0 window-rain and beach-wave recordings, about 220 KiB, opt-in (CHANGELOG 0.11.0). The owner disliked the earlier procedural ambience |
| Films | Field notes: 8 HyperFrames cuts; screening room 4 | Motion studies | Original; GSAP licence file retained (`assets-source/library/motion/library/gsap-license.txt`) |
| Rejected / not shipped | Unsplash library photo shortlist | | Researched only (`docs/ux/ASSETS.md`) |

**Constraints for new art:**

- **Required clues must be authored text or overlays.** "Never rely on generated text, numbers, labels or maps being correct" (`ART-AND-MOTION.md`; #46).
- **Every asset needs a source, licence and hash record** before delivery (`docs/castle/ASSETS.md`).
- **No paid generation or purchases** (#43).
- **Crop safety:** keep central subjects in the middle 70% for mobile crops (STYLE.md).
- **Theme conflict:** the castle art direction's 1911 flood and memorial themes need restraint, e.g. "No graphic scene" in the film briefs.

### 3.6 Composition patterns seen in screenshots

- **Desk (phone, `alibi-qa/castle/shots/01-phone-home.png`),** top to bottom:
  1. A 3-button header.
  2. The dark theatre bar with "Room settings".
  3. "Try the Wrenmere desk".
  4. Two eyebrows.
  5. The H1.
  6. A photo hero taking the full viewport.
  7. The 6-tab nav.

  No puzzle is visible above the fold.
- **Castle landing (phone, `02b`):** the page stacks the theatre bar, castle header, score, zoom row, a small map with overlapping numbered pins, a room rail, "A thread to follow", then 10 full room cards.
- **Castle room (desktop, `d03`):** the theatre bar, castle header and room title bar are stacked above the illustration, and the room's description is repeated in both the title bar and the side rail.
- **Quiet Wing (phone, `20`):** the theatre bar sits above the Wing header, then an 8-item scroll rail with wrapped labels ("Compan/ions", "Challeng/es").

---

## 4. Known UX/design problems already recorded (with status)

### 4.1 Navigation and information architecture

| Problem | Source | Status |
|---|---|---|
| Six mobile tabs wrap ("Games room"); Castle and Desk share an icon; "consider 4–5 primary tabs" | #222 | Closed 09-22 (short labels); the icon overlap remains in `src/app.js:487-495` |
| Visible labels don't match routes (`#/salon`, `#/settings`, `#/quiet`) | #224 | Closed; aliases added |
| Path routes `/about` and `/login` hit not-found | #213, #279 | Closed |
| Screen readers heard "The games roomNEW"; counts and badges are visual noise | #210 | Closed (names separated); badges still render |
| The Quiet Wing is an app-within-app (own header, rail, settings, return link, shadow root) | #62, #36, #37 | #62 closed (focus). A duplicate settings surface persists; #37 (mirror preferences across activities) is open |
| Castle estate plan: floor/wing views, a phone selected-room panel, "do not shrink … into tiny tappable dots", a 32-room atlas | #45 | Closed (auto-closed by PR #206, whose comment says it "intentionally leaves #45 open"); floor/wing views are not built |
| Inspectable objects: close-up art and zoom/pan remain | #47 | Open |
| Notebook needs "a readable ordered outline instead of a tiny desktop canvas" on narrow screens | #51 | Open |
| First-visit castle human test (find a room, begin, ask for help, return, inspect, museum) | #56, HUMAN_TODO q-7 | Open, **never run**: no human evidence yet on castle confusion |
| Wrenmere Desk as the default mobile home needs an owner decision | ROADMAP Horizon C | Open; opt-in since 0.11.2 |
| Routing and path policy | `docs/ux/MOBILE-QA-2026-09-21.md` "Not covered" | Deferred |

### 4.2 Visual system

| Problem | Source | Status |
|---|---|---|
| Umbrella tracker verdicts: "high" risk for phone play; the design pack is "Beautiful atmosphere; weak tokens" | #218 | Open (findings #208–#217 closed via PRs #227, #228, #287; follow-ups #276–#279 closed) |
| Type scale: the desk h2 (44.6px) exceeded the h1 (40.3px); about 16 ad-hoc display sizes (58→19px), all Georgia. Proposed 7 steps: display 44, h1 36, h2 28, h3 22, body 16, meta 13, eyebrow 11 | #219; `docs/ux/TYPOGRAPHY-2026-09-21.md` | Open. The inversion is fixed (h1/h2 now 36/28 desktop, 32/25 at 390px, PR #353). Adoption: **12 `var(--text-*)` uses vs about 40 ad-hoc px sizes (6–58px) and 13 `clamp()` rules across 8 stylesheets** |
| Radius: 18 live radii collapse to sm 8 / md 12 / lg 16 / pill 999. 56 declarations mapped (owner-approved slice) | #220; `docs/STATE.md` 2026-09-25 | Open. Awaiting owner visual approval on `--radius-xs` 4, `--radius-xl` 24 and a circle token. Still off-scale: 40 uses of 1–6px, 16 of 18–30px, 37 circles |
| Button sprawl: 14–20 styles on one screen; a 10px hero micro-button. Recipe: primary teal `#235861` ≥44px, paper secondary, text tertiary, 44×44 icon, separate nav | #221 | Closed 09-25 without an explanation. Desk hero actions were raised to 12px/44px (`docs/STATE.md` "Desk action sizing") |
| Edition eyebrow "AFTER HOURS / PREVIEW" rendered at 7–8px | #223 | Closed; 11px floor |
| Play chrome stack: the board started about 618px down on mobile ("main simplicity failure"); 0 islands visible at 320×568 | #218, #214, #277 | Closed (board-first, context disclosure) |
| Castle rooms must not be "interchangeable dark rooms with a different accent colour"; bespoke layered paintings are outstanding | #46 | Open |
| Material feedback for wood, glass, paper and brass | #48 | Open (generic opt-in feedback only) |
| Portraits and a voice pass for castle letters | #49 | Open |

### 4.3 Game-surface and tactile

- **#160 Block Cabinet phone-first rework** (open). Priority order: board, tray, selected piece, next legal action. Primary actions go in a reachable area. "make it stop flashing" became #203 (closed).
- **Physical tests (open):** #118 (Block Cabinet on physical Android), #13 (Quiet Wing pinch/pan/TalkBack), #2 (Android acceptance).
- **Closed accessibility fixes:**
  - Lantern Gardens targets were about 36px at 320px (#100).
  - Switches were 36×21 (#216).
  - Icons were 33×33 (#217).
  - Targets were 31–34px (#215).
  - A Cabinet back target was 27px (#278).
- **Restart vs new-game wording** unified to "Start again" vs "New game / new seed" (#159, closed). Duel strengths and a fresh Block Cabinet seed on restart (#347, open).
- **Usage-sharing control:** first floated as a popup, then read "as a cookie notice"; it moved into Settings (`docs/STATE.md` hotfix; owner report "can't find the setting").

---

## 5. Technical constraints a redesign must respect

### 5.1 Offline PWA and byte budgets

Enforced in `tests/budget.test.cjs` (run by `npm test` / `npm run verify`), in `tools/build-castle.cjs`, and by the house pack checks. Measured values are from the local `build-info.json` (build `e6f71ff5cdfa`); the CSS figure is a local gzip of `dist/assets/alibi.340d95f030c1.css`.

| Budget | Limit | Measured | Headroom |
|---|---|---|---|
| Main CSS `alibi.*.css` gzip | < 33 KiB + 256 = 34,048 B | 33,999 B | **49 B** |
| Application JS gzip | < 127 KiB + 1,024 = 131,072 B | 130,955 B | **117 B** |
| Initial code + official data gzip | < 200 KiB = 204,800 B | 201,554 B | 3,246 B |
| Precached shell excl. official content | < 1.32 MiB | about 1,315,906 B | about 68 KB |
| Total core offline | < 2.3 MiB | about 1,966,604 B | about 445 KB |
| Official content | < 1 MiB | 650,698 B | |
| Deferred official defs gzip | < 12 KiB | 8,669 B | |
| Platform gzip | < 6 KiB | 5,092 B | |
| `club-engines.*` gzip | < 8 KiB | | |
| Quiet Wing optional pack | < 2,250 KiB = 2,304,000 B | 2,303,623 B | **377 B** |
| Castle script / scenes / film | 96 KiB / 180 KiB / 1 MiB (`tools/build-castle.cjs:21-23`) | 69,015 B script; 137,225 B scenes; 828,098 B film (`docs/castle/ASSETS.md`) | |
| House desk pack | < 60 KiB raw, < 18 KiB gzip (`docs/ux/ASSETS.md`) | 47,889 B raw; 11,177 + 4,405 gzip | |

Consequences for the redesign:

- **Any new CSS or JS in the core must be offset by removals.** Budgets have been raised only with measured justifications (the budget test comments).
- Optional packs (Quiet Wing, castle, house desk, Field notes, films, enhanced images) are lazy, separately cached, and "retain the current and one previous pack".
- Films never precache or autoplay (`docs/ASSET-DELIVERY.md`, `docs/THEATRICAL-EDITION.md`).
- The complete compact artwork must remain usable offline. Enhanced images upgrade only after hash, MIME and decode validation (`docs/ASSET-DELIVERY.md`).

### 5.2 Fonts, scripts, CSP

- No remote fonts, scripts, or third-party runtime libraries. No font files are bundled; system stacks only (`NOTICE.md`, `docs/SECURITY-AND-PRIVACY.md`, `docs/castle/design/QA.md`).
- The CSP (`dist/_headers`, generated in `tools/build.cjs:383,442`) contains:
  - `default-src 'self'`
  - `script-src 'self'` plus hashes
  - `style-src 'self' 'unsafe-inline'`, allowed because boards use per-cell inline geometry and colour
  - `img-src 'self' data: blob:`
  - `connect-src`: self, images.pexels.com, images.unsplash.com and the Pulseboard collector
  - `worker-src 'self' blob:`, `object-src 'none'`, `frame-ancestors 'none'`
- There is no `font-src`, so it falls back to `default-src 'self'`. Any webfont would have to be self-hosted and paid for inside the byte budgets above.
- The Sites fallback origin lacks the HTTP CSP (#6). PR #396 proposes retiring Sites.

### 5.3 Accessibility commitments (as documented; physical certification is still open)

- **Touch targets:**
  - At least 44px for header, player and close controls (`docs/ux/MOBILE-QA-2026-09-21.md`; CHANGELOG 0.11.5).
  - House desk primary controls are ≥48px high; dock targets ≥44×48; inputs use 16px text (`docs/ux/MOBILE-COMPONENTS.md`).
  - STYLE.md: "Use at least 44px touch targets and visible keyboard focus."
- **Comfort settings** (`src/app.js:733`): Stronger contrast, Larger clue text, Reduce motion, and Evening/System theme. Forced colours and night/contrast/large-text are tested in the house suites.
- **How the settings are applied:** as `data-*` attributes, not via `prefers-contrast` media queries (3.1).
- **Large text is weak in the main app.** It adds only +1px to body text (3.2).
- **Focus rings** use 8 recipes (3.2). A redesign should unify them without losing visible focus.
- **Reduced motion:** stops decorative motion, room audio and Wing ambient loops. Wing rendering also pauses when hidden or after "eight consecutive frames taking over 50 ms" (`docs/QUIET-WING-EXPANSION.md`, `docs/THEATRICAL-EDITION.md`).
- **Sound:** off by default on every new document (`docs/THEATRICAL-EDITION.md`). Haptics are optional and never the sole channel (world bible).
- **Castle** (`docs/castle/design/WORLD-BIBLE.md`, `docs/castle/README.md`): no precision pixel hunts. Every hotspot has a named-control equivalent, plus a directory and an "objects in this room" list. The map and room illustrations are never the only path.
- **Test widths** (`tests/browser_mobile_qa.py`): 320×568, 360×800, 390×844, 430×932 and 844×390, plus 768 and 1440. The Capacitor floor is 320 dp with 200% text scaling (`docs/capacitor/NATIVE-UX.md`).
- **Not established:** TalkBack, physical Android, large system text and safe areas all remain open (HUMAN_TODO q-2, q-4, q-7, q-8; #2, #13, #56, #118). There is no WCAG conformance claim.

### 5.4 Android / Capacitor

Program #120 with work packages #123–#136; `docs/capacitor/README.md`.

- **Build model:**
  - One shared web UI, bundled at `https://localhost`.
  - No service worker and no OTA updates in Android.
  - No telemetry, accounts, ads or billing.
- **Preview status:** the CAP04 non-publishable preview APK (`example.unapproved.alibi.preview`) exists.
- **CAP-08 (#130):** a single back-button coordinator (gesture → modal → sheet → route → system) and a single safe-area inset owner via `var(--safe-area-inset-*, env(...))`.
- **CAP-09 (#131):** a benchmark set of Block Cabinet, a large Nonogram, a castle room with media, and a dense realm.
- **Proposed targets:** p95 touch acknowledgement under 50 ms; cold launch under 3 s; no idle animation loop; a 50 MiB first-review download threshold (`docs/capacitor/ASSETS-AND-UPDATES.md`).

### 5.5 Save and ID preservation

- Preserve published puzzle IDs and revisions and `content/legacy.json`. Saved runs pin their definitions (`AGENTS.md`).
- Keep the `alibi-device` DB at version 1. The app version, puzzle revision and build hash stay distinct.
- Never clear unknown saves. Never activate updates mid-game. A dirty castle notebook blocks updates until it is exported (`docs/castle/README.md`).
- Each store restores separately, never as one transaction.
- The Cloudflare and Sites origins keep separate saves; there is no silent migration (`docs/DEPLOYMENT.md`, `docs/AFTER-HOURS-MAP.md`).
- **A rename to Postern must not change the DB names** (`alibi-*`), the cache prefixes (`alibi-shell-*`, `alibi-quiet-wing-pack-*`) or the origins without a migration. The manifest `id` is `./`.

### 5.6 Deferred chunks and ownership seams

- Script order: boot → official content → application → motion loader (`docs/ux/DELIVERY-REVIEW.md`).
- Separately hashed deferred assets: the Pulseboard SDK, discovery storage, deferred official definitions (precached), the block-motion loader, and the validator worker.
- The Wing, castle and house activities mount in the root via `src/activities.js`; "only one authority should handle navigation" (`docs/castle/design/INTEGRATION.md`).
- **Owner guidance** (`AGENTS.md`): "Keep tooling small: no speculative MCP servers, command-deny hooks, accounts or native wrappers." Reasoning hints must not read `solution`.

---

## 6. Player evidence

- **Two real players "loved it"** (owner report, 2026-09-09; `HUMAN_TODO.md`, `docs/PLAYER-QA.md`). They wanted more and larger Sun & Moon boards, family collections, narrative chapter pages, completed-digit feedback, and cell candidates and exclusions. All were delivered in 0.8.x.
- **Elena's playtest** (2026-09-09; `docs/PLAYER-FEEDBACK-2026-09.md`):
  - Inconsistent solved counts across the library, journal, desk and casebooks.
  - Crime-scene input friction (tap cycling and holds were requested).
  - Nonogram auto-cross.
  - Larger and harder puzzles (15×15 Nonogram; Sudoku variants).
  - **First-screen hierarchy:** the Winter Gallery sound/motion/edition controls were too prominent, and the Screening Room should be demoted.
  - **Disliked the procedural ambience.** She wanted rain/waves, replaced by opt-in CC0 recordings.
  - **Recognizable thumbnails:** identify a family before reading its title.
  - Longer continuous cases.
  - Games Room requests: tic-tac-toe, a Block Blast-like game, Mahjong, dominoes, and a Mewdoku-like region game.
  - Dominoes and Mahjong were later retired from discovery at the owner's request (#196).
- **QA author issues #208–#218** (2026-09-21): phone play is "high" risk; the board sits below the fold; targets are 31–36px; the h1/h2 inversion; 7–8px eyebrows; label/route mismatch. Verdict: "Beautiful atmosphere; weak tokens" (#218).
- **Block Cabinet player:** it "needs a full UX review"; "make it stop flashing" (#160, #203).
- **Owner reports:**
  - "can't find the setting" for usage sharing (`docs/STATE.md`).
  - Repeated post-completion freezes of *The last service* on a physical Android phone. The trigger is unconfirmed (#11, HUMAN_TODO q-2).
  - The current feel is "incomplete" and the castle is confusing (this brief).
- **Not yet gathered:** first-visit castle playtests (#56, q-7), difficulty calibration (q-6, q-8), audio comfort (q-4). Nothing records whether players understand the castle's inference chain or can find their way back.
- **Pending feedback channel:** owner decision 2026-09-27 to send feedback and surveys to Pulseboard (`alibi-qa/specs/VOICES.md`; PR #396 references it). #380 (in-app feedback) is open.

---

## 7. Open questions and contradictions

1. **Competing metaphors.**
   - Home and puzzles: "Your desk", the "puzzle club" breadcrumb, the "original **cabinet**", "Curation **Cabinet**", "Block **Cabinet**", "The Number **Cabinet**" (castle room), "The artist's **cabinet**" (asset library), and product line "The Cabinet".
   - **Club and After Hours:** the Games room lives at the `salon` route; "Club journal" and "Club save" both exist.
   - **House:** product line "The House", `?ux=house` "Wrenmere Desk" with a "House" tab, and the Briar House casebook.
   - **Castle / estate:** Wrenmere.
   - **Wing:** the Quiet Wing, which is also a wing *inside* the castle.
   - **Harbour/coast:** the living atlas, Little harbour, Pocket Borough, Bellweather, Pike & Tide, and a "coastal club" audio brief.
   - **Theatre:** eight atmosphere "rooms" plus a screening room.
   - **Museum:** the Museum of Questions, the Art room, Winter gallery, and curation museum images.
   - The redesign brief must choose which of these survive as rooms of one castle.
2. **Hierarchy inversion.**
   - The code nests the castle under the Wing (`#/quiet/castle`), but the world bible places the Quiet Wing inside the castle (Museum of Questions and Winter Conservatory are "The Quiet Wing" wing).
   - "Leave castle" goes to `#/home`, while the Wing's rail says "← Puzzle cabinet".
3. **Four journals or notebooks:** Your journal, Club journal, Quiet Wing Journal, Castle notebook. There is also Field notes (`src/app.js:482`, `src/quiet-wing/app.js:231-238`, `src/castle/pages.mjs:71`).
4. **Five settings surfaces:** Settings/"Your space", the theatre "Room settings", Quiet Wing settings, castle Preferences, and the house "Comfort". #36 and #37 already document conflicts.
5. **Three competing "rooms" systems:** theatre atmosphere rooms (8), castle rooms (32), and the Games "room"/Art room. The theatre's "Map room" and "Lamplight & paper" duplicate the castle's Map Room and Library, and a theatre bar sits above the castle header (screenshots 02b, d03).
6. **Two competing mobile homes:** the classic 6-tab nav (Desk, Puzzles, Cases, Games, Space, Castle) and the house dock (Desk, Puzzles, House, Notes, Comfort). Horizon C asks for an owner decision on the default (`ROADMAP.md`).
7. **Palette identity conflict:**
   - `index.html` theme-color `#17343e`.
   - Manifest `theme_color #294937` (forest) and `background_color #f5f4ef`.
   - The effective `--bg` is `#f1eee7`, via the expedition override (3.2).
   - STYLE.md: petrol `#173e49`, ink `#172d38`, paper `#f4ead4`, lamplight `#dbac60`, sage `#87a997`, terracotta `#b76d52`.
   - #221 primary teal `#235861`; house `--hx-*` "paper/forest/brass"; castle SVGs in olive/sand/stone.
   - #219's brief assumed "cream/teal/brass, Georgia + system UI" stays. A Postern redesign may reopen that.
8. **Art-style fragmentation**, with at least seven idioms side by side:
   - AI gouache paintings;
   - stock photos (Unsplash/Pexels);
   - museum masterpieces (Van Gogh, Seurat, Hokusai, Hiroshige, Dürer);
   - flat vector castle scenes;
   - flat isometric toy motifs (`src/illustrations/`);
   - line engravings (house);
   - Kenney low-poly 3D.
   - #46 wants bespoke layered castle paintings; STYLE.md says gouache is the "large-cover medium" and vignettes are "cut-paper silhouettes".
9. **Setting conflict:** the castle is a "countryside estate" by a river; the club, casebooks and audio are coastal. The desk tagline "A fictional forecast. A real place to think." adds a third, weather-desk frame.
10. **Tone conflict:** WRITING.md bans ornamental oppositions and slogan rhythms. The desk editions use them ("The light went out. The story didn't.", "The world is small. The possibilities aren't.") (`src/club.js:56-92`).
11. **Name collisions across fictions:**
    - Mara **Vale** (Wrenmere) vs Mara **Voss** (Invitation).
    - Iona **Bell** vs Iona **Reed**; Elias **Bell** vs Iona **Bell**.
    - Celia **Wren** / Edmund **Wren** / **Wren**mere.
    - "Bellweather" also names a garden item ("Little Bellweather", `src/quiet-wing/engine.js`).
    - A Postern world bible should decide whether these are one universe.
12. **Stale counts:** 324, 328, 361, 376, 382 and 510 appear across docs and issues (#212). The manifest says 510; `AGENTS.md` and README say 382. The castle directory promises 32 rooms but ships 10. Planned rooms are visible "so the owner can review scope", yet the world bible says a shipped campaign should hide them.
13. **Score vs philosophy:** the castle shows "0 / 100 points" in its header, while the design docs say points "cannot manufacture evidence" and warn against stacking economies (`PROGRESSION-AND-QUESTS.md`).
14. **Missing source doc:** the castle art direction cites "DESIGN.md" palette and system-font direction (`docs/castle/design/ART-AND-MOTION.md`). No DESIGN.md exists in the repo; it lived in the original supplied package.
15. **Closed-but-unfinished issues:** #45 (floor/wing views, atlas) and #30 were closed while their last comments say they stay open. #221 was closed without an explanation.
16. **Rename scope (unresolved):** "Postern" is only in open PR #396. q-3 (publisher/name) is open. Undecided:
    - whether "Wrenmere" survives as the castle's name;
    - whether "Alibi" survives as a sub-brand (e.g. the Alibi files family);
    - what happens to the wordmark colon, the manifest name and short_name, and the `alibi-*` storage identifiers.
17. **Evidence gap:** the castle's "confusing" navigation has no recorded human test (#56 never run). Any redesign claim that navigation is "fixed" needs that playtest.
18. **Budget reality:** 49 bytes of CSS headroom and 117 bytes of JS headroom mean a visual redesign is also a CSS consolidation project. The token work in #219–#221 is the existing path.
    - Consolidation has room to give: about 802 one-off hex values, 96 font sizes, 43 radii, 234 padding values, three stacked `:root` palettes, and four unrelated token namespaces (3.2).
    - Dead tokens exist: `--club-navy`, `--club-cream`, `--club-sage`, and four unused `--text-*` steps.
19. **Separately styled activities.** The Quiet Wing, castle and house desk are separately built and scoped (Shadow DOM, `--hx-*`, `:host`). A unified Postern look needs either shared tokens injected into each scope or duplicated values. Their optional-pack caps are separate from the core CSS cap (5.1).
