# Mobile UX continuation plan

## 1. Review this foundation

Keep `?ux=house` opt-in. Run production verification, source and hosted browser suites, optional-pack offline tests and representative screenshot review. Independently review bridge ownership, focus/routes and escaped imported text. No deployment in this PR. Complete physical gates in HUMAN_TODO rather than closing them from browser emulation.

## 2. Apply components inside real games

Prioritise phone-sized game controls before more homepage decoration. Inventory each engine's primary gesture, undo, candidate/mark mode, hint ladder, restart confirmation and completion destination. Design a reachable tool area with explicit active state, preserving domain-specific controls. Test 320 px, large text, long clues, held pointers, cancelled drag and orientation. Game/save changes need their own reviewable PR.

## 3. Connect mystery to canonical progression

Use existing Wrenmere content/evidence/store schemas. Promote an approved study into an authored chapter only with versioned save migration and replay/import validation. Retain non-visual exploration and spoiler-safe continuation. No hidden gesture or novelty door should block ordinary puzzles. Measure line assets on low-end phones before adding scene art.

## 4. Measure rollout

Establish baselines first. Proposed measures: entry-to-first-legal-move time, successful unassisted resume, navigation errors, accidental restarts, filter abandonment, hint comprehension, keyboard-only task completion, focus obstruction, layout shift, longest input task, cold/warm bytes, image memory and battery-sensitive motion. Do not infer retention or claim percentage improvement from screenshots.

Observe first-time puzzle start, exact-state resume, unfinished-family discovery, optional clue comprehension and preference changes followed by return to play. Record failures, not only satisfaction. Telemetry stays separately opted-in and content-free under the existing Observatory policy.

## Capacitor

Coordinate with PR #137 and CAP-02/03/04. Shared web UI remains authoritative; lifecycle/back/insets/haptics ports must not introduce another navigation/save owner. Native packaging does not solve oversized images, blocked input or confusing toolbars. Physical Android/TalkBack/recovery/Play gates stay separate.
