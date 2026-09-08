# After Hours integration map

The owner supplied `alibi-after-hours-bundle/` on 2026-09-08. Its documents are design and
implementation proposals, not authority over this checkout. All 74 delivery-manifest checksums
match. The source ZIP SHA256 is `2acd9878e5d6a5ff42d8c34a5b022630d62faef3368286cf988ea5c3d3558a6b`.
The bundle identifies baseline `36d5e01180c017e7bd3fa068526fd2669034c9b0`; its recovered
`app.baseline.js` matched our application before integration. All 116 catalogue definitions,
four casebooks and compatibility definitions remain unchanged as JSON values.

[Every source-archive file, checksum and disposition](after-hours-inventory.csv) is indexed separately.
The original input and extraction stay ignored. No duplicate `classic/`, generated website,
prototype package manager files or historical test reports are published as working source.

## Product map

| Bundle capability | Integrated source | Delivery and proving check |
| --- | --- | --- |
| Lantern Duel: offline opponent and same-device play | `src/club-engines.js`, `src/club.js` | Legal flips, automatic passes, bounded opponent, whole-exchange undo; real-control full game |
| Pocket Borough | Same modules | Seeded draft, 18 placements, explicit score preview, daily seed, local records, seed sharing and resume |
| Archive Heist | Same modules | Six independently solved rooms, touch/keyboard, undo/redo; all six completed through controls |
| Reversible assistance | `src/assist.js`, player hooks | Visible-rule candidates and derived marks, explicit forced-step confirmation; off by default to preserve manual play |
| Four editorial desks | `src/club.js`, `src/club.css` | Per-visit rotation, pinning, latest unfinished puzzle/game, fictional weather |
| Club journal | `src/club.js` | Local activity and records, no fabricated players or global ranking |
| Zen | Club/player hooks | Keeps clues and essential controls, hides decorative chrome, Escape/exit button |
| Living atlas | `src/atlas.js`, Club hooks | Canvas harbour, worker/fallback, pause, actual render counters, reduced-motion support |
| Artwork | `src/artwork/`, `src/illustrations/` | Seven re-encoded WebPs and 22 editable motifs (ten new); 418,376 raster bytes |
| Club saves | `src/club.js` | Separate `alibi-afterhours-v1` DB, revisions, bounded startup/transactions, backup and atomic pre-restore recovery |
| Cabinet saves | `src/storage.js` | Existing `alibi-device` v1 preserved; stalled operations reject without clearing progress |
| Startup recovery | `src/boot.js` | Independent watchdog, retry and app-file-only refresh; no IndexedDB deletion |
| Release build | `tools/build.cjs` | Lazy engine and validator assets precached, exact standalone source, stable PWA identity |
| Optional private rooms | `optional-online/` | Separate Worker and Durable Objects; reviewed/tested separately from static launch |
| Cloudflare static preview | `wrangler.jsonc` | Assets-only Worker in existing account, explicit 404, native headers; current host retained |

## Integration corrections

- The prototype's `save()` did not return its queue, so an update could outrun Club persistence.
- Club restore now requires healthy transactional storage and retains the previous save atomically.
- Main and Club storage opens and transactions are bounded; a late abandoned connection is closed.
- A separate startup script offers recovery even if the main script never loads.
- Standalone replacement now uses a callback. A replacement string interpreted `$$` in Archive
  maps as one crate; source-equivalence coverage prevents that regression.
- Assistance is opt-in. Existing manual mistakes remain possible and useful for learning.
- Existing lint, CI, builder, manifest identity, import worker validation and original tests remain.

## Phone incident

The owner reports that The last service (`scene-01@1`) and other scenes can become unusable after
completion, eventually remaining on the startup screen after repeated reloads. This is a real
physical-device report, not a successful acceptance run. Desktop Chromium completes all 19 scenes,
reloads their actual saves, repeats The last service, restarts the browser, and reopens offline.
The code contained indefinite storage waits both on boot and before navigation; those now time out
with recovery. The exact Android trigger remains unconfirmed. Do not clear the affected phone's data.

## Hosting and future scope

Cloudflare uses a separate preview origin. Browser storage does not cross origins: export cabinet
and Club saves on the old site and restore them on the new one. Keep both original backup files.
There is no automatic redirect or silent migration. See [DEPLOYMENT.md](DEPLOYMENT.md).
Private rooms are optional; static deployment does not activate a server. No accounts, public
matchmaking, chat, global rankings, score integrity, cloud sync or native store release is claimed.
See [HUMAN_TODO.md](../HUMAN_TODO.md) for the remaining phone and owner decisions.
