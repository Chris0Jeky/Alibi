# Puzzle traditions and source decisions

Tidal bridges follows Hashi rules. Alibi's JavaScript engine, eight island maps, renderer,
lesson and reasoning hints are original. No third-party engine, level data or manual is bundled.

Research on 2026-09-08 considered these primary sources:

| Source | Verified license / revision | Decision |
| --- | --- | --- |
| [Simon Tatham's Portable Puzzle Collection](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) | [MIT](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/licence.html), `38e7ea3212748cebb17e277b98b7fad3a2dd3b3e` | Credit the [Bridges rules](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/bridges.html); link to the collection from Credits. A C/WASM import would add a second engine stack. |
| [kmay89/puzzles](https://github.com/kmay89/puzzles/tree/cdd1eeff3be17d92a48f325709c7698f6f2c6899) | [MIT](https://github.com/kmay89/puzzles/blob/cdd1eeff3be17d92a48f325709c7698f6f2c6899/LICENSE) | Studied its vanilla-JS/offline and seeded-generation approach; no code copied. |
| [Gugatb/puzzles](https://github.com/Gugatb/puzzles/tree/d9a21074422a3c69d87920c5d999d31aa9cf1f6b) | [MIT](https://github.com/Gugatb/puzzles/blob/d9a21074422a3c69d87920c5d999d31aa9cf1f6b/LICENSE) | Touch/offline collection; not embedded because of its additional WASM/Vite architecture and stated testing limitations. |

External links open another website. Its progress, hosting, accessibility and offline behavior
are separate from Alibi. No external website is required for Alibi gameplay.

If code is imported later, pin the exact files and revision, retain their full copyright and
license notices, and verify data/artwork rights separately. Alibi's own source license remains
an owner decision in [HUMAN_TODO.md](../HUMAN_TODO.md).
