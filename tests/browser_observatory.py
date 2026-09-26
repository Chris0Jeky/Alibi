"""Synthetic intercepted checks for the Pulseboard SDK v3 on a 390px phone viewport.

The one-line Beta notice must sit in flow at the top of the page (pushing content down, never
overlapping game controls), and the collapsed Beta button must render inline inside the Settings
and Privacy panels only, never as a fixed pill over play. Puzzle journeys carry official ids and
numbers only.

This is NOT a real-origin storage/offline suite: it serves the last local ``dist`` build under the
public origin via Playwright routing with a fake Pulseboard collector (region hint, counts and
product endpoints), using disposable in-memory contexts only. No persistent or private profiles are
created or read. Real-origin IndexedDB, service-worker and offline acceptance lives in
``tests/browser_origin.py``.
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
COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev'
CONSENT_KEY = 'pulseboard:consent:v3:alibi'
VISIT_KEY = 'pulseboard:visit:alibi'
PHONE = {'width': 390, 'height': 844}
NO_WEBDRIVER = (
    "Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false, configurable: true});"
)
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS', label, flush=True)


if not (DIST / 'index.html').is_file():
    raise SystemExit('Run npm run build before browser_observatory.py')


class Collector:
    """Fake Pulseboard collector: records every request per endpoint."""

    def __init__(self, region):
        self.region = region
        self.requests = []
        self.counts = []
        self.events = []
        self.bodies = []

    def headers(self):
        return {
            'Access-Control-Allow-Origin': ORIGIN,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type',
            'Cache-Control': 'no-store',
            'Vary': 'Origin',
        }

    def handle(self, route, request):
        path = urlparse(request.url).path
        if request.method == 'OPTIONS':
            route.fulfill(status=204, headers=self.headers(), body='')
            return
        self.requests.append((request.method, path))
        if request.method == 'GET' and path == '/v1/consent/alibi':
            route.fulfill(
                status=200,
                headers=self.headers(),
                content_type='application/json',
                body=json.dumps({'v': 1, 'region': self.region}),
            )
            return
        if request.method == 'POST' and path in ('/v1/collect-stat/alibi', '/v1/product/alibi'):
            payload = json.loads(request.post_data or '{}')
            self.bodies.append((path, payload))
            if path.endswith('/collect-stat/alibi'):
                self.counts.extend(payload.get('counts', []))
            else:
                self.events.extend(payload.get('events', []))
            route.fulfill(
                status=202, headers=self.headers(), content_type='application/json', body='{}'
            )
            return
        route.fulfill(status=404, headers=self.headers(), body='')


def serve_with(collector, block_sdk=False):
    def serve(route, request):
        parsed = urlparse(request.url)
        if request.url.startswith(COLLECTOR):
            collector.handle(route, request)
            return
        if parsed.scheme == 'https' and f'{parsed.scheme}://{parsed.netloc}' == ORIGIN:
            relative = unquote(parsed.path).lstrip('/') or 'index.html'
            if block_sdk and relative.startswith('assets/pulseboard.'):
                route.abort()
                return
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

    return serve


def wait_until(page, predicate, label, timeout=6000):
    deadline = time.monotonic() + timeout / 1000
    while not predicate():
        if time.monotonic() >= deadline:
            raise AssertionError('Timed out: ' + label)
        page.wait_for_timeout(50)


def open_context(browser, collector, errors, init=None, block_sdk=False):
    context = browser.new_context(service_workers='block', viewport=PHONE)
    context.add_init_script(NO_WEBDRIVER)
    if init:
        context.add_init_script(init)
    context.route('**/*', serve_with(collector, block_sdk))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    return context, page


def ready(page, sdk=True):
    page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')
    if sdk:
        page.wait_for_function('()=>Boolean(window.Pulseboard)')


def goto_puzzle(page, key):
    page.evaluate("(key) => { location.hash = '/play/' + key; }", key)
    page.wait_for_function("(key) => window.AlibiDiagnostics?.getCurrent()?.key === key", arg=key)
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')
    page.locator('.main-tools [data-action="undo"]').wait_for(state='attached')


def dismiss_dialog(page):
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')


BAR_LAYOUT = """() => {
  const holder = document.querySelector('[data-pulseboard-bar]');
  const bar = holder?.querySelector('.pb-bar');
  const rect = (el) => { const r = el.getBoundingClientRect(); return {top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height}; };
  return {
    first: document.body.firstElementChild === holder,
    hidden: !!holder?.hidden,
    holder: holder ? rect(holder) : null,
    bar: bar ? rect(bar) : null,
    position: bar ? getComputedStyle(bar).position : null,
    app: rect(document.querySelector('#app')),
  };
}"""

# Every game control and the board: scrolled into view, it must not intersect the notice and the
# element under its centre must be the control itself (nothing drawn over it).
CONTROLS_CLEAR = """() => {
  const holder = document.querySelector('[data-pulseboard-bar]');
  const out = [];
  const targets = [...document.querySelectorAll('.main-tools [data-action], .play-nav button, .board-wrap, #play-back')];
  for (const el of targets) {
    el.scrollIntoView({block: 'center', inline: 'center', behavior: 'instant'});
    const r = el.getBoundingClientRect();
    const b = holder && !holder.hidden ? holder.getBoundingClientRect() : null;
    const x = r.left + Math.min(r.width / 2, 20), y = r.top + Math.min(r.height / 2, 20);
    const hit = document.elementFromPoint(x, y);
    out.push({
      control: el.dataset.action || el.id || 'board',
      overlaps: !!b && b.height > 0 && r.top < b.bottom && r.bottom > b.top && r.left < b.right && r.right > b.left,
      covered: !(hit && (hit === el || el.contains(hit))),
      coveredBy: hit && !(hit === el || el.contains(hit)) ? (hit.className || hit.tagName) : null,
    });
  }
  scrollTo({top: 0, left: 0, behavior: 'instant'});
  return out;
}"""

NO_FIXED_SDK_UI = """() => [...document.querySelectorAll('[class^="pb-"], [class*=" pb-"]')]
  .every((el) => !['fixed', 'absolute', 'sticky'].includes(getComputedStyle(el).position))"""

PILL = """() => {
  const pill = document.querySelector('.pb-pill');
  if (!pill) return null;
  const r = pill.getBoundingClientRect();
  return {
    slot: pill.parentElement?.id,
    host: pill.parentElement?.parentElement?.id,
    hostHidden: !!pill.parentElement?.hidden,
    visible: r.width > 0 && r.height > 0,
    position: getComputedStyle(pill).position,
    height: r.height,
    fallbackShown: [...document.querySelectorAll('.usage-fallback')].some((p) => p.getClientRects().length > 0),
  };
}"""


def assert_controls_clear(page, label):
    result = page.evaluate(CONTROLS_CLEAR)
    names = {entry['control'] for entry in result}
    check({'undo', 'redo', 'hint', 'check', 'back-to-collection'} <= names, f'{label}: Undo, Redo, Hint, Check and the phone tool bar are measured')
    bad = [entry for entry in result if entry['overlaps'] or entry['covered']]
    check(not bad, f'{label}: no game control or the board is overlapped or covered {bad!r}')
    check(page.evaluate(NO_FIXED_SDK_UI), f'{label}: no Pulseboard element is fixed or absolute')


def assert_bar_in_flow(page, label):
    layout = page.evaluate(BAR_LAYOUT)
    check(layout['first'], f'{label}: the notice space is the first element of <body>')
    check(layout['bar'] is not None and layout['bar']['height'] > 0, f'{label}: the Beta notice shows')
    check(layout['position'] in ('static', 'relative'), f'{label}: the notice is in flow')
    check(
        layout['holder']['height'] >= layout['bar']['height'] - 0.5,
        f'{label}: the reserved space grows with the wrapped notice',
    )
    check(
        layout['app']['top'] >= layout['holder']['bottom'] - 0.5,
        f'{label}: the notice pushes the game down instead of overlapping it',
    )


errors = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)

    # ---- EEA visitor: counts only until OK; the notice is in flow; the pill lives in Settings ----
    eea = Collector('eea')
    context, page = open_context(browser, eea, errors)
    page.goto(PUBLIC_URL)
    ready(page)
    release = page.evaluate('() => ALIBI_CONFIG.version')
    check(page.evaluate('() => Pulseboard.version') == '3.1.0', 'the page loads Pulseboard SDK 3.1.0')
    check(
        page.locator('script[src^="./assets/pulseboard."]').count() == 1,
        'the page loads exactly one hashed SDK asset',
    )
    page.locator('[data-pulseboard-bar] .pb-bar').wait_for(state='visible')
    text = page.locator('.pb-bar').inner_text()
    check('Beta' in text and 'thanks for helping test Alibi' in text, 'the owner-approved notice text shows')
    assert_bar_in_flow(page, 'home at 390px')
    check(page.locator('.pb-pill').count() == 0, 'no Beta button before a choice')
    wait_until(page, lambda: any(c['event'] == 'page.view' for c in eea.counts), 'EEA page.view count')
    check(eea.counts[0] == {'event': 'page.view', 'route': 'home', 'release': release, 'n': 1}, 'EEA counts carry the registered release')
    check(not eea.events, 'EEA sends no diagnostics or journeys before OK')
    check(page.evaluate(f"() => localStorage.getItem('{VISIT_KEY}')") is None, 'EEA stores no visit marker before OK')

    key = page.evaluate(
        """() => {
          const puzzle = ALIBI_CATALOG.puzzles.find((candidate) => candidate.type === 'sudoku');
          return puzzle.id + '@' + puzzle.revision;
        }"""
    )
    puzzle_id = key.split('@')[0]
    goto_puzzle(page, key)
    assert_bar_in_flow(page, 'puzzle at 390px')
    assert_controls_clear(page, 'puzzle with the notice showing')
    wait_until(page, lambda: any(c['route'] == 'puzzle' for c in eea.counts), 'puzzle page.view count')

    page.locator('.pb-bar .pb-choose').click()
    page.locator('.pb-bar .pb-switches').wait_for(state='visible')
    assert_bar_in_flow(page, 'puzzle with Choose open')
    assert_controls_clear(page, 'puzzle with the switches open')

    page.locator('.pb-bar .pb-ok').click()
    page.wait_for_function("() => !document.querySelector('.pb-bar')")
    layout = page.evaluate(BAR_LAYOUT)
    check(layout['hidden'] and layout['holder']['height'] == 0, 'OK releases the reserved space')
    pill = page.evaluate(PILL)
    check(pill and pill['slot'] == 'pulseboard-slot' and pill['hostHidden'], 'on a puzzle the Beta button is parked hidden in its slot')
    check(not pill['visible'], 'no Beta button is visible over play')
    assert_controls_clear(page, 'puzzle after OK')
    stored = page.evaluate(f"() => JSON.parse(localStorage.getItem('{CONSENT_KEY}'))")
    check(stored['counts'] and stored['diagnostics'] and stored['journeys'] and stored['decided'], 'OK records every category on')

    # A bounded journey: one move opens an attempt, a conflicted check fails it, a hint is numbered.
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
    page.locator('.main-tools [data-action="check"]').click()
    dismiss_dialog(page)
    page.locator('.main-tools [data-action="hint"]').click()
    dismiss_dialog(page)

    def journey():
        return [e for e in eea.events if e['name'] in ('puzzle.started', 'puzzle.failed', 'hint.requested')]

    wait_until(page, lambda: len(journey()) >= 3, 'journey events')
    started, failed, hint = journey()[:3]
    check(started['name'] == 'puzzle.started' and started['props'] == {'puzzle': puzzle_id}, 'puzzle.started carries only the puzzle id')
    check(
        failed['name'] == 'puzzle.failed'
        and set(failed['props']) == {'puzzle', 'seconds', 'attempts'}
        and failed['props']['puzzle'] == puzzle_id
        and failed['props']['attempts'] == 1
        and isinstance(failed['props']['seconds'], int),
        'puzzle.failed carries the id, whole seconds and the attempt number',
    )
    check(hint['name'] == 'hint.requested' and hint['props'] == {'puzzle': puzzle_id, 'hint': 1}, 'hint.requested carries the id and hint index')
    check(all(e['route'] == 'puzzle' for e in journey()), 'journey events carry the puzzle route')
    wait_until(
        page,
        lambda: {'puzzle.started', 'puzzle.failed', 'hint.requested'} <= {c['event'] for c in eea.counts},
        'journey counts',
    )
    raw = json.dumps([b for _, b in eea.bodies])
    check('"solution"' not in raw and '"cells"' not in raw and '"state"' not in raw, 'no answer or board leaves the page')
    product = [b for p, b in eea.bodies if p.endswith('/product/alibi')]
    check(all(set(b) == {'v', 'session', 'release', 'context', 'events'} and b['release'] == release for b in product), 'product batches carry the release and no extra keys')

    # Settings and Privacy: the Beta button renders inline in the panel, never fixed.
    page.evaluate("location.hash='/settings'")
    page.locator('#usage-sharing-slot .pb-pill').wait_for(state='visible')
    pill = page.evaluate(PILL)
    check(pill['host'] == 'usage-sharing-slot' and not pill['hostHidden'], 'Settings shows the Beta button in its panel')
    check(pill['position'] == 'static', 'the Settings Beta button is inline, not fixed')
    check(pill['height'] >= 44, 'the Beta button meets the 44px touch target')
    check(not pill['fallbackShown'], 'the fallback line hides once the button shows')
    page.locator('#usage-sharing-slot .pb-pill').click()
    page.locator('#usage-sharing-slot .pb-panel').wait_for(state='visible')
    check(page.evaluate(NO_FIXED_SDK_UI), 'the switches open inline in Settings')
    page.locator('#usage-sharing-slot .pb-panel .pb-off').click()
    stored = page.evaluate(f"() => JSON.parse(localStorage.getItem('{CONSENT_KEY}'))")
    check(not stored['counts'] and not stored['diagnostics'] and not stored['journeys'], 'Turn all off records every category off')
    check(page.evaluate(f"() => localStorage.getItem('{VISIT_KEY}')") is None, 'Turn all off clears the visit marker')
    page.wait_for_timeout(2500)
    before = len(eea.requests)
    page.evaluate("location.hash='/home'")
    page.wait_for_timeout(2500)
    check(len(eea.requests) == before, 'nothing is sent after Turn all off')

    page.evaluate("location.hash='/privacy'")
    page.locator('.privacy-copy #usage-sharing-slot .pb-pill').wait_for(state='visible')
    check(page.evaluate(PILL)['position'] == 'static', 'Privacy shows the Beta button inline')
    copy = page.locator('.privacy-copy').inner_text()
    for phrase in ('Usage counts', 'Diagnostics', 'Journeys', 'EEA', 'Global Privacy Control', 'Do Not Track', '90 days', 'currently 14 days'):
        check(phrase in copy, f'Privacy describes {phrase}')
    check(not errors, 'the EEA journey produces no page errors')
    context.close()

    # ---- Visitor outside the EEA, landing on a puzzle: everything on, notice still in flow ----
    other = Collector('other')
    context, page = open_context(browser, other, errors)
    page.goto(PUBLIC_URL + '#/play/' + key)
    ready(page)
    page.wait_for_function("(key) => window.AlibiDiagnostics?.getCurrent()?.key === key", arg=key)
    dismiss_dialog(page)
    page.locator('[data-pulseboard-bar] .pb-bar').wait_for(state='visible')
    assert_bar_in_flow(page, 'deep-linked puzzle')
    assert_controls_clear(page, 'deep-linked puzzle with the notice showing')
    wait_until(page, lambda: any(e['name'] == 'page.view' for e in other.events), 'journey page.view outside the EEA')
    wait_until(page, lambda: any(c['route'] == 'puzzle' for c in other.counts), 'deep link names its route')
    check(not any(c['route'] == 'home' for c in other.counts), 'a deep link records no extra home view')
    check(any(e['name'] == 'page.view' and e['route'] == 'puzzle' for e in other.events), 'journeys start on outside the EEA with the real route')
    check(not errors, 'the non-EEA visit produces no page errors')
    context.close()

    # ---- Global Privacy Control: silent, no notice, no request, the button still in Settings ----
    gpc = Collector('other')
    context, page = open_context(
        browser, gpc, errors,
        init="Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {get: () => true, configurable: true});",
    )
    page.goto(PUBLIC_URL)
    ready(page)
    page.wait_for_timeout(2500)
    check(not gpc.requests, 'GPC: no request of any kind')
    check(page.locator('.pb-bar').count() == 0, 'GPC: no notice')
    check(page.evaluate(BAR_LAYOUT)['hidden'], 'GPC: the reserved space is released')
    page.evaluate("location.hash='/settings'")
    page.locator('#usage-sharing-slot .pb-pill').wait_for(state='visible')
    check(page.evaluate(PILL)['position'] == 'static', 'GPC: the Beta button is inline in Settings')
    page.locator('#usage-sharing-slot .pb-pill').click()
    check(page.locator('#usage-sharing-slot .pb-check:disabled').count() == 3, 'GPC: the switches are disabled')
    check(not gpc.requests, 'GPC: still no request after navigation')
    context.close()

    # ---- SDK blocked or offline: the game is unchanged and the reserved space is released ----
    blocked = Collector('other')
    context, page = open_context(browser, blocked, errors, block_sdk=True)
    page.goto(PUBLIC_URL)
    ready(page, sdk=False)
    page.wait_for_function("() => document.querySelector('[data-pulseboard-bar]').hidden")
    check(page.evaluate('() => window.Pulseboard === undefined'), 'blocked: window.Pulseboard is undefined')
    goto_puzzle(page, key)
    page.locator(f'#cell-{editable["index"]}').click()
    page.keyboard.press(str(editable['value']))
    page.wait_for_function(
        "(entry) => AlibiDiagnostics.getCurrent().state.cells[entry.index] === entry.value",
        arg=editable,
    )
    page.locator('.main-tools [data-action="check"]').click()
    dismiss_dialog(page)
    assert_controls_clear(page, 'blocked SDK')
    page.evaluate("location.hash='/settings'")
    page.locator('#usage-sharing-slot .usage-fallback').wait_for(state='visible')
    check(not blocked.requests, 'blocked: nothing reaches the collector')
    check(not errors, 'a blocked SDK produces no page errors')
    context.close()

    browser.close()

print('PASS', checks, 'Pulseboard SDK browser assertions')
