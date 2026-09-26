"""Planning controls. ALIBI_ISOLATED uses source scripts and memory remount only, not origin/storage proof."""
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT / 'test-results' / 'planning-expansion')))
OUT.mkdir(parents=True, exist_ok=True)
ISOLATED = os.environ.get('ALIBI_ISOLATED') == '1'
DATA = [c for name in ('archive-vaults', 'borough-contracts') for c in json.loads((ROOT / 'content/challenges' / (name + '.json')).read_text())['challenges']]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT / 'dist'), **kw)
    def log_message(self, *_):
        pass

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    evidence = []
    try:
        with sync_playwright() as p:
            launch = {}
            executable = os.environ.get('ALIBI_CHROMIUM')
            if executable or Path('/usr/bin/chromium').exists():
                launch['executable_path'] = executable or '/usr/bin/chromium'
            browser = p.chromium.launch(**launch)
            for width in (390, 1280):
                context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                if ISOLATED:
                    page.set_content('<main id="host"></main>')
                    stylesheet = next((ROOT / 'dist/assets').glob('quiet-style.*.css'))
                    page.add_style_tag(path=str(stylesheet))
                    for source in ('quiet-wing/engine.js','club-engines.js','challenges.js','challenge-storage.js','challenge-launcher.js'):
                        page.add_script_tag(path=str(ROOT / 'src' / source))
                    manifest = json.loads((ROOT/'content/challenges/registry.json').read_text())
                    all_data = [c for name in manifest['packs'] for c in json.loads((ROOT/'content/challenges'/name).read_text())['challenges']]
                    page.evaluate('(data) => { window.registry=AlibiChallenges.create(data,{quiet:QWEngine,club:AlibiClubEngines}); window.saved=null; }',all_data)
                    assert page.evaluate('registry.count') == 95
                else:
                    page.goto(base + '/#/quiet/challenges')
                    page.locator('[data-challenge-id]').first.wait_for(timeout=15000)
                    assert page.locator('[data-challenge-id]').count() == 95
                    page.locator('#challenge-family').wait_for(timeout=2500)
                    page.locator('#challenge-family').select_option('warehouse')
                    assert page.locator('[data-challenge-id]:visible').count() == 36
                    page.locator('#challenge-family').select_option('borough')
                    assert page.locator('[data-challenge-id]:visible').count() == 16
                    page.locator('#challenge-family').select_option('all')
                cases = DATA if not os.environ.get('ALIBI_SMOKE') else [DATA[0], DATA[-1]]
                for c in cases:
                    if ISOLATED:
                        page.evaluate('(id)=>{ window.saved=null;AlibiChallengeLauncher.mount(document.querySelector("#host"),registry,id,null,r=>window.saved=r); }',c['id'])
                    else:
                        page.goto(base + '/#/quiet/challenges/' + c['id'])
                    page.locator('.challenge-launcher h2').wait_for(timeout=10000)
                    assert page.locator('.challenge-launcher h2').inner_text() == c['title']
                    assert page.locator('.challenge-grid').evaluate('(e) => e.getBoundingClientRect().right <= innerWidth')
                    if c['id'].endswith(('01','24','12')):
                        page.screenshot(path=str(OUT / f'{c["id"]}-{width}-start.png'), full_page=True)
                    actions = c.get('solutionActions', list(c.get('solutionPath', '')))
                    for i, action in enumerate(actions):
                        if c['family'] == 'warehouse':
                            value = {'U':'up','R':'right','D':'down','L':'left'}[action]
                            page.locator(f'[data-action="walk"][data-value="{value}"]').click()
                        else:
                            page.locator(f'[data-action="slot"][data-value="{action["slot"]}"]').click()
                            page.locator(f'[data-action="plot"][data-value="{action["cell"]}"]').click()
                        if i == 0:
                            page.locator('[data-challenge="undo"]').click()
                            assert '0 moves' in page.locator('.challenge-status').inner_text()
                            if c['family'] == 'warehouse':
                                page.locator(f'[data-action="walk"][data-value="{value}"]').click()
                            else:
                                page.locator(f'[data-action="slot"][data-value="{action["slot"]}"]').click()
                                page.locator(f'[data-action="plot"][data-value="{action["cell"]}"]').click()
                    assert 'Complete.' in page.locator('.challenge-status').inner_text(), c['id']
                    if c['family'] == 'borough':
                        page.locator('.challenge-objectives').wait_for(timeout=2000)
                        text = page.locator('.challenge-objectives').inner_text()
                        assert f'{c["referenceScore"]} / {c["targetScore"]}' in text
                    if ISOLATED:
                        page.evaluate('(id)=>AlibiChallengeLauncher.mount(document.querySelector("#host"),registry,id,window.saved,r=>window.saved=r)',c['id'])
                    else:
                        page.wait_for_function("""([id, length]) => new Promise(resolve => {
                          const request=indexedDB.open('alibi-challenges-v1');
                          request.onerror=()=>resolve(false);
                          request.onsuccess=()=>{
                            const db=request.result, read=db.transaction('runs','readonly').objectStore('runs').get(id);
                            read.onerror=()=>{db.close();resolve(false)};
                            read.onsuccess=()=>{const ready=read.result?.run?.log?.length===length;db.close();resolve(ready)};
                          };
                        })""", arg=[c['id'],len(actions)], timeout=15000)
                        page.reload()
                    page.locator('.challenge-launcher').wait_for(timeout=15000)
                    assert 'Complete.' in page.locator('.challenge-status').inner_text(), 'completed replay reload'
                    if c['id'].endswith(('01','24','12')):
                        page.screenshot(path=str(OUT / f'{c["id"]}-{width}-complete.png'), full_page=True)
                    page.locator('[data-challenge="reset"]').click()
                    assert '0 moves' in page.locator('.challenge-status').inner_text()
                    assert not errors, errors
                    evidence.append({'id':c['id'], 'width':width, 'actions':len(actions), 'complete':True, 'undo':True, 'reload':not ISOLATED, 'memoryRemount':ISOLATED, 'mode':'isolated-controls' if ISOLATED else 'built-origin', 'restart':True})
                    (OUT/'controls.json').write_text(json.dumps(evidence,indent=2))
                    print(width,c['id'],'PASS',flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()
    print(f'{len(evidence)} {"isolated-document" if ISOLATED else "built-origin"} planning scenarios passed',flush=True)

if __name__ == '__main__':
    run()
