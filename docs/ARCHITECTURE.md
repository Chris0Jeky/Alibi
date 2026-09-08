# Architecture and invariants

## Deployment topology

```text
Original definitions + pure engines + UI + local storage adapter
                  | Node standard-library build
                  v
        Immutable, content-hashed static release
                  | browser upload or CLI
                  v
      Cloudflare static hosting, permanent HTTPS origin
                  |
                  v
 Browser / installed PWA
   UI -> pure reducer -> rule checker -> queued save
                  |                         |
                  |                         v
                  |                IndexedDB: alibi-device
                  |                runs / packs / meta
                  v
       Background validation worker

 Service worker -> application-file caches only
 Export/import  -> player-controlled JSON backups
```

No backend is necessary for the current offline game. No secret can be protected inside a static browser application. The solver and solutions are public by design; this is a private puzzle experience, not a trusted competitive scoring service.

## Module boundaries

Core and extra engine modules have no DOM/network dependency. Each registry entry exposes `initial(definition)`, `reduce(definition, state, action)`, `validate(definition, state)` and `complete(definition, state)`. Validation returns explanatory issues and cell indices when available. Reducers return new state and preserve fixed clues.

`AlibiCore.validateDefinition`, `validateState`, `validatePack` and `solve` are the runtime data contract. Solvers count up to two solutions by default, with a bounded search; two is enough to reject ambiguity. Imported packs are checked in a Blob worker with a 25-second overall timeout. A rejected or timed-out pack is not installed.

The UI orchestrator owns routing, selected tools, dialogs, history, timer state, pack installation and persistence. It uses delegated DOM events and rerenders the small current view while preserving appropriate focus/scroll positions. This keeps the distributed app simple but is not the final scalability boundary for hundreds of UI features. Split the player, workshop and settings controllers into separate modules before substantially expanding them. Do not replace the pure engines or save format as part of a cosmetic refactor.

Presentation metadata owns the instructional language, demonstrations, family labels and original SVG artwork. A new game family must supply a renderer and lesson, not only a solver. Decorative library artwork is not a preview of the answer.

## Catalogue identity

A puzzle has a stable `id` and positive integer `revision`. A run key is `id@revision`. Pack version, puzzle revision, application version, build hash and database schema version are different identifiers with different responsibilities.

Application 0.2.0 changes UI/engines. A build hash identifies the exact asset release. A puzzle revision changes the definition a new run should use. A pack version describes a collection release. Database version 1 describes its object-store structure. Do not advance all of these automatically together.

The original forty published definitions retain their IDs, revision numbers and original fields. Additive catalogue metadata describes grouping and time estimates. A saved run always carries its own full definition, so a player halfway through revision 1 does not receive revision 2's altered clue silently. Continue links include the revision. The library can start a separate run for the newer definition.

## Save transaction model

`runs` stores `{key, value: RunRecord}`. `packs` stores custom packs. `meta` stores settings, preferences, the current workshop draft and pre-restore recovery. IndexedDB identity is `alibi-device`, version 1, for upgrade continuity.

A run contains puzzle snapshot, engine state, undo/redo arrays, counters, elapsed seconds, a note, revision counter, updated timestamp and completion timestamps. Up to 80 history states are retained during play; imported compatible runs may contain up to 100. One paint stroke produces one undo entry, not an entry per cell. Hints are separate from counted solution reveals. Undoing a reveal does not make it un-used.

Writes are serialised by the application. A readwrite IndexedDB transaction compares the stored revision with the expected revision and either writes the next revision or aborts. BroadcastChannel informs other open tabs. A stale or conflicting writer stops accepting edits and offers export/reload rather than silently claiming success. Browser suspension can interrupt pending asynchronous work, so the UI saves on each action and on lifecycle events; no web app can promise that a final tap survives every sudden power loss.

If IndexedDB is unavailable, the app attempts localStorage, then session memory. These modes are labelled. localStorage has no equivalent multi-key atomic transaction and cannot honestly provide the IndexedDB cross-tab guarantee. Destructive restoration is refused in both fallbacks. Unknown-newer IndexedDB versions trigger a compatibility stop rather than an empty alternative save store. Invalid stored records are quarantined from active views but are not deleted; raw export retains the stored records.

## Backup and restore

Backup envelope is `format: alibi-backup`, `schemaVersion: 1`, with runs, custom packs, settings and optional preferences. The export also merges current in-memory runs so it can rescue a session that failed to persist. Exported JSON is not encrypted; treat it as personal data, especially notes. Workshop drafts are kept locally but are not included as unfinished drafts in general progress backups; export a verified draft as a pack for portable preservation.

Import validates all run snapshots/states and pack structures before offering actions. Add missing only preserves existing device runs; it is not a cell-by-cell merge. Replace asks for a second confirmation. The IndexedDB restore transaction retains a pre-restore copy while replacing runs/packs/settings. An export outside the browser is still the independent backup. Restoring an old backup cannot restore content it never contained.

A future cloud-sync service should authenticate each user, accept revision-conditional writes, enforce body limits and authorization, and return conflicts explicitly. Keep a local outbox and retry idempotently. Conflicting puzzle boards should remain two alternatives until resolved; combining two contradictory hypothesis grids is not a valid merge. Do not treat last-write-wins timestamps as a complete offline conflict strategy. No such server or sync flow exists in this release.

## Offline release coherence

Hashed JS/CSS and their matching shell are precached into `alibi-shell-BUILD`. Installation requires all shell resources; an interrupted install deletes only its incomplete release cache. A waiting worker activates only on the explicit update message. The initiating page saves, requests activation and reloads. Other open pages are not forcibly reloaded.

The active worker serves navigation from its own cached shell rather than mixing freshly downloaded HTML with earlier assets. It retains one earlier application cache as a compatibility cushion for an older open page's exact asset hashes. Non-GET, other-origin and `sw.js` requests are not intercepted. The worker never reads or deletes IndexedDB. New content becomes available with the new complete application build, not through a half-updated remote JSON request.

Retaining one previous cache is not indefinite compatibility for tabs left open through many releases. Ask long-lived tabs to update, and keep backward compatibility in the save model. A server rollback does not roll back IndexedDB or instantly replace every installed service worker. Prefer a forward repair that understands current saves; use the release checklist before a rollback.

## 0.3 reasoning and presentation

`src/insights.js` derives bounded deductions from current clues/entries for four families and computes completed-record explanations. It never consults stored solutions for reasoning hints; tests enforce this with a guarded solution property. These local deductions assume preceding entries are correct and are labeled accordingly.

Casebook covers are original local WebP assets, hashed with the release and included in the offline shell and standalone preview. `src/cabinet.css` extends the base board stylesheet with readable mobile controls.

## Growth path

First: human puzzle playtesting, hosted persistence/offline acceptance, touch/accessibility testing and authoring polish. Next: a human-reasoning hint trace and better difficulty calibration. Then: optional authenticated backup/sync if players need it. Native packaging, analytics, account systems and monetisation should be separate projects with explicit threat models and costs, not prerequisites for playing a static puzzle.
