# Review of Alibi 0.5.0-preview.1

Reviewed 8 September 2026. Source anchor: `1f049a794609be04f29a91117fbd1a8701d28d08`, merge PR #10. GitHub Actions run `34219942887`; downloaded artifact `10053421652`. The artifact is the current built application and evidence, not a full checkout of current source. Main can have moved after this snapshot.

## What was inspected

Read the repository development-state document and current source tree through the connected GitHub tool. Downloaded the successful tag workflow artifact. Inspected its generated application, service worker, headers, release metadata, browser-origin/restart/boot/update/room reports and screenshots. The public preview could not be opened from this environment. Do not describe this review as a live-site or physical-phone review.

## The implementation is materially stronger than the original proposal

The supplied CI evidence includes real Chromium-origin tests rather than only isolated DOM tests: IndexedDB writes and restores, browser process restarts, offline restarts, actual service-worker A/B updates and two-tab preservation. The restart report completes all nineteen crime scenes and repeats The last service three times. Boot recovery explicitly preserves IndexedDB, localStorage and unrelated caches. Room tests now use local Wrangler and two isolated browser contexts, including a lost join response. These are the repository's results, not tests rerun here.

The integration retained 116 puzzle definitions, thirteen original engines and four casebooks. The After Hours route is no longer merely a loose concept bundle. Separate preview publication also avoids replacing the earlier play origin while the changes are evaluated.

## The remaining important problem

The owner reported repeated Android freezes after scene completion. The repository says unbounded storage open/transaction waits were fixed, but the actual physical-device cause is unconfirmed. Issue #11 and the Android acceptance gate should remain open until the affected device passes a repeatable script. Desktop Chromium success does not identify a phone-specific cause.

Recommended script: record device/browser/version and available storage; cold launch; finish The last service; return home; reopen; repeat three times; force-stop/relaunch; airplane-mode relaunch; change a note; export; then stage an update while a second tab is open. Capture the last persisted revision, queued-save count and any timeout separately from animation or rendering work. Do not fix a hang by clearing saved data.

## Concrete follow-up recommendations

1. Finish the affected-phone retest before merging substantial new animation work. Add an unobtrusive exportable diagnostic log with bounded entries, no puzzle answers and no personal account data.
2. Preserve visible save outcomes across rerenders. “Saved” must mean the transaction committed. A stale tab must not silently overwrite a newer save.
3. Introduce an activity registry rather than expanding the existing application and Club modules indefinitely. Model each extension as `mount(context) -> dispose()` with explicit storage, assets, routes and capabilities.
4. Unify backup discovery in the product. This laboratory intentionally uses a third namespace, but a public product should offer one export entry point with a manifest describing Puzzle, Club and Quiet Wing sections. Cross-database restore is not automatically atomic; stage, validate, record recovery and expose partial-failure recovery deliberately.
5. Keep competitive and local-toy state apart. Idle clocks, editable realms, local badges and imported backups are not evidence for public leaderboards.
6. Budget rendering by device and interaction. A profiler screenshot on a desktop is not evidence that an Android session is smooth or cool.
7. Keep the artwork acquisition ledger beside the executable assets. A search result or a game's screenshot is not a reuse licence. Never ship the supplied inspiration screenshots as game assets without permission.

## A real integration trap found in the current release

The root service worker serves its cached root application for every navigation on its origin. Simply adding `/retreat/index.html` would therefore still deliver the original application to an already-controlled browser. The combined preview explicitly excludes `/retreat` navigation from the root handler, gives the root shell a new cache identity, and lets the wing register a separate scope. The original cache-cleanup prefix is `alibi-shell-`; the new wing uses `alibi-quiet-wing-`, so the two must remain disjoint.

## Review references

- https://github.com/Chris0Jeky/Alibi/blob/1f049a794609be04f29a91117fbd1a8701d28d08/docs/STATE.md
- https://github.com/Chris0Jeky/Alibi/pull/10
- https://github.com/Chris0Jeky/Alibi/issues/11
- https://github.com/Chris0Jeky/Alibi/actions/runs/34219942887

Physical Android, TalkBack, the new wing's real-origin durability, hosted two-release updates, and actual museum connectivity remain separate acceptance tasks.
