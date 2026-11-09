"""Count app DOM replacements and exercise a native held drag in Chromium."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / 'tests/screenshots'
SHOTS.mkdir(exist_ok=True)


def geometry(page):
    return page.evaluate('''() => ({
      scroll: {x: window.scrollX, y: window.scrollY},
      viewport: {width: innerWidth, height: innerHeight},
      cells: [0, 1].map(i => {
        const el = document.querySelector(`.paint-cell[data-cell="${i}"]`);
        if (!el) return {i, missing: true};
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {i, rect: {x: r.x, y: r.y, width: r.width, height: r.height}, x, y,
          hitCell: hit?.closest('.paint-cell[data-cell]')?.dataset.cell ?? null,
          hitTag: hit?.tagName ?? null, hitId: hit?.id ?? null};
      }),
      cellsState: AlibiDiagnostics.getCurrent()?.state.cells.slice(0, 2),
      moves: AlibiDiagnostics.getCurrent()?.moves,
      events: window.paintEvents,
      renders: window.paintRenders,
    })''')


def wait_filled(page, cell):
    page.wait_for_function('''i => document.querySelector(`.paint-cell[data-cell="${i}"]`)
      ?.classList.contains('filled')''', arg=cell)


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
      window.paintEvents = [];
      new MutationObserver(records => { for (const r of records)
        if (r.target.id === 'app' && r.type === 'childList') window.paintRenders++;
      }).observe(document.getElementById('app'), {childList: true});
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'])
        document.addEventListener(type, e => {
          if (window.paintEvents.length < 40) window.paintEvents.push({type, x: e.clientX, y: e.clientY,
            buttons: e.buttons, cell: e.target.closest?.('.paint-cell[data-cell]')?.dataset.cell ?? null});
        }, true);
    }''')
    # Synchronous dispatch intentionally places both events in one task for the same-frame count.
    page.evaluate('''() => {
      const cell = document.querySelector('.paint-cell[data-cell="0"]');
      cell.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
      document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0}));
    }''')
    page.wait_for_function('paintRenders >= 1')
    page.evaluate('''() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))''')
    count = page.evaluate('paintRenders')
    assert count == 1, f'same-frame synthetic tap must replace app once, got {count}'
    assert page.locator('.paint-cell[data-cell="0"]').evaluate('(el) => el.classList.contains("filled")')
    assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == 1
    page.locator('[data-action="undo"]').first.click()
    assert page.evaluate('AlibiDiagnostics.getCurrent().state.cells[0]') == -1

    # Undo can scroll the page: record that geometry, then ensure both native pointer targets are hittable.
    before_scroll = geometry(page)
    print('PAINT_GEOMETRY_BEFORE_SCROLL', json.dumps(before_scroll), flush=True)
    try:
        page.locator('.paint-cell[data-cell="0"]').scroll_into_view_if_needed()
        page.evaluate('''() => { paintRenders = 0; paintEvents = []; }''')
        start = geometry(page)
        print('PAINT_GEOMETRY_AFTER_SCROLL', json.dumps(start), flush=True)
        assert [cell['hitCell'] for cell in start['cells']] == ['0', '1'], 'both cell centers must be hittable'
        page.mouse.move(start['cells'][0]['x'], start['cells'][0]['y'])
        page.mouse.down()
        wait_filled(page, 0)
        after_down = geometry(page)
        print('PAINT_GEOMETRY_AFTER_DOWN', json.dumps(after_down), flush=True)
        assert after_down['cells'][1]['hitCell'] == '1', 'second cell center must remain hittable after render'
        page.mouse.move(after_down['cells'][1]['x'], after_down['cells'][1]['y'])
        wait_filled(page, 1)
        page.screenshot(path=str(SHOTS / 'paint-render-desktop.png'), full_page=True)
        page.evaluate('document.dispatchEvent(new PointerEvent("pointercancel", {bubbles: true}))')
        page.mouse.up()
        assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == 1
        page.locator('[data-action="undo"]').first.click()
        assert page.evaluate('AlibiDiagnostics.getCurrent().state.cells.slice(0, 2).every(x => x === -1)'), 'drag is one undo step'
    except Exception:
        try:
            print('PAINT_FAILURE_CONTEXT', json.dumps(geometry(page)), flush=True)
        except Exception as error:
            print('PAINT_FAILURE_CONTEXT_UNAVAILABLE', str(error)[:500], flush=True)
        try:
            page.screenshot(path=str(SHOTS / 'paint-render-failure.png'), full_page=True)
        except Exception as error:
            print('PAINT_FAILURE_SCREENSHOT_UNAVAILABLE', str(error)[:500], flush=True)
        raise
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(SHOTS / 'paint-render-phone.png'), full_page=True)
    assert not errors, errors
    print('PASS same-frame synthetic tap uses one app replacement; native held drag renders and cancels as one undo step')
    browser.close()
