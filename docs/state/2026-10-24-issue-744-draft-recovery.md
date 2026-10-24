# Damaged workshop drafts on restore (#744, #738 comment)

Branch: `fix/744-draft-recovery`. Follows #743 (workshop drafts in Cabinet backups).

## Changed

Root cause: `Store.restore` treated any stored `meta/workshop-draft` as valid. (1) A damaged
local draft was copied raw into the pre-restore recovery copy as `workshopDraft`, which
`validateBackup` rejects, so the recovery file could not be re-imported. (2) A damaged local
draft also counted as "present", so it shadowed a valid backup draft forever.

Restore now validates the local draft with the same check export uses (shared `badDraft`
helper in `src/storage.js`):

- Damaged local draft + worker-validated backup draft: the backup draft is applied and the
  note says so. The damaged bytes survive in the recovery copy.
- Damaged local draft + no backup draft: the local bytes are untouched.
- In both cases the recovery copy stores the damaged bytes under `damagedWorkshopDraft`
  (not interpreted by `validateBackup`, which spreads unknown fields) and lists
  `workshop-draft` in `damaged.meta`, mirroring export. It no longer carries `workshopDraft`.
- A valid different local draft is kept as before; an identical one is untouched.

The merge-snapshot path in `src/app.js` is unchanged: it still compares the stored damaged
bytes through `expected.workshopDraft`, which the new regression exercises.

## Verified

Regressions in `tests/storage-restore.test.cjs`, red first: 23 tests, 21 pass, 2 fail on the
unfixed code; 23 pass after. Budget: `javascriptGzipBytes` 134,933 (ceiling 134,944 unchanged);
precache shell 1,416,423 (main 1,416,210); the shell ceiling rose 32,128 -> 32,320.

## Not verified

Real-browser IndexedDB atomicity (fake-IDB fixture only); the dialog and download path were
not exercised in a browser.
