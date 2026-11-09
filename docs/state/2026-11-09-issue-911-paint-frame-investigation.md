# Issue 911: paint render work

## Change

Paint strokes schedule at most one in-progress render per animation frame and cancel a pending render when the stroke ends. The existing final render continues to commit history, completion and save state. This removes the extra full render for a same-frame tap and batches multiple drag events within a frame; a press that spans a frame still draws on press and release. The keyboard path is unchanged. Existing pause, save-conflict, update and restore rollback paths remain in place.

The focus restoration paths for ID-based and action-matched controls now share one branch. ID-based controls retain selection restoration; both paths retain the same visibility check, fallback behavior and scroll handling. This removes duplicate code and brings the paint change back under the existing shell budget without changing a ceiling.

## Evidence and limits

- The paint work-count regression failed against the baseline with two render calls for a same-frame gesture before passing with the candidate. Focused Node regressions covered same-frame and held painting, one undo entry, completion hooks, pause, update, restore rollback and focus restoration.
- Clean `npm run build:android` at `84bd69d` built matching web and Android identities. Startup JavaScript gzip was 135,511 bytes, below the unchanged 135,680-byte ceiling; core offline bytes were 1,981,066, 11 fewer than the supplied baseline. See the Node budget gate for the precise shell constraint.
- The full `npm test` at `84bd69d` finished with 2,634 passes and one failure: `tests/asset-catalogue.test.cjs` found the checked-in `src/app.js` byte count and hash stale. Running the documented `node tools/assets/catalogue.cjs` generator refreshed all 13 teaching entries for that source, with no other catalogue changes. The targeted catalogue suite then passed 2/2. A fresh run of the budget suite against the same built app passed 17/17; the catalogue and this handoff are not app source. The full suite has not been rerun after the catalogue update.
- The browser DOM-replacement regression and phone/desktop screenshots are wired into the full CI workflow. They were not run locally: the available Chromium runtime was missing and the official browser download returned a site-unavailable HTML response. The test needs its first real browser run and screenshot inspection before acceptance. Physical devices were not tested.
- The original worktree's repeat build encountered `Unexpected existing platform identity`; a fresh isolated worktree built successfully without changing the guard.
- No production deployment occurred. Owner decision `alibi-release-20261030` in `HUMAN_TODO.md` remains open.

The technique-library final-render profile mentioned in #915 points at `getClientRects()` during focus restoration, but there is no validated replacement that preserves hidden-element and fallback focus behavior. No change was made to that visibility test. CI and physical-device results must remain distinct from local evidence.
