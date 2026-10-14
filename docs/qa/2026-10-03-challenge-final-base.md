# Challenge current-base receipt

Refs #560 and #416. Main advanced to `299f10efd7ec2aa33f007a8ee2ed68ee96293d32`
after the earlier ten workflow passes. Its release/state notes caused a merge
conflict, so the PR was returned to draft instead of bypassing the merge guard.

Integration `26492c2e37f64c1b13ae574415b404f466391148` incorporates that exact main.
Only `docs/STATE.md` and `docs/RELEASE-0.15.1.md` differ from the reviewed and fully
verified `85825983d3d38413ca67de7052124c84d137b468` source. Every prior parent note
is retained. The nineteen host/readiness cases pass again. No runtime, test,
workflow, content or storage bytes changed during this reconciliation.

Evidence: run `37089582918`, artifact `11261647299`, downloaded ZIP SHA-256
`6798210712e747ce5bd1cc4ffec9ed01217096a721e0a42ff9bf563ca3c0becd`.
Its receipt and per-branch patch bind the parent, main, tree and exact changed
paths. Publication was atomic across the three owned gameplay branches and
never wrote main. The one-shot reconciliation workflow removed itself.

This receipt is the only addition after that integration. Final-head full CI,
twelve actual-origin ownership scenarios and review must be checked again
before merge; the older green runs remain historical evidence. Physical
Android/TalkBack and the admitted-transaction boundary remain unchanged.
