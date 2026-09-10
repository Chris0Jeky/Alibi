"""Eight chapters completed using real controls; dedicated story pages and epilogue."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
book=next(b for b in json.loads((ROOT/'content/casebooks.json').read_text()) if b['id']=='the-unfinished-invitation')
puzzles=json.loads((ROOT/'content/extra/case-invitation.json').read_text())['puzzles']
count=0
def check(v,label):
    global count
    assert v,label
    count+=1
    print('PASS',label,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for width in [390,1440]:
        context=browser.new_context(viewport={'width':width,'height':950})
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(os.environ.get('ALIBI_URL','http://127.0.0.1:8792'))
        page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        page.evaluate("location.hash='/casebooks/the-unfinished-invitation'")
        page.wait_for_selector('.chapter')
        check(page.locator('.chapter').count()==8,f'{width}: eight chapters')
        page.locator('.case-opening [data-action="open"]').click()
        page.wait_for_selector('.story-page')
        check(book['intro'] in page.locator('.story-page').inner_text(),f'{width}: introduction before puzzle')
        check(page.locator('.case-art').evaluate('(e)=>e.complete && e.naturalWidth>0'),f'{width}: original cover loads')
        page.screenshot(path=str(ROOT/'test-results'/f'invitation-opening-{width}.png'),full_page=True)
        for index,p in enumerate(puzzles):
            page.locator('[data-action="story-play"]').click()
            page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id',arg=p['id'])
            if page.locator('dialog[open]').count(): page.keyboard.press('Escape')
            if p['type']=='witness':
                action=p.get('action','took the missing object')
                rule=page.locator('.witness-rule').inner_text()
                statements=page.locator('.statement-list').inner_text()
                check(f'One person {action}.' in rule,f'{width}: {p["id"]} uses its authored witness action')
                check(action in statements and 'took it' not in statements,f'{width}: {p["id"]} statements use its authored witness action')
                answer=p['solution']
            elif p['type']=='dossier':
                n=p['size']
                for cat in range(2):
                    page.locator(f'[data-action="dossier-tab"][data-value="{cat}"]').click()
                    for person in range(n):
                        cell=cat*n*n+person*n+p['solution'][cat*n+person]
                        page.locator(f'[data-action="mark"][data-cell="{cell}"]').click()
                answer=p['solution'][n:].index(p['targetItem'])
            elif p['type']=='scene':
                for person in p['people']:
                    page.locator(f'[data-action="person"][data-id="{person["id"]}"]').click()
                    page.locator(f'[data-action="cell"][data-cell="{p["solution"][person["id"]]}"]').click()
                room=p['rooms'][p['solution'][p['victim']]]
                answer=next(x['id'] for x in p['people'] if x['id']!=p['victim'] and p['rooms'][p['solution'][x['id']]]==room)
            else:
                for i,v in enumerate(p['solution']):
                    if v: page.locator(f'#cell-{i}').click()
            if p['type']!='nonogram':
                page.locator(f'[data-action="choose-accuse"][data-id="{answer}"]').click()
                page.locator('[data-action="submit-accuse"]').click()
                if p['type']=='witness':
                    check(action in page.locator('dialog[open]').inner_text(),f'{width}: {p["id"]} completion explains its authored action')
            page.wait_for_function('()=>!!AlibiDiagnostics.getCurrent()?.completedAt')
            page.locator('dialog[open] [data-action="next"]').click()
            page.wait_for_selector('.story-page')
            check(book['chapters'][index]['revelation'] in page.locator('.story-page').inner_text(),f'{width}: chapter {index+1} continuation')
            if index<7:
                page.locator('[data-action="story-next"]').click()
                page.wait_for_function('(text)=>document.querySelector(".story-page")?.textContent.includes(text)',arg=book['chapters'][index+1]['brief'])
                check(book['chapters'][index+1]['brief'] in page.locator('.story-page').inner_text(),f'{width}: next chapter introduction')
        check('EPILOGUE' in page.locator('.story-page').inner_text(),f'{width}: epilogue after eight puzzles')
        check(book['ending'] in page.locator('.story-page').inner_text(),f'{width}: complete ending')
        page.screenshot(path=str(ROOT/'test-results'/f'invitation-epilogue-{width}.png'),full_page=True)
        page.wait_for_timeout(600)
        context.set_offline(True)
        page.reload()
        page.wait_for_selector('.story-page')
        check('EPILOGUE' in page.locator('.story-page').inner_text(),f'{width}: epilogue survives offline reload')
        check(not errors,f'{width}: no browser errors')
        context.close()
    browser.close()
print('PASS',count,'invitation browser assertions')
