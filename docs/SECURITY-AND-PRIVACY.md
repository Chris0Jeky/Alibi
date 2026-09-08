# Security and privacy notes

The app is a static local-first game, not an account service. It has no runtime trackers, analytics beacons, remote fonts, advertising SDKs, third-party images, chat provider, payment service or API key. Hosting still involves normal web requests and whatever logging/security configuration the operator enables at Cloudflare. Do not write a privacy notice claiming that the hosting provider sees no information.

Imported packs are JSON data, not code. Header, dimensions, references, givens, clue shapes, stored solution and uniqueness are validated. The UI escapes user-controlled strings. A separate bounded worker prevents a difficult pack from blocking the main interaction thread indefinitely. Limits are 3 MB / 150 puzzles per pack, up to 3,000 installed puzzles, and 16 MB for a backup import. Extremely large valid collections can still slow catalogue rendering; the caps are guardrails, not a performance promise at maximum size.

The `_headers` file sets a self-only script policy, disables framing, removes referrers, disables camera/microphone/location, and disallows object embedding. Inline styles are allowed because the renderer uses per-cell geometry/colors. Blob workers are allowed for local validation. This is deliberate, not a strict no-inline-style CSP. Verify the actual headers after hosting; the HTML file alone cannot enforce all server headers.

No static-browser design can hide its solutions from a determined player or prove an honest completion to a leaderboard. Imported backup timestamps/completion fields are convenience data, not signed evidence. If competitive features are added, create server-side challenge issuance and validation; do not trust browser-supplied scores or store a signing secret in JavaScript.

Save data and exported backups are unencrypted. Notes may contain personal information. Shared-device users should export/remove their own data as appropriate. Private-mode and embedded-browser storage can differ from normal browser storage. Requesting persistent storage does not prevent deliberate clearing or loss of a device.

The issue-report feature creates a downloadable report only. It does not transmit it. It excludes the separate personal-note field but includes the puzzle definition and board state, including its solution and working marks. Review before sharing. The operator should supply an appropriate contact method before public launch rather than publishing an invented address.

Runtime dependencies: none. The optional Python browser tests depend on Playwright; optional deployment commands use Wrangler; the sample CI uses official GitHub actions. Those tooling dependencies are not served to players. Review/pin versions for a production supply-chain policy. Keep account credentials and deployment tokens outside this repository and ZIP.

No external copyrighted puzzle collection, photograph, music file, icon library or font file is bundled. The Murdoku-inspired family uses original scenes from this project; the app is not affiliated with the original Murdoku creator. This is not trademark or legal clearance for the working title or every future asset. Review naming and third-party rights before marketing or an app-store submission.
