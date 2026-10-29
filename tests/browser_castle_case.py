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


def is_receipt_asset(url):
    return '/assets/cases/receipt.' in url and url.endswith('.js')


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


def share_invitation(page):
    # Synthetic clipboard; exercise the actual controls and inspect exact visible bytes.
    page.evaluate('''() => {
      window.caseCopies = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText(text) { window.caseCopies.push(text); return Promise.resolve(); }
      }});
    }''')
    before = read(page)
    case_click(page, 'share-open')
    preview = page.locator('#case-share-text').inner_text()
    assert 'The Reading Room Blackout' in preview
    assert 'Fictional pre-case field note.' not in preview
    for item in SOURCE['steps']:
        assert item['title'] not in preview
    for item in SOURCE['records']:
        assert item['title'] not in preview
    case_click(page, 'share-cancel')
    assert page.evaluate('() => window.caseCopies') == []
    assert read(page) == before
    case_click(page, 'share-open')
    assert page.locator('#case-share-text').inner_text() == preview
    expect(page.locator('#case-share-text')).to_be_focused()
    page.evaluate('''() => { navigator.clipboard.writeText = text => new Promise((resolve, reject) => {
      window.caseReject = reject;
    }); }''')
    page.locator('[data-case-action="share-copy"]').click()
    expect(page.locator('[data-case-action="share-copy"]')).to_be_disabled()
    expect(page.locator('[data-case-action="share-cancel"]')).to_be_disabled()
    page.evaluate("() => window.caseReject(new Error('synthetic denial'))")
    expect(page.locator('[data-case-status]')).to_contain_text('blocked copying')
    assert page.locator('#case-share-text').inner_text() == preview
    expect(page.locator('#case-share-text')).to_be_focused()
    page.evaluate('''() => { navigator.clipboard.writeText = text => {
      window.caseCopies.push(text); return Promise.resolve();
    }; }''')
    case_click(page, 'share-copy')
    expect(page.locator('[data-case-status]')).to_contain_text('copied')
    assert page.evaluate('() => window.caseCopies') == [preview]
    assert read(page) == before
    return preview


def start_playtest_receipt(page, requests, width):
    before = read(page)
    request_count = len(requests)
    assert not any(is_receipt_asset(url) for url in requests), 'receipt asset is lazy until explicit consent'
    page.evaluate('''() => {
      window.caseReceiptCopies = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText(text) { window.caseReceiptCopies.push(text); return Promise.resolve(); }
      }});
    }''')
    expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
    assert page.locator('#case-receipt-preview').count() == 0
    if width == 320:
        bad_start = len(requests)
        page.evaluate('''() => {
          window.__receiptFetch = window.fetch;
          window.fetch = (input, options) => String(input).includes('/assets/cases/receipt.') && String(input).endsWith('.js')
            ? Promise.resolve(new Response(
                'globalThis.__tamperedReceiptImported = true; export function createCaseReceipt() {}',
                {headers: {'Content-Type': 'text/javascript'}}))
            : window.__receiptFetch(input, options);
        }''')
        case_click(page, 'receipt-start')
        expect(page.locator('[data-case-status]')).to_contain_text('No collection started')
        assert page.evaluate('() => globalThis.__tamperedReceiptImported === true') is False
        assert not any(is_receipt_asset(url) for url in requests[bad_start:]), 'hash failure must stop before import()'
        assert page.locator('#case-receipt-preview').count() == 0
        expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
        page.evaluate('() => { window.fetch = window.__receiptFetch; delete window.__receiptFetch; }')
        page.context.set_offline(True)
        case_click(page, 'receipt-start')
        expect(page.locator('[data-case-status]')).to_contain_text('reconnect and retry')
        assert page.locator('#case-receipt-preview').count() == 0
        expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
        page.context.set_offline(False)
    case_click(page, 'receipt-start')
    case_click(page, 'receipt-review')
    module_requests = requests[request_count:]
    assert module_requests and all(is_receipt_asset(url) for url in module_requests)
    initial = json.loads(page.locator('#case-receipt-preview').inner_text())
    assert initial['format'] == 'postern-case-playtest-1'
    assert initial['stages'] == [{
        'id': SOURCE['steps'][0]['id'],
        'outcome': 'not-completed',
        'assisted': False,
        'priorAssistance': False,
        'hints': 0,
        'reveals': 0,
        'submissions': 0,
        'rejectedIncomplete': 0,
        'rejectedReasoning': 0,
        'afterCompletion': 0,
    }]
    page.locator('#case-receipt-observation').fill('Synthetic observation from browser fixture.')
    editable = page.locator('#case-receipt-preview').inner_text()
    assert json.loads(editable)['observation'] == 'Synthetic observation from browser fixture.'
    case_click(page, 'receipt-close')
    case_click(page, 'receipt-cancel')
    expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
    assert page.evaluate('() => window.caseReceiptCopies') == []
    assert read(page) == before
    assert len(requests) == request_count + len(module_requests)
    case_click(page, 'receipt-start')


