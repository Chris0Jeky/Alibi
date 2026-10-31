"""Actual control and PDF proof; not evidence of human cooperation or physical printing."""
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'prototypes/two-dossiers'
OUT = ROOT / 'test-results/two-dossiers'
INPUTS = [*sorted(SOURCE.glob('*')), ROOT / 'tests/two-dossiers.test.mjs', Path(__file__),
          ROOT / '.github/workflows/two-dossiers.yml', ROOT / 'requirements-dev.txt',
          ROOT / 'tools/ci-setup-phase.cjs']
ROLE_IDS = {'archive': ['A0', 'A1', 'A2'], 'field': ['B1', 'B2'],
            'solo': ['A0', 'A1', 'A2', 'B1', 'B2']}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def hashes():
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in INPUTS if p.is_file()}


def capture(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'), full_page=True)
    (OUT / f'{name}.aria.txt').write_text(page.locator('body').aria_snapshot(), encoding='utf-8')


def focused(page, selector):
    assert page.locator(selector).evaluate('(e) => e === document.activeElement'), selector


def cleared(page):
    assert page.locator('#claim').input_value() == 'quay'
    assert page.locator('#verdict').input_value() == ''
    assert page.locator('#explanation').input_value() == ''
    assert page.locator('#citations input:checked').count() == 0
    for selector in ('#hint-text', '#worked', '#pause-dialog'):
        assert not page.locator(selector).is_visible(), selector
    for selector in ('#hint', '#reveal'):
        assert page.locator(selector).get_attribute('aria-expanded') == 'false'
    assert page.locator('#result').get_attribute('data-status') == 'ready'
    assert page.locator('#story').is_visible()
    assert page.locator('#story-toggle').get_attribute('aria-pressed') == 'false'


def layout(page, width):
    measured = page.evaluate('''() => ({width: innerWidth, scroll: document.documentElement.scrollWidth,
      targets: [...document.querySelectorAll('button,select,nav a,#citations label')]
        .filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height)})''')
    assert measured['scroll'] <= width, measured
    assert min(measured['targets']) >= 44, measured
    return measured


def check(page, verdict, expected):
    page.locator('#verdict').select_option(verdict)
    page.locator('#check').focus()
    page.keyboard.press('Enter')
    focused(page, '#check')
    assert page.locator('#result').get_attribute('data-status') == expected


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    assert not (OUT / 'browser-receipt.json').exists(), 'Use a fresh proof directory'
    before = hashes()
    head = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
    cards = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
        f"import {{CARDS}} from '{(SOURCE / 'case.mjs').as_uri()}'; console.log(JSON.stringify(CARDS))"],
        text=True))
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SOURCE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    journeys, prints = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for width, height in [(320, 740), (390, 844), (1440, 900)]:
                    for story in (True, False):
                        for role, ids in ROLE_IDS.items():
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
                                page.goto(origin + f'/index.html?role={role}')
                                page.locator('#citations input').first.wait_for()
                                cleared(page)
                                assert page.locator('#cards li').count() == len(ids)
                                for card in cards:
                                    if card['id'] in ids:
                                        assert page.locator(f"#card-{card['id']} p").inner_text() == card['text']
                                    else:
                                        assert page.locator(f"#card-{card['id']}").count() == 0
                                        assert page.locator(f"#cite-{card['id']}").count() == 0
                                context.set_offline(True)
                                if not story:
                                    page.locator('#story-toggle').click()
                                card_text = page.locator('#cards').inner_text()
                                assert page.locator('#story').is_visible() == story
                                check(page, '', 'incomplete')
                                # A correct guess with no cited evidence must not count as supported.
                                check(page, 'supported', 'revise')
                                assert '32 possibilities' in page.locator('#result').inner_text()
                                current = [cid for cid in ids if cid != 'A0']
                                first = f'#cite-{current[0]}'
                                page.locator(first).focus()
                                page.keyboard.press('Space')
                                assert page.locator(first).is_checked()
                                focused(page, first)
                                for cid in current[1:]:
                                    page.locator(f'#cite-{cid}').check()
                                page.locator('#explanation').fill('A provisional explanation; keep uncertainty open.')
                                check(page, 'supported' if role == 'solo' else 'uncertain', 'matches')
                                count = {'archive': 6, 'field': 8, 'solo': 2}[role]
                                assert f'{count} possibilities' in page.locator('#result').inner_text()
                                check(page, 'refuted', 'revise')
                                check(page, 'supported' if role == 'solo' else 'uncertain', 'matches')
                                page.locator('#pause').click()
                                focused(page, '#resume')
                                assert page.locator('#pause-dialog').is_visible()
                                page.keyboard.press('Enter')
                                focused(page, '#pause')
                                assert not page.locator('#pause-dialog').is_visible()
                                assert page.locator('#explanation').input_value().startswith('A provisional')
                                assert page.locator('#citations input:checked').count() == len(current)
                                page.locator('#pause').click()
                                page.keyboard.press('Escape')
                                focused(page, '#pause')
                                for _ in range(3):
                                    page.locator('#hint').click()
                                assert 'if and only if' in page.locator('#hint-text').inner_text()
                                assert not page.locator('#worked').is_visible()
                                name = f'{width}-{role}-story-{str(story).lower()}'
                                measured = layout(page, width)
                                capture(page, name + '-checked')
                                page.locator('#reveal').click()
                                assert page.locator('#reveal').get_attribute('aria-expanded') == 'true'
                                assert f'{count} possibilities' in page.locator('#worked').inner_text()
                                if role != 'solo':
                                    assert page.locator('#worked p').count() == 2
                                page.locator('#claim').select_option('upper')
                                assert not page.locator('#worked').is_visible()
                                assert not page.locator('#hint-text').is_visible()
                                check(page, 'supported', 'revise')
                                check(page, 'uncertain', 'matches')
                                page.locator('#reveal').click()
                                assert page.locator('#worked p').count() == 2
                                assert 'upper open' in page.locator('#worked').inner_text()
                                assert 'upper closed' in page.locator('#worked').inner_text()
                                capture(page, name + '-uncertain')
                                if role != 'field':
                                    page.locator('#cite-A0').check()
                                    check(page, 'supported', 'unavailable')
                                    assert 'superseded plan' in page.locator('#result').inner_text()
                                    page.locator('#cite-A0').uncheck()
                                # Story changes do not alter evidence or drafts.
                                page.locator('#story-toggle').click()
                                assert page.locator('#cards').inner_text() == card_text
                                assert page.locator('#claim').input_value() == 'upper'
                                page.locator('#story-toggle').click()
                                if width == 1440:
                                    # Capture the print-button wiring separately from actual PDF generation.
                                    page.evaluate('window.printCalls=0; window.print=()=>{window.printCalls++}')
                                    page.locator('#print').click()
                                    assert page.evaluate('window.printCalls') == 1
                                    page.emulate_media(media='print')
                                    for selector in ('#work', 'nav', 'footer', '#hint-text', '#worked'):
                                        assert not page.locator(selector).is_visible(), selector
                                    assert page.locator('#cards').inner_text() == card_text
                                    print_name = f'print-{role}-story-{str(story).lower()}'
                                    capture(page, print_name)
                                    page.pdf(path=str(OUT / f'{print_name}.pdf'), format='A4',
                                             print_background=True, prefer_css_page_size=True)
                                    prints.append({'role': role, 'story': story, 'cardIds': ids,
                                        'cardText': card_text, 'pdf': print_name + '.pdf',
                                        'feedbackHidden': True, 'printButtonInvoked': True,
                                        'physicalPrinterTested': False})
                                    page.emulate_media(media='screen')
                                page.locator('#restart').click()
                                cleared(page)
                                focused(page, '#restart')
                                # Reload from a separately populated state, not from the reset state.
                                page.locator(first).check()
                                page.locator('#claim').select_option('upper')
                                page.locator('#verdict').select_option('uncertain')
                                page.locator('#explanation').fill('Reload must discard this.')
                                page.locator('#hint').click()
                                page.locator('#reveal').click()
                                page.locator('#story-toggle').click()
                                context.set_offline(False)
                                page.reload()
                                page.locator('#citations input').first.wait_for()
                                cleared(page)
                                capture(page, name + '-reload')
                                assert not errors, errors
                                assert not external, external
                                journeys.append({'viewport': [width, height], 'role': role, 'story': story,
                                    'worldCount': count, 'sameSourceCards': True, 'roleSeparation': True,
                                    'unsupportedGuessRefused': True, 'orientationUncertain': True,
                                    'supersededRefused': role != 'field', 'keyboardAndFocus': True,
                                    'pauseResumeAndEscape': True, 'hintsSeparateFromReveal': True,
                                    'storyEquivalent': True, 'offlineAfterLoad': True,
                                    'restartClears': True, 'reloadClears': True,
                                    'reloadSource': 'local HTTP, not offline navigation',
                                    'scriptErrors': len(errors), 'externalRequests': len(external),
                                    'layout': measured})
                            finally:
                                context.close()
                context = browser.new_context(viewport={'width': 1440, 'height': 900})
                try:
                    facilitator_errors, facilitator_external = [], []

                    def allow_facilitator(route):
                        if route.request.url.startswith(origin + '/'):
                            route.continue_()
                        else:
                            facilitator_external.append(route.request.url)
                            route.abort()

                    context.route('**/*', allow_facilitator)
                    page = context.new_page()
                    page.on('pageerror', lambda error: facilitator_errors.append(str(error)))
                    page.goto(origin + '/facilitator.html')
                    assert 'shared-signal-1' in page.locator('body').inner_text()
                    assert 'zero worlds cannot certify' in page.locator('body').inner_text()
                    page.emulate_media(media='print')
                    capture(page, 'print-facilitator')
                    page.pdf(path=str(OUT / 'print-facilitator.pdf'), format='A4',
                             print_background=True, prefer_css_page_size=True)
                    assert not facilitator_errors, facilitator_errors
                    assert not facilitator_external, facilitator_external
                finally:
                    context.close()
                version = browser.version
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    assert hashes() == before, 'Source changed during proof'
    assert len(journeys) == 18 and len(prints) == 6
    for name in before:
        target = OUT / 'source' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / name).read_bytes())
    evidence = [{'path': p.name, 'bytes': p.stat().st_size,
                 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                for p in sorted(OUT.iterdir()) if p.suffix in ('.png', '.txt', '.pdf')]
    receipt = {'head': head, 'browser': version, 'sourceSha256': before,
               'journeys': journeys, 'playerPrints': prints, 'facilitatorPdf': 'print-facilitator.pdf',
               'facilitatorScriptErrors': len(facilitator_errors),
               'facilitatorExternalRequests': len(facilitator_external),
               'evidence': evidence, 'humanRoleBalanceEstablished': False, 'physicalPrinterTested': False}
    (OUT / 'browser-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(f'Two dossiers: {len(journeys)} actual-control journeys, 6 player PDFs and 1 separate facilitator PDF passed; head {head}')


if __name__ == '__main__':
    run()
