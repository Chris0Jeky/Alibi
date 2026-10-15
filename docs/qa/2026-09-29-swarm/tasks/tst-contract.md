# tst-contract: cover the platform runBounded commit/cancellation race

## Target
`src/platform/contract.mjs` `runBounded` (line 129): executes one platform
operation with a deadline and optional AbortSignal. The action gets a guard,
must check it before side effects, and calls `commit()` immediately before an
irreversible provider action; once committed, cancellation no longer wins and
the caller waits for the provider's definitive result. Used by six call sites
in `src/platform/web.mjs` (file picking, document transfer, asset delivery).
Zero test references today (`runBounded`, `contract.mjs` absent from `tests/`).

## Behaviours to cover (new `tests/platform-contract.test.mjs`, Node)
Follow the repo's `node:test` + `assert/strict` style; `contract.mjs` is ESM —
import it directly (`.mjs` suits run under `npm test`).
1. Invalid options rejected: missing/blank operationId, timeoutMs out of
   1..60000, non-AbortSignal signal.
2. Pre-aborted signal returns `cancelled` without running the action.
3. Timeout cancels a slow action (`timeout` code); explicit abort returns
   `cancelled`.
4. Commit wins the race: action that commits then resolves slowly returns the
   provider result, not timeout/cancel.
5. Guard `throwIfCancelled` throws after cancellation; error mapping:
   AbortError→cancelled, NotAllowedError/SecurityError→denied,
   QuotaExceededError→quota, PlatformFailure passes through, unknown→fallback.
6. Timer/host injection via the `host` parameter (fake timers) so the suite is
   fast and deterministic — no real 60s waits.

## Constraints
- Test-only change: do NOT modify `src/` or `tools/`.
- Deterministic, no network, no ports, runs under `node --test`.

## Proving check
`node --test tests/platform-contract.test.mjs`
Repo gates that must stay green: `npm.cmd run format:check`.
