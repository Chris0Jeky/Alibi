# Asset integration candidate

The owner's second asset pass brings the produced library into the player experience.
Work stays local on `codex/asset-library`; no push or deployment is authorized by this pass.

Field notes lives at `#/quiet/folio`, within the existing lazy Quiet Wing. Three composed
scenes and forty-three modules have deliberate 3D controls and an illustrated fallback. Four
companion expression sets, twenty cues, four atmospheres and all eight film cuts are
available in their own browsing sections. Films never autoplay or join the offline pack.
The field-notes offline button caches artwork, geometry and audio explicitly, in bounded
batches. Puzzle startup requests none of these files. Source masters remain in the library.

Quiet Wing actions use the produced cues when the existing sound setting is enabled.
Background atmosphere is a deliberate, session-only selection. Mute, hidden-page and
disposal paths stop playback. Companion actions use the layered expression art as their
illustrated fallback while retaining the animated 3D portraits and saved identities.

The four new room illustrations appear on home and activity surfaces; six distinct fictional
club portraits appear in Field notes. Eight existing saved building types use compact library
geometry, including the new boat, slatted bench and fountain-style well. Models and scenes
retain editable SVG/Blender sources, measurements and provenance.

The main JavaScript is minified with the existing pinned esbuild dependency. Final build
`a08ee0dba82d` has a 1,259,087-byte core pack and 111,373-byte gzip JavaScript: 103,722 and
15,891 bytes smaller than the first pass. Existing budgets remain unchanged. The automatic
Quiet Wing pack is 2,189,871 bytes; Field notes offers a separate explicit 7,393,439-byte offline
copy. The full static distribution is 27,635,236 bytes, including films that load only on playback.

`npm run verify` passes (52 Node entries plus existing parameterized contracts). Browser checks:
182 puzzles, 106 Club, 156 Quiet Wing, 92 real-origin, 18 two-release update, 40 Quiet Wing origin,
28 realm controls, 14 GPU/lifecycle, and 45 new integrated experience checks. These cover actual
3D controls, all film cuts, expression selection, native media mute, hidden-page audio pause,
an explicit offline copy/reload, narrow layout and standalone fallback. Screenshots were inspected.
The final rebuild differs from the last behaviour run only in credits wording and the additional
independent-pack contract test. See the [integration ledger](../assets-source/library/integration-ledger.json).

Independent review found absent optional media references in the single-file preview. Those paths
are now gated to the full browser edition, with a passing browser regression. Its unused generation
counter observation is non-blocking; it does not change disposal or request cancellation.

Rebuild with `npm run build`; run `npm start` and open `http://127.0.0.1:8787/#/quiet/folio`.
The source gallery remains on port 8790 with `npm run assets:gallery`. No push or deployment was
performed. The separate curation task's `alibi-curation/` and `.curation-worktrees/` are preserved.

Physical-device performance, auditory acceptance, TalkBack and external editor import are
still open in [HUMAN_TODO.md](../HUMAN_TODO.md). No source licence decision is inferred.
