"""Render all new advanced definitions through the player at phone and desktop widths."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
puzzles=json.loads((ROOT/'content/extra/expert-families.json').read_text())['puzzles']
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for width in [390,1440]:
        context=browser.new_context(viewport={'width':width,'height':950},reduced_motion='reduce')
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(os.environ.get('ALIBI_URL','http://127.0.0.1:8792').rstrip('/')+'/#/library')
        page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        page.locator('[data-action="browse-all"]').click()
        page.locator('#difficulty-filter').select_option('Expert')
        expect(page.locator('.puzzle-card')).to_have_count(15)
        page.screenshot(path=str(ROOT/'test-results'/f'expert-families-{width}.png'),full_page=True)
        for p in puzzles:
            page.evaluate('(id)=>location.hash="/play/"+id',p['id'])
            page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id',arg=p['id'])
            if page.locator('dialog[open] .dialog-close').count(): page.locator('dialog[open] .dialog-close').click()
            expect(page.locator('.play-head .difficulty')).to_have_text('Expert · provisional')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),p['id']
            assert page.locator('.board-card').is_visible(),p['id']
            print('PASS',width,p['id'],'renders with provisional label and no page overflow',flush=True)
        assert not errors,errors
        context.close()
    browser.close()
print('PASS all 12 advanced families at both widths')
