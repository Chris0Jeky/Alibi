"""Populated toast geometry with supplied emitted styles, not device acceptance."""
from native_inset_content import MODES, VIEWPORTS


def toast_geometry(page):
    return page.evaluate("""() => {
        const host = document.querySelector('#toasts');
        const toast = host.firstElementChild;
        const nav = document.querySelector('.mobile-nav');
        const box = toast.getBoundingClientRect();
        const dock = nav.getBoundingClientRect();
        const style = getComputedStyle(host);
        return {bottom: parseFloat(style.bottom), left: box.left, width: box.width,
                height: box.height, top: box.top, toastBottom: box.bottom,
                transform: style.transform, pointerEvents: style.pointerEvents,
                navVisible: nav.getClientRects().length > 0, navTop: dock.top};
    }""")


def verify_toast_clearance(page, native, shared):
    checks = []
    for width, height in VIEWPORTS:
        page.set_viewport_size({'width': width, 'height': height})
        for attributes, mode in MODES:
            # Match app.js's actual non-interactive toast, not an invented action button.
            page.set_content(f'''<!doctype html><html><head><style>{native}</style>
                <style>{shared}</style></head><body {attributes}>
                <main id="main" class="main">Puzzle</main>
                <nav class="mobile-nav"><button type="button" id="navigation">Menu</button></nav>
                <div id="toasts" class="toast-container"><div class="toast">Progress saved on this device.</div></div>
                </body></html>''')
            baseline = toast_geometry(page)
            for inset in (0, 32, 80):
                label = f'toast:{width}x{height}:{mode}:{inset}'
                page.evaluate("""inset => {
                    document.documentElement.dataset.alibiTarget = 'android';
                    document.documentElement.style.setProperty('--safe-area-inset-bottom', inset + 'px');
                }""", inset)
                current = toast_geometry(page)
                growth = inset if mode == 'house' or width <= 800 else 0
                assert abs(current['bottom'] - baseline['bottom'] - growth) < .1, (label, current, baseline)
                for key in ('left', 'width', 'height', 'transform', 'pointerEvents', 'navVisible'):
                    assert current[key] == baseline[key], (label, key, current, baseline)
                assert current['top'] >= 0, (label, 'toast left viewport')
                if current['navVisible']:
                    gap = current['navTop'] - current['toastBottom']
                    old_gap = baseline['navTop'] - baseline['toastBottom']
                    assert gap > 0 and abs(gap - old_gap) < .1, (label, 'toast overlaps dock', gap, old_gap)
                    assert page.evaluate("""() => {
                        const button = document.querySelector('#navigation');
                        const box = button.getBoundingClientRect();
                        return button.contains(document.elementFromPoint(box.x + box.width/2, box.y + box.height/2));
                    }"""), (label, 'toast intercepts navigation')
                checks.append(label)
            page.evaluate("document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px')")
            assert toast_geometry(page) == baseline, (width, mode, 'toast reset drift')
            page.evaluate("""() => {
                delete document.documentElement.dataset.alibiTarget;
                document.documentElement.style.setProperty('--safe-area-inset-bottom', '80px');
            }""")
            assert toast_geometry(page) == baseline, (width, mode, 'web toast drift')
    return checks
