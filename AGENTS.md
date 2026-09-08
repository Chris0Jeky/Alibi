# Instructions for an agent maintaining this project

Read README.md, docs/ARCHITECTURE.md and docs/RELEASE-CHECKLIST.md before edits. Inspect the actual code and tests; do not repeat previous test claims without running the commands.

Preserve published puzzle IDs and revisions. Keep legacy definitions in content/legacy.json as compatibility fixtures. Never change an unfinished run to a newer puzzle definition automatically. Database schema version, app version, puzzle revision and build hash are distinct.

Make changes in src/ and content/, not dist/. Rebuild the entire static release. Use `npm run build` then `npm test`. The Python UI suite is optional tooling but required for any claim about browser-control checks. Current browser UI reports explicitly use an isolated page; hosted service-worker/IndexedDB claims need separate real-origin tests.

Never clear unknown saves, overwrite concurrent edits silently, automatically activate a waiting worker mid-game, store a secret in client assets, or claim imported content was published for other players. Preserve original snapshots and recovery export. Keep restore atomic on IndexedDB; do not weaken the fallback refusal.

New families need pure engine functions, bounded solver, structural/state validation, renderer, accessible controls, coherent help and a miniature lesson. Complete at least one puzzle through real controls in the UI suite. Count semantic solutions rather than equivalent encodings such as symmetric network rotations.

Do not run content generation over edited published content without reviewing its diff. Human-facing copy should be short, plain and specific. No promotional superlatives or invented test certification.

Do not deploy to a guessed account/project, buy a domain, enable paid services, create accounts or change repository visibility. Once the owner supplies/authorises the exact destination, use their existing project and preserve its production origin. Before a destructive storage or restoration test, use a disposable browser profile and retain a backup.
