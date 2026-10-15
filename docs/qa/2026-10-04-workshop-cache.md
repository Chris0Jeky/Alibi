# Workshop catalogue cache correction

Refs #570 review discussion 4174632865 and #433. The existing assets header
marks assets/* immutable for one year. A stable catalogue.json URL therefore
cannot be reused for changed public metadata.

The shelf builder now emits catalogue.<full SHA-256>.json from the exact UTF-8
metadata bytes. It emits no stable alias. The same bytes retain their URL;
a description-only update changes it without changing any accepted puzzle or
pack download. A stylesheet-only update leaves catalogue identity unchanged.
The five-file output count, exact JSON bytes, existing immutable header, importer
and numerical delivery ceilings are unchanged. Existing old cached URLs are not
purged; future releases simply do not reuse them for different content.

Three new tests produced two failures and one pass against the exact old shelf
builder (Git blob eb478f72324dda7a21003a867b875f6137e78ed0). All three pass after
correction. Together with the existing seven shelf/composition cases, ten tests
pass with zero failures or skips; formatting passes. Local tests used real
accepted pack/validator sources and a small CSS fixture, not a release build or
browser evidence. A broader authoring run reached the local command timeout and
is not counted as a pass. The actual CSS, output budgets, complete Android index
and fourteen acquisition/browser cases must pass in final-head hosted CI.

The existing shelf test now locates the full-hash metadata path while retaining
its exact metadata and five-file assertions. The emitted-output and Android tests
already derive the expected file list from buildShelf and require exact bytes.
No workflow permission, source trust, save format or deployment change is made.

The previously saved continuation ledger is submitted in #571, stacked on #570.
Its archive preserves the prior state file byte-for-byte; refresh its current
status only after the implementation and independent re-review qualify.
