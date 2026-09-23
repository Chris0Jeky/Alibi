"""Exercise the optional Observatory control on Alibi's exact public HTTPS origin."""
import json
import mimetypes
import time
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = (ROOT / 'dist').resolve()
ORIGIN = 'https://alibi-after-hours-preview.commit-atlas.workers.dev'
PUBLIC_URL = ORIGIN + '/'
COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi'
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS', label, flush=True)


def wait_for_events(page, events, count, timeout=5000):
    deadline = time.monotonic() + timeout / 1000
    while len(events) < count:
        if time.monotonic() >= deadline:
            raise AssertionError(f'Expected {count} Observatory events, found {events!r}')
        page.wait_for_timeout(25)


def dismiss_dialog(page):
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')


def open_consent(page):
    details = page.locator('#pulseboard-usage-sharing')
    if not details.get_attribute('open'):
        details.locator('summary').click()
    return details.locator('input[type="checkbox"]')


if not (DIST / 'index.html').is_file():
    raise SystemExit('Run npm run build before browser_observatory.py')

observed = []
page_errors = []


def headers():
    return {
        'Access-Control-Allow-Origin': ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Cache-Control': 'no-store',
        'Vary': 'Origin',
    }


def serve(route, request):
    parsed = urlparse(request.url)
    if request.url.startswith(COLLECTOR):
        if request.method == 'OPTIONS':
            route.fulfill(status=204, headers=headers(), body='')
            return
        if request.method == 'POST':
            payload = json.loads(request.post_data or '{}')
            observed.extend(payload.get('events', []))
            route.fulfill(status=202, headers=headers(), content_type='application/json', body='{}')
            return
        route.fulfill(status=405, headers=headers(), body='')
        return
    if parsed.scheme == 'https' and f'{parsed.scheme}://{parsed.netloc}' == ORIGIN:
        relative = unquote(parsed.path).lstrip('/') or 'index.html'
        filename = (DIST / relative).resolve()
        if DIST not in filename.parents and filename != DIST:
            route.fulfill(status=403, body='')
            return
        if not filename.is_file():
            route.fulfill(status=404, body='')
            return
        route.fulfill(
            status=200,
            content_type=mimetypes.guess_type(filename.name)[0] or 'application/octet-stream',
            body=filename.read_bytes(),
        )
        return
    route.abort()


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(service_workers='block', viewport={'width': 1100, 'height': 900})
    context.add_init_script(
        "Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false, configurable: true});"
    )
    context.route('**/*', serve)
    page = context.new_page()
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.goto(PUBLIC_URL)
    page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')
    page.locator('#pulseboard-usage-sharing').wait_for()

    checkbox = open_consent(page)
    app_release = page.evaluate('() => ALIBI_CONFIG.version')
    check(not checkbox.is_checked(), 'usage sharing starts off')
    check(observed == [], 'no Observatory request occurs before consent')

    checkbox.check()
    wait_for_events(page, observed, 1)
    check(observed[0]['event'] == 'page.view', 'granting consent reports one page view')
    check(observed[0]['route'] == 'home', 'initial page view uses the current Alibi route')
    check(observed[0]['release'] == app_release, 'initial page view uses the registered app release')

    page.reload()
    page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')
    page.locator('#pulseboard-usage-sharing').wait_for()
    wait_for_events(page, observed, 2)
    check(
        page.locator('#pulseboard-usage-sharing input[type="checkbox"]').is_checked(),
        'consent persists across reload',
    )
    check(observed[1]['route'] == 'home', 'restored consent reports the reloaded route')
    check(observed[1]['release'] == app_release, 'restored consent keeps the release label')

    key = page.evaluate(
        """() => {
          const puzzle = ALIBI_CATALOG.puzzles.find((candidate) => candidate.type === 'sudoku');
          return puzzle.id + '@' + puzzle.revision;
        }"""
    )
    page.evaluate("(key) => { location.hash = '/play/' + key; }", key)
    page.wait_for_function(
        "(key) => window.AlibiDiagnostics?.getCurrent()?.key === key",
        arg=key,
    )
    wait_for_events(page, observed, 3)
    check(observed[2]['route'] == 'puzzle', 'SPA navigation reports the puzzle route')
    check(observed[2]['release'] == app_release, 'SPA navigation keeps the release label')
    dismiss_dialog(page)

    editable = page.evaluate(
        """() => {
          const run = AlibiDiagnostics.getCurrent();
          const index = run.puzzle.givens.findIndex((value) => !value);
          return {index, value: run.puzzle.solution[index]};
        }"""
    )
    page.locator(f'#cell-{editable["index"]}').click()
    page.keyboard.press(str(editable['value']))
    page.wait_for_function(
        "(entry) => AlibiDiagnostics.getCurrent().state.cells[entry.index] === entry.value",
        arg=editable,
    )
    page.evaluate('() => PulseboardUsage.flush()')
    wait_for_events(page, observed, 4)
    check(observed[3]['event'] == 'puzzle.started', 'the first real board change starts a journey')
    check(observed[3]['route'] == 'puzzle', 'the journey start uses the puzzle route')

    conflict = page.evaluate(
        """(entry) => {
          const run = AlibiDiagnostics.getCurrent();
          const size = Math.sqrt(run.puzzle.givens.length);
          const row = Math.floor(entry.index / size), column = entry.index % size;
          for (let index = 0; index < run.state.cells.length; index++)
            if (index !== entry.index && !run.puzzle.givens[index] && !run.state.cells[index] &&
                (Math.floor(index / size) === row || index % size === column))
              return {index, value: entry.value};
          return null;
        }""",
        editable,
    )
    check(conflict is not None, 'Sudoku fixture needs an editable row or column peer for a conflict')
    page.locator(f'#cell-{conflict["index"]}').click()
    page.keyboard.press(str(conflict['value']))
    page.wait_for_function(
        "(entry) => AlibiDiagnostics.getCurrent().state.cells[entry.index] === entry.value",
        arg=conflict,
    )
    page.locator('[data-action="check"]').first.click()
    page.evaluate('() => PulseboardUsage.flush()')
    wait_for_events(page, observed, 5)
    check(
        [event['event'] for event in observed[3:]] == ['puzzle.started', 'puzzle.failed'],
        'a conflicted check ends the open attempt without another start',
    )
    check(
        all(set(event) <= {'v', 'id', 'session', 'seq', 'event', 'route', 'release'} for event in observed[3:])
        and key not in json.dumps(observed),
        'journey events carry no puzzle identity, answer or board payload',
    )
    dismiss_dialog(page)

    page.locator('[data-action="check"]').first.click()
    page.evaluate('() => PulseboardUsage.flush()')
    page.wait_for_timeout(300)
    check(len(observed) == 5, 'checking the same board again is not another attempt')
    dismiss_dialog(page)

    followup = page.evaluate(
        """() => {
          const run = AlibiDiagnostics.getCurrent();
          const index = run.puzzle.givens.findIndex(
            (value, cell) => !value && !run.state.cells[cell],
          );
          return index === -1 ? null : {index, value: run.puzzle.solution[index]};
        }"""
    )
    check(followup is not None, 'the sudoku board has a third editable cell for the retry')
    page.locator(f'#cell-{followup["index"]}').click()
    page.keyboard.press(str(followup['value']))
    page.wait_for_function(
        "(entry) => AlibiDiagnostics.getCurrent().state.cells[entry.index] === entry.value",
        arg=followup,
    )
    page.locator('[data-action="check"]').first.click()
    page.evaluate('() => PulseboardUsage.flush()')
    wait_for_events(page, observed, 7)
    check(
        [event['event'] for event in observed[5:]] == ['puzzle.started', 'puzzle.failed'],
        'a move after failure opens a fresh attempt',
    )
    dismiss_dialog(page)

    page.locator('[data-action="undo"]').first.click()
    page.wait_for_function(
        "(entry) => AlibiDiagnostics.getCurrent().state.cells[entry.index] !== entry.value",
        arg=followup,
    )
    page.locator('[data-action="check"]').first.click()
    page.evaluate('() => PulseboardUsage.flush()')
    wait_for_events(page, observed, 9)
    check(
        [event['event'] for event in observed[7:]] == ['puzzle.started', 'puzzle.failed'],
        'undo after a failed check reopens the retry without a new move',
    )
    dismiss_dialog(page)

    before = page.evaluate(
        "()=>({state: AlibiDiagnostics.getCurrent().state, moves: AlibiDiagnostics.getCurrent().moves})"
    )
    summary = page.locator('#pulseboard-usage-sharing summary')
    summary.focus()
    page.keyboard.press('Delete')
    page.keyboard.press('ArrowRight')
    after = page.evaluate(
        "()=>({state: AlibiDiagnostics.getCurrent().state, moves: AlibiDiagnostics.getCurrent().moves})"
    )
    check(after == before, 'summary keyboard input cannot mutate the active puzzle')
    check(
        page.evaluate(
            "()=>document.activeElement === document.querySelector('#pulseboard-usage-sharing summary')"
        ),
        'summary retains keyboard focus instead of moving through the board',
    )

    checkbox = open_consent(page)
    checkbox.uncheck()
    count = len(observed)
    page.evaluate("location.hash='/home'")
    page.evaluate("window.dispatchEvent(new ErrorEvent('error', {message: 'post-withdrawal probe'}))")
    page.wait_for_timeout(300)
    check(len(observed) == count, 'withdrawal stops route and error emission immediately')
    choice = page.evaluate(
        """() => {
          const key = Object.keys(localStorage).find((item) => item.startsWith('pulseboard:consent:v1:alibi:'));
          return key ? JSON.parse(localStorage.getItem(key)) : null;
        }"""
    )
    check(choice and choice['allow'] is False, 'withdrawal is persisted for this collector')
    check(not page_errors, 'Observatory lifecycle produces no browser errors')
    context.close()
    browser.close()

print('PASS', checks, 'Observatory browser assertions')
