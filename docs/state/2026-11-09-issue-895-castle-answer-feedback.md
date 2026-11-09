# Castle answer feedback (#895)

## Changed

Failed answers now identify the relevant existing constraint or reasoning hint in the Gatehouse, Library, Orangery, Lo Shu, Bridges and Ur, and distinguish a route that has not reached the tower from one that arrives too late in the Map Room. The Orangery reports the number of unlit lanterns. The engine derives the feedback from the submitted board without looking at the worked answer; clock and inference retain their existing specific feedback. Factored repeated room data values and selectors to retain the existing size ceilings; all room records compare equal to the base.

## Evidence and limits

The new engine regression failed on the original generic message and passed after the change; 44 focused Castle tests passed. The clean-source Android build and budget subtests passed. The emitted Castle script is 101,080 / 101,120 bytes; the separate case player is 16,443 bytes (strictly under 16,448). Existing room records matched the base as JSON. Browser acceptance now checks all seven through actual controls, including keyboard Enter, status semantics, 390px touch emulation, and both route outcomes, but this environment had no browser executable; CI/browser artifacts remain required. The complete verify result is recorded separately in the integration report.

Feedback for Lo Shu and some other cases points to a violated rule or reasoning step rather than naming every offending cell or line. Physical touch and screen-reader speech remain unverified. No production deploy was performed; the release decision and phone checks in HUMAN_TODO remain open.
