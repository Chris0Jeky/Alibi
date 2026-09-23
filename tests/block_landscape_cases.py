"""Phone landscape geometry and real control checks for the enhanced Block Cabinet."""
from playwright.sync_api import expect


def check_landscape(page, isolated=False, screenshot=None):
    host = page.locator('.bc-host')
    host.locator('.bc-cell').first.wait_for()
    # The optional opaque-origin source fixture necessarily runs in session mode.
    # Keep its warning visible in the document; it is not a normal-origin fold test.
    if isolated:
        host.evaluate('el => scrollTo(0, el.getBoundingClientRect().top + scrollY)')
    geometry = host.evaluate('''el => {
        const rect = e => {
            const r = e.getBoundingClientRect();
            return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
        };
        const board = el.querySelector('.bc-board');
        const pieces = [...el.querySelectorAll('.bc-piece')];
        const sidebar = document.querySelector('.sidebar');
        return {width:innerWidth,height:innerHeight,board:rect(board),pieces:pieces.map(rect),
            exit:rect(el.querySelector('.bc-return')),
            cell:rect(el.querySelector('.bc-cell')),
            sidebar:sidebar && getComputedStyle(sidebar).display,
            overflow:document.documentElement.scrollWidth > innerWidth + 1};
    }''')
    assert geometry['sidebar'] == 'none', geometry
    assert not geometry['overflow'], geometry
    assert geometry['exit']['width'] >= 44 and geometry['exit']['height'] >= 44, geometry
    assert geometry['cell']['width'] >= 24 and geometry['cell']['height'] >= 24, geometry
    assert len(geometry['pieces']) == 3, geometry
    for rect in [geometry['board'], geometry['exit'], *geometry['pieces']]:
        assert rect['left'] >= 0 and rect['right'] <= geometry['width'] + 1, geometry
        assert rect['top'] >= -1 and rect['bottom'] <= geometry['height'] + 1, geometry
    # Exact visual targets must not be covered by sticky controls or decorative canvas.
    assert host.locator('.bc-piece').first.evaluate('''el => {
        const r=el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
    }'''), geometry
    if screenshot:
        page.screenshot(path=str(screenshot))
    before = page.evaluate('AlibiClub.diagnostics().state.runs.blockcabinet.log.length')
    host.locator('.bc-piece').first.click()
    expect(host.locator('.bc-piece.selected')).to_have_count(1)
    cell = host.locator('.bc-cell.legal').first
    cell.click()
    page.wait_for_function('(turn) => AlibiClub.diagnostics().state.runs.blockcabinet.log.length > turn', arg=before)
    host.locator('[data-command="undo"]').click()
    page.wait_for_function('(turn) => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === turn', arg=before)
    host.locator('.bc-menu-toggle').click()
    expect(host.locator('.bc-aside')).to_be_visible()
    host.locator('.bc-menu-toggle').click()
    expect(host.locator('.bc-aside')).not_to_be_visible()
    host.locator('.bc-return').focus()
    page.keyboard.press('Tab')
    page.keyboard.press('Shift+Tab')
    expect(host.locator('.bc-return')).to_be_focused()
    assert host.locator('.bc-return').evaluate('el => getComputedStyle(el).outlineStyle !== "none"')
    host.locator('.bc-return').press('Enter')
    expect(host).to_have_count(0)
    assert page.evaluate('location.hash') == '#/salon'
    return geometry
