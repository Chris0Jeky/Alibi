# Publish through your browser

Instructions checked against official Cloudflare documentation on 7 September 2026. Dashboard wording can change; the source links below are the reference.

## Choose the route deliberately

For your exact requirement, repeated browser-only ZIP uploads, Pages Direct Upload is the most explicitly documented route. Cloudflare recommends Workers for new projects generally, so the bundle also includes Workers Static Assets configuration and the Drop route. Do not create a new host/project for every update. Player storage belongs to an origin, not the ZIP filename.

Both Workers Static Assets and Pages static requests are currently documented as free and unlimited. This app has no server-side Worker or Pages Function, database binding, remote asset service or AI API. A paid domain is optional. Those statements do not make future backend services free or remove hosting terms and platform limits.

## Route A: Pages Direct Upload, entirely in the browser

1. Sign in to your own Cloudflare account. Open Workers & Pages, then Create application. Choose the Pages drag-and-drop/direct-upload path. The documentation currently calls this Get started > Drag and drop your files.
2. Choose a project name. Drag `alibi-deluxe-cloudflare.zip` into the upload area. Do not upload the full bundle, the source ZIP, or a containing directory above `index.html`.
3. Review the file list. It should include `index.html`, `manifest.webmanifest`, `sw.js`, `_headers`, two hashed assets, three icons and `404.html`.
4. Select Deploy site / Save and Deploy. Open the permanent project address under `pages.dev`.
5. Play several moves. Wait for the app's Offline ready status. Export a backup. Reload and verify those moves remain. Complete the Android checks before sharing widely.

For the next release: open THIS project, choose Create a new deployment, select Production, upload the new deployment ZIP and deploy. Preview deployments are useful for testing but use a different origin and separate saves. Test progress is not automatically copied to production.

A Pages Direct Upload project cannot be converted in place to Pages Git integration. It can still receive uploads from a CLI or your own CI. Creating another Git-integrated project changes the hosting relationship and potentially the URL; plan migration rather than assuming it is automatic.

## Route B: Cloudflare Drop

Visit https://www.cloudflare.com/drop/ and upload the same deployment ZIP. The initial preview lasts one hour. Claim it into your account before that window expires; new accounts require email verification. Test the claimed permanent address and use that address for installation.

Do not confuse a new Drop upload with updating an existing deployment. Confirm that your next release targets the claimed Worker rather than another temporary site. The included `wrangler.jsonc` provides an explicit existing-Worker deployment path; use the exact claimed Worker name. This guide does not invent a dashboard update control that has not been verified for your account. Route A is the clearer documented choice when every future update must also be browser-only.

## Route C: local agent or CLI, Workers Static Assets

Edit the `name` in `wrangler.jsonc` to your intended existing Worker name. No `main` server script or account secrets belong in this file. Review the destination before running deployment commands.

```sh
npm run build
npm test
npx wrangler login
npx wrangler deploy
```

The `npx` commands download/use Cloudflare's CLI and authenticate to your account. They are optional and are not part of the dependency-free app build. For a maintained CI deployment, pin the approved Wrangler version and use narrowly scoped deployment credentials in the CI secret store, never in the browser bundle.

For an existing Pages Direct Upload project, use Pages commands instead of the Workers configuration:

```sh
npx wrangler pages deploy dist --project-name YOUR_EXISTING_PROJECT --branch main
```

Use the actual configured production branch. A nonproduction branch produces a preview, not necessarily the production update you intended.

## Installing on Android

Open the permanent HTTPS address in Chrome or another install-capable browser, not a chat's embedded viewer. Use the app's install button when available, or the browser menu's Install app / Add to Home screen. Browser wording and installation behaviour differ. The manifest includes normal and maskable icons, a standalone display mode and home/casebook shortcuts.

Wait for Offline ready. Close the app, enable airplane mode, then reopen from the home screen. Try another puzzle, make a move, close and reopen again. Installation is not a backup. Clearing site data or losing the phone can remove progress.

An Android APK is not included or required for this route. A native wrapper would add signing, update, distribution and storage-migration work. Do not add one solely to obtain an app icon; test this PWA first.

## Update and domain traps

The production origin should remain stable. Changing from a preview address to production, from `pages.dev` to a custom domain, or from one browser profile to another can make existing saves appear missing. Export on the OLD origin and import on the NEW origin. A redirect does not migrate IndexedDB. Keep the old address available long enough to export. Choose the permanent domain before inviting players where practical.

The app precaches a whole release, then waits for the user's Save & update action. Do not manually replace only the CSS, JavaScript or service worker. Upload the entire rebuilt ZIP. Keep the previous tested ZIP and its build ID.

## Troubleshooting

Blank page: confirm the upload root, JavaScript MIME type, browser console and no extension blocking local scripts. Try the hosted site in a normal browser. Do not clear site data as the first troubleshooting step.

Old appearance: go online, open Settings & saves, Check for updates, then Save & update. Existing pages can legitimately run the previous release until they switch. A server/CDN cache purge alone does not clear an installed service worker.

No install button: use a supported browser and permanent HTTPS URL; it may already be installed. The single-file preview does not register a service worker. Do not promise a native package on every browser.

Session only: persistent browser storage was unavailable. Export before closing the page. Private/incognito, embedded previews or restrictive browser settings may behave differently.

Offline ready never appears: inspect service-worker registration, scope and failed asset requests. The entire shell must cache successfully. Online play and local saves can work even if offline setup fails.

Missing progress after release: first verify the exact address and browser profile. Export any remaining data. Inspect version and quarantine warnings. Never make deleting the database a repair routine.

## Official references

https://developers.cloudflare.com/pages/get-started/direct-upload/
https://developers.cloudflare.com/pages/functions/pricing/
https://developers.cloudflare.com/changelog/post/2026-07-08-cloudflare-drag-and-drop/
https://developers.cloudflare.com/workers/static-assets/get-started/
https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
