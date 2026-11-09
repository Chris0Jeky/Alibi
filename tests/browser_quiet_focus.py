"""Keyboard route-focus regressions across the root and Quiet Wing shadow DOM."""
import json
import os
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import expect, sync_playwright


URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8796')
OUT = Path(__file__).resolve().parents[1] / 'test-results' / 'quiet-focus'
OUT.mkdir(parents=True, exist_ok=True)


def wait_for_quiet(page, route='realm'):
    page.wait_for_function(
        """route => window.AlibiActivities?.diagnostics().active &&
          window.QWApp?.route === route""",
        arg=route,
    )


def quiet_focus(page):
    return page.evaluate(
        """() => document.querySelector('#quiet-host')?.shadowRoot?.activeElement?.id || null"""
    )


def write_timeout_diagnostics(page, width, errors):
    def evaluate(expression):
        try:
            return page.evaluate(expression)
        except Exception as error:  # Preserve the original timeout if the page is already closing.
            return {'captureError': str(error)}

    (OUT / f'quiet-focus-timeout-{width}.json').write_text(
        json.dumps(
            {
                'width': width,
                'url': page.url,
                'activity': evaluate('window.AlibiActivities?.diagnostics?.() || null'),
                'route': evaluate('window.QWApp?.route || null'),
                'shadowText': evaluate(
                    "document.querySelector('#quiet-host')?.shadowRoot?.textContent || ''"
                ),
                'errors': errors,
            },
            indent=2,
        ),
        encoding='utf-8',
    )


