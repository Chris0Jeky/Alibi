# Evidence-case workbench implementation plan

> For agentic workers: use superpowers:executing-plans task by task. No subagent tool is available in this session; self-review is not independent review.

**Goal:** validate and play one original evidence-led case without touching production saves.

**Architecture:** a build-time bounded validator produces source receipts; a pure memory-only session module supplies a safe offline authoring preview. Existing host integration is deferred.

**Tech stack:** Node 22 CommonJS, HTML/CSS/DOM, existing Node tests and Python Playwright.

**Spec:** ../specs/2026-09-27-case-workbench.md

## Global constraints

Preserve a3c6ad9 runtime assets, official registrations, IDs/revisions and all save domains. Add no dependencies. Respect the spec's 256 KiB / 64-record / 16-step / 64-claim limits. Require story-on/off copy, explicit reveal, source provenance and unknown-field rejection. Do not claim independent review, semantic proof or physical acceptance from structural tests.

## Review focus

- A cyclic or sibling-only source dependency must fail, even when IDs exist.
- Boundary-sized multibyte source and malformed JSON must fail without an unbounded file read.
- A plausible but unsupported attribution must remain not-established in the semantic model.
- A hostile authored script delimiter must remain visible text, never code.
- Story changes, incorrect input and revealed answers must not grant or erase completion.

## Task 1: bounded authoring contract (#440)

Files: `tools/case-authoring.cjs`, `tests/case-authoring.test.cjs`, `docs/cases/README.md`.
Interfaces: `validateCase(definition)` returns counts/scope or throws a path-bearing error; `parseCase(text)` returns definition/receipt; `readCase(path)` reads a bounded regular UTF-8 file; CLI prints receipt or exits nonzero.

- [ ] Write a minimal valid fixture and failing missing-validator assertion.
- [ ] Run `node --test tests/case-authoring.test.cjs` and capture the expected failure.
- [ ] Implement strict shape and size checks, unique IDs, DAG ancestry and citation visibility; bounded file read and SHA-256 receipt.
- [ ] Add malformed/unknown/duplicate/cycle/hidden-reference/boundary/Unicode/CLI tests; run them and the existing castle suite.
- [ ] Commit independently; publish a focused draft PR with spec and evidence.

## Task 2: session semantics and original case (#441)

Files: `tools/case-session.cjs`, `content/cases/reading-room-blackout.json`, `tests/case-session.test.cjs`, `tests/case-blackout-model.test.cjs`.
Interfaces: session helper projects only active source/claim prose; validates exact citation sets and verdicts; exposes separate hint and worked-answer functions; completion is an idempotent ordered list.

- [ ] Write and run failing access, classification/citation, repeat/wrong/reveal and story-parity tests.
- [ ] Implement pure transitions over validated definitions; no storage or network.
- [ ] Author three steps and independently enumerate bounded fictional worlds; assert each authored verdict against its predicate and retain uncertainty counterexamples.
- [ ] Run authoring/session/model tests; commit separately.

## Task 3: offline reviewable preview (#441)

Files: `tools/case-preview.cjs`, `tools/cases/preview.js`, `tools/cases/preview.css`, `tests/case-preview.test.cjs`, `tests/browser_case_workbench.py`.

- [ ] Write failing build/CSP/escaping and actual-control tests.
- [ ] Generate a single HTML from bounded input and fixed local assets, with text-node rendering and hashed scripts/styles.
- [ ] Exercise incorrect/missing answers, hint progression, explicit reveal, restart, final completion, story change and narrow/desktop focus without external requests.
- [ ] Run root test/build commands; report unavailable dependency failures, never substitute a focused pass for full verification.
- [ ] Publish stacked draft PR, request available independent review, inspect exact-head CI and leave unproven gates open.

## Execution ledger

Baseline source tree and actual GitHub commit recovered and hash-verified. Existing castle tests: 70 passed. Full package installation unavailable locally: `npm ci --offline` fails on uncached youch-core 0.3.3. This is an environment limitation, not a green build. No dependencies have been changed. Work occurs in a dedicated linked worktree; GitHub connector remains publication authority.
