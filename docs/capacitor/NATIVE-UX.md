# Native UX and game feel

**Proposed implementation: #130 and #131.** Packaging provides a host, not a performance fix. The first Android release should feel deliberate in its touch response, interruptions, navigation and recovery while preserving the accessible PWA.

## Interaction model

Keep puzzle reducers deterministic and independent of animation. Use a retained interaction surface per active game. Pointer movement updates only presentation state; an accepted release produces one validated command. A cancelled gesture produces none. Feedback consumes accepted events and never becomes a prerequisite for scoring or persistence.

For Block Cabinet, the target behaviour is a piece that follows the finger, lifts enough to reveal the drop area, shows the complete candidate footprint and prospective clear, rejects illegal placements without consuming the piece, and settles with restrained visual/audio/haptic feedback. Tap-to-select/place and keyboard operations remain complete alternatives. Do not copy a competitor's art or interface assets.

The native host should improve haptic availability, file handling and lifecycle integration. It will not automatically make HTML/CSS/Canvas faster. The merged #115/#117 Block Cabinet surface is a shared web seam, but its separate Cascade replay store remains outside the first native transfer until the explicit CAP-05/CAP-06 route is verified.

## A single lifecycle owner

Use an app-level coordinator with an owned listener lease and an active-scene handle. Route transitions already have serialization/disposal in `src/activities.js`; extend that contract rather than inventing a competing lifecycle. App API behaviours are documented in [S03](SOURCES.md#s03--device-apis).

| Event | Required work | Forbidden shortcut |
| --- | --- | --- |
| Cold launch | Bounded boot, capability check, committed-state hydration, requested safe route | Infinite splash waiting for network/SW |
| Background/pause | Cancel drag, suspend feedback/rendering, release transient resources, request bounded flush/checkpoint | Assume this callback always happens before process death |
| Resume | Check actual saved state, reconcile pending picker result, remeasure insets and scene resources | Replay a stale pointer-up or silently apply new content |
| Route leave | Finish/cancel command boundary, flush as required, dispose scene listeners/workers/audio | Use global `removeAllListeners` and break another feature |
| Process recreation | Restore a valid checkpoint of navigation and committed progress; show recovery if protected | Restore arbitrary serialized DOM or optimistic state as authoritative |
| WebView renderer loss | Retain native shell/diagnostics, offer controlled restart/recovery | Clear the WebView's data store to make it boot |

Save accepted state transitions as they occur. Visibility/background handling adds an opportunity to finish work; it is not the durability mechanism. A native lifecycle callback can arrive while an asynchronous scene mount or export is in progress. Serialize operations with generation tokens so late results cannot mount a disposed scene or overwrite newer state.

### External activity results

A document picker may outlive the app process. Register the App restored-result handler early, but only accept allowlisted plugin/method results tied to a pending operation. Reopen the appropriate review page; do not automatically restore files merely because the OS returned a URI. The selected document adapter must support persistence of the native call. The acceptance suite must kill/recreate the process while the picker is open.

## Back and navigation

One coordinator resolves back in this order:

1. Cancel a current gesture or transient placement preview.
2. Close the top modal/review sheet without committing cancelled work.
3. Close the current drawer/menu/inspector.
4. Navigate through the app's own validated route history, restoring the originating control.
5. At the true root, use the normal Android exit/minimize behaviour rather than trapping the user.

An App `backButton` listener replaces the default handler; therefore the root behaviour must be implemented and tested. Do not call `history.back()` blindly into an external or untrusted entry. Test button navigation and gesture/predictive back on the actual supported Android versions, including a cancelled predictive gesture.

Keep current hash routes internally. Public App Links are optional later; they require an approved domain, verified associations and the actual Play distribution certificate set. Normalize and allowlist route IDs and parameters. Reject arbitrary `url`, native method, local path and script parameters. Credits, support and privacy links open outside the privileged WebView; returning must not lose the active game.

## Insets, keyboard and window changes

Capacitor v8's SystemBars API is bundled in core and supports an inset-CSS fallback for older WebViews. Use its documented variables with one layout owner, for example the shell reads `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`. Avoid applying the same inset again inside every board. Verify the actual plugin/version contract rather than copying old StatusBar overlay recipes. See [S03](SOURCES.md#s03--device-apis).

Use a resize-aware layout: board and tray remain reachable above the gesture area; notebooks and import dialogs remain usable above the IME. Recompute gesture geometry after a real resize and cancel active gestures safely. Do not turn every ResizeObserver callback into an unconditional input reset if a selection/status label changes size. Retest this particularly with the retained Block Cabinet surface.

Proposed acceptance viewport floor is 320 dp with horizontal layout alternatives for large boards; this is a test target, not permission to shrink all touch targets to fit. Honour text scaling to 200%, landscape, cutouts, tablets, folding/window resizing and changes in display density. Android's adaptive-layout behaviour evolves; do not rely on forcing portrait orientation to solve layout. [S04](SOURCES.md#s04--android-data-and-security) covers the target-version review.

## Accessibility contract

Every playable action needs a semantic control and meaningful name. Canvas/WebGL may draw visual feedback, but screen readers must still expose pieces, cells, state and the available operation. Large boards may use roving focus, controlled panning or an alternate list; do not create a tiny inaccessible grid just to fit a phone.

Restore focus after placement, undo/redo, modal dismissal and return from castle practice. Announce useful results once, not every pointer move. Legal/illegal/selected/solved states need structural or textual distinctions as well as colour. Keep sound and vibration optional; reduced-motion mode removes decorative travel/particles and excessive camera movement without delaying logical state changes.

Keyboard and assistive controls should use the same game command path as touch. Test TalkBack on a real phone and keyboard in both targets; automated accessibility trees alone are insufficient. Reuse the outstanding #100, #79, #2/#13/#118 work rather than declaring a new wrapper automatically accessible.

## Feedback and audio

Use a small event vocabulary: select, invalid, place, clear, completion. Native haptics maps it to supported effects; missing hardware is a no-op. Rate-limit repetitive effects and honour the user's setting and active/paused state. No haptic or audio call is awaited by a reducer or save commit.

Start with the existing Web Audio/recorded audio where it passes actual-device interruption tests. Require a user gesture where needed, maintain a mute master, cap simultaneous voices, and suspend when the app loses focus. Handle headphones/disconnect, external audio interruptions and return from the picker. A native low-latency audio plugin is a later measured optimization, not an automatic dependency. No background audio service or notifications in the MVP.

## Performance budgets: proposed, not measured claims

Collect a baseline on a modest supported Android phone and a higher-refresh phone using the same source/content build in PWA and Capacitor. Record OS, WebView, memory class, viewport, thermal state, refresh rate, payload digest and scene.

Initial review targets:

| Metric | Proposed target / review trigger |
| --- | --- |
| Normal touch-to-visible acknowledgement | p95 under 50 ms in representative controls; measure end-to-end |
| Active drag/clear | Aim for display-synchronized 60 Hz without persistent jank; do not advertise 120 Hz without evidence |
| Cold launch to usable state | Aim under 3 s on the chosen modest device; separately measure warm launch |
| Idle game surface | No continuous animation loop unless an active effect/scene requires it |
| Repeated scene transitions | No unbounded growth after resources settle; investigate monotonic memory/worker/listener growth |
| 20-minute mixed session | No unacceptable heat, input degradation or continuing background activity |

These are Alibi engineering targets, not store rules or existing results. Measure UI thread, WebView renderer/GPU and total memory; a Canvas draw counter is not FPS, input latency or battery evidence. Keep baseline-relative thresholds for scenes before setting absolute RAM caps.

Optimization order: remove whole-page rerenders from continuous input; batch geometry reads and writes; cache immutable tile/asset preparation; reduce unnecessary style/layout/filter work; bound DPR, particles and decoded resources; move heavy hints/validation to bounded workers; only then consider native computation or a renderer change. #96 is directly relevant to large Nonogram work. Maintain identical game outcomes when changing timing or rendering.

## Physical stop-ship conditions

Unexplained data loss, the known repeated scene-completion freeze on a supported device, inability to recover/import progress, cancelled drops committing, back-navigation traps, inaccessible core controls and persistent serious jank block promotion. Filing a new issue is not acceptance of an existing blocker. Exact device evidence belongs in [ACCEPTANCE.md](ACCEPTANCE.md), not in marketing claims.
