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
        viewport={'width': width, 'height': 900}, reduced_motion='reduce'
    )
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        # Direct hashes and browser history deliberately do not claim keyboard focus.
        page.goto(URL + '/#/quiet/realm')
        wait_for_quiet(page)
        assert quiet_focus(page) is None, 'Direct Quiet Wing load does not steal focus'

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
    for width in [390, 1440]:
        run_width(browser, width)
    browser.close()

print('Quiet Wing keyboard route-focus checks pass at phone and desktop widths.')
