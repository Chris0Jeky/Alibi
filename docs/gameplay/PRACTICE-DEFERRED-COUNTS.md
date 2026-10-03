# Practice progress while definitions are deferred

Refs #389 item 1. Observatory and Glass Orangery familiarity previously appeared
as a final low count when a completed saved Vault puzzle was compared with its
listing-only catalogue entry. Matching only public ID/revision fields would hide
the symptom but permit different rules to earn official familiarity.

The adapter retains exact full-definition matching. A validated committed run
with a completion marker and a still-deferred official key makes only its family's
count incomplete. The panel says "At least" and explains that some saved
completions await definitions. Already verified progress, starter links and
unlocked details remain available. Unverified candidates award no credit.

No download is started or awaited by this display bridge. The existing loader
and atomic in-place definition validator remain authoritative. The next snapshot
after successful loading gives the exact count. Castle currently takes its
snapshot on mounting; returning from a practice game or leaving and reopening
Castle refreshes it. This slice does not add an observer or promise live refresh
inside an already-mounted room. Persistent failure leaves an honest lower bound,
not an invented complete count or a blocked room.

Seven new regressions failed on the exact old adapter and pass after correction.
They cover real emitted definition application, both affected families, changed
rules under matching listing identity, malformed/uncompleted/unknown records,
legacy completedAt validation, retained verified detail and panel text/controls.
The adapter still calls its host's validateRun and legacy completion predicate.
The unit fixture uses shaped run inputs; the browser lane uses actual solved
games and committed IndexedDB records instead.

The source removes redundant empty-string/date and Map-key type guards without
changing their outcome: Date.parse rejects empty strings, and Map lookup does
not coerce keys into canonical official strings. The invalid-key cases include
a coercion trap. Repeated control copy is shortened without removing guidance.
Local reconstructed-source web build and unchanged budgets pass: JavaScript
134,935 gzip bytes; core offline 1,892,692 bytes; shell excluding official content
1,411,614 bytes. These are local comparisons, not hosted release receipts. No
numerical ceiling is raised and no other runtime files are part of this PR.

The read-only exact-head browser lane must complete six scenarios at 390/1280px:
two real solves, failed definition delivery with truthful panel counts and usable
controls, then validated retry and exact counts without replaying the puzzles.
Service workers are blocked only to prevent cached definitions masking that
network scenario. Existing Castle and full-origin workflows retain offline,
update and prior-practice acceptance. Python syntax and the seven new source
tests pass locally; no local browser or full-suite pass is claimed.

Keep draft until full current-head CI, all browser cases, independent review and
repository aging qualify. #389 item 2 landed in #567; item 3 remains with #459.
The broader issue, physical Android/TalkBack and HUMAN_TODO remain open. No save
schema, official definition, reward, content identity or deployment changes.
