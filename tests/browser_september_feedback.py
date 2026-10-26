"""September feedback: actual scene taps, holds, undo and offline note restoration."""
import json, os, re, sys
from pathlib import Path
from playwright.sync_api import (
    Error as PlaywrightError,
    expect,
    sync_playwright,
)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'september-feedback'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8792').rstrip('/')
puzzle = next(p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'scene')
free = [i for i in range(puzzle['size'] ** 2) if i not in [o['cell'] for o in puzzle['objects']]]
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce', has_touch=True)
        tracing_started = False
        try:
            context.tracing.start(screenshots=True, snapshots=True, sources=True)
            tracing_started = True
        except Exception as trace_error:
            print(f'tap_mark trace start failed: {trace_error}', file=sys.stderr)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script("""(() => {
            const trace = [];
            const nodeIds = new WeakMap();
            let nextNodeId = 1;
            const nodeId = node => {
                if (!node) return null;
                if (!nodeIds.has(node)) nodeIds.set(node, nextNodeId++);
                return nodeIds.get(node);
            };
            window.__sceneInputTrace = trace;
            window.__sceneInputNodeId = nodeId;
            for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click']) {
                document.addEventListener(type, (event) => {
                    const target = event.target instanceof Element ? event.target : null;
                    if (!target) return;
                    const cell = target.closest('.scene-cell[data-cell]');
                    const person = target.closest('.people-palette [data-action="person"][data-id]');
                    const mode = target.closest('.toolrow [data-action="scene-mode"][data-value]');
                    if (!cell && !person && !mode) return;
                    const entry = {
                        event: type,
                        at: Math.round(performance.now()),
                        pointerType: event.pointerType || null,
                        pointerId: Number.isFinite(event.pointerId) ? event.pointerId : null,
                        cancelable: event.cancelable,
                        eventPhaseAtCapture: event.eventPhase,
                        defaultPreventedAtCapture: event.defaultPrevented,
                        trusted: event.isTrusted,
                        detail: event.detail || 0,
                        x: Math.round(event.clientX || 0),
                        y: Math.round(event.clientY || 0),
                        target: `${target.tagName.toLowerCase()}${target.id ? '#' + target.id : ''}`,
                        targetNodeId: nodeId(target),
                        cell: cell?.id || null,
                        cellNodeId: nodeId(cell),
                        person: person?.dataset.id || null,
                        mode: mode?.dataset.value || null,
                        selectedPerson: document.querySelector('.people-palette [data-action="person"][aria-pressed="true"]')?.dataset.id || null,
                        selectedMode: document.querySelector('.toolrow [data-action="scene-mode"][aria-pressed="true"]')?.dataset.value || null,
                        movesBefore: window.AlibiDiagnostics?.getCurrent?.()?.moves ?? null,
                    };
                    trace.push(entry);
                    if (trace.length > 32) trace.shift();
                    queueMicrotask(() => {
                        entry.movesAfter = window.AlibiDiagnostics?.getCurrent?.()?.moves ?? null;
                        entry.selectedPersonAfter = document.querySelector('.people-palette [data-action="person"][aria-pressed="true"]')?.dataset.id || null;
                        entry.selectedModeAfter = document.querySelector('.toolrow [data-action="scene-mode"][aria-pressed="true"]')?.dataset.value || null;
                    });
                    // A capture-listener microtask need not run after later event listeners.
                    // Sample cancellation in a later task, with its actual phase recorded.
                    setTimeout(() => {
                        entry.defaultPreventedAfterDispatch = event.defaultPrevented;
                        entry.eventPhaseAfterDispatch = event.eventPhase;
                    }, 0);
                }, true);
            }
        })();""")
        page.goto(URL + '/#/play/' + puzzle['id'])
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=puzzle['id'])
        who, other = puzzle['people'][:2]
        cell, elsewhere = free[:2]
        target = page.locator(f'#cell-{cell}')
        def mode(value):
            button = page.locator(f'.toolrow [data-action="scene-mode"][data-value="{value}"]')
            button.click()

        def person(w):
            button = page.locator(f'[data-action="person"][data-id="{w["id"]}"]')
            button.click()

        def state(): return page.evaluate('AlibiDiagnostics.getCurrent().state')

        def tap_mark(loc, mode_value, person_value):
            cell_id = None
            phase = 'cell identity readiness'
            before = None
            try:
                cell_id = loc.get_attribute('id')
                phase = 'selected mode/person readiness'
                expect(
                    page.locator(
                        f'.toolrow [data-action="scene-mode"][data-value="{mode_value}"]'
                    )
                ).to_have_attribute('aria-pressed', 'true')
                expect(
                    page.locator(
                        f'.people-palette [data-action="person"][data-id="{person_value}"]'
                    )
                ).to_have_attribute('aria-pressed', 'true')
                page.evaluate(
                    """id => {
                        const el = document.getElementById(id);
                        if (!el) return false;
                        el.scrollIntoView({
                            block: 'center',
                            inline: 'center',
                            behavior: 'instant',
                        });
                        return true;
                    }""",
                    cell_id,
                )
                phase = 'cell center hit-test readiness'
                page.wait_for_function(
                    """id => {
                        const el = document.getElementById(id);
                        if (!el || el.disabled) return false;
                        const rect = el.getBoundingClientRect();
                        if (!rect.width || !rect.height) return false;
                        const hit = document.elementFromPoint(
                            rect.left + rect.width / 2,
                            rect.top + rect.height / 2,
                        );
                        return hit === el || el.contains(hit);
                    }""",
                    arg=cell_id,
                )
                before = page.evaluate('AlibiDiagnostics.getCurrent().moves')
                phase = 'single tap and move commit'
                # Candidate taps toggle state; retrying could hide a missed-state race or undo a landed tap.
                loc.tap()
                page.wait_for_function(
                    'exp => AlibiDiagnostics.getCurrent()?.moves === exp',
                    arg=before + 1,
                )
            except (PlaywrightError, AssertionError) as error:
                try:
                    diagnostic = page.evaluate(
                        """({cellId, expectedMode, expectedPerson, beforeMoves}) => {
                            const current = window.AlibiDiagnostics?.getCurrent?.();
                            const target = cellId ? document.getElementById(cellId) : null;
                            let hit = null;
                            if (target) {
                                const rect = target.getBoundingClientRect();
                                const element = document.elementFromPoint(
                                    rect.left + rect.width / 2,
                                    rect.top + rect.height / 2,
                                );
                                hit = {
                                    tag: element?.tagName?.toLowerCase() || null,
                                    id: element?.id || null,
                                    cell: element?.closest?.('.scene-cell[data-cell]')?.id || null,
                                };
                            }
                            return {
                                url: location.href,
                                puzzle: current?.puzzle?.id || null,
                                moves: current?.moves ?? null,
                                expectedMoves: Number.isFinite(beforeMoves) ? beforeMoves + 1 : null,
                                state: current?.state || null,
                                expectedPerson,
                                expectedMode,
                                selectedPerson: document.querySelector('.people-palette [data-action="person"][aria-pressed="true"]')?.dataset.id || null,
                                selectedMode: document.querySelector('.toolrow [data-action="scene-mode"][aria-pressed="true"]')?.dataset.value || null,
                                target: target ? {
                                    id: target.id,
                                    nodeId: window.__sceneInputNodeId?.(target) ?? null,
                                    disabled: target.disabled,
                                    visible: !!(target.getBoundingClientRect().width && target.getBoundingClientRect().height),
                                    pointerEvents: getComputedStyle(target).pointerEvents,
                                    touchAction: getComputedStyle(target).touchAction,
                                    centerHit: hit,
                                } : null,
                                recentInputEvents: window.__sceneInputTrace?.slice(-16) || [],
                            };
                        }""",
                        {
                            'cellId': cell_id,
                            'expectedMode': mode_value,
                            'expectedPerson': person_value,
                            'beforeMoves': before,
                        },
                    )
                    print(
                        f'tap_mark failed during {phase}: {json.dumps(diagnostic, sort_keys=True)}',
                        file=sys.stderr,
                    )
                    try:
                        page.screenshot(
                            path=str(OUT / f'scene-tap-failure-{width}-{cell_id or "unknown"}.png'),
                            full_page=True,
                        )
                    except Exception as screenshot_error:
                        print(f'tap_mark diagnostic screenshot failed: {screenshot_error}', file=sys.stderr)
                except Exception as diagnostic_error:
                    print(
                        f'tap_mark failed during {phase}; diagnostic collection failed: {diagnostic_error}',
                        file=sys.stderr,
                    )
                if tracing_started:
                    try:
                        context.tracing.stop(
                            path=OUT / f'scene-tap-failure-{width}-{cell_id or "unknown"}.zip',
                        )
                    except Exception as trace_error:
                        print(f'tap_mark diagnostic trace save failed: {trace_error}', file=sys.stderr)
                raise
        person(other)
        mode('candidate')
        tap_mark(target, 'candidate', other['id'])
        mode('exclude')
        tap_mark(target, 'exclude', other['id'])
        person(who)
        mode('candidate')
        tap_mark(page.locator(f'#cell-{elsewhere}'), 'candidate', who['id'])
        mode('cycle')
        for tap in range(1, 8):
            tap_mark(target, 'cycle', who['id'])
            s = state()
            stage = (tap - 1) % 4
            assert (s['placements'].get(who['id']) == cell) == (stage == 0), (tap, s)
            assert other['id'] in s.get('candidates', {}).get(str(cell), []), (tap, width, s)
            assert cell in s['notes'].get(other['id'], []), (tap, width, s)
            assert who['id'] in s.get('candidates', {}).get(str(elsewhere), []), (tap, width, s)
            assert (cell in s.get('crosses', [])) == (stage == 3), (tap, width, s)
            expect(page.locator(f'[data-action="person"][data-id="{who["id"]}"]')).to_have_attribute('aria-pressed', 'true')
            label = page.locator(f'#cell-{elsewhere}').get_attribute('aria-label')
            assert ('candidates: ' + who['name'] in label) == (stage != 0), label
        before = state()
        page.locator('.main-tools [data-action="undo"]').click()
        assert who['id'] in state()['candidates'][str(cell)]
        page.locator('.main-tools [data-action="redo"]').click()
        assert state() == before
        # Hold opens the actual clear menu and release must not perform a tap.
        target.click(delay=650)
        expect(page.locator('dialog[open]')).to_contain_text('Square actions')
        assert state() == before
        page.get_by_role('button', name='Clear ' + who['name'] + ' here', exact=True).click()
        assert who['id'] not in state()['candidates'].get(str(cell), [])
        assert cell not in state()['notes'][who['id']]
        assert other['id'] in state()['candidates'][str(cell)]
        # Hold on a person exposes all actions and retains their identity.
        page.locator(f'[data-action="person"][data-id="{who["id"]}"]').click(delay=650)
        expect(page.locator('dialog[open]')).to_contain_text(who['name'] + ': marking tools')
        page.locator('dialog[open] [data-value="board-cross"]').click()
        # The hold suppression window must not swallow an intentional new tap.
        target.tap()
        assert cell in state().get('crosses', [])
        page.locator('[data-action="scene-cell-menu"]').click()
        page.get_by_role('button', name='Clear everything here', exact=True).click()
        assert str(cell) not in state()['candidates']
        assert cell not in state().get('crosses', [])
        assert cell not in state()['notes'][other['id']]
        assert state()['candidates'][str(elsewhere)] == [who['id']]
        expect(page.locator('#save-state')).to_contain_text('Saved on this device')
        page.wait_for_function('() => navigator.serviceWorker.controller !== null')
        context.set_offline(True)
        page.reload()
        expect(page.locator(f'#cell-{elsewhere}')).to_have_attribute('aria-label', re.compile('candidates: ' + who['name']))
        page.screenshot(path=str(OUT / f'scene-{width}.png'), full_page=True)
        context.set_offline(False)
        nonograms = [p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'nonogram']
        non, row, filled, blanks = next((p, r,
            [r*p['size']+c for c in range(p['size']) if p['solution'][r*p['size']+c] == 1],
            [r*p['size']+c for c in range(p['size']) if p['solution'][r*p['size']+c] == 0 and p['colClues'][c]])
            for p in nonograms for r in range(p['size'])
            if 0 < sum(p['solution'][r*p['size']:(r+1)*p['size']]) < p['size'] - 1
            and len([c for c in range(p['size']) if p['solution'][r*p['size']+c] == 0 and p['colClues'][c]]) >= 2)
        page.goto(URL + '/#/play/' + non['id'])
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        auto = page.locator('.controls [data-action="club-assist"]')
        expect(auto).to_contain_text('Auto-cross completed lines: off')
        auto.click()
        page.locator('[data-action="brush"][data-value="0"]').click()
        page.locator(f'#cell-{blanks[0]}').click()
        page.locator('[data-action="brush"][data-value="1"]').click()
        for i in filled: page.locator(f'#cell-{i}').click()
        derived = page.locator(f'#cell-{blanks[1]}')
        expect(derived).to_have_class(re.compile('derived-mark'))
        assert state()['cells'][blanks[1]] == -1, 'automatic crosses never overwrite saved manual cells'
        assert state()['cells'][blanks[0]] == 0
        page.locator('.main-tools [data-action="undo"]').click()
        expect(derived).not_to_have_class(re.compile('derived-mark'))
        assert state()['cells'][blanks[0]] == 0, 'manual cross survives changed premise'
        page.locator('.main-tools [data-action="redo"]').click()
        expect(derived).to_have_class(re.compile('derived-mark'))
        expect(page.locator('#save-state')).to_contain_text('Saved on this device')
        page.wait_for_function('() => AlibiClub.diagnostics().revision > 0')
        context.set_offline(True)
        page.reload()
        expect(derived).to_have_class(re.compile('derived-mark'))
        expect(auto).to_contain_text('Auto-cross completed lines: on')
        auto.click()
        expect(derived).not_to_have_class(re.compile('derived-mark'))
        assert state()['cells'][blanks[0]] == 0
        page.screenshot(path=str(OUT / f'nonogram-{width}.png'), full_page=True)
        context.set_offline(False)
        # Custom names are plain text even in newly generated action labels.
        other_scene = next(p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'scene' and p['id'] != puzzle['id'])
        markup_name = '<b id="name-markup">J</b>'
        page.evaluate("arg => { ALIBI_CATALOG.puzzles.find(p => p.id === arg.id).people[0].name = arg.name; }", {'id': other_scene['id'], 'name': markup_name})
        page.evaluate("id => { location.hash = '#/play/' + id; }", other_scene['id'])
        expect(page.locator('.play-title')).to_contain_text(other_scene['title'])
        page.locator('[data-action="scene-cell-menu"]').click()
        expect(page.locator('dialog[open]')).to_contain_text('Clear ' + markup_name + ' here')
        expect(page.locator('#name-markup')).to_have_count(0)
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        assert not errors, errors
        print(f'PASS scene cycle/notes/holds/undo/offline at {width}px', flush=True)
        if tracing_started:
            try:
                context.tracing.stop()  # No path: discard successful trace data.
            except Exception as trace_error:
                print(f'tap_mark trace discard failed: {trace_error}', file=sys.stderr)
        context.close()
    browser.close()
