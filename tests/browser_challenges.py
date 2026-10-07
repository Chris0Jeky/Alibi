"""Exercise the trusted launcher controls directly at phone and desktop widths."""
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PACKS = json.loads((ROOT / 'content/challenges/registry.json').read_text())['packs']
DATA = [item for name in PACKS for item in json.loads((ROOT / 'content/challenges' / name).read_text())['challenges']]
BY_ID = {item['id']: item for item in DATA}

def assert_grid(page):
    assert page.evaluate('''() => {
      const grid=document.querySelector('.challenge-grid'); if(!grid)return true;
      const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      const cells=[...grid.children].map(e=>e.getBoundingClientRect());
      return getComputedStyle(grid).display==='grid' && columns>1 &&
        Math.abs(cells[0].y-cells[columns-1].y)<1 &&
        cells[columns].y>cells[0].bottom &&
        Math.abs(cells[columns].x-cells[0].x)<1 &&
        cells.every(r=>r.width>=24 && r.right<=innerWidth);
    }'''), 'Board cells must retain their spatial rows and columns'

def store_diagnostics(page):
    return page.evaluate('''async () => {
      const start = performance.now();
      let storeInfo = {mode: 'unknown', protected: null, revision: null};
      try {
        const probeStore = AlibiChallengeStore.create(registry);
        await probeStore.open();
        storeInfo = probeStore.info();
      } catch (error) {
        storeInfo = {mode: 'diagnostic-error', protected: null, revision: null, error: String((error && error.message) || error)};
      }
      const probe = await new Promise((resolve) => {
        let settled = false, timer = null;
        const begin = performance.now();
        const finish = (outcome, name, message) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({outcome, name: name || null, message: message || null, elapsedMs: Math.round(performance.now() - begin)});
        };
        let request = null;
        try {
          request = indexedDB.open('alibi-challenges-v1', 1);
        } catch (error) {
          finish('error', error && error.name, String((error && error.message) || error));
          return;
        }
        timer = setTimeout(() => finish('timeout', 'TimeoutError', 'indexedDB.open timed out after 2200 ms'), 2200);
        request.onsuccess = () => { try { request.result.close(); } catch {} finish('success', null, null); };
        request.onerror = () => { const err = request.error; finish('error', err && err.name, String((err && err.message) || err)); };
        request.onblocked = () => finish('blocked', 'BlockedError', 'indexedDB.open is blocked by another connection');
      });
      return {mode: storeInfo.mode, protected: storeInfo.protected, revision: storeInfo.revision, storeError: storeInfo.error || null, outcome: probe.outcome, name: probe.name, message: probe.message, elapsedMs: probe.elapsedMs, totalMs: Math.round(performance.now() - start)};
    }''')

