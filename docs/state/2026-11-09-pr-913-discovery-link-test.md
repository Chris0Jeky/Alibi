# PR 913: Workshop discovery browser locator

## Scope and outcome

The built-in Workshop discovery browser test used the stale accessible name `Browse downloads (new tab)`. The actual inline link in `src/workshop-add.mjs` is labelled `Downloads (new tab)`. Update only the locator to use that exact current label. The keyboard `Enter` action, new-tab assertion, `noopener` check, discovery/no-auto-install checks, pack download/import checks, and offline IndexedDB replay remain intact.

## Validation

- `node tools/build-android.cjs` completed from a clean source tree at `892662709ba90f394742836eddf9fedc67f95e60`; its web receipt reports `sourceDirty: false`.
- Built-origin Chromium run of `tests/browser_workshop_discovery.py`: 14/14 checks passed at 320 px and 1280 px, including the keyboard-opened new tab, `opener === null`, no automatic download/install, exact-byte pack downloads/imports, and offline IndexedDB play.
- The discovery runner's chained Workshop adder browser suite also passed: 34 checks, zero failures, across both widths.
- Python syntax compilation and `git diff --check` passed.

## Evidence limits and remaining gates

This change corrects a test expectation only; it does not alter product UI or navigation behavior. The hosted workflow should rerun on the updated commit. Browser evidence covers the built local origin and IndexedDB, not a physical device or native Android picker.
