# Observatory integration

Shared collector/dashboard: [Pulseboard #15](https://github.com/Chris0Jeky/Pulseboard/pull/15), source commit `8d92fff11f581d600c357e402cd521426665f318`.

The build incorporates the local adapter into the application bundle before minification, content hashing and service-worker manifest generation. The small boot diagnostics script remains unchanged. No post-build artifact injection, remote CDN or save-schema change is introduced. Collection remains off because the endpoint is empty. The adapter also requires `ALIBI_CONFIG.standalone === false`, so a standalone export remains silent even when hosted on the primary origin.

Run `node observatory/check.mjs`. Rebuild and run existing tests, formatting, distribution validation, service-worker update checks and hosted QA before approval. Shared kit: 58 local tests passed, including the standalone guard. The initial boot integration exceeded the existing boot-script size guard; this revision moves the adapter to the application bundle without relaxing that guard. Check the latest CI result before approval.

Activation requires a separate notice/CSP review and collector deployment. Keep the existing primary/fallback roles. Never send answers, save data, imported puzzles, personal text or workshop contents. Baseline active signals are opted-in page views and content-free error occurrence counts. The registered puzzle start/completion/hint names are contracts awaiting explicit engine hooks, not yet complete genre funnels. Completion must come from validated puzzle success, not from a button click.
