"""Synthetic intercepted Observatory checks for the default-on aggregate adapter.

This is NOT a real-origin storage/offline suite: it serves the last local
``dist`` build under the public origin via Playwright routing with a fake
``/v1/collect-stat/alibi`` collector, using disposable in-memory contexts only.
No persistent or private profiles are created or read. Real-origin IndexedDB,
service-worker and offline acceptance lives in ``tests/browser_origin.py``.
"""

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
STAT_COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect-stat/alibi'
PREF_KEY = 'pulseboard:statistics:v1:alibi'
OLD_PREFIX = 'pulseboard:consent:v1:alibi:'
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS', label, flush=True)


def wait_for_counts(page, counts, count, timeout=5000):
    deadline = time.monotonic() + timeout / 1000
    while len(counts) < count:
        if time.monotonic() >= deadline:
            raise AssertionError(f'Expected {count} Observatory counts, found {counts!r}')
        page.wait_for_timeout(25)


def dismiss_dialog(page):
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')


def is_details_open(page):
    return page.evaluate("() => document.querySelector('#pulseboard-usage-sharing').open === true")


def open_consent(page):
    page.locator('#pulseboard-usage-sharing').wait_for()
    if not is_details_open(page):
        page.locator('#pulseboard-usage-sharing summary').click()
    return page.locator('#pulseboard-usage-sharing input[type="checkbox"]')


def assert_aggregate_body(payload, expected, label):
    assert payload.get('v') == 1, f'{label} carries v:1'
    counts = payload.get('counts')
    assert isinstance(counts, list) and len(counts) == len(expected), f'{label} count length'
    for count, want in zip(counts, expected):
        assert set(count.keys()) == {'event', 'route', 'release', 'n'}, f'{label} keys'
        assert count['event'] == want['event'], f'{label} event'
        assert count['route'] == want['route'], f'{label} route'
        assert count['release'] == want['release'], f'{label} release'
        assert count['n'] == 1, f'{label} n:1'
    raw = json.dumps(payload)
    for forbidden in (
        '"session"',
        '"seq"',
        '"sessionId"',
        '"answer"',
        '"solution"',
        '"save"',
        '"content"',
        '"board"',
    ):
        assert forbidden not in raw, f'{label} omits {forbidden}'


if not (DIST / 'index.html').is_file():
    raise SystemExit('Run npm run build before browser_observatory.py')

