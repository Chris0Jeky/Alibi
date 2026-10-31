# The tool-hatch lexicon

An original, standalone reasoning experiment for issue #449. Eight newly drawn geometric marks,
four labelled workshop exchanges, and one unseen composition. The visible neutral shape names
carry exactly the same symbol identity as the drawings. No cultural script, artwork, font,
colour inference, outside vocabulary, import or runtime AI is needed.

Serve this directory with any local static HTTP server and open `index.html`. The experiment
does not register with Alibi, ship in its release ZIP, use storage, or contact another origin.
Interaction works after loading while offline; reload still needs the source server. Restart
and reload clear all rehearsal state. The dictionary-only comparison is `control.html`.

## Explicit grammar class

The scaffolding identifies symbol groups but leaves their meanings open. Workshop marks form
a bijection with Lark/Moss; tool marks with bowl/lamp/spoon; relation marks with owns/requests.
The count mark means one or two; an unmarked tool means one. Clause order is either
workshop–relation–tool phrase or tool phrase–relation–workshop. Count-marker position is independently
before/after its tool: moving a phrase does **not** reverse that phrase.

There are exactly `2! × 3! × 2! × 2 × 2 × 2 = 192` candidates. Teaching prefixes retain
192, 8, 4, 4 and 1 candidates. The third card offers another compositional example without
further narrowing the class. The unseen construction appears in none of the four cards.

After two cards, two candidates parse the unseen construction as one/two lamps, and two reject
its syntax. All four remain in the denominator. A reading is supported only when **every**
compatible grammar parses it that way. A reading with some support is possible; no support
is contradicted. Zero compatible grammars or no parsed readings yields unavailable. Malformed
or over-bound evidence is refused. These are claims within the stated finite class, not about
all imaginable languages.

The answer checker takes only the proposed semantic reading and shown evidence. It never
uses the player's dictionary or a final-answer mapping. A contradictory or incomplete
dictionary stays editable. Hints inspect only shown observations; the separately requested
reveal computes agreement across compatible grammars and reports remaining readings/refusals.
The authored dictionary appears only in the explicitly spoiler-bearing comparison sheet.

## Qualification

`node --test tests/glyph-grammar.test.mjs` checks every candidate and all 4,608 generated
utterances using an independent meaning-to-utterance oracle, each prefix, conflicts and invalid
input, draft independence, reset and hint boundaries. Swapping workshop meanings in the
observations changes the certified answer. A recorded sensitivity run replacing unanimous
support with any support failed the two false-certainty tests before the correct condition
was restored.

`python tests/browser_glyph_grammar.py` uses actual native controls at 320, 390 and 1440 pixels
with story on/off. It checks revising duplicates, partial evidence, both possible quantities,
contradiction/support, keyboard/focus, hints/reveal, independent restart and reload clearing,
offline-after-load interaction, dictionary-only views and external-request refusal. Its receipt
binds PNG/ARIA and copied inputs to the Git head and SHA256 hashes. A completed receipt requires
all journeys to pass. Use a fresh output directory; CI supplies a fresh checkout. The dedicated
workflow uploads only that bounded proof directory, including its copied workflow input.

The normal hosted repository ritual covers integration/release exclusion. Browser simulation
does not establish physical assistive-technology accessibility, human learning, or deployment.

## Consented human comparison remains open

Use separate consenting participants for observation and dictionary conditions, or document a
counterbalanced protocol and explicitly account for carry-over: showing both can teach the answer.
Keep time, wording and access to the rule scaffold comparable. In the observation condition,
ask for an explanation before reveal, including what the first two cards leave open. In the
control condition, provide the dictionary and ordering rule, then the same unseen construction.
Record only consented explanations and necessary observations outside this app; it collects none.

Compare how participants justify the unseen reading, revise mistaken interpretations, and describe
uncertainty. Correct clicks alone are insufficient. Report who saw a reveal or the other condition;
do not interpret their later correctness as independent transfer. One tiny, explicitly scaffolded
language supports no broad learning-effect claim. If success depends on opaque guessing or outside
vocabulary, stop expansion. Issue #449 stays open for this human evidence and a separate promotion
decision. Release, sharing, physical Android/TalkBack and publisher/signing gates remain separate.
