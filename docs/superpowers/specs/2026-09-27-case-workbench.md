# Evidence-case workbench design

Program #436; authoring epic #437; first slices #440 and #441. Base: a3c6ad9.

## Decision and alternatives

Extend existing castle modules immediately, import an external narrative engine, or validate an isolated data-only specimen first. Choose the third: it permits a real authored case without spending scarce startup bytes, inventing a save owner or rewriting published Chapter I. The eventual adapter remains a separate integration decision. Owner requested implementation without a further design checkpoint; this is a bounded prototype, not approval to release a new chapter.

## Contract

Node 22, existing repository dependencies only. `tools/case-authoring.cjs` accepts UTF-8 JSON with `format: postern-case-1`, `id`, positive safe-integer `revision`, `title`, `intro`, `ending`, `provenance`, `records` and `steps`. Prose pairs use `storyOn` and `storyOff`.

Records have `id`, `title`, `kind` (record/observation/model), `source`, owning step `at` and prose `text`. Steps have `id`, `title`, prose `prompt`, AND prerequisites `requires`, `claims`, three `hints`, and `workedAnswer`. Claims have globally unique `id`, prose `text`, authored `answer` (supported/contradicted/not-established), and `evidence` (alternative exact sufficient record sets). Hints have ordered level orientation/constraint/method, prose `text` and `records`; worked answers have prose `text` and `records`.

Limits: 256 KiB UTF-8 input; 64 records, 16 steps, 64 total claims; 8 alternative evidence sets per claim, 8 citations per set; ID pattern `[a-z][a-z0-9-]{0,47}`; prose 1..1800 characters; titles 1..120; sources/provenance 1..1800. Unknown fields, malformed types, duplicate IDs/references, missing/future records and cyclic prerequisites fail. A step can cite only its own records or prerequisite ancestors, not a completed sibling. Required strings must contain non-whitespace text. All claims require at least one sufficient citation set. Hints may cite zero records; worked answers cite at least one. No interpreted code, HTML or network resources.

The validator is build-time only and does not mutate inputs. A source receipt binds raw UTF-8 bytes, case ID, revision and counts to SHA-256, explicitly `structure-only`. Structural validity does not prove meaning, uniqueness, fairness or rights. A bounded independent semantic model tests the first specimen's verdicts.

## Preview

A later CLI produces a self-contained HTML with a restrictive CSP, native controls, safe text nodes and no external fetches or storage. A pure session reducer gates steps; wrong answers retain drafts and progress; repeated success is idempotent. Hints use projected hint data, never answer fields. Worked answers require a separate deliberate action and never mark completion. Refresh resets the memory-only specimen, visibly disclosed. Story mode changes prose, never answers, access or source identity.

No main route, official pack, save schema, analytics, new dependency, deployment or budget change. Test 320px and desktop keyboard controls plus adversarial strings. Real-device/human acceptance and host integration remain open.
