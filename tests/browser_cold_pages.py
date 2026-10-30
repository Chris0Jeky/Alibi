"""Cold pages (#825): Privacy & credits, About and the sign-in note come from a deferred, precached
chunk. Prove they render offline from the service worker cache, that Privacy keeps its Beta slot,
and that a failed chunk load shows a retry that recovers."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').rstrip('/') + '/'
PAGES = [
    ('#/privacy', 'Privacy & credits.', 'Your device is the save file.'),
    ('#/about', 'About Alibi.', 'Credits, privacy and support are on the Privacy & credits page.'),
    ('#/login', 'No accounts here.', 'nobody can sign in as you'),
    ('#/changelog', 'What’s new.', 'A growing puzzle club'),
]


def launch(pw, **context):
    options = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        options['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = pw.chromium.launch(**options)
    return browser, browser.new_context(viewport={'width': 390, 'height': 844}, **context)


def check_pages(page):
    for route, title, sentence in PAGES:
        page.evaluate('hash => { location.hash = hash }', route)
        expect(page.locator('#main h1')).to_have_text(title)
        expect(page.locator('#main')).to_contain_text(sentence)
    # Privacy keeps the place the Beta button moves into, and the Voices panel decorates it.
    page.evaluate("location.hash = '#/privacy'")
    expect(page.locator('.privacy-copy #usage-sharing-slot')).to_be_attached()
    expect(page.locator('.privacy-copy h2', has_text='Beta usage data.')).to_be_visible()
    # Buttons on the deferred pages still navigate.
    page.locator('#main .privacy-copy').get_by_role('button', name='Back to your space', exact=True).click()
    expect(page.locator('#main h1')).to_have_text('Your space.')
    page.locator('#usage-sharing-slot').wait_for(state='attached')


def main():
    with sync_playwright() as pw:
        # 1. Retry: the chunk fails once (service worker blocked, request aborted), then loads.
        browser, ctx = launch(pw, service_workers='block')
        page = ctx.new_page()
        page.route('**/assets/cold-pages.*.js', lambda route: route.abort())
        page.goto(BASE + '#/privacy')
        retry = page.locator('#main [data-action="retry-route"]')
        expect(retry).to_be_visible(timeout=15000)
        expect(page.locator('#main [role="status"]')).to_contain_text('could not load')
        page.unroute('**/assets/cold-pages.*.js')
        retry.click()
        expect(page.locator('#main h1')).to_have_text('Privacy & credits.')
        browser.close()

        # 2. Offline: the precached chunk serves every route, including a cold deep link.
        browser, ctx = launch(pw, service_workers='allow')
        page = ctx.new_page()
        page.goto(BASE)
        page.wait_for_function('() => !!globalThis.AlibiDiagnostics')
        page.wait_for_function('() => AlibiDiagnostics.getStatus().offlineReady === true', timeout=90000)
        page.reload()
        page.wait_for_function('() => !!navigator.serviceWorker?.controller')
        ctx.set_offline(True)
        check_pages(page)
        page.goto(BASE + '#/privacy')
        page.reload()
        page.wait_for_function('() => !!globalThis.AlibiDiagnostics')
        expect(page.locator('#main h1')).to_have_text('Privacy & credits.')
        assert page.evaluate('() => !!globalThis.AlibiCold'), 'chunk loaded offline'
        browser.close()
    print('PASS cold pages retry and offline checks', flush=True)


if __name__ == '__main__':
    main()
