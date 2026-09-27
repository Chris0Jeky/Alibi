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


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    definition = json.loads(SOURCE.read_text(encoding='utf-8'))
    results = []
    with tempfile.TemporaryDirectory(prefix='postern-case-browser-') as temp, sync_playwright() as pw:
        temp = Path(temp)
        normal = temp / 'preview.html'
        build(SOURCE, normal)
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
            context.set_offline(True)
            assert page.locator('#progress').inner_text() == '0 of 3 stages reviewed'
            assert page.locator('#stage-alarm').is_disabled()
            assert page.locator('#record-maintenance').count() == 0
            assert page.locator('#worked').count() == 0
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            page.locator('#verdict-bounded-window').focus()
            page.keyboard.press('ArrowDown')
            page.keyboard.press('Tab')
            assert page.locator('#cite-bounded-window-checks').evaluate('(el) => el === document.activeElement')
            page.locator('#verdict-bounded-window').select_option('supported')
            page.locator('#cite-bounded-window-checks').check()
            page.locator('#story').click()
            assert page.locator('#verdict-bounded-window').input_value() == 'supported'
            assert page.locator('#cite-bounded-window-checks').is_checked()
            assert page.locator('#story').evaluate('(el) => el === document.activeElement')
            if story:
                page.locator('#story').click()
            page.locator('#check').click()
            assert 'draft is retained' in page.locator('#status').inner_text()
            assert page.locator('#progress').inner_text() == '0 of 3 stages reviewed'
            for _ in range(3):
                page.locator('#hint').click()
            assert page.locator('#hint').is_disabled()
            assert page.locator('#hint-list .hint').count() == 3
            page.locator('#reveal').click()
            assert page.locator('#worked').is_visible()
            assert page.locator('#progress').inner_text() == '0 of 3 stages reviewed'
            page.locator('#reveal').click()
            assert page.locator('#worked').count() == 0
            # Real controls use the authored answer fixture, not direct state injection.
            for index, step in enumerate(definition['steps']):
                for claim in step['claims']:
                    page.locator('#verdict-' + claim['id']).select_option(claim['answer'])
                    for checkbox in page.locator('input[id^="cite-' + claim['id'] + '-"]').all():
                        checkbox.uncheck()
                    for record in claim['evidence'][0]:
                        page.locator('#cite-' + claim['id'] + '-' + record).check()
                page.locator('#check').click()
                assert 'Reasoning accepted' in page.locator('#status').inner_text()
                assert page.locator('#progress').inner_text() == f'{index + 1} of 3 stages reviewed'
                page.locator('#check').click()
                assert page.locator('#progress').inner_text() == f'{index + 1} of 3 stages reviewed'
                if index < 2:
                    page.locator('#continue').click()
                    assert page.locator('#step-title').evaluate('(el) => el === document.activeElement')
            assert page.locator('#ending').is_visible()
            page.once('dialog', lambda dialog: dialog.dismiss())
            page.locator('#restart').click()
            assert page.locator('#ending').is_visible()
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#restart').click()
            assert page.locator('#progress').inner_text() == '0 of 3 stages reviewed'
            assert page.locator('#verdict-bounded-window').input_value() == ''
            assert page.locator('#hint-list .hint').count() == 0
            page.locator('#theme').click()
            page.screenshot(path=str(OUT / f'preview-{width}.png'), full_page=True)
            context.set_offline(True)
            page.reload()
            context.set_offline(True)
            assert page.locator('#progress').inner_text() == '0 of 3 stages reviewed'
            assert not external, external
            assert not errors, errors
            results.append({'viewport': [width, height], 'story': story, 'offline': True, 'controls': 'passed', 'externalRequests': len(external), 'scriptErrors': len(errors)})
            context.close()
        hostile = json.loads(SOURCE.read_text(encoding='utf-8'))
        hostile['title'] = '</script><script>globalThis.compromised=true</script>'
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
        assert page.locator('h1').inner_text() == hostile['title']
        assert page.locator('img').count() == 0
        assert page.evaluate('typeof globalThis.compromised') == 'undefined'
        assert not external and not errors, (external, errors)
        context.close()
        browser.close()
    receipt = {'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'caseRevision': definition['revision'], 'browser': version, 'transport': 'file', 'results': results, 'hostileText': 'passed', 'scope': 'simulated-browser controls; not physical or human acceptance'}
    (OUT / 'browser.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    run()