def run_width(browser, width):
    context = browser.new_context(
        viewport={'width': width, 'height': 568 if width == 320 else 844 if width == 390 else 900},
        reduced_motion='reduce'
    )
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        # Direct hashes and browser history deliberately do not claim keyboard focus.
        page.goto(URL + '/#/quiet/realm')
        wait_for_quiet(page)
        assert quiet_focus(page) is None, 'Direct Quiet Wing load does not steal focus'

        # Test the toolbar at the viewport's lower edge, including long error feedback.
        pan = page.locator('#quiet-host').locator('[data-ract="pan"]')
        pan.scroll_into_view_if_needed()
        page.evaluate("""() => {
          const toolbar = document.querySelector('#quiet-host').shadowRoot.querySelector('.world-tools');
          window.scrollBy(0, toolbar.getBoundingClientRect().bottom - innerHeight + 20);
        }""")
        pan.click()
        toast = page.locator('#quiet-host').locator('#toast')
        expect(toast).to_contain_text('Drag to move the view')
        assert toast.get_attribute('aria-live') == 'polite'
        error = ('Import rejected: this backup cannot be restored because its saved data '
                 'is damaged. Export the original recovery copy and try another backup.')
        page.evaluate('(message) => QWApp.toast(message)', error)
        expect(toast).to_have_text(error)
        page.wait_for_timeout(250)  # Allow the visible toast transition to finish.
        def check_toast():
            assert toast.evaluate("""el => {
              const toast = el.getBoundingClientRect();
              const bar = el.getRootNode().querySelector('.world-tools').getBoundingClientRect();
              const overlap = toast.left < bar.right && toast.right > bar.left &&
                              toast.top < bar.bottom && toast.bottom > bar.top;
              return getComputedStyle(el).opacity === '1' && toast.top >= 0 &&
                     toast.bottom <= innerHeight && toast.left >= 0 && toast.right <= innerWidth && !overlap;
            }"""), 'Visible error must fit the viewport and clear the camera toolbar'
        check_toast()
        for action in ['zoomout', 'zoomin', 'rotate', 'pan', 'fit']:
            control = page.locator('#quiet-host').locator(f'[data-ract="{action}"]')
            expect(control).to_be_visible()
            assert control.evaluate("""el => {
                const rect=el.getBoundingClientRect();
                return el.getRootNode().elementFromPoint(rect.left+rect.width/2, rect.top+rect.height/2) === el;
            }"""), f'{action} must remain clickable'
        # The toast must move if scrolling brings the toolbar underneath it.
        page.evaluate('window.scrollBy(0, -80)')
        page.wait_for_timeout(100)
        check_toast()
        if width <= 390:
            # The offset is scoped to the Realm and to the period without a dialog.
            def show_offset_toast():
                page.evaluate('''() => {
                  const bar = document.querySelector('#quiet-host').shadowRoot.querySelector('.world-tools');
                  window.scrollTo({top: window.scrollY + bar.getBoundingClientRect().bottom - innerHeight + 20, behavior: 'instant'});
                }''')
                page.wait_for_timeout(100)
                page.evaluate("QWApp.toast('Import rejected: export your original recovery copy before trying another backup.')")
                assert toast.evaluate("el => el.style.bottom !== ''"), 'Fixture must create a Realm offset'
            show_offset_toast()
            page.evaluate("location.hash = '#/quiet/pets'")
            wait_for_quiet(page, 'pets')
            assert toast.evaluate("el => el.classList.contains('show') && el.style.bottom === ''"), (
                'An in-flight toast returns to its default position on another route'
            )
            page.evaluate("location.hash = '#/quiet/realm'")
            wait_for_quiet(page)
            show_offset_toast()
            page.evaluate("document.querySelector('#quiet-host').shadowRoot.querySelector('[data-act=settings]').click()")
            expect(page.locator('#quiet-host').locator('#modal[open]')).to_be_visible()
            assert toast.evaluate("el => el.classList.contains('show') && el.style.bottom === ''"), (
                'Opening a dialog resets an in-flight toast to its default position'
            )
            page.locator('#quiet-host').locator('[data-close]').click()
            assert toast.evaluate("el => el.style.bottom !== ''"), (
                'Closing the dialog restores the offset while the toast remains visible'
            )
        if width == 320:
            assert not errors, errors
            return

        page.goto(URL + '/#/settings')
        entry = page.get_by_role('button', name='Quiet Wing recovery')
        entry.focus()
        page.wait_for_function('()=>navigator.serviceWorker.controller')
        page.evaluate("navigator.serviceWorker.dispatchEvent(new Event('controllerchange'))")
        expect(page.locator('#quiet-recovery')).to_be_focused()
        page.keyboard.press('Enter')
        wait_for_quiet(page)
        assert quiet_focus(page) == 'main', 'Keyboard button entry focuses Quiet Wing main'

        page.go_back()
        expect(page.locator('#setting-reducedMotion')).to_be_visible()
        assert page.evaluate('document.activeElement.id') != 'main', (
            'Browser Back does not request root landmark focus'
        )

        # The room-to-room invitation and return-home logo are native links inside the shadow root.
        page.goto(URL + '/#/quiet/realm')
        wait_for_quiet(page)
        folio_link = page.locator('#quiet-host').locator('a[href="#/quiet/folio"]')
        folio_link.focus()
        folio_link.press('Enter')
        wait_for_quiet(page, 'folio')
        assert quiet_focus(page) == 'main', 'Keyboard native link focuses Quiet Wing main'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (
            'Quiet Wing route fits its viewport'
        )
        page.screenshot(path=str(OUT / f'quiet-focus-{width}.png'), full_page=True)

        home_link = page.locator('#quiet-host').locator('a.logo[href="#/home"]')
        home_link.focus()
        home_link.press('Enter')
        expect(page.locator('.club-welcome')).to_be_visible()
        assert page.evaluate('document.activeElement.id') == 'main', (
            'Keyboard native exit focuses the root main landmark'
        )

        # A Quiet Wing dialog keeps its focus rather than yielding it to the route landmark.
        page.goto(URL + '/#/quiet/realm')
        wait_for_quiet(page)
        settings = page.locator('#quiet-host').locator('[data-act="settings"]')
        settings.focus()
        settings.press('Enter')
        modal = page.locator('#quiet-host').locator('#modal[open]')
        expect(modal).to_be_visible()
        assert page.evaluate('AlibiActivities.focusDestination()') is False
        assert page.evaluate(
            """() => {
              const root = document.querySelector('#quiet-host').shadowRoot;
              const modal = root.querySelector('#modal');
              return modal === root.activeElement || modal.contains(root.activeElement);
            }"""
        ), 'Quiet Wing dialog retains focus'
        page.locator('#quiet-host').locator('[data-close]').press('Enter')
        assert not errors, errors
    except PlaywrightTimeoutError:
        try:
            write_timeout_diagnostics(page, width, errors)
        except Exception as diagnostic_error:
            print(f'Quiet Wing timeout diagnostics unavailable: {diagnostic_error}', flush=True)
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for width in [320, 390, 1440]:
        run_width(browser, width)
    browser.close()

print('Quiet Wing keyboard route-focus checks pass at phone and desktop widths.')
