# Alibi hosting compatibility

Reference-only preparation, 2026-09-10. `manifest.json` is an inert agent-intake contract, not application configuration. No deployment, domain, rename, collection or room activation occurs here. Existing main-push workflows may still publish after a future merge; inspect their triggers first.

Keep the current static Worker. The optional-online Worker/Durable Objects implementation is a separate service capability, not a prerequisite for playing the static game. Do not replace the current Worker or introduce a conventional server merely to obtain a custom domain.

## Origin migration acceptance

Before changing the canonical hostname, implement and test an explicit export/import journey for cabinet, Club, Quiet Wing and separately exported challenges. Keep both existing origins usable for recovery. A redirect cannot transfer IndexedDB or service-worker state. Test a real installed PWA, offline/reconnect behavior, old cached releases, deep links and interrupted migration. Do not force an update mid-game or silently reset an unknown save.

Before any display-name change, inventory UI copy, manifest name/icons, page titles, social previews and store-facing material separately from `alibi-device`, schema versions, content IDs, storage keys and backup formats. Stable identifiers remain unchanged unless a separately approved compatibility migration proves otherwise. No candidate name or domain is adopted by this PR.

## Optional rooms

Re-read the current optional-online configuration. Verify the real allowed origins, secret references, room and quota Durable Objects, expiry, abuse limits and two-device acceptance. Static publishing does not activate those capabilities. Keep room activation and telemetry decisions separate from a hostname change.

## Agent and verification entry

Follow the existing `AGENTS.md`, `docs/STATE.md`, project map and owner queue. This is a reference document, not a replacement prompt or harness. Tasks AL1-AL3 in `manifest.json` provide bounded outcomes and acceptance criteria.

Syntax: `python -m json.tool .hosting/manifest.json`. Future hosting/build slices require `npm run verify`, emitted-file inspection and actual hosted responses; storage/origin changes additionally require the repository's real-origin browser suites. JSON validation does not establish those results. Record NOT RUN where evidence is absent.

Rollback preserves the previous complete build, both recovery origins and existing saves. Never use destructive storage clearing or an unconditional redirect as the rollback. Keep private operational receipts, credentials and unregistered name candidates out of this repository.
