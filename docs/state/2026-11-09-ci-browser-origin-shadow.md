# 2026-11-09: real-origin browser shard shadow

This manual-only, non-required Actions experiment compares the current real-origin browser block with four isolated shards on the same selected commit. The existing required workflow and release gates are unchanged. The generator refuses to run if the literal source step diverges, and focused tests check exact command and environment parity, membership and manual matrix configuration.

At preparation, 3 focused Node tests, targeted formatting and an independent read-only review passed. The full hosted experiment and its queue-inclusive cost and timing are not yet verified. Each job builds independently; payloads are not compared across jobs. The 4–6 minute longest browser-shard estimate is a hypothesis, not a release or end-to-end CI result. The workflow must first land on the default branch to be dispatchable; retain the existing required gate while measuring and validating it.

Physical-device and owner acceptance remains in HUMAN_TODO.md. A later change must separately prove the complete suite, exact source/artifact identity and fail-closed aggregation before any required-check migration.