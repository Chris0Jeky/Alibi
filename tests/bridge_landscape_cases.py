"""Short-landscape Bridges checks shared by built-origin and isolated DOM runs."""
from playwright.sync_api import expect


def check_bridge_landscape(page, screenshot=None):
    """Call after lesson dismissal, with no fixture-only scroll or hidden chrome."""
    expect(page.locator('.island')).to_have_count(4)
    geometry = page.evaluate('''() => {
        const nav = document.querySelector('.mobile-nav');
        const edge = nav && getComputedStyle(nav).display !== 'none'
            ? nav.getBoundingClientRect().top : innerHeight;
        const islands = [...document.querySelectorAll('.island')].map(el => {
            const r = el.getBoundingClientRect();
            return {id:el.id,top:r.top,bottom:r.bottom,left:r.left,right:r.right,
                width:r.width,height:r.height,
                exposed:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};
        });
        return {width:innerWidth,height:innerHeight,edge,islands,
            overflow:document.documentElement.scrollWidth > innerWidth + 1};
    }''')
    assert not geometry['overflow'], geometry
    for island in geometry['islands']:
        assert island['top'] >= 0 and island['bottom'] <= geometry['edge'], geometry
        assert island['left'] >= 0 and island['right'] <= geometry['width'], geometry
        assert island['width'] >= 44 and island['height'] >= 44, geometry
        assert island['exposed'], geometry
    if screenshot:
        page.screenshot(path=str(screenshot))
    original = page.evaluate('AlibiDiagnostics.getCurrent().state')
    page.locator('.island').first.click()
    page.locator('.island.reachable').first.click()
    page.wait_for_function('AlibiDiagnostics.getCurrent().moves === 1')
    page.locator('.main-tools [data-action="undo"]').click()
    assert page.evaluate('AlibiDiagnostics.getCurrent().state') == original
    # The normal board fits; enlargement still offers a bounded scrollable surface.
    page.locator('#play-zoom').click()
    expect(page.locator('#play-zoom')).to_have_attribute('aria-pressed', 'true')
    enlarged = page.locator('[data-scroll-key="bridges"]').evaluate('''el => ({
        width:el.clientWidth, height:el.clientHeight,
        scrollWidth:el.scrollWidth, scrollHeight:el.scrollHeight,
        mapWidth:el.querySelector('.bridge-map').getBoundingClientRect().width,
        islandWidth:el.querySelector('.island').getBoundingClientRect().width
    })''')
    assert enlarged['islandWidth'] >= 56, enlarged
    assert enlarged['scrollWidth'] > enlarged['width'] or enlarged['scrollHeight'] > enlarged['height'], enlarged
    page.locator('.island').last.click()
    expect(page.locator('.island').last).to_have_attribute('aria-pressed', 'true')
    page.locator('[data-action="erase"]').click()
    page.locator('#play-zoom').click()
    expect(page.locator('#play-zoom')).to_have_attribute('aria-pressed', 'false')
    assert page.evaluate('AlibiDiagnostics.getCurrent().state') == original
    return {'normal': geometry, 'enlarged': enlarged}
