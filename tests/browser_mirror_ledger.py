"""Exercise the standalone Mirror Ledger's real controls and responsive layout."""
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PROTOTYPE = ROOT / 'prototypes/mirror-ledger'
OUTPUT = ROOT / 'test-results/mirror-ledger'
FILES = [*sorted(PROTOTYPE.glob('*')), Path(__file__), ROOT / 'tests/mirror-ledger.test.mjs', ROOT / 'tools/build-mirror-preview.cjs']
BUILT = OUTPUT / 'mirror-ledger.html'
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def run():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(PROTOTYPE)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_address[1]}'
    build = json.loads((OUTPUT / 'build-receipt.json').read_text(encoding='utf-8'))
    built_hash = hashlib.sha256(BUILT.read_bytes()).hexdigest()
    assert built_hash == build['output']['sha256'], 'Built HTML differs from build receipt'
    receipt = {'builtSha256': built_hash, 'sources': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in FILES if p.is_file()}, 'viewports': []}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, **({'executable_path': os.environ['ALIBI_CHROMIUM']} if os.environ.get('ALIBI_CHROMIUM') else {}))
            receipt['chromium'] = browser.version
            for transport, target in [('http', origin), ('file', BUILT.as_uri())]:
                for width,height in [(320,740),(1280,900)]:
                    page = browser.new_page(viewport={'width':width,'height':height})
                    errors, external = [], []
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    page.on('request', lambda r: external.append(r.url) if not (r.url.startswith(origin + '/') if transport == 'http' else r.url == target) else None)
                    page.goto(target, wait_until='networkidle')
                    assert page.locator('[data-cell]').count() == 32
                    assert page.evaluate('document.documentElement.scrollWidth') <= width
                    first = page.locator('[data-cell]:not(.fixed)').first
                    label = first.get_attribute('aria-label')
                    first.focus(); page.keyboard.press('s')
                    assert 'sun' in page.locator(':focus').get_attribute('aria-label')
                    page.keyboard.press('m')
                    assert 'moon' in page.locator(':focus').get_attribute('aria-label')
                    page.keyboard.press('Backspace')
                    assert 'empty' in page.locator(':focus').get_attribute('aria-label')
                    page.get_by_role('button', name='Undo', exact=True).click()
                    assert 'moon' in page.locator(f'[aria-label="{label.replace("empty", "moon")}"]').get_attribute('aria-label')
                    page.locator('[data-link="0"]').click()
                    assert page.locator('.cell.highlight').count() == 2
                    assert page.locator('[data-link="0"]').evaluate('(e) => e === document.activeElement')
                    page.get_by_role('button',name='Hint',exact=True).click()
                    assert page.locator('[role=status]').inner_text()
                    page.get_by_role('button',name='Restart',exact=True).click()
                    assert page.locator(f'[aria-label="{label}"]').count() == 1
                    first = page.locator('[data-cell]:not(.fixed)').first
                    first.focus(); page.keyboard.press('s')
                    undo = page.get_by_role('button', name='Undo', exact=True)
                    undo.focus(); page.keyboard.press('Enter')
                    assert undo.is_disabled()
                    assert first.evaluate('(e) => e === document.activeElement'), 'final Undo returns to the selected cell'
                    assert 'empty' in first.get_attribute('aria-label')
                    page.get_by_role('button',name='Check',exact=True).click()
                    assert 'at least one completion' in page.locator('[role=status]').inner_text()
                    page.locator('#level').focus()
                    page.locator('#level').select_option('1')
                    assert page.locator('#level').input_value() == '1'
                    assert page.locator('#level').evaluate('(e) => e === document.activeElement'), 'changing puzzle preserves keyboard focus'
                    changed = page.locator('[data-cell]:not(.fixed)').first
                    changed_label = changed.get_attribute('aria-label')
                    changed.focus(); page.keyboard.press('s')
                    assert 'sun' in page.locator(':focus').get_attribute('aria-label')
                    page.screenshot(path=str(OUTPUT / f'mirror-{transport}-{width}.png'), full_page=True)
                    page.reload(wait_until='networkidle')
                    assert page.locator('#level').input_value() == '0', 'reload resets the session'
                    page.locator('#level').select_option('1')
                    assert page.locator(f'[aria-label="{changed_label}"]').count() == 1, 'reload clears marks'

                    assert not errors and not external, (errors,external)
                    receipt['viewports'].append({'transport':transport,'width':width,'height':height,'controls':32,'errors':errors,'externalRequests':external})
                    page.close()
            browser.close()
    finally:
        server.shutdown()
    (OUTPUT / 'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(receipt,indent=2))
if __name__ == '__main__':
    run()
