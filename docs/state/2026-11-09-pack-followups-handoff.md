# Pack removal follow-ups handoff — 9 November 2026

Changed: pack addition and removal notices are registered before the initial pack read. A serialized
readback reconciles the full authoritative IndexedDB collection, including remove/re-add and
out-of-order notices; the pack list
updates in place, while other screens retain their DOM, focus and unfinished form values. The
persistent IndexedDB pack snapshot is authoritative in exports, so a stale tab cannot substitute an
old same-ID definition. Session mode still exports its in-memory packs.

A mismatched IndexedDB pack key is quarantined at startup without changing the stored row. Cabinet
exports preserve JSON-safe, bounded mismatched `{key,value}` rows in `damaged.packRows`, omit them
from installable packs and explain that manual recovery is required. The bounded backup validator
and the storage layer refuse automatic restore of a file containing those rows, and restoration also
refuses to replace a device that currently contains mismatched rows. Non-JSON-safe or oversized raw
rows cause export to refuse rather than silently lose information; the browser data is retained.
This uses the existing backup envelope without changing the IndexedDB version. LocalStorage fallback
also quarantines mismatched keys, retains the exact original key and raw text in the recovery field,
and continues to refuse pack removal.

The optional collection adder distinguishes an explicitly offline browser from other module load
failures. Published pack IDs, puzzle revisions and existing run definitions are unchanged.

Verified: focused Node tests cover stale same-ID exports, worker and storage restore refusal,
lossless raw-row export, lossy data refusal, existing pack admission and composition. A local Chromium
scenario exercises two tabs, unfinished clue-selector value and focus, removal, actual re-add,
stale-tab export and restore, a change during startup, original raw-row export, restore refusal, and
online/offline adder failures. This is local simulated-browser evidence, not physical-device or
hosted-release evidence.

The last fully measured review build exceeded the existing startup gzip and precache shell ceilings;
the coordinator is providing separately reviewed copy trimming and must remeasure the integrated
result without raising budgets. No full integrated CI, hosted release, physical device or
BroadcastChannel-unavailable browser is claimed. Without BroadcastChannel, a reload is still required
to see another tab's changes. `HUMAN_TODO.md` remains the authority for owner and deployment gates.
