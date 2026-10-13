"""Voices: feedback, the taste survey and puzzle ratings against an intercepted collector.

Serves the last local ``dist`` build under the primary origin through Playwright routing (plus one
ineligible origin), with a fake Pulseboard collector that records every /v1/feedback and /v1/survey
request. Proves the client half of the Voices contract (Pulseboard ``pulseboard.feedback/1`` and
``pulseboard.survey/1``): exact payload shapes, nothing sent without a player action, the offline
queue flushing on reconnect, survey resubmission with the same survey key, rating taps and changes,
the Settings and Privacy panels, the ineligible-origin export fallback and the sheet at 320px, 390px
and desktop. Disposable in-memory contexts only; the Pulseboard SDK script is blocked so its own
consent traffic never mixes with Voices. Screenshots go to tests/screenshots/ (ignored).

This is NOT a live collector test and NOT a real-origin service-worker suite
(``tests/browser_origin.py`` covers the precached shell).
"""

import json
import mimetypes
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = (ROOT / 'dist').resolve()
SHOTS = ROOT / 'tests' / 'screenshots'
ORIGIN = 'https://alibi-after-hours-preview.commit-atlas.workers.dev'
FALLBACK = 'https://alibi-fallback.example'
COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev'
QUEUE = 'alibi:voices:queue:v1'
KEY = 'alibi:voices:respondent:v1'
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
PHONE = {'width': 390, 'height': 844}
NARROW = {'width': 320, 'height': 640}
DESKTOP = {'width': 1280, 'height': 900}
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
    raise SystemExit('Run npm run build before browser_voices.py')
SHOTS.mkdir(parents=True, exist_ok=True)


class Collector:
    """Fake collector for the Voices routes: 202 with the contract's bodies, or a network error."""

    def __init__(self):
        self.requests = []
        self.down = False
        self.refuse = False

    def handle(self, route, request):
        path = urlparse(request.url).path
        cors = {
            'Access-Control-Allow-Origin': ORIGIN,
            'Access-Control-Allow-Methods': 'POST, PUT',
            'Access-Control-Allow-Headers': 'content-type',
            'Vary': 'Origin',
        }
        if request.method == 'OPTIONS':
            route.fulfill(status=204, headers=cors, body='')
            return
        if self.down:
            route.abort('internetdisconnected')
            return
        body = json.loads(request.post_data or 'null')
        self.requests.append(
            {'method': request.method, 'path': path, 'body': body, 'headers': request.headers}
        )
        if self.refuse:
            route.fulfill(status=400, headers=cors, content_type='application/json', body='{"error":"contract"}')
            return
        reply = {'accepted': True, 'duplicate': False} if 'feedback' in path else {'accepted': True, 'updated': False}
        route.fulfill(status=202, headers=cors, content_type='application/json', body=json.dumps(reply))

    def voices(self):
        return [r for r in self.requests if r['path'].startswith(('/v1/feedback/', '/v1/survey/'))]


def serve_with(collector, origin=ORIGIN):
    def serve(route, request):
        parsed = urlparse(request.url)
        if request.url.startswith(COLLECTOR):
            collector.handle(route, request)
            return
        if f'{parsed.scheme}://{parsed.netloc}' == origin:
            relative = unquote(parsed.path).lstrip('/') or 'index.html'
            if relative.startswith('assets/pulseboard.'):
                route.abort()
                return
            filename = (DIST / relative).resolve()
            if DIST not in filename.parents or not filename.is_file():
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


def open_context(browser, collector, errors, viewport=PHONE, origin=ORIGIN, init=None):
    context = browser.new_context(service_workers='block', viewport=viewport)
    context.add_init_script(NO_WEBDRIVER)
    if init:
        context.add_init_script(init)
    context.route('**/*', serve_with(collector, origin))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(origin + '/#/home')
    page.wait_for_function('()=>Boolean(window.AlibiDiagnostics)')
    return context, page


