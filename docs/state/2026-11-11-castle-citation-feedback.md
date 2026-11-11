# Castle citation feedback

A rejected case check reports one stage-level message for verdicts and source sets. Each
Sources group now references that existing status while the rejection is shown; editing a
citation clears the association when the status changes to `Draft saved.`. No group is
identified as individually wrong, because the case check does not expose that detail.

The browser regression first failed without the association, then passed with a citation-only
rejection at 320 and 1280 pixels; it checked all three descriptions and their removal after an
edit. The full case journey passed, including offline, backup and stale-save checks. The
emitted player was 16,440 bytes (strictly below 16,448); the Castle asset test passed. These
are browser and build checks, not physical-device or screen-reader acceptance. See
[HUMAN_TODO.md](../../HUMAN_TODO.md).
