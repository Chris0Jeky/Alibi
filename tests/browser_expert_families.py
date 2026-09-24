"""Render all new advanced definitions through the player at phone and desktop widths."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
puzzles=json.loads((ROOT/'content/extra/expert-families.json').read_text())['puzzles']
registry=json.loads((ROOT/'content/official-packs.json').read_text())
expected_experts=sorted(
    f'{p["id"]}@{p["revision"]}'
    for relative in registry['packs']
    for p in json.loads((ROOT/'content'/relative).read_text())['puzzles']
    if p['difficulty']=='Expert'
)
assert expected_experts, 'the official catalogue must contain Expert puzzles'
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
        # Filtering resets the first page to 24; read every page through the actual control.
        for _ in range(len(expected_experts)):
            more=page.locator('[data-action="show-more"]')
            if not more.count(): break
            previous=page.locator('.puzzle-card').count()
            more.click()
            page.wait_for_function(
                '(previous)=>document.querySelectorAll(".puzzle-card").length>previous',
                arg=previous,
            )
        expect(page.locator('[data-action="show-more"]')).to_have_count(0)
        expect(page.locator('.puzzle-card')).to_have_count(len(expected_experts))
        actual=page.locator('.puzzle-card [data-action="open"]').evaluate_all(
            '(cards)=>cards.map(card=>card.dataset.id).sort()'
        )
        assert actual==expected_experts, f'{width}: Expert filter membership differs: {actual}'
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
