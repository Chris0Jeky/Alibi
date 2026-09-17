"""Boot the derived Android payload under Capacitor's stable local HTTPS origin."""
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = (ROOT / 'dist-android').resolve()
ORIGIN = 'https://localhost'
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS', label, flush=True)


if not (DIST / 'index.html').is_file():
    raise SystemExit('Run npm run build:android before browser_android_payload.py')

requested = []
page_errors = []


def serve(route, request):
    requested.append(request.url)
    parsed = urlparse(request.url)
    if f'{parsed.scheme}://{parsed.netloc}' != ORIGIN:
        route.abort()
        return
    relative = unquote(parsed.path).lstrip('/') or 'index.html'
    filename = (DIST / relative).resolve()
    if filename != DIST and DIST not in filename.parents:
        route.fulfill(status=403, body='')
        return
    if not filename.is_file():
        route.fulfill(status=404, body='')
        return
    route.fulfill(
        status=200,
        content_type=mimetypes.guess_type(filename.name)[0] or 'application/octet-stream',
        body=filename.read_bytes(),
    )


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(service_workers='allow', viewport={'width': 390, 'height': 844})
    context.route('**/*', serve)
    page = context.new_page()
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.goto(ORIGIN + '/')
    page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')

    check(
        page.evaluate("()=>globalThis.ALIBI_BUILD_TARGET") == 'android',
        'Android target marker loads first',
    )
    check(
        page.evaluate("()=>AlibiDiagnostics.getStatus().target") == 'android',
        'diagnostics expose the Android target',
    )
    check(
        page.evaluate("()=>AlibiDiagnostics.getStatus().offlineReady") is True,
        'bundled payload reports offline readiness without a worker',
    )
    check(
        page.locator('link[rel="manifest"]').count() == 0,
        'Android document has no web-app manifest',
    )
    check(
        page.locator('[data-action="install"]').count() == 0,
        'Android UI hides PWA install controls',
    )
    check(
        page.locator('#pulseboard-usage-sharing').count() == 0,
        'native telemetry remains disabled',
    )
    page.wait_for_timeout(200)
    check(
        not any(urlparse(url).path.endswith('/sw.js') for url in requested),
        'Android boot never requests a service worker',
    )
    check(
        page.evaluate('()=>navigator.serviceWorker.getRegistrations().then(items => items.length)') == 0,
        'Android origin has no service-worker registration',
    )

    house = page.evaluate('()=>ALIBI_HOUSE_CONFIG')
    check(house['script'].startswith('./assets/house.'), 'Wrenmere script is configured locally')
    check(house['css'].startswith('./assets/house.'), 'Wrenmere stylesheet is configured locally')
    page.evaluate("location.hash='/home?ux=house'")
    page.wait_for_function("()=>typeof AlibiHouseLoader?.home === 'function'")
    check(
        any(urlparse(url).path.endswith(house['script'].removeprefix('.')) for url in requested),
        'Wrenmere script loads from the bundled payload',
    )
    check(
        any(urlparse(url).path.endswith(house['css'].removeprefix('.')) for url in requested),
        'Wrenmere stylesheet loads from the bundled payload',
    )
    check(
        all(urlparse(url).netloc == 'localhost' for url in requested),
        'Android boot and Wrenmere use no remote network origin',
    )
    check(not page_errors, 'Android payload produces no browser errors')
    context.close()
    browser.close()

print('PASS', checks, 'Android payload browser assertions')
