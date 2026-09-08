# 0.3.0 — Public puzzle cabinet (2026-09-08)

- Establish a public, maintainable repository from the 0.2.0 bundle with incremental import history.
- Add original illustrated casebook covers and readable phone-first navigation, controls and type.
- Explain board-based deductions for Sudoku, Futoshiki, Sun & moon and Picture logic.
- Make completed-record explanations available for every family, including full mystery evidence.
- Repair keyboard entry to boards starting with a wall, tree, furniture or locked tile.
- Reject malformed scene occupancy and unused extra-family notes during save validation.
- Quarantine malformed workshop drafts without deleting them; preserve structurally valid unfinished edits.
- Stop on blocked IndexedDB instead of creating a competing fallback store.
- Add real-origin save/offline/update acceptance, CI, repository guidance and portable release packaging.
- Preserve all 102 published puzzle IDs/revisions and the original forty compatibility fixtures.

Physical Android acceptance, human difficulty calibration and the source-license choice remain
explicitly recorded in HUMAN_TODO.md. This is a browser release, not an APK/store release.

# 0.2.0

40 to 102 puzzles. Five to twelve families. Eighteen original crime scenes, eight alibi logic-grid files, eight witness-statement mysteries, eight each of lanterns, tents, aquariums, signal paths and number trails, plus the original seven each of Sudoku, picture logic, binary logic and Futoshiki.

New desk, searchable/filterable collection, favourites, journal, daily catalogue selections, three four-chapter anthology casebooks, twelve hands-on lessons, clearer per-game modes and success/error explanations. Mobile contextual dock with evidence and notes drawers; keyboard controls, undo/redo, paint strokes, optional timer/audio/haptics, paper/evening themes, reduced motion and contrast/text preferences.

Visual scene workshop with generated drafts, room painting/renaming, furniture and clue editing, bounded uniqueness verification, local installation, JSON sharing and twelve-family pack examples. Imports remain data-only.

Preserved legacy puzzle definitions and IndexedDB identity. Saved definition snapshots, revision-aware continuation, queued compare-and-write saves, quarantine rather than deletion, backup export/atomic IndexedDB restoration and explicit offline update activation. Preferences are included in exported backups. Workshop drafts remain local until separately exported as verified packs.

Validation reports distinguish pure engine tests, actual isolated-browser controls, fallback storage contracts, simulated service-worker lifecycle and the still-pending hosted/Android acceptance layer.

