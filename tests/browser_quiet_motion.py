"""Quiet Wing's local motion preference remains distinct from root and OS comfort settings."""
import os

from playwright.sync_api import expect, sync_playwright


URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8796')
ROOT_PREFERENCES = {
    'theme': 'light',
    'reducedMotion': False,
    'contrast': False,
    'largeText': False,
}


def wait_for_realm(page):
    page.wait_for_function(
        """() => window.AlibiActivities?.diagnostics().active && window.QWApp?.renderer"""
    )


def state(page):
    return page.evaluate(
        """() => ({
          motion: QWApp.state.settings.motion,
          sceneName: QWApp.state.scene.name,
          reduced: document.querySelector('#quiet-host').shadowRoot
            .querySelector('.qw-body').classList.contains('reduce')
        })"""
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={'width': 390, 'height': 900}, reduced_motion='no-preference')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL + '/#/quiet/realm')
    wait_for_realm(page)
    original = state(page)
    assert original['motion'] is True and original['reduced'] is False

    page.locator('#quiet-host').locator('[data-act="settings"]').click()
    local_motion = page.locator('#quiet-host').locator('[data-setting="motion"]')
    local_motion.uncheck()
    expect(local_motion).not_to_be_checked()
    assert state(page)['motion'] is False and state(page)['reduced'] is True
    page.wait_for_timeout(300)
    page.reload()
    wait_for_realm(page)
    restored = state(page)
    assert restored['motion'] is False and restored['reduced'] is True
    assert restored['sceneName'] == original['sceneName'], 'Motion setting does not replace realm data'

    page.locator('#quiet-host').locator('[data-act="settings"]').click()
    page.locator('#quiet-host').locator('[data-setting="motion"]').check()
    expect(page.locator('#quiet-host').locator('[data-setting="motion"]')).to_be_checked()
    assert state(page)['motion'] is True and state(page)['reduced'] is False

    page.evaluate('(preferences) => AlibiActivities.setPreferences(preferences)', {
        **ROOT_PREFERENCES,
        'reducedMotion': True,
    })
    reduced_by_root = state(page)
    assert reduced_by_root['motion'] is True and reduced_by_root['reduced'] is True
    page.evaluate('(preferences) => AlibiActivities.setPreferences(preferences)', ROOT_PREFERENCES)
    assert state(page)['motion'] is True and state(page)['reduced'] is False
    assert not errors, errors
    context.close()

    system_context = browser.new_context(
        viewport={'width': 1440, 'height': 900}, reduced_motion='reduce'
    )
    system_page = system_context.new_page()
    system_page.goto(URL + '/#/quiet/realm')
    wait_for_realm(system_page)
    system_state = state(system_page)
    assert system_state['motion'] is True and system_state['reduced'] is True
    system_context.close()
    browser.close()

print('Quiet Wing motion preference checks pass for local, root and OS settings.')
