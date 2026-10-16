# Full official-content identity

Refs #389 item 3 and #433. Base a3c6ad9. Build-only hardening, not a save migration.

## Design and limits

The existing web identity directly hashes the initial official-content script. That script already contains a deferred URL with a truncated content hash, so changing deferred source normally changes the old identity indirectly. This is not a claim that deferred changes were completely invisible.

Use a SHA-256 over a versioned JSON frame with explicit `initial` and `deferred` roles and the full exact source strings. JSON framing preserves boundaries, order, Unicode and empty partitions without concatenation ambiguity. Individual payload hashes remain intact. The runtime web identity and its inherited Android runtime identity share this aggregate. Android's separate legacy artifact receipt still defines its similarly named field as the initial file hash; its existing verifier is unchanged in this bounded slice. Unifying those metadata definitions needs an explicit compatibility decision, not a silent receipt change.

No content definitions, IDs/revisions, save stores, network, application logic or budget ceilings change. The preview-house source-only identity remains its existing separate contract.

## Implementation and evidence

1. Write independent crypto expectations and regressions for either source changing while the other stays fixed, role/partition separation, Unicode and invalid types.
2. Observe the missing-helper failures: five fail, one historical-behaviour test passes.
3. Implement the helper in `tools/platform-identity.cjs` and call it with both emitted source strings in `tools/build.cjs`.
4. Verify source tests plus existing dirty-path diagnostics: 13 passed locally.
5. Add generated web/Android-runtime assertions that independently reconstruct the framing from emitted files. Do not skip absent builds or manufacture receipts. These require clean complete build CI because local dependencies are unavailable.
6. Publish a focused draft PR; inspect its exact-head build, checks and review before any merge. #389's two loading-interface items and #433 remain open.

The independent semantic expectation here is an independently written crypto expression, not an independent code reviewer. No reviewer approval or full local build is claimed.
