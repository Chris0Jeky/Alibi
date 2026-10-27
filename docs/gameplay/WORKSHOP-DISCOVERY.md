# Workshop collection discovery

Refs #433 and the owner's 3 October 2026 continuation request. This is a bounded
bridge from accepted optional sources to the existing Workshop, not a new save
system, official registry or automatic installer.

## Decision

Keep the explicit data-only import. Publish a small source-bound catalogue and a
same-origin download shelf for the accepted Lattice (24) and Afterlight (10)
collections. A player downloads a JSON file, returns to Workshop > Puzzle packs,
and chooses that file. Existing worker validation, duplicate-ID refusal and local
storage remain authoritative. A download is not an installation.

Three options were considered from #433:

| Approach | Benefit | Cost / decision |
| --- | --- | --- |
| More precached official chunks | Automatic offline library | Consumes startup/offline headroom and changes registration; not this slice |
| On-demand installer with durable status | Best integrated acquisition flow | Needs interruption, migration, conflict and update semantics; retain as #433 follow-up |
| Discoverable downloads + existing import | Makes 34 accepted puzzles accessible without GitHub or new storage | Manual file handoff remains; selected for this slice |

## Source contract

`content/workshop/catalogue.json` is a checked-in build input, never a fetched
runtime trust list. Schema 1 permits 1–12 entries and no unknown fields. Each entry
pins its slug, local JSON basename, exact pack ID/version, byte count, full SHA-256
and bounded plain-text description. No URL, executable content or caller-selected
path is permitted. Pack bytes are bounded by the existing 3 MiB import limit;
non-regular sources and symlinks are refused. UTF-8 decoding is strict.

Before any public output, validate every source and run production pack/rule/
uniqueness validation. Reject duplicate optional slugs, sources and pack IDs,
and puzzle-ID collisions across optional packs and the complete official catalogue. Public metadata contains only
collection identity, title/description, provisional difficulty status, family
counts, download location, size and full digest. It excludes solutions, blueprints,
reasoning notes, private saves and unknown metadata. Keep original JSON bytes.
A digest identifies reviewed bytes; it does not confer official-puzzle status.

The two accepted definitions are immutable here. Interlock #427 is deliberately
not advertised while its separate delivery qualification is blocked. Adding a
collection requires a separately reviewed manifest/source change.

## Delivery and interface boundary

The following integration slice emits a script-free `collections/index.html`, a
small stylesheet, metadata and content-addressed JSON downloads. Nothing is
fetched until a player follows the shelf link or downloads a pack. Existing app
and pack-import controls are reused; no remote assets, network service, telemetry,
implicit installation or private-data export are added.

The shelf makes no dynamic installed/offline claim. Explain the manual handoff,
possible network requirement and provisional labels. Browser file/Android native
download semantics need their own acceptance; do not advertise an unsupported
link in standalone/native targets. Keyboard, 320px portrait and short landscape
must have ordinary labelled links, visible focus and no clipped content.

New downloadable bytes must appear in total output and a named optional-byte
measurement, stay outside core precache, and be subtracted from core accounting
exactly once. Do not increase any existing numerical ceiling or hide them from
release/Android payload indexes. Build tests must sum actual emitted files and
verify hashes, no startup inclusion and unchanged official definitions.

## Evidence and remaining scope

The first PR contains the manifest, validator, adversarial tests and this plan.
It does not yet expose a player route or claim browser acceptance. A second PR
will integrate the static shelf, app entry point and actual-origin import tests.
Existing source tests are machine evidence, not human difficulty calibration or
physical Android/TalkBack acceptance. Those remain in HUMAN_TODO.md.

The eventual direct installer must still cover cancellation, interrupted/corrupt
content, concurrent tabs, old/future definitions, installed availability and
recovery through one existing save authority. Keep #433 open after this slice.

### Foundation source verification

The source policy/reader has 38 passing tests. With the retained Afterlight and
Lattice authoring suites, 116 cases pass with no skips or failures. The first
pre-implementation run failed because the module did not yet exist; this is not
a claim that all 38 adversarial cases were separately observed failing. A valid
5×5 ambiguous drawing proves production uniqueness is checked after its matching
digest, not merely that malformed input is refused. The read-only CLI reproduces
the public metadata. Full clean-head CI and independent review remain required.

