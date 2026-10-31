# The lantern reports: contradiction cabinet

Original fictional standalone experiment for #450. Open it through a local static
server, for example from the repository root:

```sh
python -m http.server 8788 --bind 127.0.0.1 --directory prototypes/contradiction-cabinet
```

Visit `http://127.0.0.1:8788`. The page uses native checkboxes and a three-row table.
There is no app registration, external asset, sound, timer, save, account or
telemetry. Once loaded, interactions need no connection. Reload clears the rehearsal
and needs the local source server; this is not an installed offline PWA.

## Model and player actions

All five reports concern the same instant. Each of three named lanterns is either
lit or dark, giving exactly eight possible worlds. The circuit reports mean
"not both lit", not "exactly one lit". Optional story prose changes none of this.

The first task asks for a globally smallest inconsistent group. R1/R2/R3 and
R1/R4/R5 are the two answers, each of size three. Every pair has an admissible
world. The full set is inconsistent but is not smallest. Inconsistency identifies
incompatible reports, not a liar or the report that is actually mistaken.

"Inclusion-minimal" only means removing any member makes a group consistent.
Another inclusion-minimal group can still be smaller. The separate regression
fixture contains both a conflicting pair and an inclusion-minimal triple; only
the pair is accepted as globally smallest.

The second task keeps R2/R3/R5 fixed, independent of any first-task selection.
Two worlds fit: East dark, West lit, with Stair either dark or lit. The player must
construct a world that fits every premise and falsifies "Stair must have been lit".
Incomplete states, broken premises and states supporting the claim are refused.
If premises have no admissible worlds, the evaluator returns `no-worlds` and does
not fabricate a counterexample. The empty premise set admits all eight worlds.

The model uses trusted authored predicates, at most six reports and eight worlds.
It accepts no imported or evaluated predicate text. `tools/case-model.cjs` supplies
the repository's bounded-model convention, not a browser dependency or a new schema.
Hints explain how to reason; worked explanations require the separate Reveal control.
Selections and state can be revised freely; Restart and reload clear the rehearsal.

## Proof and limits

```sh
node --test tests/contradiction-cabinet.test.mjs
python tests/browser_contradiction_cabinet.py
```

The Node oracle independently enumerates Boolean assignments with nested loops and
arithmetic truth conditions, checking all 32 report subsets. Browser proof uses
actual controls at 320, 390 and 1440 pixels in both story modes. Its successful
receipt under `test-results/contradiction-cabinet/` binds source hashes, copied source,
screenshots, ARIA, native keyboard/focus, negative and positive controls, offline
interaction and local-origin reload. A partial failed artifact is not a passing
receipt. The dedicated workflow checks the exact PR head and retains failures.

This is technical proof against explicit predicates. It does not establish that
the prose-to-predicate translation is fair or that people understand it. Independent
content review checks that translation; real player explanations remain necessary.

## Human experiment before promotion

With a consenting player, ask for an explanation before revealing the worked
answers: why each selected report matters, why a smaller group cannot conflict,
and why the proposed world fits every fixed premise while defeating "must".
Observe whether the player can accept the other valid triple and distinguish a
possible state from the actual historical state. Record only observations the
player agrees to share; no automatic collection exists.

Stop expanding if selecting everything succeeds or the controls obscure the
inference. Technical correctness alone does not justify production integration,
additional content or improved-learning claims. Keep #450 open for these human
observations and a separate promotion decision. Existing HUMAN_TODO gates remain.
