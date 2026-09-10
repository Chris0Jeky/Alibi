# Observatory integration

Shared collector/dashboard: [Pulseboard #15](https://github.com/Chris0Jeky/Pulseboard/pull/15), source commit `8d92fff11f581d600c357e402cd521426665f318`.

The build incorporates the local adapter into the existing boot input before content hashing and service-worker manifest generation. No post-build artifact injection, remote CDN or save-schema change is introduced. Collection remains off because the endpoint is empty. The adapter also requires `ALIBI_CONFIG.standalone === false`, so a standalone export remains silent even when hosted on the primary origin.

Run `node observatory/check.mjs`. Rebuild and run existing tests, formatting, distribution validation, service-worker update checks and hosted QA before approval. Shared kit: 58 local tests passed, including the standalone guard. Full Alibi build and browser QA were not executed here.

Activation requires a separate notice/CSP review and collector deployment. Keep the existing primary/fallback roles. Never send answers, save data, imported puzzles, personal text or workshop contents. Baseline active signals are opted-in page views and content-free error occurrence counts. The registered puzzle start/completion/hint names are contracts awaiting explicit engine hooks, not yet complete genre funnels. Completion must come from validated puzzle success, not from a button click.
