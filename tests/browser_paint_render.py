"""Count real app DOM replacements for paint gestures in isolated Chromium."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content((ROOT / 'alibi-deluxe-play.html').read_text(), wait_until='load')
    page.wait_for_function('window.AlibiDiagnostics')
    page.evaluate('location.hash = "#/play/nonogram-01@1"')
    page.wait_for_function('AlibiDiagnostics.getCurrent()?.puzzle.id === "nonogram-01"')
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')
    page.evaluate('''() => {
      window.paintRenders = 0;
      new MutationObserver(records => { for (const r of records)
        if (r.target.id === 'app' && r.type === 'childList') window.paintRenders++;
      }).observe(document.getElementById('app'), {childList: true});
    }''')
    page.evaluate('''() => {
      const cell = document.querySelector('.paint-cell[data-cell="0"]');
      cell.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
      document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0}));
    }''')
    page.wait_for_timeout(50)
    count = page.evaluate('paintRenders')
    assert count == 1, f'quick tap must replace app once, got {count}'
    assert page.locator('.paint-cell[data-cell="0"]').evaluate('(el) => el.classList.contains("filled")')
    assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == 1
    page.locator('[data-action="undo"]').first.click()
    assert page.evaluate('AlibiDiagnostics.getCurrent().state.cells[0]') == -1
    page.evaluate('paintRenders = 0')
    page.evaluate('''() => document.querySelector('.paint-cell[data-cell="0"]')
      .dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}))''')
    page.wait_for_timeout(50)
    assert page.locator('.paint-cell[data-cell="0"]').evaluate('(el) => el.classList.contains("filled")'), 'held gesture paints before release'
    box = page.locator('.paint-cell[data-cell="1"]').bounding_box()
    page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
    page.wait_for_timeout(50)
    assert page.locator('.paint-cell[data-cell="1"]').evaluate('(el) => el.classList.contains("filled")'), 'drag paints another cell before release'
    shots = ROOT / 'tests/screenshots'
    shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots / 'paint-render-desktop.png'), full_page=True)
    page.evaluate('document.dispatchEvent(new PointerEvent("pointercancel", {bubbles: true}))')
    assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == 1
    page.locator('[data-action="undo"]').first.click()
    assert page.evaluate('AlibiDiagnostics.getCurrent().state.cells.slice(0, 2).every(x => x === -1)'), 'drag is one undo step'
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(shots / 'paint-render-phone.png'), full_page=True)
    assert not errors, errors
    print('PASS quick tap uses one app replacement; held drag renders and cancels as one undo step')
    browser.close()