Local source was reconciled to merged #567, canonical tree
7cc61bcbd5533de2d42f1704ab4e9116575308f1; local Git commits are reconstruction
identities, not hosted release identities. No application build or player-facing
change is claimed by the foundation. The next integration must retain measured
byte accounting, actual browser controls and physical-device limits above.

### Integration ruling

The source-pinned catalogue now feeds five outputs: an HTML page under
collections/ and data, metadata and a stylesheet under assets/workshop/. Putting
the data and style under assets/ keeps them in the existing complete runtime
payload digest, without extending that identity contract or precaching them.

The entry uses the build pipeline's existing source-composition stage, scoped by
explicit packDesk/authorGuide boundaries and one-match copy guards. It adds one
ordinary browser-only link and shortens equivalent duplicate pack-desk wording.
It changes no importer handlers, route ownership, saved data or runtime globals;
there is no observer. Unknown upstream boundaries/copy fail the build rather than
silently omitting the link. The unchanged src/app.js and its source catalogue
receipts are retained; composed behavior is tested explicitly and through the
actual built application. This replaces the plan's direct monolith edit, avoiding
a second runtime integration hook. The coupling to exact copy is deliberate and
must be reviewed when that copy changes. Native/standalone targets hide the link.

## 2026-10-26: in-app adding (first slice of option b)

Decision: players add a curated collection from Workshop > Puzzle packs > **Add a
curated collection** without handling a file. The build emits one optional module,
`assets/workshop/add.<hash>.js`, beside the packs. It carries the same hashed listing
the shelf publishes (id, title, counts, download name, byte count, SHA-256), so there
is no separately fetched trust list. On request it downloads one pack from its own
directory (`redirect: 'error'`, same-origin credentials), stops reading as soon as the
stream exceeds the listed size, requires the exact size and SHA-256, and only then
hands the bytes to the existing `#pack-input` change path. Installation therefore
keeps every existing control: bounded worker validation, the 3 MB / 150-puzzle limit,
duplicate pack and puzzle-ID refusal, the 3,000-puzzle cap, route ownership and the
one IndexedDB save owner. A matching digest proves reviewed bytes, not official
status: added packs remain locally imported packs with their published IDs.

Why this shape: the application bundle had 58 gzip bytes and the precached shell 31
raw bytes of headroom, so neither a listing nor a downloader fits in startup code. The
composition stage replaces the old shelf link with one button and inserts one action
(`import()` of the module, resolved against the application script's `./assets/` URL).
Measured on main 1c4272fd vs this branch head (same machine, `npm run build:android`; gzip
figures move by a byte or two between commits because the bundle embeds build identities):

| Measure (budget) | Before | After |
| --- | ---: | ---: |
| Application JS gzip (< 135,808) | 135,750 | 135,750 |
| Precached shell bytes (< 1,419,736.32) | 1,419,705 | 1,419,720 |
| Initial code + content gzip (< 225,280) | 204,973 | 204,974 |
| Deferred official gzip (< 32,768) | 21,266 | 21,266 |
| Core offline bytes (< 2.3 MiB) | 1,937,324 | 1,937,339 |
| Optional collection bytes (reported, not precached) | 38,389 | 42,611 |

The adder is 4,222 bytes (2,168 gzip), counted in `workshopCollectionBytes`,
excluded from core precache and startup, and held under a new 3 KiB gzip check. No
existing ceiling changed. Offline, the adder states that adding needs a connection;
if the module itself was never fetched, the browser's import error is toasted instead.
Nothing is written until the existing importer accepts the pack.

Still open under #433: a durable installed/available index (the adder cannot see
installed packs and relies on the importer's duplicate refusal), cancellation of an
in-flight download, cross-tab install coordination (manual import has the same gap),
old/future definition handling, device-memory measurements, and #389's pending-load
and content-identity gaps. Escape rooms (#467) can reuse the same pattern with their
own listing and owner: a hashed module carrying room digests, the same bounded
`fetchPack`, and the Castle validator instead of `#pack-input`.
