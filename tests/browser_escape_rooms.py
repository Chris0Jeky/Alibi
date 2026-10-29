"""Actual-control anthology checks. File loading by default; DOM mode is not origin evidence."""
import hashlib
import json
import os
from pathlib import Path
import re
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


def tab_to(page, selector, limit=400):
    """Move focus with Tab only; proves the control is in the keyboard order."""
    for _ in range(limit):
        if page.evaluate('(s) => !!document.activeElement?.matches(s)', selector):
            return
        page.keyboard.press('Tab')
    raise AssertionError('Tab never reached ' + selector)


def arrow_select(page, selector, value):
    """Choose an option with arrow keys; focus must stay on the select (WCAG 3.2.2)."""
    tab_to(page, selector)
    values = page.locator(selector + ' option').evaluate_all('(os) => os.map((o) => o.value)')
    step = values.index(value) - values.index(page.locator(selector).input_value())
    for _ in range(abs(step)):
        page.keyboard.press('ArrowDown' if step > 0 else 'ArrowUp')
        assert page.evaluate('(s) => document.activeElement?.matches(s)', selector), 'focus left ' + selector
    assert page.locator(selector).input_value() == value


def announced(page):
    """The persistent live region must repeat exactly the visible feedback, no more."""
    page.wait_for_function("() => document.getElementById('escape-announcer')?.textContent === (document.getElementById('feedback')?.textContent || '')")
    text = page.locator('#escape-announcer').text_content()
    assert text, 'nothing announced'
    return text


def check_names(page):
    """Every control and named region exposes an accessible name; no aria-label on generic divs."""
    tree = page.locator('#escape-root').aria_snapshot()
    unnamed = [line for line in tree.splitlines() if re.match(r'\s*- (button|textbox|combobox)\b(?! ")', line)]
    assert not unnamed, unnamed
    assert page.evaluate("() => [...document.querySelectorAll('div[aria-label]:not([role])')].length") == 0
    if page.locator('.observations').count():
        assert page.get_by_role('group', name='Current observations', exact=True).count() == 1
    assert page.locator('#escape-announcer').evaluate('(el) => !document.getElementById("escape-root").contains(el)')


def keyboard_pass(browser, html, definitions, receipt):
    """Play every room by keyboard alone; each change is announced without hidden content."""
    results = []
    for width, height in [(1280, 900), (320, 780)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', offline=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        open_document(page, html)
        page.locator('#room-title').wait_for()
        assert page.locator('#escape-announcer').text_content() == ''
        for index, d in enumerate(definitions):
            arrow_select(page, '#room-select', d['id'])
            assert page.locator('#room-title').text_content() == d['title']
            actions = {a['id']: a for a in d['actions']}
            trace = receipt['rooms'][index]['model']['solution']
            for step, action_id in enumerate(trace):
                action = actions[action_id]
                if width <= 760:
                    arrow_select(page, '#object-select', action['object'])
                else:
                    tab_to(page, '#inspect-' + action['object'])
                    page.keyboard.press('Enter')
                    assert page.locator('#inspect-' + action['object']).get_attribute('aria-current') == 'true'
                check_names(page)
                before = set(page.locator('.observations p').all_text_contents())
                if step == 0:
                    tab_to(page, '#help-' + action_id)
                    page.keyboard.press('Space')
                    hint = page.locator('#hints-' + action_id + ' p').first.text_content()
                    assert page.evaluate('(id) => document.activeElement?.id === id', 'hints-' + action_id)
                    assert page.get_by_role('group', name='Hints for ' + action['label'], exact=True).count() == 1
                    page.wait_for_function('(t) => document.getElementById("escape-announcer").textContent === t', arg=hint)
                if action['input']:
                    tab_to(page, '#answer-' + action_id)
                    page.keyboard.type(action['answer'])
                    page.keyboard.press('Enter')
                else:
                    tab_to(page, '#act-' + action_id)
                    page.keyboard.press('Space' if step % 2 else 'Enter')
                text = announced(page)
                assert 'unchanged' not in text, (d['id'], action_id, text)
                for line in set(page.locator('.observations p').all_text_contents()) - before:
                    assert line in text, (d['id'], action_id, line)
                assert d['solution']['storyOn'] not in text
            assert 'Room complete' in announced(page)
            assert page.locator('#ending').is_visible()
            tab_to(page, '#undo')
            page.keyboard.press('Enter')
            assert announced(page).startswith('One room action undone.')
            assert page.locator('#ending').count() == 0
            results.append({'room': d['id'], 'viewport': [width, height], 'keyboard': 'passed'})
        assert not errors, errors
        context.close()
    return results


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
        results += keyboard_pass(browser, html, definitions, receipt)
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
