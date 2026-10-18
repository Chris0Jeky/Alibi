"""Scrollable-content geometry using the supplied emitted layer, not device acceptance."""
from pathlib import Path

VIEWPORTS = [(390, 844), (430, 800), (431, 800), (600, 800), (601, 800), (650, 800), (651, 800), (760, 480), (760, 481),
             (761, 481), (768, 800), (800, 800), (801, 800), (900, 400)]
MODES = [("", "plain"), ('class="block-motion-active"', "block"),
         ('data-house="true"', "house"), ('class="club-home"', "club-home"),
         ('class="club-experiment"', "club-experiment"), ('class="club-zen"', "zen")]


def geometry(page):
    return page.evaluate("""() => {
        const main = document.querySelector('#main');
        const nav = document.querySelector('.mobile-nav');
        const style = getComputedStyle(main);
        return {bottom: parseFloat(style.paddingBottom), marginBottom: parseFloat(style.marginBottom),
                top: style.paddingTop,
                left: style.paddingLeft, right: style.paddingRight,
                navVisible: nav.getClientRects().length > 0,
                navHeight: nav.getBoundingClientRect().height};
    }""")


def verify_content_reservation(page, native, shared, screenshots: Path):
    """Test actual #main/playing selectors and hit-test the last scrollable action."""
    checks = []
    screenshots.mkdir(parents=True, exist_ok=True)
    for width, height in VIEWPORTS:
        page.set_viewport_size({"width": width, "height": height})
        for attributes, mode in MODES:
            for playing in (False, True):
                page.set_content(f'''<!doctype html><html><head><style>{native}</style>
                    <style>{shared}</style></head><body {attributes}>
                    <div class="shell {'playing' if playing else ''}">
                      <div class="main-wrap"><main id="main" class="main">
                        <div style="height:1800px">Scrollable content</div>
                        <button id="final-action" type="button">Final action</button>
                      </main></div>
                    </div><nav class="mobile-nav"><button>Navigation</button></nav>
                    </body></html>''')
                baseline = geometry(page)
                for inset in (0, 32, 80):
                    label = f"content:{width}x{height}:{mode}:{playing}:{inset}"
                    page.evaluate("""inset => {
                        document.documentElement.dataset.alibiTarget = 'android';
                        document.documentElement.style.setProperty('--safe-area-inset-bottom', inset + 'px');
                    }""", inset)
                    actual = geometry(page)
                    expected = baseline['marginBottom'] + (inset if baseline['navVisible'] else 0)
                    assert abs(actual['marginBottom'] - expected) < 0.1, (label, actual, baseline, expected)
                    for side in ('bottom', 'top', 'left', 'right', 'navVisible'):
                        assert actual[side] == baseline[side], (label, side, actual, baseline)
                    if actual['navVisible']:
                        gap = actual['bottom'] + actual['marginBottom'] - actual['navHeight']
                        old_gap = baseline['bottom'] + baseline['marginBottom'] - baseline['navHeight']
                        assert abs(gap - old_gap) < 0.1, label
                        page.evaluate("window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'})")
                        assert page.evaluate("""() => {
                            const button = document.querySelector('#final-action');
                            const rect = button.getBoundingClientRect();
                            const nav = document.querySelector('.mobile-nav').getBoundingClientRect();
                            return rect.bottom <= nav.top && rect.top >= 0
                              && button.contains(document.elementFromPoint(
                                rect.left + rect.width / 2, rect.top + rect.height / 2));
                        }"""), (label, 'final action hidden under fixed navigation')
                        if width in (390, 800) and mode == 'plain' and inset == 80:
                            page.screenshot(path=str(screenshots / f"content-{width}-playing-{playing}.png"))
                    checks.append(label)
                page.evaluate("""() => {
                    document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
                }""")
                assert geometry(page) == baseline, (width, height, mode, playing, 'reset drift')
                page.evaluate("""() => {
                    delete document.documentElement.dataset.alibiTarget;
                    document.documentElement.style.setProperty('--safe-area-inset-bottom', '80px');
                }""")
                assert geometry(page) == baseline, (width, height, mode, playing, 'web drift')
    return checks
