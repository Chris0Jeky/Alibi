# Mobile component contracts

## Primary decisions

**Play is the first useful action.** One canonical start/resume control, before artwork; no duplicate desktop/mobile CTAs. The card uses real saved state, not invented streaks, urgency or completion percentages.

**Five stable destinations.** Desk, Puzzles, House, Notes and Comfort use original SVG icons, readable labels, full accessible names and non-colour-only current-page treatment. The dock includes safe-area padding. Short landscape puts it in normal flow; observed virtual-keyboard contraction hides it. The focus guard keeps focused content clear of a fixed dock. No swipe is required.

**Search stays visible; refinements have a draft.** Enter and a named submit button both search. Gentle/In progress links preserve other filters. The native filter sheet starts at the first select, uses `showModal`, and provides three labelled choices, Reset choices and Apply filters. Escape/close discard changes and restore focus. Apply commits one URL transition and restores the opener, including unchanged selections. No-results recovery never touches progress.

**One compact puzzle row.** Family symbol/text, title, editorial difficulty/time, explicit progress and a title-named 48 px launch control. Solved state includes a check and text. Imported titles are escaped. Pagination adds 12 rows and preserves focus. Returning from a game restores browsing depth.

**Rooms are interactive documents.** Each room card has an original engraving and Inspect action, then Observed/read again. The optional floor plan is equivalent, never the only path. Observation sheets repeat the room heading, evidence and session notice. Notebook evidence can be revisited. Semantic observations, not decorative pixels, contain the deduction.

## Tokens and behaviour

`--hx-bg`, `--hx-paper`, `--hx-ink`, `--hx-muted`, `--hx-line`, `--hx-accent` and `--hx-dark` scope paper/forest/brass treatments. Night/contrast/text/motion preferences retain existing owners. Installed system/serif stacks avoid font requests. Borders/focus remain meaningful without images or shadows.

Primary controls use 48 px minimum height; dock targets are at least 44 px wide and 48 px high in tested phone sizes. Inputs use 16 px text. Larger text stacks tight groups. Reduced-motion preferences suppress transitions; forced colours retain boundaries. No automatic audio or new sound file.

Artwork has declared geometry and empty alt because adjacent text carries its meaning. Decode failure preserves text/actions. SVG decorations are aria-hidden and non-focusable; labelled controls expose meaning.

## Acceptance

Automate 320/360/390/430 px phones, 768/1440 px expansion, short landscape, every view with larger text/night/contrast, failed decode, Escape/focus return, filter apply/cancel/reset, pointer/keyboard activation, real engine continuation/undo, unique IDs and no page-wide overflow. Chromium touch emulation is not physical phone certification.

Manual gates: TalkBack/VoiceOver, 200% browser zoom/OS text scaling, actual iOS/Android IME and address-bar expansion, safe areas, low-end frame timing, grip/reach and comprehension. This is not a WCAG conformance statement.

## Primary references, checked 2026-09-12

- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- https://web.dev/learn/design/responsive-images

References guide implementation, not substitute for user or assistive-technology testing.
