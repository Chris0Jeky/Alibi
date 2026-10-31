"""Source-bound actual controls for the isolated experiment; not human/device acceptance."""
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'prototypes/contradiction-cabinet'
OUT = ROOT / 'test-results/contradiction-cabinet'
INPUTS = [*sorted(SOURCE.glob('*')),
          ROOT / 'tests/contradiction-cabinet.test.mjs', Path(__file__),
          ROOT / '.github/workflows/contradiction-cabinet.yml',
          ROOT / 'requirements-dev.txt', ROOT / 'tools/ci-setup-phase.cjs']


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def hashes():
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in INPUTS if p.is_file()}


def select_reports(page, ids):
    for n in range(1, 6):
        page.locator(f'#r{n}').set_checked(n in ids)


def set_world(page, east, west, stair):
    for name, value in zip(('east', 'west', 'stair'), (east, west, stair)):
        page.locator(f'#lamp-{name}').select_option(value)


def status(page, which, expected):
    assert page.locator(f'#{which}-result').get_attribute('data-status') == expected


def capture(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
    (OUT / f'{name}.aria.txt').write_text(page.locator('body').aria_snapshot(), encoding='utf-8')


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    before = hashes()
    head = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SOURCE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    journeys = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for width, height in [(320, 740), (390, 844), (1440, 900)]:
                    for story in (True, False):
                        context = browser.new_context(viewport={'width': width, 'height': height})
                        try:
                            page = context.new_page()
                            errors, external = [], []
                            page.on('pageerror', lambda error: errors.append(str(error)))
                            page.on('request', lambda request: external.append(request.url)
                                    if not request.url.startswith(origin + '/') else None)
                            page.goto(origin + '/index.html')
                            page.locator('#r1').wait_for()
                            context.set_offline(True)
                            if not story:
                                page.locator('#story-toggle').click()
                            assert page.locator('#story').is_visible() == story
                            assert not page.locator('#worked').is_visible()
                            page.locator('#check-conflict').click()
                            status(page, 'conflict', 'empty')
                            page.locator('#r1').focus()
                            page.keyboard.press('Space')
                            assert page.locator('#r1').is_checked()
                            assert page.locator('#r1').evaluate('(el) => el === document.activeElement')
                            page.locator('#check-conflict').click()
                            status(page, 'conflict', 'consistent')
                            select_reports(page, [1, 2, 3, 4, 5])
                            page.locator('#check-conflict').click()
                            status(page, 'conflict', 'too-large')
                            name = f'{width}-story-{str(story).lower()}'
                            capture(page, name + '-select-all-refused')
                            for ids in ([1, 2, 3], [1, 4, 5]):
                                select_reports(page, ids)
                                page.locator('#check-conflict').click()
                                status(page, 'conflict', 'smallest')
                                assert page.locator('#check-conflict').evaluate('(el) => el === document.activeElement')
                            page.locator('#conflict-hint').click()
                            assert page.locator('#conflict-hint-text').is_visible()
                            assert not page.locator('#worked').is_visible()
                            page.locator('#check-counterexample').click()
                            status(page, 'counterexample', 'incomplete')
                            for values, expected in [
                                (('dark', 'dark', 'dark'), 'violates-premises'),
                                (('lit', 'lit', 'dark'), 'violates-premises'),
                                (('dark', 'lit', 'lit'), 'supports-claim'),
                                (('dark', 'lit', 'dark'), 'counterexample'),
                            ]:
                                set_world(page, *values)
                                page.locator('#check-counterexample').click()
                                status(page, 'counterexample', expected)
                            # A report selection cannot weaken the counterexample's fixed dossier.
                            retained = page.locator('#retained').text_content()
                            select_reports(page, [])
                            page.locator('#check-counterexample').click()
                            status(page, 'counterexample', 'counterexample')
                            assert page.locator('#retained').text_content() == retained
                            select_reports(page, [1, 4, 5])
                            page.locator('#check-conflict').click()
                            page.locator('#story-toggle').click()
                            status(page, 'conflict', 'smallest')
                            status(page, 'counterexample', 'counterexample')
                            assert page.locator('#lamp-west').input_value() == 'lit'
                            assert page.locator('#r4').is_checked()
                            page.locator('#story-toggle').click()
                            page.locator('#lamp-stair').focus()
                            page.keyboard.press('ArrowUp')
                            assert page.locator('#lamp-stair').input_value() == 'lit'
                            assert page.locator('#lamp-stair').evaluate('(el) => el === document.activeElement')
                            status(page, 'counterexample', 'ready')
                            page.keyboard.press('ArrowDown')
                            page.locator('#check-counterexample').click()
                            status(page, 'counterexample', 'counterexample')
                            page.locator('#counterexample-hint').click()
                            assert page.locator('#counterexample-hint-text').is_visible()
                            assert not page.locator('#worked').is_visible()
                            capture(page, name + '-accepted')
                            page.locator('#reveal').click()
                            assert page.locator('#worked').is_visible()
                            assert page.locator('#reveal').get_attribute('aria-expanded') == 'true'
                            assert page.locator('#worked').inner_text().count('R1') == 2
                            layout = page.evaluate('''() => ({width:innerWidth, scroll:document.documentElement.scrollWidth,
                              controls:[...document.querySelectorAll('button,select,label.report')].map(e=>e.getBoundingClientRect().height)})''')
                            assert layout['scroll'] <= width, layout
                            assert min(layout['controls']) >= 44, layout
                            # Reload uses the local source server; this prototype has no service worker.
                            context.set_offline(False)
                            page.reload()
                            page.locator('#r1').wait_for()
                            assert page.locator('input:checked').count() == 0
                            for lamp in ('east', 'west', 'stair'):
                                assert page.locator(f'#lamp-{lamp}').input_value() == ''
                            status(page, 'conflict', 'ready')
                            status(page, 'counterexample', 'ready')
                            assert not page.locator('#worked').is_visible()
                            assert not page.locator('#conflict-hint-text').is_visible()
                            capture(page, name + '-reload')
                            assert not errors, errors
                            assert not external, external
                            journeys.append({'viewport': [width, height], 'story': story,
                                'smallestConflictsAccepted': [[1, 2, 3], [1, 4, 5]],
                                'selectAllRefused': True, 'counterexample': {'east': False, 'west': True, 'stair': False},
                                'fixedPremisesRetained': True, 'keyboardAndFocus': True,
                                'hintsSeparateFromReveal': True, 'offlineInteractions': True,
                                'reloadClearsRehearsal': True, 'reloadSource': 'local HTTP fixture',
                                'scriptErrors': len(errors), 'externalRequests': len(external), 'layout': layout})
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
    evidence = [{'path': p.relative_to(OUT).as_posix(), 'bytes': p.stat().st_size,
                 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                for p in sorted(OUT.glob('*.png'))] + [
                {'path': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                for p in sorted(OUT.glob('*.aria.txt'))]
    receipt = {'head': head, 'browser': version, 'sourceSha256': before,
               'journeys': journeys, 'evidence': evidence, 'humanAcceptance': False}
    (OUT / 'browser-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(f'Contradiction cabinet: {len(journeys)} actual-control journeys passed; head {head}')


if __name__ == '__main__':
    run()
