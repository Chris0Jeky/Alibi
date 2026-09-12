# Wrenmere Desk source prototype

Generate from current checked-in sources: `node tools/preview-house.cjs house-preview.html`.

Open the HTML in a browser and use Desk, Puzzles, House, Notes and Comfort. Start a real cabinet puzzle, make a move, return and resume. Open the envelope, inspect rooms and compare observations in Notes. Try filtering, changing appearance/text size and returning from a game.

Primary review viewport: 390 x 844, then 320/360/430; desktop expansion 768/1440. Browser suites regenerate screenshots from these actual components, not illustrative mockups. `tests/browser_house_mobile.py` captures phone desk/finder/room/filter/observation/night screens. CI uploads preview HTML, screenshots, JSON receipts and build sizes as review artifacts.

This self-contained file is a source harness, not a production PWA. It labels unavailable optional castle/media packs and does not assert durable storage or native behaviour. The small desk mystery is session-only in all builds. Full assets and strict-CSP/offline checks use `npm run build && npm start`.
