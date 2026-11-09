# Pack and Workshop draft integration

This follow-up is based on the reviewed Sunrise/Eclipse Lab candidate (#906). It combines
the remaining pack-removal work in #889 with the Workshop draft fixes in #880. GitHub is
authoritative; the starting archive was reconciled against main before these branches began.

## Changes and review

- Pack notices reconcile the full committed collection, including replacement and reversed
  cross-tab notices. In-place list updates preserve unfinished forms and focus. Removal uses
  the definition shown when its confirmation opened, and refuses a later replacement.
- Backups use the committed pack snapshot. Quarantined key/value mismatches retain bounded,
  JSON-safe original rows (or the exact localStorage key and text) for manual recovery;
  automatic restore refuses those raw rows and leaves stored data unchanged.
- Draft saves capture the value at the call boundary and serialize same-tab fallback writes.
  Restore gives a newly applied draft a local revision, protecting it from a stale revision-zero
  tab even without a broadcast. Invalid explicit revisions and exhausted counters are refused
  before writes; valid legacy absent/zero revisions remain supported. Recovery retains the
  original damaged draft. LocalStorage still has no cross-tab transaction.
- Stale-draft guidance distinguishes this tab's Export draft from the persisted draft in a full
  backup. Generation at the 50-entry Undo limit has regression coverage.
- Interface and privacy prose is shorter without changing disclosures, controls, puzzle rules,
  backup warnings or external URLs. The validator emits all official IDs in a compact string;
  validated IDs cannot contain spaces, and existing compiled-worker checks verify the entire
  reconstructed list, original order and collision protections. No numeric budget is raised.

Independent source review covered the pack races, draft fence, snapshot/serialization behavior,
worker representation and privacy disclosures. The separate draft, pack and copy handoffs retain
their historical measurements. Their earlier isolated budget failures are not qualification of
this combined tree; final build measurements and CI receipts are recorded on this PR.

## Evidence and limits

The pack slice passed 78 focused Node checks and an actual two-tab Chromium journey covering
startup changes, reversed notices, stale confirmations, live imports, backup/restore and raw-row
recovery. The draft slice passed 98 focused checks after reproducing the missing guards, plus
actual Chromium restore-without-broadcast and cross-tab-control scenarios before the final
revision-validation extension. Privacy disclosures passed source review and 17 Pulseboard checks.

The combined tree must pass unchanged budgets, full verification and exact-head CI before merge.
The main workflow now runs the pack browser journey as well as the existing draft-origin checks.
This work changes no deployment or owner decision in HUMAN_TODO.md. Physical-device and
assistive-technology acceptance remain separate; no such evidence is claimed here.
