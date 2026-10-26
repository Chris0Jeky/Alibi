"""Actual controls on a generated, memory-only file. Not physical-device acceptance."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/cases/reading-room-blackout.json'
OUT = ROOT / 'test-results/case-workbench'


def build(source, output):
    subprocess.run(['node', 'tools/case-preview.cjs', str(source), str(output)], cwd=ROOT, check=True, capture_output=True)


def solve(page, step):
    for claim in step['claims']:
        page.locator('#verdict-' + claim['id']).select_option(claim['answer'])
        for record in claim['evidence'][0]:
            page.locator('#cite-' + claim['id'] + '-' + record).check()


def playtest_receipt(browser, preview, definition):
    """#455 consent through actual controls. The observation text is a labelled synthetic fixture."""
    context = browser.new_context(viewport={'width': 320, 'height': 740})
    context.set_offline(True)
    page = context.new_page()
    errors, external = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.append(request.url) if not request.url.startswith('file:') else None)
    page.goto(preview.as_uri())
    page.evaluate("""() => { globalThis.copies = [];
        Object.defineProperty(navigator, 'clipboard', { configurable: true,
            value: { writeText: async (text) => { globalThis.copies.push(text); } } }); }""")
    assert page.locator('#playtest-review').count() == 0
    page.locator('#hint').click()  # Before consent: baseline only, no event count.
    page.locator('#reveal').click()
    page.locator('#reveal').click()  # Hiding must not erase earlier exposure.
    page.locator('#playtest-start').click()
    assert page.locator('#playtest-review').evaluate('(el) => el === document.activeElement')
    page.locator('#check').click()  # Empty form: an interface rejection.
    page.locator('#hint').click()
    first, second = definition['steps'][0], definition['steps'][1]
    solve(page, first)
    page.locator('#check').click()
    assert 'Reasoning accepted' in page.locator('#status').inner_text()
    page.locator('#check').click()  # Repeat on a completed stage.
    page.locator('#story').click()
    page.locator('#continue').click()
    page.locator('#reveal').click()  # Abandoned, assisted stage.
    page.locator('#playtest-review').click()
    observation = 'SYNTHETIC FIXTURE: browser test, not a tester'
    page.locator('#playtest-observation').fill(observation)
    draft = json.loads(page.locator('#playtest-preview').inner_text())
    assert draft['observation'] == observation
    assert draft['modes'] == ['storyOn', 'storyOff'] and draft['assisted'] is True
    window, alarm = draft['stages']
    assert window['priorAssistance'] is True and alarm['priorAssistance'] is False
    assert (window['id'], window['outcome'], window['hints'], window['submissions']) == (first['id'], 'completed', 1, 2)
    assert (window['rejectedIncomplete'], window['rejectedReasoning'], window['afterCompletion']) == (1, 0, 1)
    assert (alarm['id'], alarm['outcome'], alarm['reveals'], alarm['submissions']) == (second['id'], 'not-completed', 1, 0)
    shown = json.dumps({k: v for k, v in draft.items() if k != 'limitations'})
    for record in definition['records']:
        assert record['id'] not in shown and record['title'] not in shown
    assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
    page.locator('.playtest').screenshot(path=str(OUT / 'playtest-review-320.png'))
    page.locator('#playtest-cancel').click()
    assert 'Clipboard copies are not removed' in page.locator('#status').inner_text()
    assert page.locator('#playtest-preview').count() == 0 and page.locator('#playtest-start').is_visible()
    assert page.evaluate('globalThis.copies.length') == 0
    # A fresh consent starts empty; copy happens only on the explicit control.
    page.locator('#playtest-start').click()
    page.locator('#playtest-review').click()
    assert page.locator('#playtest-observation').input_value() == ''
    assert page.evaluate('globalThis.copies.length') == 0
    page.locator('#playtest-copy').click()
    page.wait_for_function('globalThis.copies.length === 1')
    copied = json.loads(page.evaluate('globalThis.copies[0]'))
    assert copied['observation'] == '' and [s['id'] for s in copied['stages']] == [second['id']]
    assert copied['stages'][0]['priorAssistance'] is True
    assert copied['stages'][0]['reveals'] == 0 and copied['assisted'] is True
    assert 'Nothing was sent' in page.locator('#status').inner_text()
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('#restart').click()
    assert page.locator('#playtest-start').is_visible() and page.locator('#playtest-review').count() == 0
    # Consent can begin after progress, including after discarding an earlier receipt.
    solve(page, first)
    page.locator('#check').click()
    page.locator('#playtest-start').click()
    page.locator('#playtest-review').click()
    stage = json.loads(page.locator('#playtest-preview').inner_text())['stages'][0]
    assert (stage['outcome'], stage['submissions'], stage['afterCompletion']) == ('completed', 0, 0)
    assert stage['priorAssistance'] is True  # Restart cannot make help unseen.
    page.locator('#playtest-close').click()
    page.locator('#verdict-' + first['claims'][0]['id']).select_option('')
    page.locator('#check').click()
    page.locator('#playtest-review').click()
    stage = json.loads(page.locator('#playtest-preview').inner_text())['stages'][0]
    assert (stage['outcome'], stage['submissions'], stage['afterCompletion']) == ('completed', 0, 1)
    assert stage['rejectedIncomplete'] == 0
    page.locator('#playtest-cancel').click()
    page.locator('#continue').click()
    page.locator('#playtest-start').click()
    page.locator('#stage-' + first['id']).click()
    page.locator('#playtest-review').click()
    assert json.loads(page.locator('#playtest-preview').inner_text())['stages'][0]['outcome'] == 'completed'
    # A denied clipboard leaves the exact JSON available for manual copying.
    page.evaluate("() => { navigator.clipboard.writeText = async () => { throw new Error('SYNTHETIC FIXTURE: denied'); }; }")
    before = page.locator('#playtest-preview').inner_text()
    page.locator('#playtest-copy').click()
    assert 'browser blocked copying' in page.locator('#status').inner_text()
    assert page.locator('#playtest-preview').inner_text() == before
    assert page.locator('#playtest-preview').evaluate('(el) => el === document.activeElement')
    for width in (320, 1280):
        page.set_viewport_size({'width': width, 'height': 740})
        for theme in ('daylight', 'lamplight'):
            if page.locator('html').get_attribute('data-theme') != theme:
                page.locator('#theme').click()
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            page.locator('.playtest').screenshot(path=str(OUT / f'playtest-review-{width}-{theme}.png'))
    # Delayed clipboard completion cannot resurrect a discarded/restarted receipt.
    for reset in ('discard', 'restart'):
        page.evaluate("""() => { navigator.clipboard.writeText = text => new Promise(resolve => {
            globalThis.finishCopy = () => { globalThis.copies.push(text); resolve(); };
        }); }""")
        page.locator('#playtest-copy').click()
        if reset == 'discard':
            page.locator('#playtest-cancel').click()
            assert 'Clipboard copies are not removed' in page.locator('#status').inner_text()
        else:
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#restart').click()
        status = page.locator('#status').inner_text()
        page.evaluate('globalThis.finishCopy()')
        assert page.locator('#status').inner_text() == status
        assert page.locator('#playtest-start').is_visible()
        page.locator('#playtest-start').click()
        page.locator('#playtest-review').click()
    page.reload()
    assert page.locator('#playtest-start').is_visible() and page.locator('#playtest-preview').count() == 0
    page.locator('#playtest-start').click()
    page.locator('#playtest-review').click()
    fresh = json.loads(page.locator('#playtest-preview').inner_text())
    assert fresh['observation'] == '' and fresh['stages'][0]['outcome'] == 'not-completed'
    assert fresh['stages'][0]['submissions'] == 0
    assert not external and not errors, (external, errors)
    context.close()
    return {'viewport': [320, 740], 'playtestReceipt': 'passed', 'observation': 'synthetic fixture', 'externalRequests': 0}