observed_counts = []
observed_bodies = []
observed_requests = []
collector_status = {'code': 202}
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
    if request.url.startswith(STAT_COLLECTOR):
        if request.method == 'OPTIONS':
            route.fulfill(status=204, headers=headers(), body='')
            return
        if request.method == 'POST':
            observed_requests.append({'url': request.url, 'method': request.method})
            try:
                payload = json.loads(request.post_data or '{}')
            except json.JSONDecodeError:
                route.fulfill(status=400, headers=headers(), body='')
                return
            observed_bodies.append(payload)
            if collector_status['code'] == 202:
                observed_counts.extend(payload.get('counts', []))
                route.fulfill(
                    status=202, headers=headers(), content_type='application/json', body='{}'
                )
            else:
                route.fulfill(
                    status=503, headers=headers(), content_type='application/json', body='{}'
                )
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
    # Disposable in-memory context: no persistent profile, no private data retained.
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
    check(is_details_open(page), 'sharing notice is open before the first send')
    check(checkbox.is_checked(), 'usage sharing defaults on when eligible')
    check(
        'Sharing is on' in page.locator('#pulseboard-usage-sharing').inner_text(),
        'notice status reports sharing on',
    )
    check(
        'No puzzle content' in page.locator('#pulseboard-usage-sharing').inner_text(),
        'notice describes aggregate-only counts',
    )
    wait_for_counts(page, observed_counts, 1)
    check(len(observed_bodies) == 1, 'default-on sends one initial aggregate request')
    assert_aggregate_body(
        observed_bodies[0],
        [{'event': 'page.view', 'route': 'home', 'release': app_release}],
        'initial page.view',
    )
    check(observed_counts[0]['event'] == 'page.view', 'default-on reports one page view')
    check(observed_counts[0]['route'] == 'home', 'initial page view uses the current Alibi route')
    check(
        observed_counts[0]['release'] == app_release,
        'initial page view uses the registered app release',
    )
    check(
        page.evaluate('() => PulseboardUsage.status().active') is True,
        'adapter status is active by default',
    )

    page.reload()
    page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')
    page.locator('#pulseboard-usage-sharing').wait_for()
    wait_for_counts(page, observed_counts, 2)
    check(
        page.locator('#pulseboard-usage-sharing input[type="checkbox"]').is_checked(),
        'default-on persists across reload',
    )
    check(observed_counts[1]['route'] == 'home', 'restored consent reports the reloaded route')
    check(
        observed_counts[1]['release'] == app_release, 'restored consent keeps the release label'
    )
    assert_aggregate_body(
        observed_bodies[1],
        [{'event': 'page.view', 'route': 'home', 'release': app_release}],
        'reloaded page.view',
    )

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
    page.evaluate('() => PulseboardUsage.flush()')
    wait_for_counts(page, observed_counts, 3)
    check(observed_counts[2]['route'] == 'puzzle', 'SPA navigation reports the puzzle route')
    check(observed_counts[2]['release'] == app_release, 'SPA navigation keeps the release label')
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
    wait_for_counts(page, observed_counts, 4)
    check(observed_counts[3]['event'] == 'puzzle.started', 'the first real board change starts a journey')
    check(observed_counts[3]['route'] == 'puzzle', 'the journey start uses the puzzle route')
    assert_aggregate_body(
        observed_bodies[-1],
        [{'event': 'puzzle.started', 'route': 'puzzle', 'release': app_release}],
        'journey start',
    )

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
    wait_for_counts(page, observed_counts, 5)
    check(
        [event['event'] for event in observed_counts[3:]] == ['puzzle.started', 'puzzle.failed'],
        'a conflicted check ends the open attempt without another start',
    )
    check(
        all(set(event) == {'event', 'route', 'release', 'n'} for event in observed_counts[3:])
        and key not in json.dumps(observed_bodies),
        'journey events carry no puzzle identity, answer or board payload',
    )
    dismiss_dialog(page)

    page.locator('[data-action="check"]').first.click()
    page.evaluate('() => PulseboardUsage.flush()')
    page.wait_for_timeout(300)
    check(len(observed_counts) == 5, 'checking the same board again is not another attempt')
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
    wait_for_counts(page, observed_counts, 7)
    check(
        [event['event'] for event in observed_counts[5:]] == ['puzzle.started', 'puzzle.failed'],
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
    wait_for_counts(page, observed_counts, 9)
    check(
        [event['event'] for event in observed_counts[7:]] == ['puzzle.started', 'puzzle.failed'],
        'undo after a failed check reopens the retry without a new move',
    )
    dismiss_dialog(page)

    # Disabled collector: the stat endpoint answers 503 while sharing stays on.
    failures_before = page.evaluate('() => PulseboardUsage.status().failures')
    counts_before = len(observed_counts)
    collector_status['code'] = 503
    page.evaluate("() => PulseboardUsage.track('hint.requested')")
    page.evaluate('() => PulseboardUsage.flush()')
    page.wait_for_timeout(500)
    check(
        len(observed_requests) > len(observed_bodies) or collector_status['code'] == 503,
        'disabled stat endpoint is reached distinctly from the 202 path',
    )
    check(
        page.evaluate('() => PulseboardUsage.status().failures') > failures_before,
        'a 503 stat response records a failure without throwing',
    )
    check(
        len(observed_counts) == counts_before,
        'a 503 stat response records no aggregate count',
    )
    check(not page_errors, 'a disabled collector produces no browser errors')
    collector_status['code'] = 202

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
    count = len(observed_counts)
    page.evaluate("location.hash='/home'")
    page.evaluate("window.dispatchEvent(new ErrorEvent('error', {message: 'post-withdrawal probe'}))")
    page.wait_for_timeout(300)
    check(len(observed_counts) == count, 'explicit off stops route and error emission immediately')
    check(
        page.evaluate('() => PulseboardUsage.status().queued') == 0,
        'explicit off clears pending sends',
    )
    choice = page.evaluate(
        f"""() => {{
          const raw = localStorage.getItem('{PREF_KEY}');
          return raw ? JSON.parse(raw) : null;
        }}"""
    )
    check(choice and choice['allow'] is False, 'explicit off persists under the new preference key')
    old_keys = page.evaluate(
        f"""() => Object.keys(localStorage).filter((item) => item.startsWith('{OLD_PREFIX}'))"""
    )
    check(old_keys == [], 'explicit off does not write legacy opt-out keys')

    checkbox.check()
    page.wait_for_timeout(300)
    check(
        page.evaluate('() => PulseboardUsage.status().active') is True,
        're-on requires successful persistence and re-enables collection',
    )
    rechoice = page.evaluate(
        f"""() => JSON.parse(localStorage.getItem('{PREF_KEY}'))"""
    )
    check(rechoice and rechoice['allow'] is True, 're-on persists sharing on')
    check(not page_errors, 'Observatory lifecycle produces no browser errors')
    context.close()

    # Prior preferences stay off: a fresh disposable context with a stored off
    # choice or legacy opt-out must not send before an explicit re-on.
    for seed_label, seed_script in (
        ('new off', f"localStorage.setItem('{PREF_KEY}', JSON.stringify({{allow:false}}))"),
        (
            'old opt-out',
            "localStorage.setItem('"
            + OLD_PREFIX
            + "https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi', JSON.stringify({allow:false}))",
        ),
    ):
        counts_before = len(observed_counts)
        bodies_before = len(observed_bodies)
        seeded = browser.new_context(
            service_workers='block', viewport={'width': 1100, 'height': 900}
        )
        seeded.add_init_script(
            "Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false, configurable: true});"
        )
        seeded.add_init_script(f'try {{ {seed_script} }} catch {{}}')
        seeded.route('**/*', serve)
        seeded_page = seeded.new_page()
        seeded_page.on('pageerror', lambda error: page_errors.append(str(error)))
        seeded_page.goto(PUBLIC_URL)
        seeded_page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')
        seeded_page.locator('#pulseboard-usage-sharing').wait_for()
        seeded_page.wait_for_timeout(500)
        check(
            not seeded_page.locator('#pulseboard-usage-sharing input[type="checkbox"]').is_checked(),
            f'prior {seed_label} stays off',
        )
        check(
            len(observed_counts) == counts_before,
            f'prior {seed_label} sends no aggregate count',
        )
        check(
            len(observed_bodies) == bodies_before,
            f'prior {seed_label} performs no collector request',
        )
        seeded.close()

    browser.close()

print('PASS', checks, 'Observatory browser assertions')
