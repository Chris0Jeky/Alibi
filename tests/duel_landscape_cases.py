"""Short-landscape Lantern Duel checks shared by built-origin and isolated DOM runs."""
from playwright.sync_api import expect


def check_duel_landscape(page, screenshot=None):
    """Call with the duel route open. The board must already sit at scroll 0."""
    expect(page.locator('.duel-cell')).to_have_count(36)
    geometry = page.evaluate('''() => {
        const nav = document.querySelector('.mobile-nav');
        const edge = nav && getComputedStyle(nav).display !== 'none'
            ? nav.getBoundingClientRect().top : innerHeight;
        const sidebar = document.querySelector('.sidebar');
        const cells = [...document.querySelectorAll('.duel-cell')].map(el => {
            const r = el.getBoundingClientRect();
            return {id:el.id, top:r.top, bottom:r.bottom, left:r.left, right:r.right,
                width:r.width, height:r.height,
                exposed:el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))};
        });
        return {width:innerWidth, height:innerHeight, edge, scrollY, cells,
            sidebar:sidebar && getComputedStyle(sidebar).display,
            overflow:document.documentElement.scrollWidth > innerWidth + 1};
    }''')
    assert geometry['scrollY'] == 0, geometry
    assert geometry['sidebar'] == 'none', geometry
    assert not geometry['overflow'], geometry
    assert len(geometry['cells']) == 36, geometry
    for cell in geometry['cells']:
        assert cell['top'] >= 0 and cell['bottom'] <= geometry['edge'], geometry
        assert cell['left'] >= 0 and cell['right'] <= geometry['width'], geometry
        assert cell['width'] >= 28 and cell['height'] >= 28, geometry
        assert cell['exposed'], geometry
    if screenshot:
        page.screenshot(path=str(screenshot))
    before = page.evaluate('AlibiClub.diagnostics().state.runs.duel.log.length')
    legal = page.locator('.duel-cell.legal').first
    expect(legal).to_be_enabled()
    legal.click()
    page.wait_for_function(
        '(turn) => AlibiClub.diagnostics().state.runs.duel.log.length > turn', arg=before)
    page.locator('.club-playtools [data-action="club-undo"]').click()
    page.wait_for_function(
        '(turn) => AlibiClub.diagnostics().state.runs.duel.log.length === turn', arg=before)
    return geometry
