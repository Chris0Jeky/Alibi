# Static release bundling

The main browser distributable is `alibi-deluxe-cloudflare.zip`, emitted by `npm run build`.
GitHub's source archive provides the exact committed source. `npm run bundle` creates a local
release directory with the static ZIP, standalone HTML, build identity and available test reports.
These are generated operational outputs and remain ignored; attaching release artifacts is an
explicit publication step after validation.
