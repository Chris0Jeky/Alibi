"""Source-bound browser proof of a standalone rehearsal, not human learning evidence."""
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'prototypes/glyph-grammar'
OUT = ROOT / 'test-results/glyph-grammar'
INPUTS = [*sorted(SOURCE.glob('*')), ROOT / 'tests/glyph-grammar.test.mjs',
          Path(__file__), ROOT / '.github/workflows/glyph-grammar.yml',
          ROOT / 'requirements-dev.txt', ROOT / 'tools/ci-setup-phase.cjs']


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def hashes():
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in INPUTS if p.is_file()}


def choose(page, kind, values):
    for key, value in values.items():
        page.locator(f'#{kind}-{key}').select_option(value)


def status(page, kind, expected):
    assert page.locator(f'#{kind}-result').get_attribute('data-status') == expected


def focused(page, selector):
    assert page.locator(selector).evaluate('(el) => el === document.activeElement')


def capture(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
    (OUT / f'{name}.aria.txt').write_text(page.locator('body').aria_snapshot(), encoding='utf-8')


def cleared(page):
    for select in page.locator('select').all():
        assert select.input_value() == ''
    for selector in ('#worked', '#hint-text', '#card-2', '#card-3', '#card-4'):
        assert not page.locator(selector).is_visible(), selector
    for selector in ('#hint', '#reveal'):
        assert page.locator(selector).get_attribute('aria-expanded') == 'false'
    assert page.locator('#story').is_visible()
    assert page.locator('#story-toggle').get_attribute('aria-pressed') == 'false'
    status(page, 'draft', 'ready')
    status(page, 'answer', 'ready')


def layout(page, width):
    result = page.evaluate('''() => ({width:innerWidth, scroll:document.documentElement.scrollWidth,
      controls:[...document.querySelectorAll('button,select')].map(e=>e.getBoundingClientRect().height)})''')
    assert result['scroll'] <= width, result
    assert not result['controls'] or min(result['controls']) >= 44, result
    return result


def run():
    # A receipt is written only after all six journeys and input checks complete.
    OUT.mkdir(parents=True, exist_ok=True)
    assert not (OUT / 'browser-receipt.json').exists(), 'Use a fresh proof directory'
    before = hashes()
    head = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SOURCE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    journeys, controls = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for width, height in [(320, 740), (390, 844), (1440, 900)]:
                    for story in (True, False):
                        context = browser.new_context(viewport={'width': width, 'height': height})
                        try:
                            errors, external = [], []

                            def allow_local(route):
                                if route.request.url.startswith(origin + '/'):
                                    route.continue_()
                                else:
                                    external.append(route.request.url)
                                    route.abort()

                            context.route('**/*', allow_local)
                            page = context.new_page()
                            page.on('pageerror', lambda error: errors.append(str(error)))
                            page.goto(origin + '/index.html')
                            page.locator('#draft-P').wait_for()
                            cleared(page)
                            assert 'Card 4' not in page.locator('body').aria_snapshot()
                            context.set_offline(True)
                            if not story:
                                page.locator('#story-toggle').click()
                            assert page.locator('#story').is_visible() == story
                            page.locator('#check-draft').click()
                            status(page, 'draft', 'incomplete')
                            page.locator('#draft-P').focus()
                            page.keyboard.press('ArrowDown')
                            assert page.locator('#draft-P').input_value() == 'Lark'
                            focused(page, '#draft-P')
                            choose(page, 'draft', {'Q': 'Lark'})
                            page.locator('#check-draft').click()
                            status(page, 'draft', 'contradicted')
                            assert page.locator('#draft-Q').input_value() == 'Lark'
                            choose(page, 'draft', {'Q': 'Moss'})
                            page.locator('#check-draft').click()
                            status(page, 'draft', 'incomplete')
                            page.locator('#next').click()
                            assert page.locator('#card-2').is_visible()
                            assert not page.locator('#card-3').is_visible()
                            assert page.locator('#draft-P').input_value() == 'Lark'
                            # Even a correct complete draft cannot certify an ambiguous transfer.
                            choose(page, 'draft', dict(P='Lark', Q='Moss', X='bowl', Y='lamp', Z='spoon',
                                                     H='owns', R='requests', D='2', order='first', position='before'))
                            page.locator('#check-draft').click()
                            status(page, 'draft', 'compatible')
                            choose(page, 'answer', dict(who='Lark', relation='requests', count='2', tool='lamp'))
                            page.locator('#check-answer').focus()
                            page.keyboard.press('Enter')
                            status(page, 'answer', 'possible')
                            focused(page, '#check-answer')
                            assert '4 rule sets' in page.locator('#evidence-summary').inner_text()
                            assert '2 cannot parse' in page.locator('#evidence-summary').inner_text()
                            for count, relation, expected in [('1', 'requests', 'possible'), ('2', 'owns', 'contradicted'), ('', 'requests', 'incomplete'), ('2', 'requests', 'possible')]:
                                choose(page, 'answer', dict(count=count, relation=relation))
                                page.locator('#check-answer').click()
                                status(page, 'answer', expected)
                            for _ in range(3):
                                page.locator('#hint').click()
                            assert 'No shown card' in page.locator('#hint-text').inner_text()
                            assert not page.locator('#worked').is_visible()
                            name = f'{width}-story-{str(story).lower()}'
                            capture(page, name + '-ambiguous')
                            page.locator('#reveal').click()
                            assert 'Lark requests one lamp' in page.locator('#worked').inner_text()
                            assert 'Lark requests two lamps' in page.locator('#worked').inner_text()
                            assert '2 compatible rule sets refuse' in page.locator('#worked').inner_text()
                            assert 'Split chevron: two' not in page.locator('#worked').inner_text()
                            page.locator('#story-toggle').click()
                            status(page, 'answer', 'possible')
                            assert page.locator('#draft-D').input_value() == '2'
                            page.locator('#story-toggle').click()
                            page.locator('#next').click()
                            assert not page.locator('#hint-text').is_visible()
                            assert not page.locator('#worked').is_visible()
                            page.locator('#check-answer').click()
                            status(page, 'answer', 'possible')
                            page.locator('#next').click()
                            page.locator('#check-answer').click()
                            status(page, 'answer', 'supported')
                            focused(page, '#check-answer')
                            for _ in range(3):
                                page.locator('#hint').click()
                            assert 'Card 4' in page.locator('#hint-text').inner_text()
                            assert not page.locator('#worked').is_visible()
                            capture(page, name + '-supported')
                            page.locator('#reveal').click()
                            assert page.locator('#reveal').get_attribute('aria-expanded') == 'true'
                            assert 'Split chevron: two' in page.locator('#worked').inner_text()
                            assert 'Every remaining rule set agrees' in page.locator('#worked').inner_text()
                            measured = layout(page, width)
                            capture(page, name + '-revealed')
                            page.locator('#restart').click()
                            cleared(page)
                            focused(page, '#restart')
                            # Re-populate both hint and reveal, so reload is an independent reset check.
                            choose(page, 'draft', {'P': 'Moss'})
                            choose(page, 'answer', {'count': '2'})
                            page.locator('#next').click()
                            page.locator('#hint').click()
                            page.locator('#reveal').click()
                            page.locator('#story-toggle').click()
                            assert page.locator('#hint-text').is_visible()
                            assert page.locator('#worked').is_visible()
                            context.set_offline(False)
                            page.reload()
                            page.locator('#draft-P').wait_for()
                            cleared(page)
                            capture(page, name + '-reload')
                            if story:
                                page.goto(origin + '/control.html')
                                page.locator('.dictionary svg').first.wait_for()
                                assert page.locator('.dictionary dt').count() == 8
                                assert page.locator('.dictionary dd').all_text_contents() == ['Lark workshop', 'Moss workshop', 'bowl', 'lamp', 'spoon', 'owns', 'requests', 'two']
                                assert page.locator('#observations').count() == 0
                                assert 'counterbalanced' in page.locator('body').inner_text()
                                controls.append({'width': width, 'layout': layout(page, width)})
                                capture(page, f'{width}-dictionary-control')
                            assert not errors, errors
                            assert not external, external
                            journeys.append({'viewport': [width, height], 'story': story,
                                'revisableDuplicateDraft': True, 'completeDraftCannotCertify': True,
                                'partial': {'candidates': 4, 'syntaxRefusals': 2, 'bothQuantitiesPossible': True},
                                'contradictedAndSupported': True, 'keyboardAndFocus': True,
                                'hintUsesShownEvidence': True, 'explicitReveal': True,
                                'storyEquivalent': True, 'offlineAfterLoad': True,
                                'restartClearsRehearsal': True, 'reloadClearsRehearsal': True,
                                'reloadSource': 'local HTTP fixture, not offline navigation',
                                'scriptErrors': len(errors), 'externalRequests': len(external), 'layout': measured})
                        finally:
                            context.close()
                version = browser.version
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    assert hashes() == before, 'Source changed during browser proof'
    for path in before:
        target = OUT / 'source' / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / path).read_bytes())
    evidence = [{'path': p.name, 'bytes': p.stat().st_size,
                 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                for p in sorted(OUT.iterdir()) if p.suffix in ('.png', '.txt')]
    receipt = {'head': head, 'browser': version, 'sourceSha256': before,
               'journeys': journeys, 'dictionaryControl': controls,
               'evidence': evidence, 'humanLearningEstablished': False}
    (OUT / 'browser-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(f'Glyph grammar: {len(journeys)} actual-control journeys and 3 dictionary views passed; head {head}')


if __name__ == '__main__':
    run()
