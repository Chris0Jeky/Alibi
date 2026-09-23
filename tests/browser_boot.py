"""Exercise startup recovery and named routes against the real built HTTP origin."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').rstrip('/') + '/'


def check_named_pages(page, load):
    """Assert actual app content, not merely absence of the unknown-route guard."""
    cases = [
        ('#/about', 'About Alibi.', 'Privacy & credits', 'Privacy & credits.'),
        ('#/ABOUT?from=Shared?Detail', 'About Alibi.', 'Privacy & credits', 'Privacy & credits.'),
        ('#/login', 'No accounts here.', 'Settings & saves', 'Your space.'),
        ('#/LoGiN/', 'No accounts here.', 'Settings & saves', 'Your space.'),
    ]
    for route, title, action, destination in cases:
        load(route)
        page.wait_for_function('() => !!globalThis.AlibiDiagnostics')
        expect(page.locator('#main h1')).to_have_text(title)
        expect(page.locator('#route-not-found')).to_have_count(0)
        page.locator('#main .privacy-copy').get_by_role('button', name=action, exact=True).click()
        expect(page.locator('#main h1')).to_have_text(destination)
    for route in ['#/ABOUT-other', '#/%61bout', '#/constructor', '#/<img-src=x-onerror=alert(1)>']:
        load(route)
        expect(page.locator('#route-not-found')).to_be_visible()
        expect(page.locator('#route-not-found-hash')).to_have_text(page.evaluate('location.hash'))
        expect(page.locator('#route-not-found img')).to_have_count(0)
        page.locator('#route-not-found').get_by_role('link', name='Puzzles', exact=True).click()
        expect(page.locator('#route-not-found')).to_have_count(0)
        expect(page.locator('#main h1')).to_be_visible()
        assert page.evaluate('location.hash') == '#/library'
    return len(cases) + 4


def main():
    with sync_playwright() as pw:
        options = {'headless': True}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = pw.chromium.launch(**options)
        ctx = browser.new_context(service_workers='block', viewport={'width': 390, 'height': 844})
        page = ctx.new_page()
        page.goto(BASE + 'manifest.webmanifest')
        page.evaluate("""async () => {
            localStorage.setItem('boot-proof', 'keep');
            await caches.open('unrelated-test');
            await caches.open('alibi-shell-test');
            await new Promise((resolve, reject) => {
                const r = indexedDB.open('alibi-device', 1);
                r.onupgradeneeded = () => {
                    for (const n of ['runs', 'packs', 'meta'])
                        r.result.createObjectStore(n, {keyPath: 'key'});
                };
                r.onsuccess = () => {
                    const db = r.result, tx = db.transaction('meta', 'readwrite');
                    tx.objectStore('meta').put({key: 'boot-proof', value: 'keep'});
                    tx.oncomplete = () => { db.close(); resolve(); };
                    tx.onerror = () => reject(tx.error);
                };
            });
        }""")
        page.route('**/assets/alibi.*.js', lambda route: route.abort())
        page.goto(BASE)
        page.locator('#boot-recovery').wait_for(timeout=16000)
        expect(page.get_by_role('button', name='Retry opening')).to_be_visible()
        page.unroute('**/assets/alibi.*.js')
        page.get_by_role('button', name='Refresh app files').click()
        page.wait_for_function('() => !!globalThis.AlibiDiagnostics')
        assert page.evaluate("localStorage.getItem('boot-proof')") == 'keep'
        assert page.evaluate("() => caches.has('unrelated-test')")
        assert not page.evaluate("() => caches.has('alibi-shell-test')")
        assert page.evaluate("""() => new Promise(resolve => {
            const r = indexedDB.open('alibi-device', 1);
            r.onsuccess = () => {
                const db = r.result, q = db.transaction('meta').objectStore('meta').get('boot-proof');
                q.onsuccess = () => { resolve(q.result.value); db.close(); };
            };
        })""") == 'keep'
        named_cases = check_named_pages(page, lambda route: page.goto(BASE + route))
        browser.close()
    out = Path(__file__).resolve().parents[1] / 'test-results' / 'browser-boot'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'results.json').write_text(json.dumps({
        'passed': True, 'checks': 6, 'namedRouteCases': named_cases, 'url': BASE,
        'scope': 'Blocked main JS; recovery retains IndexedDB, localStorage and unrelated cache; '
                 'cold named/unknown routes assert rendered content and working exits; disposable profile',
    }))
    print(f'PASS 6 startup recovery checks and {named_cases} named-route cases', flush=True)


if __name__ == '__main__':
    main()
