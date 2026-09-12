"""Actual controls and offline save for the additive 15x15 Nonogram pack."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'test-results/large-nonogram'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
pack = json.loads((ROOT/'content/extra/nonogram-large.json').read_text())['puzzles']
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for width in (320, 390):
        for puzzle in pack:
            context = browser.new_context(viewport={'width':width,'height':900}, reduced_motion='reduce')
            page = context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(URL+'/#/play/'+puzzle['id'])
            page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
            if page.locator('dialog[open] [data-action="close-dialog"]').count():
                page.locator('dialog[open] [data-action="close-dialog"]').click()
            expect(page.locator('.nono-cell')).to_have_count(225)
            expect(page.locator('.board-scroll')).to_have_class(__import__('re').compile('zoomed'))
            assert page.locator('.nono-cell').first.bounding_box()['width'] >= 44, (puzzle['id'], width)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (puzzle['id'], width)
            page.get_by_role('button',name='Move view right',exact=True).click()
            assert page.locator('.board-scroll').evaluate('(e)=>e.scrollLeft') > 0
            page.get_by_role('button',name='Move view left',exact=True).click()
            assert page.locator('.board-scroll').evaluate('(e)=>e.scrollLeft') <= 1
            page.get_by_role('button',name='Move view down',exact=True).click()
            assert page.locator('.board-scroll').evaluate('(e)=>e.scrollTop') > 0
            page.get_by_role('button',name='Move view up',exact=True).click()
            if puzzle is pack[0]:
                page.locator('.board-card').screenshot(path=str(OUT/f'board-{width}.png'))
                filled=[i for i,v in enumerate(puzzle['solution'][:15]) if v]
                for cell in filled:
                    page.locator(f'#cell-{cell}').click()
                auto=page.locator('.controls [data-action="club-assist"]')
                if auto.count()==0:
                    auto=page.get_by_role('button',name='Auto-cross completed lines:',exact=False)
                if 'off' in auto.inner_text(): auto.click()
                for cell,v in enumerate(puzzle['solution'][:15]):
                    if not v: expect(page.locator(f'#cell-{cell}')).to_contain_text('×')
                page.locator('[data-action="undo"]').first.click()
                page.locator('[data-action="redo"]').first.click()
                expect(page.locator(f'#cell-{filled[-1]}')).to_have_class(__import__('re').compile('filled'))
                page.wait_for_timeout(500)
                context.set_offline(True)
                page.reload()
                expect(page.locator('.nono-cell.filled')).to_have_count(len(filled))
                expect(page.locator('.nono-cell')).to_have_count(225)
            assert not errors, errors
            print(f'PASS {puzzle["id"]} 15x15 board, panning and 44px targets at {width}px',flush=True)
            context.close()
    browser.close()
