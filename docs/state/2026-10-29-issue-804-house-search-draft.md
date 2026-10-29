# #804: keep the House search draft during same-route redraws

The House puzzle search used the committed URL query to render its input. A host
redraw replaces that input; text typed but not submitted was therefore lost. A
controller fixture reproduced the loss before this change. The controller now keeps
only the live query input's transient draft against the exact rendered hash. A
same-route redraw displays that draft; a route transition or disposal clears it.
Detached, stale or not-yet-rendered inputs cannot seed a new route's draft. The
input listener and route listener use the existing controller lifetime.

The committed URL remains the sole filter authority until the search form is
submitted. The separate filter form retains the committed URL query and does not
implicitly submit an unfinished search. No save schema, persistence, global input
restoration, or network behavior changed. The actual-control browser fixture fills
an unmatched query, invokes the real House host redraw, verifies its input and
unchanged URL, then submits and retains the existing empty-results assertion. On
failure it reports bounded synthetic-query, hash, House readiness and page-error
details, then rethrows the original exception.

Focused local tests cover draft/redraw, route exit and return, detached input,
search/filter submission, disposal, the actual view and the House return lifecycle.
The browser fixture compiles but Chromium was unavailable; no full build ran because
disk was exhausted. In-memory existing House minification measured 48,485 raw and
15,778 combined script/CSS gzip bytes, under existing 61,440 and 18,432 ceilings;
exact-head hosted build and real browser checks remain required. Physical Android,
TalkBack and player acceptance remain in HUMAN_TODO.md.

#802 mobile run 40817104658 / job 123260641696 failed an existing unmatched search
assertion; its log did not capture input-value or redraw ordering. This change fixes
an independently reproduced draft-loss defect but does not establish that it caused
the observed failure. The failed attempt and all existing assertions remain intact.