def run_storage_check(page, script):
    try:
        result = page.evaluate(script)
    except Exception as error:
        try:
            diagnostics = store_diagnostics(page)
        except Exception as diagnostic_error:
            diagnostics = {'diagnosticError': str(diagnostic_error)}
        raise AssertionError(f'Challenge storage check failed: {error} diagnostics {json.dumps(diagnostics, sort_keys=True)}')
    if not result:
        try:
            diagnostics = store_diagnostics(page)
        except Exception as diagnostic_error:
            diagnostics = {'diagnosticError': str(diagnostic_error)}
        raise AssertionError(f'Challenge storage check returned falsy result: {result!r} diagnostics {json.dumps(diagnostics, sort_keys=True)}')
    return result

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
  with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.set_content('<div class="qw-body"><main id="host"></main></div>')
        page.add_style_tag(path=str(ROOT / 'src/quiet-wing/style.css'))
        for source in ('src/quiet-wing/engine.js', 'src/club-engines.js', 'src/challenges.js', 'src/challenge-storage.js', 'src/challenge-launcher.js'):
            page.add_script_tag(path=str(ROOT / source))
        page.evaluate('(data) => { window.registry = AlibiChallenges.create(data, {quiet: QWEngine, club: AlibiClubEngines}); window.persisted = null; AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-classic-hanoi-01", null, run => window.persisted = run); }', DATA)
        page.locator('[data-action="peg"][data-value="1"]').click()
        # A selected peg is visibly filled, not only announced.
        assert page.locator('[aria-pressed="true"]').evaluate('e=>getComputedStyle(e).backgroundColor') != page.locator('[data-action="peg"][data-value="0"]').evaluate('e=>getComputedStyle(e).backgroundColor')
        assert page.locator('.challenge-pegs i').count() == 3, 'Hanoi discs are drawn'
        page.locator('[data-action="peg"][data-value="2"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()
        page.locator('[data-challenge="undo"]').click()
        assert '0 moves' in page.locator('.challenge-status').inner_text()
        page.locator('[data-action="peg"][data-value="1"]').click()
        page.locator('[data-action="peg"][data-value="2"]').click()
        page.evaluate('() => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-classic-hanoi-01", window.persisted, () => {})')
        assert '1 move so far' in page.locator('.challenge-status').inner_text()
        assert page.locator('.challenge-launcher h2').count() == 0 and 'REVISION' not in page.locator('#host').inner_text()

        def mount(challenge_id):
            page.evaluate('(id) => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, id, null, () => {})', challenge_id)
            assert_grid(page)

        sliding = BY_ID['curated-classic-sliding-01']['solutionActions'][0]
        mount('curated-classic-sliding-01')
        page.locator(f'[data-action="cell"][data-value="{sliding["cell"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        river = BY_ID['curated-classic-river-01']['solutionActions'][0]
        mount('curated-classic-river-01')
        page.locator(f'[data-action="item"][data-value="{river["item"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        jugs = BY_ID['curated-classic-jugs-01']['solutionActions'][0]
        mount('curated-classic-jugs-01')
        page.locator(f'[data-action="jug"][data-value="{jugs["i"]}"][data-kind="{jugs["kind"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        queens = BY_ID['curated-classic-queens-01']['solutionActions'][0]
        mount('curated-classic-queens-01')
        assert page.locator('[data-action="cell"][data-value="8"]').is_disabled()
        assert page.locator('[data-value="8"]').get_attribute('aria-label') == 'Row 2, column 1, fixed queen'
        assert page.get_by_role('button', name='Row 1, column 1, empty', exact=True).count() == 1
        page.locator(f'[data-action="cell"][data-value="{queens["cell"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        magic = BY_ID['curated-classic-magic-01']['solutionActions'][0]
        mount('curated-classic-magic-01')
        page.locator(f'[data-action="magic"][data-value="{magic["from"]}"]').click()
        page.locator(f'[data-action="magic"][data-value="{magic["to"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        knight = BY_ID['curated-classic-knight-01']['solutionActions'][0]
        mount('curated-classic-knight-01')
        assert page.locator('[data-action="cell"][data-value="0"]').is_disabled()
        assert page.locator('[data-value="0"]').get_attribute('aria-label') == 'Row 1, column 1, fixed visit 1'
        assert page.locator('.challenge-grid button').evaluate_all("es=>es.every(e=>e.getAttribute('aria-label')?.includes('column'))")
        page.locator(f'[data-action="cell"][data-value="{knight["cell"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        mount('curated-archive-01')
        assert page.locator('[data-action="walk"]').count() == 4
        assert page.locator('.challenge-pad button').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)')
        assert '◇ brass plate' in page.locator('.challenge-legend').inner_text()
        path = [{'U': 'up', 'R': 'right', 'D': 'down', 'L': 'left'}[m] for m in BY_ID['curated-archive-01']['solutionPath']]
        page.locator(f'[data-action="walk"][data-value="{path[0]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()
        # Tap the adjacent square, then walk with the keyboard from the kept focus.
        page.locator(f'[data-action="step"][data-value="{path[1]}"]').click()
        assert '2 moves so far' in page.locator('.challenge-status').inner_text()
        page.keyboard.press('Arrow' + path[2].capitalize())
        assert '3 moves so far' in page.locator('.challenge-status').inner_text()

        assert page.evaluate('''() => {
          let found=false;
          for(const c of registry.entries().filter(c=>c.family==='warehouse')) {
            const run=registry.begin(c.id);
            for(const move of c.solutionPath) {
              run.log.push(move);const v=registry.replay(run);
              if(!v.complete && v.state.crates.some(i=>v.state.goals.includes(i))) {
                AlibiChallengeLauncher.mount(document.querySelector('#host'),registry,c.id,run,()=>{});
                const cells=[...document.querySelectorAll('.challenge-grid button')];
                found=cells.some(e=>e.textContent==='▣' && e.getAttribute('aria-label').includes('crate on a brass plate'));
                if(found)return true;
              }
            }
          }
          return found;
        }'''), 'An occupied warehouse goal remains visible before completion'

        duel = BY_ID['curated-duel-01']['principalVariation']
        mount('curated-duel-01')
        page.locator(f'[data-action="cell"][data-value="{duel[0]}"]').click()
        # Ink answers with the recorded reply; Gold is to move again.
        assert 'Gold to move' in page.locator('.challenge-status').inner_text()
        assert page.locator(f'[data-value="{duel[1]}"].ink.last').count() == 1

        borough = BY_ID['curated-borough-01']['solutionActions'][0]
        mount('curated-borough-01')
        page.locator(f'[data-action="slot"][data-value="{borough["slot"]}"]').click()
        assert page.locator('[data-action="slot"][aria-pressed="true"]').evaluate('e=>getComputedStyle(e).backgroundColor') != page.locator('[data-action="slot"][aria-pressed="false"]').first.evaluate('e=>getComputedStyle(e).backgroundColor')
        page.locator(f'[data-action="plot"][data-value="{borough["cell"]}"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()

        assert run_storage_check(page, '''async () => { const store = AlibiChallengeStore.create(registry); await store.open(); const run = registry.begin('curated-classic-hanoi-02'); run.log.push({from: 2, to: 0}); await store.write(run); return (await store.read(run.challengeId)).log.length; }''') == 1
        assert run_storage_check(page, '''async () => {
          const store=AlibiChallengeStore.create(registry);await store.open();
          const id='curated-classic-hanoi-02', before=await store.read(id);
          await store.restore(registry.begin(id));
          await store.write(before);
          return JSON.stringify(await store.recovery(id))===JSON.stringify(before);
        }''')
        assert run_storage_check(page, '''async () => {
          const db = await new Promise((resolve,reject)=>{const r=indexedDB.open('alibi-challenges-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
          for (const readFirst of [true,false]) {
            const id=registry.entries()[readFirst?0:1].id, future={schema:2,revision:0,unrecognised:'keep exactly'};
            await new Promise((resolve,reject)=>{const tx=db.transaction('runs','readwrite');tx.objectStore('runs').put(future,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
            const store=AlibiChallengeStore.create(registry);await store.open();
            if(readFirst){let refused=false;try{await store.read(id)}catch{refused=true}if(!refused)throw Error('Future read accepted')}
            let refused=false;try{await store.write(registry.begin(id))}catch{refused=true}if(!refused)throw Error('Future write accepted');
            const after=await new Promise(resolve=>{const r=db.transaction('runs').objectStore('runs').get(id);r.onsuccess=()=>resolve(r.result)});
            if(JSON.stringify(after)!==JSON.stringify(future))throw Error('Future record changed');
          }
          db.close(); return true;
        }''')
        page.close()
    browser.close()

    production_url = os.environ.get('ALIBI_URL8795')
    if production_url:
        page = p.chromium.launch().new_page(viewport={'width': 390, 'height': 900})
        page.goto(production_url.rstrip('/') + '#/quiet/challenges?family=hanoi')
        page.locator('[data-challenge-id]').first.wait_for()
        assert page.locator('[data-challenge-id]').count() == len(DATA)
        assert set(page.locator('[data-challenge-id]').evaluate_all('(es) => es.map(e => e.dataset.challengeId)')) == set(BY_ID)
        page.locator('[data-challenge-id="curated-classic-hanoi-01"]').click()
        page.locator('[data-action="peg"][data-value="1"]').click()
        page.locator('[data-action="peg"][data-value="2"]').click()
        assert '1 move so far' in page.locator('.challenge-status').inner_text()
        page.evaluate('''async () => {
          await QWApp.challengeStore.flush();
          window.originalChallengeFlush=QWApp.challengeStore.flush;
          QWApp.challengeStore.flush=()=>new Promise(resolve=>window.releaseChallengeSave=resolve);
          window.challengeFlushFinished=false;
          QWApp.flush().then(()=>window.challengeFlushFinished=true);
        }''')
        assert not page.evaluate('challengeFlushFinished'), 'Wing flush must await challenge writes'
        page.evaluate('releaseChallengeSave()')
        page.wait_for_function('()=>window.challengeFlushFinished')
        page.evaluate('''() => {
          window.updateFlushFinished=false;
          AlibiActivities.flush().then(()=>window.updateFlushFinished=true);
        }''')
        assert not page.evaluate('updateFlushFinished'), 'Update gate must await challenge writes'
        page.evaluate('''() => {
          QWApp.challengeStore.flush=originalChallengeFlush;
          releaseChallengeSave();
        }''')
        page.wait_for_function('()=>window.updateFlushFinished')
        page.evaluate('''() => { const Original=Worker; window.challengeJobs=[]; window.Worker=class extends Original {postMessage(m){challengeJobs.push(m.type);super.postMessage(m)}} }''')
        with page.expect_download() as saved_download:
            page.locator('#challenge-export').click()
        exported=Path(saved_download.value.path()).read_bytes()
        page.locator('[data-challenge="undo"]').click()
        assert '0 moves' in page.locator('.challenge-status').inner_text()
        page.locator('#challenge-file').set_input_files({'name':'challenge.json','mimeType':'application/json','buffer':exported})
        page.wait_for_function("()=>window.challengeJobs.includes('challenge-run')")
        page.locator('.challenge-status').filter(has_text='1 move so far').wait_for()
        # File and actual Worker boundaries must agree on bytes before validation.
        limit = 3 * 1024 * 1024
        message = 'Challenge save exceeds the 3 MiB import limit.'
        oversized = ('é' * (limit // 2 + 1)).encode('utf-8')
        page.locator('#challenge-file').set_input_files({'name':'oversized.json','mimeType':'application/json','buffer':oversized})
        page.get_by_text(message, exact=True).wait_for()
        assert '1 move so far' in page.locator('.challenge-status').inner_text(), 'oversized import preserves the current run'
        worker_name = next(p.name for p in (ROOT / 'dist/assets').glob('validator.*.js'))
        worker_result = page.evaluate('''async ({name, text}) => {
          const worker = new Worker('/assets/' + name);
          try { return await new Promise(resolve => {
            worker.onmessage = e => resolve(e.data);
            worker.postMessage({type:'challenge-run', text});
          }); } finally { worker.terminate(); }
        }''', {'name':worker_name, 'text':oversized.decode('utf-8')})
        assert worker_result['ok'] is False and worker_result['error'] == message, worker_result
        padded = exported + b' ' * (limit - len(exported))
        page.locator('#challenge-file').set_input_files({'name':'boundary.json','mimeType':'application/json','buffer':padded})
        page.get_by_text('Challenge save restored. The previous save remains available for export.', exact=True).wait_for()
        assert '1 move so far' in page.locator('.challenge-status').inner_text(), 'at-limit valid import reaches run validation'
        for width in (390, 1280):
            page.set_viewport_size({'width': width, 'height': 900})
            page.goto(production_url.rstrip('/') + '#/quiet/challenges?family=queens')
            page.locator('[data-challenge-id="curated-classic-queens-01"]').click()
            assert_grid(page)
            assert page.locator('.challenge-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length") == 8
            page.screenshot(path=str(ROOT / 'test-results/curation-ui' / f'final-challenge-{width}.png'), full_page=True)
        page.context.browser.close()

        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width':390,'height':900})
        context.add_init_script("Object.defineProperty(window, 'indexedDB', {value:undefined})")
        page = context.new_page()
        page.goto(production_url.rstrip('/') + '#/quiet/challenges/curated-classic-hanoi-01')
        page.locator('[data-action="peg"][data-value="1"]').click()
        page.locator('[data-action="peg"][data-value="2"]').click()
        page.evaluate('()=>QWApp.flush()')
        assert page.evaluate('QWApp.challengeStore.info().mode') == 'session'
        page.evaluate("location.hash='/library'")
        page.wait_for_function('()=>!AlibiActivities.diagnostics().active')
        assert page.evaluate('''async () => {
          try { await AlibiActivities.flush(); return false; }
          catch(e) { return e.message.includes('Challenges'); }
        }'''), 'Update refuses inactive session challenge saves'
        page.evaluate("location.hash='/quiet/challenges/curated-classic-hanoi-01'")
        page.locator('.challenge-status').filter(has_text='1 move so far').wait_for()
        assert page.evaluate('(async()=> (await QWApp.challengeStore.read("curated-classic-hanoi-01")).log.length)()') == 1
        browser.close()
finally:
  server.shutdown()
  server.server_close()
print('PASS trusted challenge launcher controls and saved replay restore at phone and desktop widths.')