def non_prose_controls(page):
    return page.evaluate('''() => ({
        records: [...document.querySelectorAll('article.record')].map(el => el.id),
        claims: [...document.querySelectorAll('[id^="claim-"]')].map(el => el.id),
        drafts: [...document.querySelectorAll('select, input')].map(el =>
            [el.id, el.value, el.checked, el.disabled, el.getAttribute('aria-invalid')]),
        stages: [...document.querySelectorAll('nav button')].map(el =>
            [el.id, el.disabled, el.getAttribute('aria-current')]),
        progress: document.querySelector('#progress').textContent,
        hints: [...document.querySelectorAll('#hint-list .hint')].map(el => ({
            level: el.querySelector('h4').textContent,
            sources: [...el.querySelectorAll('a')].map(a => a.getAttribute('href'))
        })),
        hintDisabled: document.querySelector('#hint').disabled,
        worked: document.querySelector('#worked') ?
            [...document.querySelectorAll('#worked a')].map(a => a.getAttribute('href')) : null,
        reveal: document.querySelector('#reveal').textContent,
        validation: document.querySelector('#status').textContent
    })''')


def compare_modes(page):
    before = non_prose_controls(page)
    starting_mode = page.locator('#story').get_attribute('aria-pressed')
    definition = json.loads(page.locator('#case-data').text_content())['definition']
    for index in range(2):
        page.locator('#story').focus()
        page.keyboard.press('Enter')
        assert page.locator('#story').evaluate('(el) => el === document.activeElement')
        mode = page.locator('#story').get_attribute('aria-pressed')
        assert mode == (starting_mode if index else str(starting_mode != 'true').lower())
        key = 'storyOn' if mode == 'true' else 'storyOff'
        assert page.locator('header > p').nth(1).inner_text() == definition['intro'][key]
        for record in definition['records']:
            card = page.locator('#record-' + record['id'])
            if card.count():
                assert card.locator('p').nth(1).inner_text() == record['text'][key]
        if page.locator('#ending').count():
            assert page.locator('#ending p').inner_text() == definition['ending'][key]
        assert non_prose_controls(page) == before
    assert page.locator('#story').get_attribute('aria-pressed') == starting_mode


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    definition = json.loads(SOURCE.read_text(encoding='utf-8'))
    results = []
    with tempfile.TemporaryDirectory(prefix='postern-case-browser-') as temp, sync_playwright() as pw:
        temp = Path(temp)
        normal = temp / 'preview.html'
        build(SOURCE, normal)
        parity = json.loads(subprocess.run(
            ['node', 'tools/case-parity.cjs', str(SOURCE)], cwd=ROOT,
            check=True, capture_output=True, text=True, encoding='utf-8').stdout)
        assert parity['mechanical']['status'] == 'pass'
        assert parity['editorial']['semanticEquivalence'] == 'not-certified'
        (OUT / 'mechanical-parity.json').write_text(json.dumps({
            key: value for key, value in parity.items() if key != 'editorial'
        }, indent=2) + '\n', encoding='utf-8')
        (OUT / 'editorial-comparison.json').write_text(json.dumps({
            'caseId': parity['caseId'], 'revision': parity['revision'],
            'locale': parity['locale'], 'sourceSha256': parity['sourceSha256'],
            **parity['editorial']
        }, indent=2) + '\n', encoding='utf-8')
        launch = {'headless': True}
        if os.environ.get('ALIBI_CHROMIUM'):
            launch['executable_path'] = os.environ['ALIBI_CHROMIUM']
        browser = pw.chromium.launch(**launch)
        version = browser.version
        for width, height, story in [(320, 740, True), (1280, 900, False), (844, 390, True)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
            context.set_offline(True)
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: external.append(request.url) if not request.url.startswith('file:') else None)
            page.goto(normal.as_uri())
            page.screenshot(path=str(OUT / f'initial-{width}.png'), full_page=True)
            context.set_offline(True)
            assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
            assert page.locator('#stage-alarm').is_disabled()
            assert page.locator('#record-maintenance').count() == 0
            assert page.locator('#worked').count() == 0
            exported = json.loads(page.locator('#case-data').text_content())
            assert exported['receipt']['locale'] == 'en'
            assert exported['receipt']['revision'] == definition['revision']
            assert exported['receipt']['sourceSha256'] == parity['sourceSha256']
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            # Share: text preview first; cancel has no clipboard side effect. The stub records writes.
            page.evaluate("""() => { globalThis.copies = [];
                Object.defineProperty(navigator, 'clipboard', { configurable: true,
                    value: { writeText: async (text) => { globalThis.copies.push(text); } } }); }""")
            page.locator('#share').click()
            assert page.locator('#share').get_attribute('aria-expanded') == 'true'
            assert page.locator('#share-text').evaluate('(el) => el === document.activeElement')
            share_text = page.locator('#share-text').inner_text()
            assert definition['title'] in share_text and f"revision {definition['revision']}" in share_text
            for step in definition['steps']:
                assert step['title'] not in share_text
            for record in definition['records']:
                assert record['title'] not in share_text
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            page.locator('header').screenshot(path=str(OUT / f'share-{width}.png'))
            page.locator('#share-cancel').click()
            assert page.locator('#share-text').count() == 0
            assert 'Nothing was copied' in page.locator('#status').inner_text()
            assert page.evaluate('globalThis.copies.length') == 0
            # A started clipboard operation cannot be cancelled. Refusal permits retry;
            # restarting invalidates its completion callback without claiming to undo the write.
            page.evaluate("""() => {
                navigator.clipboard.writeText = (text) => new Promise((resolve, reject) => {
                    globalThis.finishCopy = () => { globalThis.copies.push(text); resolve(); };
                    globalThis.rejectCopy = () => reject(new Error('blocked'));
                });
            }""")
            page.locator('#share').click()
            page.locator('#share-copy').click()
            assert page.locator('#share-copy').is_disabled()
            assert page.locator('#share-cancel').is_disabled()
            assert page.locator('#share').is_disabled()
            page.evaluate('globalThis.rejectCopy()')
            assert 'blocked copying' in page.locator('#status').inner_text()
            assert page.locator('#share-text').inner_text() == share_text
            assert page.locator('#share-copy').is_enabled()
            assert page.locator('#share-cancel').is_enabled()
            page.locator('#share-copy').click()
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#restart').click()
            page.evaluate('globalThis.finishCopy()')
            assert page.locator('#status').inner_text() == 'Preview restarted.'
            assert page.locator('#share-text').count() == 0
            assert page.locator('#share').is_enabled()
            assert page.evaluate('globalThis.copies.length') == 1
            page.evaluate("""() => { globalThis.copies = [];
                navigator.clipboard.writeText = async (text) => { globalThis.copies.push(text); };
            }""")
            # A refused clipboard write keeps the invitation available for manual copying.
            page.evaluate("""() => { navigator.clipboard.writeText = async () => {
                throw new DOMException('Denied', 'NotAllowedError');
            }; }""")
            page.locator('#share').click()
            page.locator('#share-copy').click()
            assert 'browser blocked copying' in page.locator('#status').inner_text()
            assert page.locator('#share-text').inner_text() == share_text
            assert page.locator('#share-text').evaluate('(el) => el === document.activeElement')
            assert page.evaluate('globalThis.copies.length') == 0
            page.locator('#share-cancel').click()
            page.evaluate("""() => { navigator.clipboard.writeText = async (text) => {
                globalThis.copies.push(text);
            }; }""")
            page.locator('#verdict-bounded-window').focus()
            page.keyboard.press('Tab')
            assert page.locator('#cite-bounded-window-checks').evaluate('(el) => el === document.activeElement')
            page.keyboard.press('Shift+Tab')
            assert page.locator('#verdict-bounded-window').evaluate('(el) => el === document.activeElement')
            page.locator('#check').focus()
            page.keyboard.press('Enter')
            assert '6 validation errors across 3 claims' in page.locator('#status').inner_text()
            assert page.locator('#status').get_attribute('role') == 'status'
            assert page.locator('#verdict-bounded-window').get_attribute('aria-invalid') == 'true'
            verdict_error = page.locator('#verdict-bounded-window').get_attribute('aria-describedby')
            assert verdict_error and 'Choose the verdict supported by the records' in page.locator('#' + verdict_error).inner_text()
            citation_group = page.locator('#citations-bounded-window')
            assert citation_group.get_attribute('aria-invalid') == 'true'
            citation_error = citation_group.get_attribute('aria-describedby')
            assert citation_error and 'smallest sufficient source set' in page.locator('#' + citation_error).inner_text()
            claim_fieldset = page.locator('#claim-bounded-window')
            assert claim_fieldset.get_attribute('aria-invalid') == 'true'
            assert set(claim_fieldset.get_attribute('aria-describedby').split()) == {verdict_error, citation_error}
            assert page.locator('#verdict-bounded-window').evaluate('(el) => el === document.activeElement')
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            claim_fieldset.screenshot(path=str(OUT / f'verdict-errors-{width}.png'))
            page.keyboard.press('Tab')
            assert page.locator('#cite-bounded-window-checks').evaluate('(el) => el === document.activeElement')
            page.keyboard.press('Shift+Tab')
            page.locator('#verdict-bounded-window').select_option('supported')
            assert page.locator('#verdict-bounded-window').get_attribute('aria-invalid') is None
            assert page.locator('#citations-bounded-window').get_attribute('aria-invalid') == 'true'
            assert claim_fieldset.get_attribute('aria-invalid') == 'true'
            assert claim_fieldset.get_attribute('aria-describedby') == citation_error
            assert '5 validation errors across 3 claims' in page.locator('#status').inner_text()
            compare_modes(page)
            page.locator('#story').click()
            assert page.locator('#story').evaluate('(el) => el === document.activeElement')
            page.locator('#story').click()
            if not story:
                page.locator('#story').click()
            assert page.locator('#verdict-bounded-window').input_value() == 'supported'
            assert 'Your draft is retained' in page.locator('#status').inner_text()
            assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
            for _ in range(3):
                page.locator('#hint').click()
            assert page.locator('#hint').is_disabled()
            assert page.locator('#hint-list .hint').count() == 3
            page.locator('#reveal').click()
            assert page.locator('#worked').is_visible()
            compare_modes(page)
            assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
            page.locator('#reveal').click()
            assert page.locator('#worked').count() == 0
            # Correct verdicts with one deliberately incomplete citation bundle.
            first_claim = definition['steps'][0]['claims'][0]
            for claim in definition['steps'][0]['claims']:
                page.locator('#verdict-' + claim['id']).select_option(claim['answer'])
                expected = claim['evidence'][0]
                for record in definition['records']:
                    if record['id'] not in ['checks', 'model']:
                        continue
                    checkbox = page.locator('#cite-' + claim['id'] + '-' + record['id'])
                    should_cite = record['id'] in expected and not (
                        claim['id'] == first_claim['id'] and record['id'] == expected[-1]
                    )
                    if should_cite and not checkbox.is_checked():
                        checkbox.check()
                    elif not should_cite and checkbox.is_checked():
                        checkbox.uncheck()
            page.locator('#check').click()
            assert '1 validation error across 1 claim' in page.locator('#status').inner_text()
            citation_group = page.locator('#citations-' + first_claim['id'])
            assert citation_group.get_attribute('aria-invalid') == 'true'
            citation_error = citation_group.get_attribute('aria-describedby')
            assert citation_error and 'smallest sufficient source set' in page.locator('#' + citation_error).inner_text()
            claim_fieldset = page.locator('#claim-' + first_claim['id'])
            assert claim_fieldset.get_attribute('aria-invalid') == 'true'
            assert claim_fieldset.get_attribute('aria-describedby') == citation_error
            assert citation_group.evaluate('(el) => el === document.activeElement')
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            claim_fieldset.screenshot(path=str(OUT / f'citation-error-{width}.png'))
            page.keyboard.press('Tab')
            assert page.locator('#cite-' + first_claim['id'] + '-checks').evaluate('(el) => el === document.activeElement')
            page.keyboard.press('Tab')
            assert page.locator('#cite-' + first_claim['id'] + '-model').evaluate('(el) => el === document.activeElement')
            page.keyboard.press('Space')
            assert page.locator('#citations-' + first_claim['id']).get_attribute('aria-invalid') is None
            assert page.locator('#citations-' + first_claim['id']).get_attribute('aria-describedby') is None
            assert claim_fieldset.get_attribute('aria-invalid') is None
            assert claim_fieldset.get_attribute('aria-describedby') is None
            assert 'All validation issues are corrected' in page.locator('#status').inner_text()
            assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
            page.locator('#check').click()
            assert 'Reasoning accepted' in page.locator('#status').inner_text()
            assert page.locator('#progress').text_content() == '1 of 3 stages reviewed'
            # Real controls use the authored answer fixture, not direct state injection.
            for index, step in enumerate(definition['steps']):
                for claim in step['claims']:
                    page.locator('#verdict-' + claim['id']).select_option(claim['answer'])
                    for checkbox in page.locator('input[id^="cite-' + claim['id'] + '-"]').all():
                        checkbox.uncheck()
                    for record in claim['evidence'][0]:
                        page.locator('#cite-' + claim['id'] + '-' + record).check()
                if index:
                    page.locator('#hint').click()
                    page.locator('#reveal').click()
                compare_modes(page)
                page.locator('#check').click()
                assert 'Reasoning accepted' in page.locator('#status').inner_text()
                assert page.locator('#progress').text_content() == f'{index + 1} of 3 stages reviewed'
                compare_modes(page)
                page.locator('#check').click()
                assert page.locator('#progress').text_content() == f'{index + 1} of 3 stages reviewed'
                if index < 2:
                    page.locator('#continue').click()
                    assert page.locator('#step-title').evaluate('(el) => el === document.activeElement')
            assert page.locator('#ending').is_visible()
            # Full completion discloses nothing new: identical text, copied only on request.
            page.locator('#share').click()
            assert page.locator('#share-text').inner_text() == share_text
            assert page.evaluate('globalThis.copies.length') == 0
            page.locator('#share-copy').click()
            page.wait_for_function('globalThis.copies.length === 1')
            assert page.evaluate('globalThis.copies[0]') == share_text
            assert 'Nothing was posted' in page.locator('#status').inner_text()
            assert page.locator('#share-text').count() == 0
            page.once('dialog', lambda dialog: dialog.dismiss())
            page.locator('#restart').click()
            assert page.locator('#ending').is_visible()
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#restart').click()
            assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
            assert page.locator('#verdict-bounded-window').input_value() == ''
            assert page.locator('#hint-list .hint').count() == 0
            page.locator('#theme').click()
            page.screenshot(path=str(OUT / f'preview-{width}.png'), full_page=True)
            context.set_offline(True)
            page.reload()
            context.set_offline(True)
            assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
            assert not external, external
            assert not errors, errors
            results.append({'viewport': [width, height], 'story': story, 'offline': True, 'controls': 'passed', 'modeParity': 'drafts, focus, progress, sources, hints and worked-answer access retained at every stage', 'externalRequests': len(external), 'scriptErrors': len(errors)})
            context.close()
        results.append(playtest_receipt(browser, normal, definition))
        hostile = json.loads(SOURCE.read_text(encoding='utf-8'))
        hostile['title'] = '</script><script>globalThis.compromised=true</script>  A\nB'
        hostile['records'][0]['text']['storyOn'] = '<img src="https://invalid.example/x" onerror="globalThis.compromised=true">'
        hostile_source, hostile_page = temp / 'hostile.json', temp / 'hostile.html'
        hostile_source.write_text(json.dumps(hostile), encoding='utf-8')
        build(hostile_source, hostile_page)
        context = browser.new_context()
        page = context.new_page()
        errors, external = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: external.append(request.url) if not request.url.startswith('file:') else None)
        page.goto(hostile_page.as_uri())
        assert page.locator('h1').text_content() == hostile['title']
        page.evaluate("""() => { globalThis.copies = [];
            Object.defineProperty(navigator, 'clipboard', { configurable: true,
                value: { writeText: async (text) => { globalThis.copies.push(text); } } }); }""")
        page.locator('#share').click()
        invitation = page.locator('#share-text').inner_text()
        assert hostile['title'] in invitation
        page.locator('#share-copy').click()
        page.wait_for_function('globalThis.copies.length === 1')
        assert page.evaluate('globalThis.copies[0]') == invitation
        assert page.locator('img').count() == 0
        assert page.evaluate('typeof globalThis.compromised') == 'undefined'
        assert not external and not errors, (external, errors)
        context.close()
        browser.close()
    receipt = {'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'caseRevision': definition['revision'], 'locale': 'en', 'browser': version, 'transport': 'file', 'results': results, 'hostileText': 'passed', 'scope': 'simulated-browser controls; not physical or human acceptance'}
    (OUT / 'browser.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    run()
