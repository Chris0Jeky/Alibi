# Museum atmosphere collection

Three original-resolution images were fetched from the Metropolitan Museum of Art Open Access
API on 2026-09-08. Each retained record explicitly says `isPublicDomain: true` and identifies its
image URL, named artist, work, date and credit line. SHA-256 receipts include original and WebP
bytes. Run `node tools/collect-atmosphere.cjs` to reproduce the optimized images from these inputs;
only `--fetch` accesses the network. Normal builds never request museum services.

- Camille Corot, *A Woman Reading* (1869 and 1870), Met 435991.
- George Cochran Lambdin, *Side of a Greenhouse* (1870–80 [?]), Met 11393.
- William Trost Richards, *Near Land's End, Cornwall* (1879), Met 11903.

They are atmosphere, not fictional witness portraits or evidence from an Alibi case. All three
appear with their real credits and links. The app continues to identify its original generated
casebook covers separately. No generative alteration was made to these museum reproductions.

The Adobe connector returned HTTP403; image generation failed with a connection error. Initial
AIC alternatives had valid public-domain metadata but their image service returned a Cloudflare
challenge, so those images were not acquired. These Met images returned successfully and were
decoded and visually inspected instead. No challenge bypass, paid asset or new account was used.