def wait_for(page, predicate, label, timeout=8000):
    waited = 0
    while not predicate():
        if waited >= timeout:
            raise AssertionError('Timed out: ' + label)
        page.wait_for_timeout(50)
        waited += 50


def dismiss(page):
    for _ in range(3):
        if page.locator('#dialog[open]').count():
            page.keyboard.press('Escape')
            page.wait_for_timeout(100)


def goto_puzzle(page, key):
    page.evaluate("(key) => { location.hash = '/play/' + key; }", key)
    page.wait_for_function("(key) => window.AlibiDiagnostics?.getCurrent()?.key === key", arg=key)
    page.locator('.main-tools [data-action="undo"]').wait_for(state='attached')
    dismiss(page)


def solve_sudoku(page, key):
    goto_puzzle(page, key)
    cells = page.evaluate(
        """() => { const r = AlibiDiagnostics.getCurrent();
          return r.puzzle.givens.map((g, i) => g ? null : [i, r.puzzle.solution[i]]).filter(Boolean); }"""
    )
    for index, value in cells:
        page.locator(f'#cell-{index}').click()
        page.keyboard.press(str(value))
    page.wait_for_function('() => !!AlibiDiagnostics.getCurrent().completedAt')
    dismiss(page)


def sheet_open(page):
    return page.evaluate("() => !!document.querySelector('dialog.vo-sheet')?.open")


def focus_inside_sheet(page):
    return page.evaluate("() => !!document.activeElement?.closest('dialog.vo-sheet')")


def target_sizes(page, selector):
    return page.evaluate(
        """(sel) => [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length)
          .map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })""",
        selector,
    )


def fits(page):
    return page.evaluate(
        """() => { const d = document.querySelector('dialog.vo-sheet'); const r = d.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth + 0.5 && document.documentElement.scrollWidth <= innerWidth; }"""
    )


def close_sheet(page):
    """Escape, then wait for the close event to hand focus back to the page."""
    page.keyboard.press('Escape')
    page.wait_for_function(
        "() => !document.querySelector('dialog.vo-sheet')?.open && !document.activeElement?.closest('dialog.vo-sheet')"
    )


def type_message(page, text):
    page.locator('#vo-text').fill(text)
    page.locator('#vo-text').dispatch_event('input')


def local(page, key):
    return page.evaluate('(k) => JSON.parse(localStorage.getItem(k))', key)


