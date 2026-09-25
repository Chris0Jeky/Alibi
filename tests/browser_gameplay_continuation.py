"""Actual standalone controls and offline workers; not hosted storage/device acceptance."""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT/'test-results/gameplay-continuation')))
OUT.mkdir(parents=True, exist_ok=True)

def run():
    results=[]
    with sync_playwright() as p:
        launch={}
        executable=os.environ.get('ALIBI_CHROMIUM')
        if executable or Path('/usr/bin/chromium').exists():
            launch['executable_path']=executable or '/usr/bin/chromium'
        browser=p.chromium.launch(**launch)
        for width in (390,1280):
            page=browser.new_page(viewport={'width':width,'height':900})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            if os.environ.get('ALIBI_URL'):
                page.goto(os.environ['ALIBI_URL'])
            else:
                page.set_content((ROOT/'alibi-deluxe-play.html').read_text(),wait_until='load')
            page.wait_for_function('globalThis.AlibiDiagnostics')
            page.evaluate("location.hash='/salon/duel'")
            page.locator('.duel-strengths').wait_for(timeout=20000)
            for strength in ('learner','club','keeper','expert'):
                button=page.locator(f'[data-action="club-duel-strength"][data-value="{strength}"]')
                before=page.evaluate('AlibiClub.diagnostics().state.runs.duel')
                button.click()
                if before['log']:
                    page.locator('dialog[open]').wait_for()
                    page.locator('dialog[open]').press('Escape')
                    assert page.evaluate('AlibiClub.diagnostics().state.runs.duel') == before
                    button.click()
                    page.locator('[data-action="club-reset-confirm"]').click()
                else:
                    assert button.evaluate('(e)=>e===document.activeElement'), 'Strength selection retains keyboard focus'
                page.wait_for_function('(v)=>AlibiClub.diagnostics().state.runs.duel.difficulty===v',arg=strength)
                assert page.evaluate('AlibiClub.diagnostics().state.runs.duel.log.length') == 0
                page.locator('[data-action="club-duel-cell"]:enabled').first.click()
                page.wait_for_function('AlibiClub.diagnostics().state.runs.duel.log.length>=2',timeout=15000)
                assert page.evaluate('AlibiClub.diagnostics().botPending') is False
                results.append({'width':width,'strength':strength,'actualWorkerReply':True,'cancelPreservesRun':bool(before['log'])})
            page.locator('[data-action="club-restart"]').click()
            page.locator('[data-action="club-reset-confirm"]').click()
            page.evaluate("""() => {
                window.originalWorker = Worker;
                window.Worker = class extends originalWorker {
                    postMessage() { queueMicrotask(() => this.onerror?.(new Event('error'))); }
                };
            }""")
            page.locator('[data-action="club-duel-cell"]:enabled').first.click()
            page.locator('[data-action="club-bot-retry"]').wait_for()
            assert page.evaluate('AlibiClub.diagnostics().state.runs.duel.log.length') == 1
            assert page.evaluate('AlibiClub.diagnostics().botPending') is False
            page.evaluate('() => { window.Worker = window.originalWorker; }')
            page.locator('[data-action="club-bot-retry"]').click()
            page.wait_for_function('AlibiClub.diagnostics().state.runs.duel.log.length>=2',timeout=15000)
            results.append({'width':width,'failureRequiresRetry':True,'actualRetryReply':True})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No horizontal overflow'
            page.screenshot(path=str(OUT/f'duel-{width}.png'),full_page=True)
            assert not errors,errors
            print(width,'four real worker strengths PASS',flush=True)
            page.close()
        browser.close()
    (OUT/'standalone-controls.json').write_text(json.dumps({'mode':'built-origin' if os.environ.get('ALIBI_URL') else 'built-standalone-document','originPersistenceVerified':False,'scenarios':results},indent=2))
    print('10 strength/recovery scenarios passed',flush=True)
if __name__=='__main__':
    run()
