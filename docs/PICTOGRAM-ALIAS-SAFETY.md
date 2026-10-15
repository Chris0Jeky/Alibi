# Pictogram alias-safety repair — 12 October 2026

Based on unchanged draft #521 head `e1a38198e41fcc16b7754da7b71f1066535885f1`. Its unresolved review describes writes through pre-existing filesystem aliases. This isolated child validates input/output paths and ancestors, rejects symlinks/junctions, redirected real paths and multiply linked regular files, validates the entire output set before mutation, then writes exclusive run-owned temporary files and atomically renames them. `--check` enforces the same path boundary.

Six disposable Windows regressions failed before the fix and pass after it: hard links, symlinks and junctions in both write and check modes. External sentinels and presentation bytes remain unchanged. All five original icon contracts and generator check pass. A normal write run preserves every tracked SVG/export/runtime byte.

This protects against pre-existing aliases and detected identity changes. It does not claim descriptor-relative protection against every concurrent malicious filesystem race. No budget, runtime icon, source master or accepted-art change. Full branch verification and exact-head evidence appear in the child draft PR; #521's integration conflicts with current main remain separate. No merge or deployment.
