# Club save-guard consistency (#905, #884 item 3)

## Plan and design

- Use one terminal-save-error predicate for Club game moves and the shared `requireSavable()` guard. A retryable Web Lock miss may keep accepting moves; each persistence attempt still uses the existing lock and byte/revision checks.
- Guard a shared Borough seed replacement before changing the in-memory run, then persist the new seed so opening a link is durable before the first move. If the tab already knows its save is conflicted, leave the saved town intact.
- Check `requireSavable()` before reading and applying the room API setting. After persistence, check again because `persist()` reports terminal conflicts through state and resolves; restore the previous API property/value before refusing the room request so an export cannot contain the unsaved endpoint.

## Changed

- `src/club.js`: aligned `commitGame()` with `requireSavable()`, protected room API configuration before and after persistence, and guarded/persisted direct shared-town seed changes. Concise Club room/journal copy offsets the emitted-size cost while preserving the stated settings, sharing and save behavior.
- `tests/club-storage.test.cjs`: added behavior tests for retryable lock contention, shared-town persistence and conflict preservation, and unprimed room API conflicts including exported JSON.
- `tests/browser_origin.py`: the Club conflict scenario covers known-conflict controls; a separate real-origin scenario creates the API conflict only when the settings save runs and checks the request and download.

## Verification

- **RED:** the new Node regression reproduced the unprimed revision conflict and failed because the attempted API remained in memory after `persist()` detected the other tab's write.
- **GREEN:** `node --test tests/club-storage.test.cjs` passed all 24 groups and 103 assertions.
- `npm run build:web` passed. The dirty-source build reports 135,593 JavaScript gzip bytes, 205,798 initial-code/content gzip bytes, and a 1,444,081-byte shell against the unchanged 1,444,280.32-byte ceiling.
- `node --test tests/budget.test.cjs` passed all 17 tests against that build.
- Real-origin Chromium 153 / Playwright 1.62, using IndexedDB and separate two-tab sessions, passed both focused scenarios: 29 checks for `club_conflict` and 18 for `club_api_conflict`. The latter proves the stale tab has no conflict flag before settings activation, then discovers the conflict while saving; no room request is sent, the previous endpoint is restored in memory, and the downloaded Club JSON retains it.
- `python -m py_compile tests/browser_origin.py`, Prettier checks for the changed JavaScript files, and `git diff --check` passed.
- The full `npm run verify` was deferred to exact-head CI; the Android build and full Node suite were not run for this follow-up.

## Not verified and residual risk

The full verification suite remains deferred to exact-head CI. Physical-device behavior and hosted Cloudflare behavior are not established by local Chromium. A second tab can still change the save after a control passes its in-memory guard; the existing persistence compare then refuses the write and reports the conflict. This change does not alter that storage protocol, the save schema, or IndexedDB version.

`HUMAN_TODO.md` continues to track the pending release decision, physical Android/TalkBack acceptance, and publisher/signing gates. This change does not close or infer any of those owner decisions.
