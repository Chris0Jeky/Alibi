"""Numbered-game backups must be refused before restore review, without save writes."""
import copy
import json
import os
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/club-level-import'
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
WIDTHS = (390, 1280)


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks, failures = [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            for width in WIDTHS:
                context = browser.new_context(viewport={'width': width, 'height': 900})
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(BASE + '/#/settings')
                    page.wait_for_function('() => globalThis.AlibiDiagnostics')
                    # Export only already-loaded stores, without fetching the optional Wing.
                    context.set_offline(True)
                    with page.expect_download() as download:
                        page.locator('[data-action="export-all"]').click()
                    data = json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
                    context.set_offline(False)
                    assert 'club' in data['sections']
                    page.evaluate('''() => {
                      const Original = Worker;
                      window.stopped = 0;
                      window.Worker = class extends Original {
                        terminate() { window.stopped++; super.terminate(); }
                      };
                    }''')
                    before = page.evaluate('''() => ({
                      counts: AlibiDiagnostics.getCounts(),
                      clubFallback: localStorage.getItem('alibi-afterhours-v1')
                    })''')

                    def unchanged():
                        assert page.evaluate('''() => ({
                          counts: AlibiDiagnostics.getCounts(),
                          clubFallback: localStorage.getItem('alibi-afterhours-v1')
                        })''') == before

                    def submit(value):
                        prior = page.evaluate('stopped')
                        page.locator('[data-action="import-all"]').click()
                        page.locator('#all-backup-input').set_input_files({
                            'name': 'numbered-games.json', 'mimeType': 'application/json',
                            'buffer': json.dumps(value).encode(),
                        })
                        page.wait_for_function('(n) => stopped > n', arg=prior, timeout=30000)

                    for family in ('archive', 'regiongardens'):
                        bad = copy.deepcopy(data)
                        bad['sections']['club']['runs'] = {family: {'log': [], 'redo': []}}
                        submit(bad)
                        expect(page.get_by_text('Invalid game history.', exact=True)).to_be_visible()
                        expect(page.locator('[data-action="all-club"]')).to_have_count(0)
                        expect(page.locator('[data-action="club-restore-confirm"]')).to_have_count(0)
                        unchanged()
                        page.screenshot(path=str(OUT / f'{width}-{family}-refused.png'))
                        checks.append(f'{width}px {family}: missing level refused before restore review')

                    valid = copy.deepcopy(data)
                    valid['sections']['club']['runs'] = {
                        family: {'level': 0, 'log': [], 'redo': []}
                        for family in ('archive', 'regiongardens')
                    }
                    submit(valid)
                    expect(page.locator('[data-action="all-club"]')).to_be_visible()
                    page.locator('[data-action="all-club"]').click()
                    expect(page.locator('[data-action="club-restore-confirm"]')).to_be_visible(timeout=30000)
                    unchanged()
                    page.get_by_role('button', name='Cancel', exact=True).click()
                    unchanged()
                    checks.append(f'{width}px: explicit level zero still previews; cancellation changes nothing')
                    assert not errors, errors
                except Exception as error:
                    failures.append({'width': width, 'error': str(error), 'traceback': traceback.format_exc()})
                    page.screenshot(path=str(OUT / f'{width}-failure.png'), full_page=True)
                finally:
                    context.close()
        finally:
            browser.close()
    if len(checks) != 6:
        failures.append({'scenario': 'coverage', 'expected': 6, 'completed': len(checks)})
    receipt = {'passed': not failures, 'sourceHead': os.environ.get('EXPECTED_HEAD', 'unrecorded'),
               'widths': list(WIDTHS), 'checks': checks, 'failures': failures,
               'scope': 'Actual file import and validation worker; synthetic saves, not physical-device acceptance.'}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps(receipt, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