def finish_playtest_receipt(page, requests):
    before = read(page)
    request_count = len(requests)
    case_click(page, 'receipt-review')
    report = json.loads(page.locator('#case-receipt-preview').inner_text())
    assert report['format'] == 'postern-case-playtest-1'
    assert set(report['modes']) == {'storyOn', 'storyOff'}
    assert report['stages'] == [{
        'id': SOURCE['steps'][0]['id'],
        'outcome': 'not-completed',
        'assisted': True,
        'priorAssistance': False,
        'hints': 1,
        'reveals': 1,
        'submissions': 1,
        'rejectedIncomplete': 0,
        'rejectedReasoning': 1,
        'afterCompletion': 0,
    }]
    serialized = page.locator('#case-receipt-preview').inner_text()
    for forbidden in ['Fictional pre-case field note.', 'answers', 'citations', 'drafts', 'deviceId', 'timestamp']:
        assert forbidden not in serialized
    page.locator('#case-receipt-observation').fill('Synthetic observation from browser fixture.')
    exact_preview = page.locator('#case-receipt-preview').inner_text()
    case_click(page, 'receipt-copy')
    expect(page.locator('[data-case-status]')).to_contain_text('Receipt copied')
    assert page.evaluate('() => window.caseReceiptCopies') == [exact_preview]
    assert read(page) == before
    assert len(requests) == request_count
    case_click(page, 'receipt-cancel')
    expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
    assert page.evaluate('() => window.caseReceiptCopies') == [exact_preview]
    assert read(page) == before
    assert len(requests) == request_count


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
                responses = []
                page.on('request', lambda request: requests.append(request.url))
                page.on('response', lambda response: responses.append((response.url, response.from_service_worker)))
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
                initial_share = share_invitation(page)
                record(width, 'share preview excludes notebook and hidden evidence; cancel writes nothing and explicit copy matches preview')
                start_playtest_receipt(page, requests, width)
                record(width, 'receipt starts off, requires consent, edits only its local preview, and cancel writes nothing')
                if width == 320:
                    before = read(page)
                    case_click(page, 'share-open')
                    page.evaluate('''() => { navigator.clipboard.writeText = () => new Promise(resolve => {
                      window.caseResolve = resolve;
                    }); }''')
                    page.locator('[data-case-action="share-copy"]').click()
                    expect(page.locator('[data-case-action="share-cancel"]')).to_be_disabled()
                    navigate(page, '#/quiet/castle/directory')
                    expect(page.get_by_role('heading', name='Room directory')).to_be_visible()
                    page.evaluate('() => window.caseResolve()')
                    navigate(page, ROUTE)
                    expect(page.locator('#case-verdict-0')).to_be_visible()
                    assert page.locator('#case-share-text').count() == 0
                    assert 'Invitation copied.' not in page.locator('[data-case-status]').inner_text()
                    assert read(page) == before
                    record(width, 'leaving during clipboard request cannot update the next case visit')
                    expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
                    assert page.locator('#case-receipt-preview').count() == 0
                    # Collection belongs to one mounted visit; leaving disposed the prior receipt.
                    case_click(page, 'receipt-start')
                    expect(page.locator('[data-case-action="receipt-review"]')).to_be_visible()
                page.locator('#case-verdict-0').focus()
                page.locator('#case-verdict-0').select_option('contradicted')
                expect(page.locator('#case-verdict-0')).to_be_enabled()
                expect(page.locator('#case-verdict-0')).to_be_focused()
                # Keep the rejection in the reasoning bucket: all fields are complete, but claim 0 is wrong.
                for index, verdict in enumerate(['contradicted', 'not-established', 'contradicted']):
                    if index:
                        page.locator(f'[data-case-verdict="{index}"]').select_option(verdict)
                        expect(page.locator('#case-verdict-0')).to_be_enabled()
                    for source_id in ['checks', 'model']:
                        page.locator(f'[data-case-cite="{index}"][value="{source_id}"]').check()
                        expect(page.locator('#case-verdict-0')).to_be_enabled()
                wrong = read(page)['state']['caseStudy']
                case_click(page, 'check')
                expect(page.locator('[data-case-status]')).to_contain_text('draft is kept')
                assert read(page)['state']['caseStudy'] == wrong
                case_click(page, 'hint')
                case_click(page, 'reveal')
                case_click(page, 'stage', SOURCE['steps'][0]['id'])
                case_click(page, 'receipt-review')
                revisited_receipt = json.loads(page.locator('#case-receipt-preview').inner_text())
                assert revisited_receipt['stages'][0]['priorAssistance'] is False
                assert revisited_receipt['stages'][0]['hints'] == 1
                assert revisited_receipt['stages'][0]['reveals'] == 1
                case_click(page, 'receipt-close')
                retained = read(page)['state']['caseStudy']
                page.locator('#case-verdict-0').focus()
                case_click(page, 'story')
                expect(page.locator('[data-case-action="story"]')).to_be_focused()
                assert read(page)['state']['caseStudy'] == retained
                assert read(page)['state']['preferences']['story'] is False
                case_click(page, 'story')
                assert read(page)['state']['caseStudy'] == retained
                record(width, 'complete wrong drafts, hint/reveal history and source choices survive story switches')
                finish_playtest_receipt(page, requests)
                record(width, 'receipt separates hint/reveal and reasoning counts, copies the exact edited preview, and leaves saves/network untouched')

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
                    expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
                    assert page.locator('#case-receipt-preview').count() == 0
                record(width, 'header story preference refreshes immediately, keeps dialog focus and drafts, and survives reload')

                # Captured controls from the old visit have no listeners after returning.
                stale_control = page.locator('[data-case-action="story"]').element_handle()
                case_click(page, 'receipt-start')
                case_click(page, 'receipt-review')
                navigate(page, '#/quiet/castle/directory')
                expect(page.get_by_role('heading', name='Room directory')).to_be_visible()
                navigate(page, ROUTE)
                expect(page.locator('#case-verdict-0')).to_be_visible()
                expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
                assert page.locator('#case-receipt-preview').count() == 0
                before = read(page)
                stale_control.evaluate('(el) => el.click()')
                assert read(page) == before
                assert read(page)['state']['caseStudy'] == retained
                record(width, 'navigation retains drafts and refuses captured controls from the old A visit')
                if width == 320:
                    case_click(page, 'receipt-start')
                    case_click(page, 'receipt-review')
                    page.evaluate('''() => { navigator.clipboard.writeText = () => new Promise(resolve => {
                      window.caseReceiptResolve = resolve;
                    }); }''')
                    page.locator('[data-case-action="receipt-copy"]').click()
                    expect(page.locator('[data-case-action="receipt-copy"]')).to_be_disabled()
                    navigate(page, '#/quiet/castle/directory')
                    expect(page.get_by_role('heading', name='Room directory')).to_be_visible()
                    navigate(page, ROUTE)
                    expect(page.locator('#case-verdict-0')).to_be_visible()
                    expect(page.get_by_role('button', name='Start local playtest receipt')).to_be_visible()
                    page.evaluate('() => window.caseReceiptResolve()')
                    assert 'Receipt copied.' not in page.locator('[data-case-status]').inner_text()
                    assert page.locator('#case-receipt-preview').count() == 0
                    record(width, 'a pending receipt copy cannot alter a later visit, and route disposal returns collection to off')

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
                assert share_invitation(page) == initial_share
                record(width, 'share invitation remains identical after case completion')
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
                offline_receipt_requests = len(requests)
                offline_receipt_responses = len(responses)
                case_click(page, 'receipt-start')
                case_click(page, 'receipt-review')
                expect(page.locator('#case-receipt-preview')).to_contain_text('postern-case-playtest-1')
                assert len(requests) == offline_receipt_requests + 1
                offline_receipt_urls = [url for url in requests[offline_receipt_requests:] if is_receipt_asset(url)]
                assert len(offline_receipt_urls) == 1
                receipt_url = offline_receipt_urls[0]
                assert requests[-1] == receipt_url
                assert any(url == receipt_url and via_worker for url, via_worker in responses[offline_receipt_responses:])
                case_click(page, 'receipt-cancel')
                record(width, 'receipt bundle loads from the controlled case-pack cache while offline')
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
