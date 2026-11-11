# Finished-family navigation label

The next-puzzle action opens the family list when no unsolved puzzle remains. Its completion dialog, completed-board card and record dialog now say “View family list” in that case; unfinished families retain “Another puzzle”. Navigation reuses the same selection function as the labels.

On the unmodified build, the finished-family browser regression failed because the dialog said “Another puzzle”. On the changed web build it passed through real controls at simulated 390px and 1280px, including the family-list navigation and record dialog. The core-cabinet suite passed 59 checks before the final focused assertions; the separate UI suite passed 307 checks. Screenshots were inspected at both widths. These are local browser results, not physical-device evidence.

The formatted web build reported 135,653 JavaScript gzip bytes against the unchanged 135,680-byte ceiling; final clean-head builds and hosted checks remain required. See `HUMAN_TODO.md` for physical-device and owner actions.
