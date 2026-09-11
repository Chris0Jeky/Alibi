# Acceptance and evidence matrix

**No native acceptance result is claimed by this document.** CAP issues implement the tests; [VERIFICATION.md](VERIFICATION.md) records only checks actually executed for the planning package. Public release requires reviewed evidence tied to the exact candidate, not a checked box in a prose plan.

## Evidence levels

- **Plan:** contracts, dependencies and examples are internally consistent.
- **Unit/fixture:** deterministic code or fault-injected adapter tests passed.
- **Browser:** actual DOM controls/storage/SW ran in a browser; a phone viewport is still browser evidence.
- **Android emulator:** real Activity/WebView/plugin and installer behaviour ran in an emulator.
- **Physical Android:** named device, OS/WebView, interaction and accessibility outcomes were observed.
- **Play:** the exact artifact was uploaded/accepted/distributed through the intended track.

Evidence at one level never silently substitutes for a higher one. Existing physical issues #2, #11, #13 and #118 stay open until their own device conditions are met.

## Required scenario matrix

| ID | Scenario / invariant | Minimum evidence | Work package |
| --- | --- | --- | --- |
| A01 | Shared rules and published replay fixtures are identical on both targets | Unit + browser + emulator sample | CAP-02, CAP-04 |
| A02 | Android does not register/wait for the PWA SW; web keeps explicit activation | Build audit + browser + emulator | CAP-02 |
| A03 | First native install in airplane mode can open every advertised game/activity | Packaged-file closure + emulator + phone | CAP-04, CAP-07 |
| A04 | Independent boot recovery appears after bounded storage failure; no permanent splash | Fault injection + emulator + affected phone | CAP-04, CAP-08 |
| A05 | All five save domains are inventoried even when activities are unloaded | Unit + real-origin browser + emulator | CAP-05 |
| A06 | Committed DB state and native checkpoint acknowledgements remain distinct | Fault injection + process restart | CAP-05 |
| A07 | Corrupt/future/stale checkpoint cannot replace healthy newer state | Unit + emulator | CAP-05 |
| A08 | Data survives accepted-move, navigation and kill/restart boundaries without invented progress | Emulator + phone | CAP-05, CAP-08 |
| A09 | Transfer from both current web origins includes all supported sections and reports omissions | Browser + emulator + phone/file provider | CAP-06 |
| A10 | Cancelled/repeated/partial import preserves data and recovery; no duplicate rewards/notes | Unit + browser + emulator | CAP-06 |
| A11 | Process recreation while picker is open returns once to review, not automatic overwrite | Emulator + phone | CAP-06, CAP-08 |
| A12 | Bad MIME/hash/size/path, low space and interrupted media activation retain fallback | Fault injection + emulator | CAP-07 |
| A13 | Touch drop commits once; OS cancellation commits nothing; edge/pinch/pan behave correctly | Browser controls + emulator + phone | CAP-08, CAP-09 |
| A14 | Back resolves gesture/modal/sheet/route/root correctly and never traps user | Emulator + phone with gesture/button navigation | CAP-08 |
| A15 | TalkBack, keyboard, enlarged text, reduced motion and focus restoration work | Browser semantics + physical accessibility review | CAP-09 |
| A16 | Insets/IME/cutout/landscape/resizable windows keep controls usable | Emulator matrix + representative phones/tablet | CAP-08, CAP-09 |
| A17 | Audio/haptics honour settings, interruptions and backgrounding; silent path remains complete | Unit + physical review | CAP-09 |
| A18 | Startup/input/frame/memory/thermal performance is measured against same PWA source | Profiled physical devices | CAP-09 |
| A19 | Final config/manifest has no remote main URL, debug bridge, broad providers or unexpected permissions | Artifact inspection + adversarial fixtures | CAP-10, CAP-11 |
| A20 | No unexpected collection; backup/transfer policy matches observed behaviour | Network capture + device restore tests + disclosure review | CAP-10 |
| A21 | Untrusted PRs have no release credentials; trusted release verifies artifact origin/digest | Workflow review + isolated dry run | CAP-11, CAP-12 |
| A22 | Unique versionCode, safe upload retry and exact-AAB promotion work | Internal-track proof | CAP-12 |
| A23 | Previous accepted and bad-build fixtures upgrade to candidate without uninstall/data clear | Bundle/APK emulator upgrade + phone sample | CAP-11, CAP-14 |
| A24 | 16 KB/ABI compatibility and supported WebView feature floor are checked | Final dependency/ELF inventory + appropriate emulator | CAP-04, CAP-11 |
| A25 | Store metadata, privacy, rating and current account/testing requirements match the binary | Console review + real closed-test record | CAP-13 |
| A26 | Bad release can be halted and repaired by compatible higher-code update | Synthetic incident drill + internal track | CAP-14 |

