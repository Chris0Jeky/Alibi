"""Family-first thumbnail and secondary room-control regression."""
import os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'feedback-discovery'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8792').rstrip('/')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width':width,'height':900}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + '/#/library')
        expect(page.locator('.family-card')).to_have_count(13)
        expect(page.locator('[data-theatre-sound]')).not_to_be_visible()
        summary = page.locator('.theatre-settings > summary')
        summary.focus()
        summary.press('Enter')
        page.evaluate("window.dispatchEvent(new Event('alibi-storage-change'))")
        expect(summary).to_be_focused()
        expect(page.locator('[data-theatre-sound]')).to_be_visible()
        page.locator('[data-theatre-data]').click()
        expect(page.locator('.theatre-settings')).to_have_attribute('open', '')
        summary.press('Enter')
        expect(page.locator('[data-theatre-sound]')).not_to_be_visible()
        page.get_by_role('button', name='Browse all puzzles', exact=True).click()
        page.locator('.curation-collections > summary').click()
        page.locator('.curation-collections [data-action="curation-venue"]').nth(1).click()
        expect(page.locator('.puzzle-card')).to_have_count(24)
        arts = {}
        # 24 initial cards include many families. Each visible card has its family's SVG and stamp.
        for card in page.locator('.puzzle-card').all():
            expect(card.locator('.card-art > svg.puzzle-art')).to_have_count(1)
            expect(card.locator('.card-family-symbol svg')).to_have_count(1)
            expect(card.locator('.collection-stamp')).to_be_visible()
            art = card.locator('.card-art')
            arts[art.get_attribute('data-family')] = art.locator('svg.puzzle-art').evaluate('(e)=>e.outerHTML')
        assert len(set(arts.values())) == len(arts)
        page.screenshot(path=str(OUT/f'collection-{width}.png'), full_page=True)
        page.locator('.puzzle-card').first.scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'cards-viewport-{width}.png'))
        page.locator('.puzzle-card [data-action="open"]').first.click()
        expect(page.locator('dialog[open]')).to_be_visible()
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        expect(page.locator('.play-title')).to_be_visible()
        expect(page.locator('[data-theatre-sound]')).not_to_be_visible()
        page.goto(URL + '/#/home')
        expect(page.locator('.theatre-screenings > summary')).to_contain_text('Optional short films')
        assert page.locator('.theatre-screenings').evaluate('(e)=>e.getBoundingClientRect().top') > 900
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'overflow'
        page.screenshot(path=str(OUT/f'home-{width}.png'), full_page=True)
        page.goto(URL + '/#/play/lightup-01')
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        page.wait_for_function("()=>AlibiDiagnostics.getCurrent()?.puzzle.id==='lightup-01'")
        cell = page.locator('button[data-action="cell"]:not([disabled])').first
        before_cell_state = page.evaluate('()=>AlibiDiagnostics.getCurrent().state')
        cell.click()
        before_summary_state = page.evaluate('()=>AlibiDiagnostics.getCurrent().state')
        assert before_summary_state != before_cell_state, 'enabled puzzle control changed state'
        game_summary = page.locator('.theatre-settings > summary')
        game_summary.focus()
        game_summary.press('ArrowRight')
        expect(game_summary).to_be_focused()
        game_summary.press('Delete')
        expect(game_summary).to_be_focused()
        assert page.evaluate('()=>AlibiDiagnostics.getCurrent().state') == before_summary_state
        page.goto(URL + '/#/salon/borough')
        expect(page.locator('[data-action="club-build"]')).to_be_disabled()
        page.locator('.borough-cell:not(.built)').first.click()
        expect(page.locator('[data-action="club-build"]')).to_be_enabled()
        page.locator('[data-action="club-build"]').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'borough-{width}.png'))
        page.goto(URL + '/#/quiet/journal')
        expect(page.locator('#quiet-room-choice')).to_be_visible()
        expect(page.locator('.theatre-settings')).to_have_count(0)
        page.evaluate("dispatchEvent(new Event('alibi-storage-change'))")
        expect(page.locator('#quiet-room-choice')).to_be_visible()
        assert not errors, errors
        print(f'PASS family thumbnails and secondary room controls at {width}px', flush=True)
        context.close()
    browser.close()
