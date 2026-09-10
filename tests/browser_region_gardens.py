"""Actual controls, completion, history and offline reload for Lantern Gardens."""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
puzzles = json.loads((ROOT / 'content/region-gardens.json').read_text())['puzzles']
checks = []
def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    for width, height in [(390,844),(1440,1000)]:
        context = browser.new_context(viewport={'width':width,'height':height})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(os.environ.get('ALIBI_URL','http://127.0.0.1:8792'))
        page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        page.evaluate("location.hash='/salon/regiongardens'")
        page.wait_for_selector('.region-cell')
        check(page.locator('.region-cell').count()==36, f'{width}: six by six board')
        for state in ['lantern','excluded','empty']:
            page.locator('#garden-cell-0').click()
            check(state in page.locator('#garden-cell-0').get_attribute('aria-label'), f'{width}: cycle {state}')
        page.locator('#garden-cell-0').click()
        page.locator('#garden-cell-1').click()
        check(page.locator('.region-cell.conflict').count()==2, f'{width}: conflicting lanterns stay editable')
        page.locator('[data-action="club-garden-level"][data-value="1"]').click()
        check(page.locator('dialog[open]').count()==1, f'{width}: switching confirms discarded history')
        page.locator('[data-action="club-reset-confirm"]').click()
        for cell in puzzles[1]['solution']:
            page.locator(f'#garden-cell-{cell}').click()
        check('Garden complete' in page.locator('#garden-status').inner_text(), f'{width}: actual controls solve garden')
        check(page.locator('[data-action="club-garden-level"][data-value="1"]').inner_text().endswith('Solved'), f'{width}: solved record visible')
        page.locator('[data-action="club-undo"][data-id="regiongardens"]').click()
        check(page.locator('.region-cell:disabled').count()==0, f'{width}: undo reopens completed board')
        page.locator('[data-action="club-redo"][data-id="regiongardens"]').click()
        check(page.locator('.region-cell:disabled').count()==36, f'{width}: redo completes board')
        page.wait_for_timeout(600)
        context.set_offline(True)
        page.reload()
        page.wait_for_selector('.region-cell:disabled')
        check('Garden complete' in page.locator('#garden-status').inner_text(), f'{width}: solved garden survives offline reload')
        context.set_offline(False)
        page.locator('[data-action="club-garden-level"][data-value="5"]').click()
        page.locator('[data-action="club-reset-confirm"]').click()
        check(page.locator('.region-cell').count()==49, f'{width}: seven by seven board')
        check(page.locator('.region-cell').first.bounding_box()['width']>=44, f'{width}: touch target width')
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}: no page overflow')
        page.screenshot(path=str(ROOT/'test-results'/f'region-gardens-{width}.png'),full_page=True)
        check(not errors, f'{width}: no browser errors')
        context.close()
    browser.close()
print('PASS', len(checks), 'garden browser assertions')
