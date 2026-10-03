"""Actual built-origin replay, journal persistence and focus at phone/desktop widths.
Seeds valid fixtures through real IndexedDB, never through a production test hook.
Not physical-device or TalkBack acceptance.
"""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT / 'test-results/club-results')))
OUT.mkdir(parents=True, exist_ok=True)
GARDEN = json.loads((ROOT / 'content/region-gardens.json').read_text())['puzzles'][0]

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = os.environ.get('ALIBI_URL', f'http://127.0.0.1:{server.server_port}')
results = []
try:
    with sync_playwright() as p:
        launch = {}
        executable = os.environ.get('ALIBI_CHROMIUM')
        if executable or Path('/usr/bin/chromium').exists():
            launch['executable_path'] = executable or '/usr/bin/chromium'
        browser = p.chromium.launch(**launch)
        for width in (320, 390, 1280):
            context = browser.new_context(viewport={'width': width, 'height': 900})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/#/salon/tictactoe')
            page.locator('[data-action="club-tictactoe-cell"]').first.wait_for()
            page.wait_for_function('() => AlibiClub.diagnostics().storageMode === "indexeddb"')

            def seed(game, run):
                page.evaluate('''async ({game,run}) => {
                  await AlibiClub.flush();
                  const data=structuredClone(AlibiClub.diagnostics().state);
                  data.runs[game]=run; data.records=[];
                  const rev=AlibiClub.diagnostics().revision+1;
                  await new Promise((resolve,reject)=>{
                    const request=indexedDB.open('alibi-afterhours-v1',1);
                    request.onerror=()=>reject(request.error);
                    request.onsuccess=()=>{
                      const db=request.result,tx=db.transaction('club','readwrite');
                      tx.objectStore('club').put({rev,data},'state');
                      tx.oncomplete=()=>{db.close();resolve();};
                      tx.onerror=()=>{db.close();reject(tx.error);};
                    };
                  });
                }''', {'game': game, 'run': run})
                page.reload()
                page.wait_for_function('(g)=>AlibiClub.diagnostics().state.runs[g]?.log.length>0', arg=game)

            seed('tictactoe', {'mode': 'local', 'log': [0,3,1,4,2], 'redo': []})
            replay = page.get_by_role('button', name='Play again', exact=True)
            replay.focus()
            replay.press('Enter')
            page.wait_for_function('()=>AlibiClub.diagnostics().state.runs.tictactoe.log.length===0')
            page.wait_for_function('()=>document.activeElement?.id==="club-control-restart-tictactoe"')
            assert page.locator('dialog[open]').count() == 0
            page.evaluate('AlibiClub.flush()')
            before = page.evaluate('AlibiClub.diagnostics().state.records')
            assert len(before) == 1 and before[0]['type'] == 'tictactoe'
            page.reload()
            page.locator('[data-action="club-tictactoe-cell"]').first.wait_for()
            assert page.evaluate('AlibiClub.diagnostics().state.records') == before
            assert page.evaluate('AlibiClub.diagnostics().state.runs.tictactoe.log') == []
            results.append({'width': width, 'case': 'replay-keyboard-focus-and-indexeddb-reload'})

            page.evaluate("location.hash='/salon/regiongardens'")
            page.locator('#garden-status').wait_for()
            seed('regiongardens', {'level': 0, 'log': GARDEN['solution'], 'redo': []})
            next_garden = page.get_by_role('button', name='Next garden →', exact=True)
            next_garden.focus()
            next_garden.press('Enter')
            page.wait_for_function('()=>AlibiClub.diagnostics().state.runs.regiongardens.level===1')
            page.wait_for_function('()=>document.activeElement?.id==="garden-status"')
            assert page.locator('dialog[open]').count() == 0
            assert page.evaluate('AlibiClub.diagnostics().state.records[0].label') == GARDEN['title']
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(OUT / f'garden-{width}.png'), full_page=True)
            results.append({'width': width, 'case': 'next-garden-keeps-result-and-board-status-focus'})
            assert not errors, errors
            context.close()
        browser.close()
    (OUT / 'results.json').write_text(json.dumps({'mode': 'built-origin-real-indexeddb', 'physicalDevice': False, 'scenarios': results}, indent=2)+'\n')
    print(f'{len(results)} built-origin replay/focus/persistence scenarios passed', flush=True)
finally:
    server.shutdown()
