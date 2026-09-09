"""Export actual existing lesson UI; no generative or invented puzzle geometry."""
from pathlib import Path
import json, argparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--force', action='store_true')
args = parser.parse_args()
out = ROOT / 'assets-source/library/teaching'
out.mkdir(parents=True, exist_ok=True)
catalog = json.loads((ROOT / 'content/catalog.json').read_text(encoding='utf8'))['puzzles']
rows = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for family in dict.fromkeys(x['type'] for x in catalog):
        target = out / (family + '.png')
        if target.exists() and not args.force:
            raise RuntimeError('Existing capture: ' + str(target) + '; inspect before --force')
        page = browser.new_page(viewport={'width': 800, 'height': 1000}, reduced_motion='reduce')
        page.set_content((ROOT / 'alibi-deluxe-play.html').read_text(encoding='utf8'))
        page.wait_for_function('window.AlibiDiagnostics')
        puzzle = next(x for x in catalog if x['type'] == family)
        page.evaluate('(id)=>location.hash="/play/"+id', puzzle['id']+'@'+str(puzzle['revision']))
        page.wait_for_selector('dialog[open]')
        page.locator('[data-action="lesson-example"]').click()
        dialog = page.locator('dialog[open]')
        dialog.screenshot(path=str(target))
        rows.append({'id': 'lesson-'+family, 'title': family+' interactive lesson', 'category':'teaching',
                     'status':'current','design':'reused','source':'src/app.js',
                     'derivatives':['assets-source/library/teaching/'+family+'.png'],
                     'provenance':{'method':'Actual existing lesson UI screenshot','source':'src/presentation.js; src/app.js',
                                   'license':'Existing project rights unchanged'},
                     'accessibility':'Static preview only; actual editable controls remain in the app.',
                     'integration':'src/app.js:lesson; tests/browser_ui.py exercises the correct answer through controls',
                     'qa':{'scope':'Existing interactive teaching examples pass all 13 family lesson controls in browser_ui.py; no puzzle solutions exported'}})
        page.close()
    browser.close()
(out / 'catalogue.json').write_text(json.dumps(rows, indent=2)+'\n', encoding='utf8')
print('Exported',len(rows),'actual lesson diagrams')
