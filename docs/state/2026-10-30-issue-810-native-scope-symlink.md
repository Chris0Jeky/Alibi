# Native-scope symlink fixture without host privilege (#810)

Branch `claude/native-scope-symlink-810`, based on `328d5dcd9909743f947a3b670a60d24fa6b75539`.

## Changed

`tests/android-native-scope.test.cjs` no longer calls `fs.symlinkSync`, which fails with `EPERM`
on unprivileged Windows. The disposable fixture repository sets `core.symlinks=false` and records
the link as a real git mode-120000 entry with `git hash-object -w` + `git update-index --cacheinfo`.
A new assertion proves the fixture commit holds a `120000 blob` entry, so the classifier still sees
a genuine symlink on every runner. `tools/android-native-scope.cjs`, the workflow and every
classification assertion are unchanged; nothing is skipped.

## Verified

- Windows 11, Node 24, unprivileged: `node --test tests/android-native-scope.test.cjs` — 3 passed,
  0 failed, 0 skipped (previously failed at `fs.symlinkSync` with `EPERM`).
- Mutation: loosening the classifier's head-entry mode check to accept `120000` makes the fixture
  test fail (`actual: 'docs-only', expected: 'full'`); restored afterwards.
- Pinned Prettier 3.9.6 check and `git diff --check` on changed files.

## NOT verified

Linux behaviour locally; hosted CI on this head is the Linux proof. No app, content, storage or
deployment change. HUMAN_TODO.md items are untouched.

## Residual risk

The fixture now exercises git's recorded symlink type rather than a filesystem symlink; the
classifier only reads `git ls-tree` modes, so this is the seam it depends on.
