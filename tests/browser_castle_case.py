"""Synthetic case saves through actual Castle controls, worker, IndexedDB and service worker."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').split('#')[0]
OUT = ROOT / 'test-results/castle-case'
SOURCE = json.loads((ROOT / 'content/cases/reading-room-blackout.json').read_text())
ROUTE = '#/quiet/castle/case'


def read(page):
    return page.evaluate('''async () => {
      const db = await new Promise((resolve,reject) => { const r=indexedDB.open('alibi-castle-v1',1); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
      try { return await new Promise((resolve,reject) => { const tx=db.transaction('records'); const r=tx.objectStore('records').get('chapter-one'); r.onsuccess=()=>resolve(r.result ?? null); tx.onerror=()=>reject(tx.error); }); }
      finally { db.close(); }
    }''')


def flush(page):
    return page.evaluate('() => AlibiCastle.flush().then(() => "ok", e => e.message)')


def navigate(page, path):
    page.evaluate('(hash) => location.hash=hash', path)


def case_click(page, action, value=None):
    selector = f'[data-case-action="{action}"]'
    if value is not None:
        selector += f'[data-value="{value}"]'
    control = page.locator(selector).first
    expect(control).to_be_enabled()
    control.click()
    if action != 'source':
        expect(page.locator('[data-case-action]').first).to_be_enabled()


def import_data(page, data):
    page.locator('#castle-import').set_input_files({
        'name': 'fictional-case.json', 'mimeType': 'application/json',
        'buffer': json.dumps(data).encode(),
    })
    expect(page.locator('#castle-title')).to_have_text('Review castle restore')


def download(page, action, file):
    with page.expect_download() as result:
        page.locator(f'[data-do="{action}"]').first.click()
    result.value.save_as(file)
    return json.loads(file.read_text())


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'base': BASE, 'checks': [], 'errors': []}
    def record(width, message):
        report['checks'].append(f'{width}: {message}')
        print('PASS', report['checks'][-1], flush=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for width in [320, 1280]:
                context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
                page = context.new_page()
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                requests = []
                page.on('request', lambda request: requests.append(request.url))
                page.goto(BASE + '#/quiet/castle/journal')
                expect(page.locator('#notes')).to_be_visible()
                page.locator('#notes').fill('Fictional pre-case field note.')
                assert flush(page) == 'ok'
                original = read(page)
                navigate(page, ROUTE)
                expect(page.get_by_role('button', name='Install experimental case')).to_be_visible()
                assert not any('/cases/' in url and url.endswith('.json') for url in requests)
                assert read(page) == original
                record(width, 'route is explicit; opening it does not install or mutate Chapter I')

                if width == 320:
                    # Intercept at fetch so service-worker activation cannot bypass the fault.
                    page.evaluate('''() => {
                      window.caseFetch = window.fetch;
                      window.fetch = (url, options) => String(url).includes('/cases/') && String(url).endsWith('.json')
                        ? Promise.resolve(new Response('{}', {headers: {'Content-Type': 'application/json'}}))
                        : window.caseFetch(url, options);
                    }''')
                    case_click(page, 'install')
                    expect(page.locator('[data-case-status]')).to_contain_text('does not match')
                    assert read(page) == original
                    page.evaluate('''() => {
                      window.fetch = (url, options) => String(url).includes('/cases/') && String(url).endsWith('.json')
                        ? Promise.reject(new TypeError('Synthetic interrupted download')) : window.caseFetch(url, options);
                    }''')
                    case_click(page, 'install')
                    expect(page.locator('[data-case-status]')).to_contain_text('needs a connection')
                    assert read(page) == original
                    page.evaluate('() => { window.fetch = window.caseFetch; }')
                    record(width, 'tampered and interrupted optional installs preserve the exact original record')
                    page.evaluate('''() => {
                      window.fetch = (url, options) => String(url).includes('/cases/') && String(url).endsWith('.json')
                        ? new Promise((resolve,reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once:true}))
                        : window.caseFetch(url, options);
                    }''')
                    page.locator('[data-case-action="install"]').click()
                    expect(page.locator('[data-case-action="install"]')).to_be_disabled()
                    navigate(page, '#/quiet/castle/journal')
                    expect(page.locator('#notes')).to_be_visible()
                    page.evaluate('() => { window.fetch = window.caseFetch; delete window.caseFetch; }')
                    assert read(page) == original
                    navigate(page, ROUTE)
                    expect(page.locator('[data-case-action="install"]')).to_be_enabled()
                    record(width, 'pending install is visible, and A/B/A disposal cannot commit the abandoned visit')

                case_click(page, 'install')
                expect(page.locator('#case-verdict-0')).to_be_visible()
                expect(page.locator('[data-case-content]')).to_contain_text('Case ready offline.')
                page.screenshot(path=str(OUT / f'case-install-{width}.png'))
                assert read(page)['state']['notes'] == original['state']['notes']
                page.locator('#case-verdict-0').focus()
                page.locator('#case-verdict-0').select_option('contradicted')
                expect(page.locator('#case-verdict-0')).to_be_enabled()
                expect(page.locator('#case-verdict-0')).to_be_focused()
                page.locator('[data-case-cite="0"][value="checks"]').check()
                expect(page.locator('#case-verdict-0')).to_be_enabled()
                wrong = read(page)['state']['caseStudy']
                case_click(page, 'check')
                expect(page.locator('[data-case-status]')).to_contain_text('draft is kept')
                assert read(page)['state']['caseStudy'] == wrong
                case_click(page, 'hint')
                case_click(page, 'reveal')
                retained = read(page)['state']['caseStudy']
                page.locator('#case-verdict-0').focus()
                case_click(page, 'story')
                expect(page.locator('[data-case-action="story"]')).to_be_focused()
                assert read(page)['state']['caseStudy'] == retained
                assert read(page)['state']['preferences']['story'] is False
                case_click(page, 'story')
                assert read(page)['state']['caseStudy'] == retained
                record(width, 'wrong/incomplete drafts, hint/reveal history and source choices survive story switches')

                # The header preference must refresh the mounted case without remounting it.
                for story in [False, True]:
                    page.get_by_role('button', name='Preferences', exact=True).click()
                    toggle = page.locator('[data-pref="story"]')
                    toggle.set_checked(story)
                    expect(toggle).to_be_focused()
                    expect(page.locator('[data-case-action="story"]')).to_have_text(
                        'Turn story off' if story else 'Turn story on')
                    expect(page.locator('[data-case-content]')).to_contain_text(
                        SOURCE['intro']['storyOn' if story else 'storyOff'])
                    assert flush(page) == 'ok'
                    assert read(page)['state']['caseStudy'] == retained
                    page.get_by_role('button', name='Close window', exact=True).click()
                    expect(page.get_by_role('button', name='Preferences', exact=True)).to_be_focused()
                    expect(page.locator('#case-verdict-0')).to_have_value('contradicted')
                    expect(page.locator('[data-case-cite="0"][value="checks"]')).to_be_checked()
                    expect(page.locator('#case-stage')).to_have_text(SOURCE['steps'][0]['title'])
                    page.reload()
                    expect(page.locator('[data-case-action="story"]')).to_have_text(
                        'Turn story off' if story else 'Turn story on')
                    assert read(page)['state']['caseStudy'] == retained
                record(width, 'header story preference refreshes immediately, keeps dialog focus and drafts, and survives reload')

                # Captured controls from the old visit have no listeners after returning.
                stale_control = page.locator('[data-case-action="story"]').element_handle()
                navigate(page, '#/quiet/castle/directory')
                expect(page.get_by_role('heading', name='Room directory')).to_be_visible()
                navigate(page, ROUTE)
                expect(page.locator('#case-verdict-0')).to_be_visible()
                before = read(page)
                stale_control.evaluate('(el) => el.click()')
                assert read(page) == before
                assert read(page)['state']['caseStudy'] == retained
                record(width, 'navigation retains drafts and refuses captured controls from the old A visit')

                for i, step in enumerate(SOURCE['steps']):
                    case_click(page, 'stage', step['id'])
                    for j, claim in enumerate(step['claims']):
                        page.locator(f'#case-verdict-{j}').select_option(claim['answer'])
                        expect(page.locator(f'#case-verdict-{j}')).to_be_enabled()
                        for checkbox in page.locator(f'[data-case-cite="{j}"]').all():
                            checked = checkbox.get_attribute('value') in claim['evidence'][0]
                            checkbox.set_checked(checked)
                            expect(page.locator(f'#case-verdict-{j}')).to_be_enabled()
                    case_click(page, 'check')
                    expect(page.locator('[data-case-action="check"]')).to_be_focused()
                    expect(page.locator('[data-case-status]')).to_contain_text('accepted and saved')
                    assert len(read(page)['state']['caseStudy']['answers']) == i + 1
                    committed = read(page)
                    case_click(page, 'check')
                    assert read(page) == committed
                expect(page.get_by_role('heading', name='Case complete')).to_be_visible()
                case_click(page, 'stage', SOURCE['steps'][1]['id'])
                accepted = read(page)['state']['caseStudy']
                for story in [False, True]:
                    page.get_by_role('button', name='Preferences', exact=True).click()
                    page.locator('[data-pref="story"]').set_checked(story)
                    expect(page.locator('[data-case-action="story"]')).to_have_text(
                        'Turn story off' if story else 'Turn story on')
                    expect(page.locator('#case-stage')).to_have_text(SOURCE['steps'][1]['title'])
                    assert flush(page) == 'ok'
                    assert read(page)['state']['caseStudy'] == accepted
                    page.get_by_role('button', name='Close window', exact=True).click()
                case_click(page, 'stage', SOURCE['steps'][2]['id'])
                record(width, 'header preference changes retain the selected completed stage and every accepted answer')
                assert read(page)['state']['completed'] == original['state']['completed']
                assert page.locator('.case-player').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1')
                page.screenshot(path=str(OUT / f'case-complete-{width}.png'), full_page=True)
                page.locator('#case-verdict-0').scroll_into_view_if_needed()
                page.screenshot(path=str(OUT / f'case-controls-{width}.png'))
                record(width, 'all three stages use native controls; repeat completion writes nothing and awards no Chapter I points')

                navigate(page, '#/quiet/castle/journal')
                expect(page.locator('#notes')).to_be_visible()
                exported = download(page, 'export', OUT / f'fictional-export-{width}.json')
                before = read(page)
                import_data(page, exported)
                assert read(page) == before
                page.locator('[data-do="close"]').click()
                assert read(page) == before
                import_data(page, exported)
                page.locator('[data-do="restore-merge"]').click()
                expect(page.locator('#castle-dialog')).not_to_be_visible()
                assert read(page)['state']['caseStudy'] == exported['state']['caseStudy']
                different = json.loads(json.dumps(exported))
                different['state']['caseStudy']['drafts'][0][0][0] = ''
                before = read(page)
                import_data(page, different)
                page.locator('[data-do="restore-merge"]').click()
                expect(page.locator('#castle-dialog')).to_contain_text('Case saves differ')
                assert read(page) == before
                page.locator('[data-do="close"]').click()
                old = json.loads(json.dumps(exported))
                del old['state']['caseStudy']
                import_data(page, old)
                expect(page.locator('#castle-dialog')).to_contain_text('replacement removes current case progress')
                page.locator('[data-do="restore-replace"]').click()
                page.locator('[data-do="restore-confirm"]').click()
                expect(page.locator('#castle-dialog')).not_to_be_visible()
                assert 'caseStudy' not in read(page)['state']
                recovery = download(page, 'recovery', OUT / f'fictional-recovery-{width}.json')
                assert recovery['state']['caseStudy'] == exported['state']['caseStudy']
                import_data(page, recovery)
                page.locator('[data-do="restore-replace"]').click()
                page.locator('[data-do="restore-confirm"]').click()
                expect(page.locator('#castle-dialog')).not_to_be_visible()
                assert read(page)['state']['caseStudy'] == exported['state']['caseStudy']
                record(width, 'actual worker preview/cancel/merge/conflict/replace/recovery retain case and old notebook semantics')

                navigate(page, ROUTE)
                expect(page.locator('#case-verdict-0')).to_be_visible()
                if width == 320:
                    other = context.new_page()
                    other.goto(BASE + '#/quiet/castle/journal')
                    expect(other.locator('#notes')).to_be_visible()
                    other.locator('#notes').fill('Fictional second-tab commit.')
                    assert flush(other) == 'ok'
                    latest = read(other)
                    page.locator('#case-verdict-0').select_option('supported')
                    expect(page.locator('#warning')).to_contain_text('Another tab changed')
                    assert read(page) == latest
                    assert flush(page) != 'ok'
                    saved_session = page.evaluate('() => AlibiCastle.exportBackup()')
                    assert saved_session['state']['caseStudy']['drafts'][2][0][0] == 'supported'
                    assert saved_session['preservedRecord']['state']['caseStudy'] == exported['state']['caseStudy']
                    other.close()
                    page.reload()
                    expect(page.locator('#case-verdict-0')).to_be_visible()
                    record(width, 'stale case edit cannot overwrite another tab; unsaved draft stays exportable and blocks update')

                page.wait_for_function('() => navigator.serviceWorker.controller !== null')
                context.set_offline(True)
                page.reload()
                expect(page.get_by_role('heading', name='Case complete')).to_be_visible()
                assert read(page)['state']['caseStudy'] == exported['state']['caseStudy']
                navigate(page, '#/quiet/castle/journal')
                expect(page.locator('#notes')).to_be_visible()
                import_data(page, exported)
                page.locator('[data-do="close"]').click()
                record(width, 'offline reload and bounded-worker backup review use retained source and existing Castle paths')
                context.set_offline(False)

                if width == 320:
                    future = read(page)
                    future['state']['caseStudy']['revision'] = 2
                    page.evaluate('''async (record) => {
                      const db = await new Promise(resolve => { const r=indexedDB.open('alibi-castle-v1',1); r.onsuccess=()=>resolve(r.result); });
                      try { await new Promise((resolve,reject) => { const tx=db.transaction('records','readwrite'); tx.objectStore('records').put(record,'chapter-one'); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); } finally {db.close();}
                    }''', future)
                    page.reload()
                    expect(page.locator('#warning')).to_contain_text('case revision')
                    assert read(page) == future
                    protected = page.evaluate('() => AlibiCastle.exportBackup()')
                    assert protected['preservedRecord'] == future
                    record(width, 'future revision protects and exports the original raw record without migration')
                context.close()
            browser.close()
        assert not report['errors'], report['errors']
        report['passed'] = True
    finally:
        (OUT / 'browser.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    run()