FEEDBACK_KEYS = ['v', 'id', 'release', 'kind', 'route', 'subject', 'text', 'written', 'context']
SURVEY_KEYS = ['v', 'survey', 'subject', 'respondent', 'release', 'answers', 'meta', 'comment', 'context']

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    errors = []

    # ---- Phone, primary origin -------------------------------------------------------------
    collector = Collector()
    context, page = open_context(browser, collector, errors)
    release = page.evaluate('() => ALIBI_CONFIG.version')
    page.wait_for_timeout(2500)
    check(not collector.voices(), 'nothing is sent on load')
    check(
        page.evaluate("() => Object.keys(localStorage).filter((k) => k.startsWith('alibi:voices:')).length") == 0,
        'no Voices storage exists before a player action',
    )
    check(page.locator('script[src*="/assets/voices."]').count() == 0, 'the sheet chunk is not loaded on start')
    button = page.locator('.top-actions #vo-open')
    check(button.count() == 1 and button.get_attribute('aria-label') == 'Feedback', 'a quiet Feedback control sits in the top bar')
    check(target_sizes(page, '#vo-open') == [[44, 44]], 'the Feedback control is a 44px target')
    page.screenshot(path=str(SHOTS / 'voices-home-390.png'))

    button.click()
    page.wait_for_function("() => document.querySelector('dialog.vo-sheet')?.open")
    check(page.locator('dialog.vo-sheet').get_attribute('aria-labelledby') == 'vo-title', 'the sheet is a labelled modal dialog')
    check(page.evaluate("() => document.activeElement?.id") == 'vo-title', 'focus moves to the sheet title')
    check(page.locator('#vo-text').get_attribute('maxlength') == '2000', 'the message is bounded at 2,000 characters')
    check(page.locator('label[for="vo-text"]').count() == 1, 'the message box has a label')
    attached = page.locator('#vo-attached').inner_text()
    check(release in attached and 'home' in attached and 'mobile' in attached and 'e-mail' in attached, 'the sheet says what is attached')
    check(all(h >= 44 for _, h in target_sizes(page, 'dialog.vo-sheet button, dialog.vo-sheet .chips label')), 'sheet targets are at least 44px tall')
    check(fits(page), 'the sheet fits a 390px screen')
    for _ in range(14):
        page.keyboard.press('Tab')
        assert focus_inside_sheet(page), 'Tab left the sheet'
    check(focus_inside_sheet(page), 'Tab wraps inside the sheet')
    page.keyboard.press('Shift+Tab')
    check(focus_inside_sheet(page), 'Shift+Tab stays inside the sheet')
    page.screenshot(path=str(SHOTS / 'voices-sheet-390.png'))
    close_sheet(page)
    check(page.evaluate("() => document.activeElement?.id") == 'vo-open', 'Escape closes and focus returns to Feedback')

    button.click()
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    check(page.locator('.vo-error').inner_text() == 'Write a message first.', 'an empty message is not sent')
    check(page.evaluate("() => document.activeElement?.id") == 'vo-text', 'focus moves to the empty message')
    page.locator('dialog.vo-sheet label:has(input[value="idea"])').click()
    type_message(page, 'More tidal bridges please.\u0007\nThanks!')
    check(
        page.locator('#vo-count').inner_text()
        == page.evaluate("() => document.querySelector('#vo-text').value.length") .__str__() + ' of 2,000 characters',
        'the counter follows the text',
    )
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    wait_for(page, lambda: len(collector.voices()) == 1, 'feedback request')
    sent = collector.voices()[0]
    body = sent['body']
    check(sent['method'] == 'POST' and sent['path'] == '/v1/feedback/alibi', 'feedback is a POST to /v1/feedback/alibi')
    check(sent['headers'].get('content-type') == 'application/json', 'feedback is sent as application/json')
    check(sent['headers'].get('origin') == ORIGIN, 'the request carries the primary Origin')
    check('cookie' not in sent['headers'] and 'referer' not in sent['headers'], 'no cookie or referrer is sent')
    check(list(body) == FEEDBACK_KEYS, 'the feedback payload has exactly the contract keys, in order')
    check(body['v'] == 1 and UUID.match(body['id']), 'v is 1 and id is a UUID v4')
    check(body['release'] == release, 'release is the app version')
    check(body['kind'] == 'idea' and body['route'] == 'home' and body['subject'] == '', 'kind, route and subject follow the screen')
    check(body['text'] == 'More tidal bridges please. \nThanks!', 'control characters become spaces; newlines stay')
    check(body['written'] == datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'written is the UTC day of Send')
    check(body['context'] == {'device': 'mobile'}, 'context is exactly the device class')
    page.locator('#vo-title', has_text='Thank you.').wait_for()
    check('was sent' in page.locator('dialog.vo-sheet').inner_text(), 'the sheet confirms the message was sent')
    check(local(page, QUEUE) is None, 'an accepted message leaves no queue')
    check(local(page, KEY) is None, 'feedback creates no survey key')
    page.keyboard.press('Escape')

    # ---- Offline: queued, confirmed, then flushed on reconnect ----
    context.set_offline(True)
    button.click()
    type_message(page, 'Written on the train.')
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    page.locator('#vo-title', has_text='Thank you.').wait_for()
    check("offline" in page.locator('dialog.vo-sheet').inner_text(), 'offline Send confirms it is saved and will send later')
    check(len(collector.voices()) == 1, 'nothing is attempted while offline')
    queued = local(page, QUEUE)
    check(
        len(queued) == 1 and set(queued[0]) == {'payload', 'attempts', 'next', 'queued'} and queued[0]['attempts'] == 0,
        'the queue holds the exact payload with attempts and next-try time',
    )
    check(list(queued[0]['payload']) == FEEDBACK_KEYS and queued[0]['payload']['text'] == 'Written on the train.', 'the queued item is the exact payload')
    page.keyboard.press('Escape')
    page.evaluate("location.hash='/settings'")
    page.locator('#vo-panel h2').wait_for()
    check('1 message waiting to send' in page.locator('#vo-panel').inner_text(), 'Settings shows the waiting message')
    context.set_offline(False)
    wait_for(page, lambda: len(collector.voices()) == 2, 'flush on reconnect')
    check(collector.voices()[1]['body'] == queued[0]['payload'], 'reconnecting sends the queued payload unchanged')
    wait_for(page, lambda: local(page, QUEUE) is None, 'queue drained')
    check(True, 'the queue is empty after the flush')

    # Delete from Settings: queue one offline, then delete it; nothing is ever sent.
    context.set_offline(True)
    page.locator('#vo-send').click()
    type_message(page, 'Please delete me.')
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    page.locator('#vo-title', has_text='Thank you.').wait_for()
    page.keyboard.press('Escape')
    page.locator('#vo-delete').wait_for()
    page.locator('#vo-delete').click()
    check(local(page, QUEUE) is None and page.locator('#vo-delete').count() == 0, 'Delete removes waiting messages')
    check(page.evaluate("() => document.activeElement?.id") == 'vo-send', 'focus moves to Send feedback after Delete')
    context.set_offline(False)
    page.wait_for_timeout(600)
    check(len(collector.voices()) == 2, 'a deleted message is never sent')
    page.screenshot(path=str(SHOTS / 'voices-settings-390.png'), full_page=False)
    page.locator('#vo-panel').scroll_into_view_if_needed()
    page.locator('#vo-panel').screenshot(path=str(SHOTS / 'voices-settings-panel-390.png'))

    # ---- Report a problem, then the rating row on the completion screen ----
    key = 'curated-sudoku-01@1'
    goto_puzzle(page, key)
    check(page.locator('#vo-rate').count() == 0 and page.locator('#vo-offer').count() == 0, 'no rating or survey mid-puzzle')
    report = page.locator('.play-secondary #vo-report')
    check(report.inner_text().strip() == 'Report a problem with this puzzle', 'the puzzle screen offers Report a problem')
    empty = page.evaluate("() => AlibiDiagnostics.getCurrent().puzzle.givens.findIndex((g) => !g)")
    page.locator(f'#cell-{empty}').click()
    board = page.evaluate("() => JSON.stringify(AlibiDiagnostics.getCurrent().state)")
    report.click()
    page.wait_for_function("() => document.querySelector('dialog.vo-sheet')?.open")
    check(page.locator('dialog.vo-sheet input[value="puzzle"]').is_checked(), 'Report pre-selects the puzzle kind')
    check('curated-sudoku-01' in page.locator('#vo-attached').inner_text(), 'the puzzle id is named as attached')
    page.locator('dialog.vo-sheet legend').click()
    page.keyboard.press('3')
    page.keyboard.press('Control+z')
    check(focus_inside_sheet(page), 'clicking text in the sheet keeps focus in the sheet')
    check(
        page.evaluate("() => JSON.stringify(AlibiDiagnostics.getCurrent().state)") == board,
        'keys pressed in the sheet never reach the board behind it',
    )
    type_message(page, 'The second row looks odd.')
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    wait_for(page, lambda: len(collector.voices()) == 3, 'report request')
    report_body = collector.voices()[2]['body']
    check(
        report_body['kind'] == 'puzzle' and report_body['route'] == 'puzzle' and report_body['subject'] == 'curated-sudoku-01',
        'a report carries kind puzzle, route puzzle and the official id',
    )
    page.locator('#vo-title', has_text='Thank you.').wait_for()
    close_sheet(page)
    check(page.evaluate("() => document.activeElement?.id") == 'vo-report', 'focus returns to Report a problem')

    solve_sudoku(page, key)
    page.locator('#vo-rate button').first.wait_for()
    row = page.locator('#vo-rate')
    check(row.get_attribute('role') == 'group' and 'How was it?' in row.inner_text(), 'the completion screen shows the rating row')
    check([b.inner_text().strip() for b in row.locator('button').all()] == ['Too easy', 'Just right', 'Too hard', 'More like this'], 'three difficulties and More like this')
    check(all(h >= 44 for _, h in target_sizes(page, '#vo-rate button')), 'rating targets are at least 44px tall')
    check(page.locator('#vo-offer').count() == 0, 'no survey invitation after a single completion')
    page.wait_for_timeout(500)
    before = len(collector.voices())
    check(before == 3, 'showing the rating row sends nothing')
    row.locator('button', has_text='Just right').click()
    wait_for(page, lambda: len(collector.voices()) == 4, 'rating request')
    rating = collector.voices()[3]
    rb = rating['body']
    check(rating['method'] == 'PUT' and rating['path'] == '/v1/survey/alibi', 'a rating is a PUT to /v1/survey/alibi')
    check(list(rb) == SURVEY_KEYS, 'the rating payload has exactly the contract keys')
    check(
        rb['survey'] == 'puzzle-rating' and rb['subject'] == 'curated-sudoku-01' and rb['answers'] == {'difficulty': 'just-right'},
        'the rating names the puzzle and the difficulty',
    )
    check(rb['meta'] == {'family': 'sudoku', 'tier': 'gentle'} and rb['comment'] == '', 'meta is the family and lower-cased tier; no comment')
    check(UUID.match(rb['respondent']) and local(page, KEY) == rb['respondent'], 'the first rating creates the survey key')
    check(row.locator('button', has_text='Just right').get_attribute('aria-pressed') == 'true', 'the chosen difficulty is pressed')
    page.locator('#vo-rate [role=status]', has_text='Thanks, sent.').wait_for()
    row.locator('button', has_text='More like this').click()
    wait_for(page, lambda: len(collector.voices()) == 5, 'heart request')
    check(collector.voices()[4]['body']['answers'] == {'difficulty': 'just-right', 'more': 'yes'}, 'More like this re-sends with more: yes')
    row.locator('button', has_text='Too hard').click()
    wait_for(page, lambda: len(collector.voices()) == 6, 'changed rating request')
    changed = collector.voices()[5]['body']
    check(changed['answers'] == {'difficulty': 'too-hard', 'more': 'yes'} and changed['respondent'] == rb['respondent'], 'changing the rating re-sends with the same key')
    row.locator('button', has_text='Too hard').click()
    page.wait_for_timeout(400)
    check(len(collector.voices()) == 6, 'tapping the same choice again sends nothing')
    row.screenshot(path=str(SHOTS / 'voices-rating-390.png'))
    page.locator('.play-end').screenshot(path=str(SHOTS / 'voices-completion-390.png'))

    # ---- The taste survey from Settings: submit, then resubmit with the same key ----
    page.evaluate("location.hash='/settings'")
    page.locator('#vo-survey').click()
    page.wait_for_function("() => document.querySelector('dialog.vo-sheet')?.open")
    check(page.locator('dialog.vo-sheet fieldset').count() == 7, 'the survey asks its seven questions')
    check(fits(page), 'the survey fits a 390px screen')
    page.screenshot(path=str(SHOTS / 'voices-survey-390.png'))
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    check('How often do you play?' in page.locator('.vo-error').inner_text(), 'a required answer is asked for')
    check(len(collector.voices()) == 6, 'an incomplete survey is not sent')
    page.locator('dialog.vo-sheet label:has(input[name="often"][value="weekly"])').click()
    page.locator('dialog.vo-sheet label:has(input[name="difficulty"][value="mostly-right"])').click()
    for family in ('sudoku', 'scene', 'bridges', 'trail', 'duel'):
        page.locator(f'dialog.vo-sheet label:has(input[name="more"][value="{family}"])').click()
    page.locator('dialog.vo-sheet label:has(input[name="more"][value="castle"])').click()
    check(page.locator('dialog.vo-sheet input[name="more"]:checked').count() == 5, 'more takes at most five choices')
    check('Choose up to 5.' in page.locator('.vo-error').inner_text(), 'the limit is explained')
    page.locator('#vo-comment').fill('Lovely rainy-day puzzles.')
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    wait_for(page, lambda: len(collector.voices()) == 7, 'survey request')
    first = collector.voices()[6]['body']
    check(list(first) == SURVEY_KEYS and first['survey'] == 'alibi-taste-1' and first['subject'] == '' and first['meta'] == {}, 'the survey payload has the contract shape')
    check(
        first['answers'] == {'often': 'weekly', 'more': ['bridges', 'scene', 'sudoku', 'trail', 'duel'], 'difficulty': 'mostly-right'},
        'answers are in registry order with unanswered questions omitted',
    )
    check(first['comment'] == 'Lovely rainy-day puzzles.', 'the optional comment is sent')
    check(first['respondent'] == rb['respondent'], 'surveys and ratings share the survey key')
    page.locator('#vo-title', has_text='Thank you.').wait_for()
    page.keyboard.press('Escape')
    page.locator('#vo-survey', has_text='Update survey answers').wait_for()
    page.locator('#vo-survey').click()
    check(page.locator('dialog.vo-sheet input[name="often"][value="weekly"]').is_checked(), 'the form pre-fills the last answers')
    check(page.locator('#vo-comment').input_value() == 'Lovely rainy-day puzzles.', 'the comment is pre-filled too')
    page.locator('dialog.vo-sheet label:has(input[name="difficulty"][value="too-hard"])').click()
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    wait_for(page, lambda: len(collector.voices()) == 8, 'resubmitted survey')
    second = collector.voices()[7]['body']
    check(second['respondent'] == first['respondent'], 'resubmitting sends the same respondent key')
    check(second['answers']['difficulty'] == 'too-hard', 'the resubmission carries the updated answer')
    page.keyboard.press('Escape')

    # Settings switch hides the rating row.
    page.locator('#vo-hide').uncheck()
    goto_puzzle(page, key)
    page.wait_for_timeout(300)
    check(page.locator('.play-end').count() == 1 and page.locator('#vo-rate').count() == 0, 'the Settings switch hides the rating row')
    page.evaluate("location.hash='/settings'")
    page.locator('#vo-hide').check()

    # Privacy explains Voices and resets the survey key.
    page.evaluate("location.hash='/privacy'")
    page.locator('#vo-privacy h2').wait_for()
    copy = page.locator('.privacy-copy').inner_text()
    for phrase in ('Nothing is sent unless you press Send', 'survey key', 'one-way hash', '365 days', '400 days', 'Global Privacy Control', 'up to 20 items', '30 days'):
        check(phrase in copy, f'Privacy explains: {phrase}')
    old_key = local(page, KEY)
    page.evaluate("""key => {
        window.__voiceRemove = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(name) {
            if (name === key) throw new DOMException('Refused', 'SecurityError');
            return window.__voiceRemove.call(this, name);
        };
    }""", KEY)
    try:
        page.locator('#vo-reset').click()
        check(page.locator('#vo-reset-status').inner_text() == 'Reset failed on this device. Try again.', 'failed key removal reports failure')
        check(local(page, KEY) == old_key, 'failed reset retains the stored survey key')
    finally:
        page.evaluate('Storage.prototype.removeItem = window.__voiceRemove; delete window.__voiceRemove')
    page.locator('#vo-reset').click()
    check(local(page, KEY) is None, 'Reset removes the survey key')
    check(page.evaluate("() => document.activeElement?.id") == 'vo-reset-status', 'focus moves to the reset confirmation')
    page.evaluate("location.hash='/settings'")
    page.locator('#vo-survey').click()
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    wait_for(page, lambda: len(collector.voices()) == 9, 'survey after reset')
    check(collector.voices()[8]['body']['respondent'] != first['respondent'], 'after Reset a new survey key is created')
    page.keyboard.press('Escape')
    check(all(r['path'] in ('/v1/feedback/alibi', '/v1/survey/alibi') for r in collector.requests), 'only the Voices routes were called')
    check(not errors, 'the phone journey produces no page errors')
    context.close()

    # ---- Survey invitation timing: five official completions on two days ----
    collector = Collector()
    context, page = open_context(browser, collector, errors)
    page.clock.set_fixed_time(datetime(2026, 9, 20, 10, tzinfo=timezone.utc))
    for n in (1, 5, 9, 13):
        solve_sudoku(page, f'curated-sudoku-{n:02d}@1')
        check(page.locator('#vo-offer').count() == 0, f'no invitation after completion on day one ({n})')
    page.clock.set_fixed_time(datetime(2026, 9, 21, 10, tzinfo=timezone.utc))
    solve_sudoku(page, 'sudoku-01@1')
    page.locator('#vo-offer').wait_for()
    offer = page.locator('#vo-offer').inner_text()
    check('Got a minute?' in offer and 'Nothing is sent until you submit' in offer, 'the fifth completion on a second day invites the survey')
    check(page.evaluate("() => !document.querySelector('.vo-sheet')?.open"), 'the invitation is inline, never a dialog over the board')
    page.locator('.play-end').screenshot(path=str(SHOTS / 'voices-invitation-390.png'))
    check(not collector.voices(), 'the invitation sends nothing')
    page.locator('#vo-offer button', has_text='Not now').click()
    check(page.locator('#vo-offer').count() == 0, 'Not now removes the invitation')
    state = local(page, 'alibi:voices:state:v1')
    check(state['snoozes'] == 1 and state['until'] - page.evaluate('Date.now()') == 7 * 864e5, 'Not now snoozes for 7 days')
    goto_puzzle(page, 'sudoku-01@1')
    check(page.locator('#vo-offer').count() == 0, 'a snoozed invitation stays away')
    page.clock.set_fixed_time(datetime(2026, 9, 29, 10, tzinfo=timezone.utc))
    goto_puzzle(page, 'curated-sudoku-05@1')
    page.locator('#vo-offer').wait_for()
    page.locator('#vo-offer button', has_text='Don’t ask again').click()
    goto_puzzle(page, 'curated-sudoku-01@1')
    page.wait_for_timeout(300)
    check(page.locator('#vo-offer').count() == 0, 'Don’t ask again stops invitations')
    check(not collector.voices(), 'invitation choices send nothing')
    check(not errors, 'the invitation journey produces no page errors')
    context.close()

    # ---- Global Privacy Control does not block an explicit Send ----
    collector = Collector()
    context, page = open_context(
        browser, collector, errors,
        init="Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {get: () => true, configurable: true});",
    )
    page.locator('#vo-open').click()
    type_message(page, 'Sent with GPC on.')
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    wait_for(page, lambda: len(collector.voices()) == 1, 'GPC send')
    check(collector.voices()[0]['body']['text'] == 'Sent with GPC on.', 'GPC does not block an explicit Send')
    page.locator('#vo-title', has_text='Thank you.').wait_for()
    close_sheet(page)

    # A 400 is dropped with a local note, and the player is told it was not sent.
    collector.refuse = True
    page.locator('#vo-open').click()
    type_message(page, 'This one is refused.')
    page.locator('dialog.vo-sheet button.btn:not(.secondary)').click()
    page.locator('#vo-title', has_text='Not sent.').wait_for()
    check('could not be sent' in page.locator('dialog.vo-sheet').inner_text(), 'a refused message is never reported as sent')
    check(local(page, QUEUE) is None, 'a refused message is not kept')
    close_sheet(page)
    page.evaluate("location.hash='/settings'")
    page.locator('#vo-dismiss').wait_for()
    check('1 message could not be sent' in page.locator('#vo-panel').inner_text(), 'Settings shows the could-not-send note')
    page.locator('#vo-dismiss').click()
    check(page.locator('#vo-dismiss').count() == 0, 'Dismiss clears the note')
    context.close()

    # ---- Desktop and 320px ----
    for viewport, name in ((DESKTOP, 'desktop'), (NARROW, '320')):
        collector = Collector()
        context, page = open_context(browser, collector, errors, viewport=viewport)
        page.locator('#vo-open').click()
        page.wait_for_function("() => document.querySelector('dialog.vo-sheet')?.open")
        check(fits(page), f'the sheet fits at {name}')
        check(all(h >= 44 for _, h in target_sizes(page, 'dialog.vo-sheet button, dialog.vo-sheet .chips label')), f'sheet targets are 44px at {name}')
        device = 'desktop' if viewport is DESKTOP else 'mobile'
        check(device in page.locator('#vo-attached').inner_text(), f'the device class is {device} at {name}')
        page.screenshot(path=str(SHOTS / f'voices-sheet-{name}.png'))
        close_sheet(page)
        check(page.evaluate("() => document.activeElement?.id") == 'vo-open', f'focus returns at {name}')
        if viewport is DESKTOP:
            page.evaluate("location.hash='/settings'")
            page.locator('#vo-panel h2').wait_for()
            page.screenshot(path=str(SHOTS / 'voices-settings-desktop.png'))
            solve_sudoku(page, 'curated-sudoku-01@1')
            page.locator('#vo-rate button').first.wait_for()
            page.locator('.play-end').screenshot(path=str(SHOTS / 'voices-completion-desktop.png'))
        check(not collector.voices(), f'nothing is sent at {name} without a Send')
        context.close()

    # ---- Ineligible origin: explanation and the existing issue-report export ----
    collector = Collector()
    context, page = open_context(browser, collector, errors, origin=FALLBACK)
    page.locator('#vo-open').click()
    page.wait_for_function("() => document.querySelector('dialog.vo-sheet')?.open")
    text = page.locator('dialog.vo-sheet').inner_text()
    check('works on the main Alibi site' in text and page.locator('dialog.vo-sheet textarea').count() == 0, 'elsewhere the sheet explains sending works on the main site')
    page.screenshot(path=str(SHOTS / 'voices-fallback-390.png'))
    page.locator('dialog.vo-sheet [data-action="feedback-report"]').click()
    page.wait_for_function("() => document.querySelector('#dialog')?.open")
    check(page.locator('#dialog-title').inner_text() == 'Create a puzzle issue report.', 'the existing issue-report export opens')
    check(not sheet_open(page), 'the sheet closes behind the issue report')
    page.keyboard.press('Escape')
    solve_sudoku(page, 'curated-sudoku-01@1')
    page.wait_for_timeout(400)
    check(page.locator('#vo-rate').count() == 0 and page.locator('#vo-offer').count() == 0, 'no rating row or invitation off the primary origin')
    page.evaluate("location.hash='/settings'")
    page.locator('#vo-panel h2').wait_for()
    check('main Alibi site' in page.locator('#vo-panel').inner_text() and page.locator('#vo-survey').count() == 0, 'Settings explains the fallback without a survey')
    check(not collector.requests, 'an ineligible origin never contacts the collector')
    check(not errors, 'no page errors on any origin')
    context.close()

    browser.close()

print('PASS', checks, 'Voices browser assertions')
