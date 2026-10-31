"""Synthetic author rehearsal; no human observations or semantic certification."""
import hashlib
import json
import shutil


def exercise_repair_kit(browser, root, output, work, build):
    out = output / 'repair-kit'
    out.mkdir(parents=True, exist_ok=True)
    sources = root / 'examples/cases/repair-kit'
    manifest = []
    for source in sorted(sources.glob('*.json')):
        target = out / source.name
        shutil.copyfile(source, target)
        manifest.append({'path': source.relative_to(root).as_posix(),
                         'bytes': source.stat().st_size,
                         'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
    (out / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    # Worked answers, not read from the authored answer key.
    answers = [
        ('arrival', 'before-bell', 'supported', ['receiving-slip', 'clock-test']),
        ('route', 'north-entrance', 'contradicted', ['entrance-register']),
        ('custody', 'rowan-stored', 'not-established', ['handover-note', 'custody-rule']),
    ]
    results = []
    for name in ['repaired', 'unsupported-verdict']:
        source, preview = sources / f'{name}.json', work / f'repair-kit-{name}.html'
        build(source, preview)
        shutil.copyfile(preview, out / f'{name}.html')
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        for width, height in [(390, 844), (1440, 900)]:
            for story in [True, False]:
                label = f'{name}-{width}-story-{str(story).lower()}'
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
                try:
                    context.set_offline(True)
                    page = context.new_page()
                    errors, external = [], []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('request', lambda request: external.append(request.url) if not request.url.startswith('file:') else None)
                    page.goto(preview.as_uri())
                    embedded = json.loads(page.locator('#case-data').text_content())
                    assert embedded['receipt']['sourceSha256'] == source_hash
                    assert embedded['receipt']['scope'] == 'structure-only'
                    assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
                    assert page.locator('#stage-route').is_disabled()
                    assert page.locator('#record-handover-note').count() == 0
                    if not story:
                        page.locator('#story').focus()
                        page.keyboard.press('Space')
                    assert page.locator('#story').get_attribute('aria-pressed') == str(story).lower()
                    page.screenshot(path=str(out / f'{label}-start.png'), full_page=True)
                    for index, (step, claim, verdict, citations) in enumerate(answers):
                        assert page.locator('#stage-' + step).get_attribute('aria-current') == 'step'
                        page.locator('#verdict-' + claim).select_option(verdict)
                        for citation in citations:
                            page.locator(f'#cite-{claim}-{citation}').check()
                        page.locator('#check').click()
                        if name == 'unsupported-verdict' and step == 'custody':
                            # This is the editorial defect: a defensible answer is rejected.
                            assert page.locator('#verdict-' + claim).get_attribute('aria-invalid') == 'true'
                            assert page.locator('#progress').text_content() == '2 of 3 stages reviewed'
                            assert page.locator('#verdict-' + claim).input_value() == 'not-established'
                            page.screenshot(path=str(out / f'{label}-editorial-refusal.png'), full_page=True)
                            (out / f'{label}-editorial-refusal.aria.txt').write_text(page.locator('body').aria_snapshot(), encoding='utf-8')
                            # The authored key accepts its wrong answer; validation is not truth checking.
                            page.locator('#verdict-' + claim).select_option('supported')
                            page.locator('#check').click()
                        assert 'Reasoning accepted' in page.locator('#status').inner_text()
                        assert page.locator('#progress').text_content() == f'{index + 1} of 3 stages reviewed'
                        assert page.locator('html').evaluate('(el) => el.scrollWidth <= innerWidth')
                        if index < 2:
                            page.locator('#continue').click()
                    assert page.locator('#ending').is_visible()
                    page.screenshot(path=str(out / f'{label}-complete.png'), full_page=True)
                    (out / f'{label}-complete.aria.txt').write_text(page.locator('body').aria_snapshot(), encoding='utf-8')
                    page.reload()
                    assert page.locator('#progress').text_content() == '0 of 3 stages reviewed'
                    assert page.locator('#verdict-before-bell').input_value() == ''
                    assert page.locator('#stage-route').is_disabled()
                    assert not external, external
                    assert not errors, errors
                    results.append({'fixture': name, 'sourceSha256': source_hash, 'viewport': [width, height],
                                    'story': story, 'offline': True, 'completedStages': 3,
                                    'editorialCounterexample': name == 'unsupported-verdict',
                                    'reload': 'memory-only progress and answers cleared',
                                    'externalRequests': 0, 'scriptErrors': 0})
                finally:
                    context.close()
    receipt = {'browser': browser.version, 'transport': 'file', 'results': results,
               'scope': 'synthetic control rehearsal; not a consenting author session or physical-device acceptance'}
    (out / 'browser.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return {'repairKit': receipt}
