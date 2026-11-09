# Club storage fallback handoff — 9 November 2026

Changed: Club uses writable localStorage fallback only when IndexedDB is absent, lacks its API, or
rejects opening with an explicit SecurityError or NotSupportedError before a database is opened.
UnknownError, AbortError, QuotaExceededError, InvalidStateError, BlockedError, VersionError and other
unexpected failures use the existing protected temporary session. The banner explains that storage
could not be checked, existing saves are untouched, and the session should be exported before
closing. Post-open/read failures remain protected. No stored bytes, revisions or schemas are migrated.

Verified: Node cases cover synchronous and asynchronous open failures, a preserved older local save,
protected-session exports, the visible warning, explicit API absence/security/unsupported fallback,
and the existing Club storage and game regressions. A local Chromium fixture using the current
emitted application script exercised UnknownError and SecurityError: the former kept older local
bytes untouched and exported only session progress; the latter loaded and persisted the local save.
This fixture is simulated local-browser evidence, not hosted or physical-device evidence.

Fresh validation: a separate detached worktree at the implementation commit passed formatting and
built the Android payload with clean-source identity. Its budget suite passed 17/17: 135,662 gzip
bytes and 1,444,247 shell bytes, both within the existing ceilings. The actual Chromium scenario
passed against that fresh build. The complete Club Node set passed 165/165. Full `npm run verify`
continued into the broader Node suite and had not finished at this handoff. The earlier fixture and
two identity-file build failures are superseded by the clean fresh-worktree build, but remain in
local logs. Hosted deployment and physical-device checks are not verified. `HUMAN_TODO.md`
remains the owner and deployment authority.
