# Cascade current-base receipt

Refs #562 and #418 item 3. #556 is merged and this PR now targets main.
Integration `e934512a797446f95e4efe483e725267cb81bb0f` incorporates documentation
main `299f10efd7ec2aa33f007a8ee2ed68ee96293d32`. Only release/state notes differ
from `1dd22c47d90aeffe8905e365cee41f3718b52dd4`; every parent note is retained.
The CSS fix, actual-browser fixture and retained workflow are byte-identical.
Six related source cases pass after reconciliation.

The earlier head passed all three actual-origin Cascade scenarios at 320x640,
390x844 and 1280x900 in run `37088462393`. Downloaded artifact `11261696106`
matched SHA-256 `b20d46d482a6bf10221c6576867b143fc716aff70919d84b9e711c491c54c13b`;
its source/receipt and narrow screenshot/geometry were inspected. Codex reviewed
that exact head with no major findings. Those are historical results, not a
claim that newly requested final-head CI has finished.

The docs-only integration is recorded in run `37089582918`, artifact
`11261647299`, ZIP SHA-256
`6798210712e747ce5bd1cc4ffec9ed01217096a721e0a42ff9bf563ca3c0becd`.
Publication touched only the owned branches, not main. No publisher remains.

This receipt is the only post-integration addition. Require refreshed full CI,
all three actual-control scenarios and review before merge. Physical-device,
TalkBack and real text-scaling checks remain in HUMAN_TODO.md.
