# Interlock delivery prerequisite

Refs #422 and #161. Target: 60 new spatial-reasoning studies, without raising delivery budgets.

Current candidate #427 (2 October 2026) builds locally after dependency installation and retains
the exact JSON roundtrip contract. Corrected accounting fits shell and JavaScript ceilings,
but initial code/content remains 969 gzip bytes over its unchanged cap at clean source 3178b35.
The content candidate is blocked; see [current evidence](INTERLOCK-STUDIES.md). The installation
failure below records the historical prerequisite intake, not the current environment.

The existing official-content encoder packs integer arrays and homogeneous record columns.
This change preserves those encodings and adds a deterministic dictionary for repeated strings
of at least 32 characters. The dictionary holds immutable strings only, never shared objects.
Both the initial catalogue and the one deferred definition chunk use the same build-owned codec.
All JSON values, property order, array order, object independence and listing validation remain
unchanged. The decoder is embedded in static output; the encoder never runs in the game.

## Verification boundary

Four source-level regression tests cover self-contained decoding, deterministic output, repeated
prose, integer/tag collisions, Unicode, own prototype-like keys, invalid references and deep
nested record runs. Existing delivery tests remain the authority for normalization, initial plus
deferred equivalence, malformed listings, retry semantics, standalone files and built budgets.
No budgets, published puzzle sources, engine rules, save formats or dependencies change.

Local dependency installation failed at the npm registry (EAI_AGAIN), so source tests are not
presented as a minified build pass. GitHub Actions must verify the exact published head before
merging this prerequisite. Unminified size probes are diagnostic only, not release evidence.

The planned collection split is Gardens in the initial catalogue and Routes in the existing
single precached deferred chunk. Real player data calibrates their provisional tiers under
`docs/CALIBRATION.md`; physical-device comfort is a separate gate. No merge or deployment here.
