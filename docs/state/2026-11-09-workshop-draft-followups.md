# Workshop draft save follow-ups (#880)

## Changed

- Restoring an absent or damaged draft assigns a fresh device-local revision in the restore transaction, so a stale tab that loaded no draft cannot overwrite it even if it missed the restore broadcast. Existing valid local drafts remain untouched; pre-restore recovery retains damaged data.
- Draft saves snapshot the supplied value at the call boundary, including IndexedDB's deferred read. Fallback saves serialize within a Store, giving overlapping same-tab edits distinct revisions. Fallback localStorage is still a compare-then-write mechanism without cross-tab atomicity.
- Malformed draft records and explicit invalid revisions are refused rather than overwritten. Restoring over damaged data checks its actual stored revision and refuses malformed or exhausted revisions before any writes; absent and zero legacy revisions remain supported. The stale notice distinguishes Export draft (this tab's copy) from a full backup (the stored device draft). Historical #877 notes now describe when its original clone happened.
- Regression coverage includes the restore/no-broadcast fence, overlapping fallback snapshots, delayed IndexedDB reads, damaged fallback bytes, and Generate at the 50-entry Undo limit.

## Evidence and remaining limits

Storage regressions for restore fencing, concurrent snapshots, damaged data and invalid or
exhausted revisions failed against their respective previous implementations and passed after the fixes.
The focused storage, workshop history, ownership and backup-race suites passed 98 tests. A clean
web and Android payload build passed; real-origin Chromium passed the new IndexedDB restore fence
scenario (14 checks) and existing cross-tab workshop controls (16 checks). Browser profiles were
disposable; this is not physical-device evidence.

The unchanged budget test **failed** on this branch: startup JavaScript gzip 136,171 bytes versus
135,680, and shell 1,447,177 versus 1,444,280.32 bytes. This includes the prerequisite pack
follow-ups; a separate integration trim must pass those existing ceilings before merge. Final
exact-head CI remains outstanding. Fallback cross-tab compare/write remains non-atomic; physical
phones and assistive technology are not verified. This work changes no deployment or owner
decisions in HUMAN_TODO.md.
