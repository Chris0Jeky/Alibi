"""Actual Cascade controls at narrow and desktop widths; no physical-device claim."""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT / 'test-results/cascade-controls')))
OUT.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
results = []
try:
    with sync_playwright() as p:
        launch = {}
        executable = os.environ.get('ALIBI_CHROMIUM')
        if executable or Path('/usr/bin/chromium').exists():
            launch['executable_path'] = executable or '/usr/bin/chromium'
        browser = p.chromium.launch(**launch)
        for width, height in ((320,640), (390,844), (1280,900)):
            context = browser.new_context(viewport={'width':width, 'height':height}, reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/#/salon/blockcabinet')
            page.locator('.bc-host .bc-cell').first.wait_for(timeout=30000)
            menu = page.locator('.bc-host [data-command="menu"]')
            if menu.is_visible():
                menu.click()
            page.locator('.bc-host [data-command="switch"]').click()
            dialog = page.get_by_role('dialog', name='Cascade Cabinet', exact=True)
            dialog.wait_for()
            controls = dialog.locator('.bc-controls')
            controls.locator('[data-command="rotate"]').wait_for()
            controls.scroll_into_view_if_needed()
            measurements = controls.locator('button:visible').evaluate_all('''buttons=>buttons.map(button=>{
              const box=button.getBoundingClientRect(),span=button.querySelector('span'),range=document.createRange();
              range.selectNodeContents(span);
              const labels=[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
              return {name:span.textContent,width:box.width,height:box.height,left:box.left,right:box.right,top:box.top,bottom:box.bottom,labels};
            })''')
            page.screenshot(path=str(OUT/f'cascade-{width}.png'), full_page=True)
            (OUT/f'geometry-{width}.json').write_text(json.dumps(measurements,indent=2)+'\n')
            assert len(measurements)==5, measurements
            for button in measurements:
                assert button['width']>=44 and button['height']>=44, button
                assert 0<=button['left'] and button['right']<=width, button
                assert all(r['left']>=button['left'] and r['right']<=button['right'] and r['top']>=button['top'] and r['bottom']<=button['bottom'] for r in button['labels']), button
            piece = dialog.locator('[data-piece="0"]')
            piece.click()
            controls.locator('[data-command="rotate"]').click()
            cancel = controls.get_by_role('button',name='Cancel piece',exact=True)
            cancel.focus()
            cancel.press('Enter')
            assert piece.get_attribute('aria-pressed')=='false'
            assert piece.evaluate('el=>el===document.activeElement')
            assert dialog.locator('[data-selection-title]').inner_text()=='Select a tray piece'
            page.get_by_role('button',name='Close Cascade lab',exact=True).click()
            assert page.locator('.bc-host [data-command="switch"]').evaluate('el=>el===document.activeElement')
            assert not errors,errors
            results.append({'width':width,'height':height,'case':'five-readable-targets-and-rotate-cancel-focus'})
            print(json.dumps(results[-1]),flush=True)
            context.close()
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'physicalDevice':False,'mode':'built-origin-controls','scenarios':results},indent=2)+'\n')
finally:
    server.shutdown()