A failed critical condition blocks promotion even when another lane is green. An unsupported optional enhancement may degrade safely only if its fallback is part of the advertised contract. An inaccessible core puzzle, missing save domain or silent data loss is not an optional limitation.

## Test fixture catalogue

Build a versioned, synthetic fixture set rather than saving a maintainer's private game state in CI:

| Fixture | Contents |
| --- | --- |
| `empty-v1` | Fresh five-domain installation and no exports |
| `mature-v1` | Unfinished and solved puzzles, custom pack, notes, undo/redo, Club records, realm/garden, castle notebook, several challenge replays |
| `legacy-reader` | Existing published compatibility fixtures and older supported export envelopes |
| `future-protected` | Unknown fields, future schemas, unrecognized domain IDs and unsupported rules revisions |
| `conflict` | Destination edited after import preview; two writers/checkpoint generations |
| `partial-transfer` | Four-section legacy backup plus separate challenges, and a deliberately unreadable section |
| `asset-faults` | Missing HD file, wrong MIME, bad hash, truncation, oversized body, failed staging, revoked provider access |
| `process-boundaries` | Kill after DB commit, during vault staging, after document result, before/after each per-domain restore |
| `long-session` | Repeated scene completions, large Nonogram, dense realm and media transitions |

Keep expected semantic results, not just snapshots of rendered pixels. Decode/import time and memory are bounded in the tests. No skipped assertion should silently become a passing native acceptance claim.

## Device matrix

Start with a modest supported Android phone, a high-refresh phone and an emulator at the chosen platform floor. Add the current target OS, 16 KB environment, tablet/resizable window and at least one different OEM file-provider/backup behaviour where supported. Record actual devices before publishing a support matrix.

The framework minimum is not automatically Alibi's support floor. Audit all boot/runtime APIs and graceful fallbacks; select the minimum WebView from observed compatibility. The example config's candidate floor is not certified. Devices unable to run core functionality need a clear unsupported/recovery path, not blank content.

For performance comparisons, use matching source/content, clean cold/warm conditions, recorded power/thermal state and repeated trials. Do not compare an optimized desktop PWA against a debug emulator and call it an Android benchmark. Numerical targets in [NATIVE-UX.md](NATIVE-UX.md) are review goals, not reported results.

## Sanitized evidence receipt template

```json
{
  "scenario": "A13",
  "status": "not-run",
  "sourceSha": null,
  "payloadSha256": null,
  "aabSha256": null,
  "versionCode": null,
  "target": "android",
  "evidenceLevel": "physical-android",
  "device": null,
  "androidVersion": null,
  "webViewVersion": null,
  "fixtureRevision": null,
  "observedAt": null,
  "reviewer": null,
  "resultSummary": null,
  "sanitizedArtifactReference": null
}
```

A successful receipt requires exact non-null identifiers, the observation, scope/limitations and a reviewer. A test on one device is not evidence for all devices. Public receipts omit tester contacts, account documents, private save content and secret-bearing logs. Restricted evidence may be referenced by a non-sensitive identifier.

## Production gates

The machine-readable [plan.json](plan.json) starts with every release gate unresolved:

1. Approved publisher/package/signing ownership.
2. Verified toolchain, bundled asset closure and supported runtime floor.
3. Save durability, recovery and complete supported transfer.
4. Physical interaction/accessibility/performance acceptance, including existing freeze follow-ups.
5. Native security, network, automatic-backup policy and privacy disclosure review.
6. Exact-artifact CI/signing/internal delivery and upgrade/repair drill.
7. Current Play account/testing/listing/policy approval and an explicit release approver.

The validator's `--release` mode must fail for this planning snapshot. Passing its structure checks cannot confer production permission or substitute for evidence. When implementation arrives, release gating must inspect artifacts and signed/approved receipts, not trust a mutable boolean in this documentation.

## Failure drills before first launch

Run at least: interrupted checkpoint replacement; partial cross-domain restore; process death during the picker; missing/corrupted asset pack; native startup failure with readable old saves; interrupted Play upload; bad-build halt and higher-versionCode repair. Document expected user recovery, observed persisted state and any manual step. Never erase real user data to make the drill pass.
