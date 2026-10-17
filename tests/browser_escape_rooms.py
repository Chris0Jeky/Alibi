"""Actual-control anthology checks. File loading by default; DOM mode is not origin evidence."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/escape-rehearsal'
NAMES = ['tidekeeper-workshop', 'printmaker-cabinet', 'moonseed-conservatory', 'herbarium-lift', 'counterweight-loft', 'clockmaker-rehearsal']


def build(output, sources):
    result = subprocess.run(['node', 'tools/escape-preview.cjs', str(output), *map(str, sources)], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def open_document(page, file):
    if os.environ.get('ESCAPE_DOM_ONLY') == '1':
        page.set_content(file.read_text(encoding='utf-8'))
    else:
        page.goto(file.as_uri())


def inspect(page, object_id, width):
    if width <= 760:
        page.locator('#object-select').select_option(object_id)
    else:
        page.locator('#inspect-' + object_id).click()


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    sources = [ROOT / 'content/escape-rooms' / (n + '.json') for n in NAMES]
    definitions = [json.loads(p.read_text(encoding='utf-8')) for p in sources]
    results = []
    with tempfile.TemporaryDirectory(prefix='postern-escape-') as td, sync_playwright() as pw:
        td = Path(td)
        html = td / 'rooms.html'
        receipt = build(html, sources)
        launch = {'headless': True}
        if os.environ.get('ALIBI_CHROMIUM'):
            launch['executable_path'] = os.environ['ALIBI_CHROMIUM']
        browser = pw.chromium.launch(**launch)
        version = browser.version
        for width, height in [(320, 780), (1280, 900), (844, 390)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', offline=True)
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda req: external.append(req.url) if not req.url.startswith('file:') else None)
            open_document(page, html)
            page.locator('#room-title').wait_for()
            assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
            for index, d in enumerate(definitions):
                page.locator('#room-select').select_option(d['id'])
                assert page.locator('#room-title').text_content() == d['title']
                assert page.locator('#ending').count() == 0
                assert page.locator('#solution-panel').count() == 0
                actions = {a['id']: a for a in d['actions']}
                trace = receipt['rooms'][index]['model']['solution']
                # Scratch notes survive theme/story changes and a round trip to another room.

                if page.locator('#notes-disclosure').get_attribute('open') is None:
                    page.locator('#notes-disclosure summary').click()
                page.locator('#scratch-notes').fill('My hypothesis for ' + d['id'])
                page.locator('#theme').click()
                page.locator('#story').click()
                assert page.locator('#scratch-notes').input_value() == 'My hypothesis for ' + d['id']
                assert page.locator('#story').evaluate('(el) => el === document.activeElement')
                page.locator('#room-select').select_option(NAMES[(index + 1) % len(NAMES)])
                page.locator('#room-select').select_option(d['id'])
                assert page.locator('#scratch-notes').input_value() == 'My hypothesis for ' + d['id']
                # Explicit reveal and hints must not mark completion.

                if page.locator('#solution-disclosure').get_attribute('open') is None:
                    page.locator('#solution-disclosure summary').click()
                page.locator('#reveal-solution').click()
                assert page.locator('#solution-panel').is_visible()
                assert page.locator('#ending').count() == 0
                page.locator('#reveal-solution').click()
                first = actions[trace[0]]
                inspect(page, first['object'], width)
                if first['input']:
                    page.locator('#answer-' + first['id']).fill('wrong')
                    page.locator('#act-' + first['id']).click()
                    assert 'unchanged' in page.locator('#feedback').text_content()
                    assert page.locator('#answer-' + first['id']).input_value() == 'wrong'
                    assert page.locator('#undo').is_disabled()
                for _ in range(3):
                    page.locator('#help-' + first['id']).click()
                assert page.locator('#help-' + first['id']).is_disabled()
                assert page.locator('#hints-' + first['id'] + ' p').count() == 3
                assert page.locator('#ending').count() == 0
                # A detached control cannot operate a newer render.
                if first['input']:
                    page.locator('#answer-' + first['id']).fill(first['answer'])
                handle = page.locator('#act-' + first['id']).evaluate_handle('(el) => el.closest("form")')
                page.locator('#theme').click()
                before = page.locator('#room-progress').text_content()
                handle.evaluate('(el) => el.dispatchEvent(new Event("submit", {bubbles:true,cancelable:true}))')
                assert page.locator('#room-progress').text_content() == before
                assert page.locator('#undo').is_disabled(), 'Detached form must not mutate the session'
                # Completion exclusively through actual visible controls.
                for action_id in trace:
                    action = actions[action_id]
                    inspect(page, action['object'], width)
                    if action['input']:
                        page.locator('#answer-' + action_id).fill(action['answer'])
                    page.locator('#act-' + action_id).click()
                    assert 'unchanged' not in page.locator('#feedback').text_content(), action_id
                assert page.locator('#ending').is_visible()
                assert page.locator('#room-progress').text_content() == 'Room complete'
                page.screenshot(path=str(OUT / f'{d["id"]}-{width}.png'), full_page=False)
                page.locator('#undo').click()
                assert page.locator('#ending').count() == 0
                last = actions[trace[-1]]
                inspect(page, last['object'], width)
                if last['input']:
                    page.locator('#answer-' + last['id']).fill(last['answer'])
                page.locator('#act-' + last['id']).click()
                assert page.locator('#ending').is_visible()
                results.append({'room': d['id'], 'viewport': [width, height], 'steps': len(trace), 'controls': 'passed'})
            # Cancellation preserves room, notes and completion; confirmed restart clears only current room.
            page.once('dialog', lambda dialog: dialog.dismiss())
            page.locator('#restart').click()
            assert page.locator('#ending').is_visible()
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#restart').click()
            assert page.locator('#ending').count() == 0
            assert page.locator('#scratch-notes').input_value() == ''
            page.locator('#room-select').select_option(NAMES[0])
            assert page.locator('#ending').is_visible()
            open_document(page, html)
            assert page.locator('#ending').count() == 0
            assert page.locator('#scratch-notes').input_value() == ''
            assert not errors, errors
            assert not external, external
            context.close()
        # Authored markup remains inert visible text, including script delimiters.
        hostile = definitions[0]
        hostile['title'] = '</script><script>globalThis.intrusion=true</script>'
        hostile['objects'][0]['text']['storyOn'] = '<img src="https://invalid.example/x" onerror="globalThis.intrusion=true">'
        source = td / 'hostile.json'
        source.write_text(json.dumps(hostile), encoding='utf-8')
        hostile_html = td / 'hostile.html'
        build(hostile_html, [source])
        context = browser.new_context(offline=True)
        page = context.new_page()
        hostile_errors, hostile_requests = [], []
        page.on('pageerror', lambda error: hostile_errors.append(str(error)))
        page.on('request', lambda req: hostile_requests.append(req.url) if not req.url.startswith('file:') else None)
        open_document(page, hostile_html)
        assert page.locator('#room-title').text_content() == hostile['title']
        assert page.locator('img').count() == 0
        assert page.evaluate('typeof globalThis.intrusion') == 'undefined'
        assert not hostile_errors and not hostile_requests, (hostile_errors, hostile_requests)
        context.close()
        browser.close()
        report = {'browser': version, 'transport': 'DOM-only' if os.environ.get('ESCAPE_DOM_ONLY') == '1' else 'file', 'previewSha256': hashlib.sha256(html.read_bytes()).hexdigest(), 'sources': [{k: r[k] for k in ['roomId','revision','sourceSha256']} for r in receipt['rooms']], 'results': results, 'hostileText': 'passed', 'scope': 'simulated controls, not human or physical-device acceptance'}
        (OUT / 'browser.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    run()
