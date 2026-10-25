'use strict';
(() => {
  const { definition: d, receipt } = JSON.parse(document.getElementById('case-data').textContent);
  const S = globalThis.PosternCaseSession;
  // Off until the tester starts it; memory-only, discarded on restart, cancel or reload.
  const playtest = globalThis.PosternPlaytestReceipt.create({
    caseId: d.id,
    revision: d.revision,
    sourceSha256: receipt.sourceSha256,
    stageIds: d.steps.map((s) => s.id),
  });
  let reviewing = false;
  const root = document.getElementById('workbench');
  let completed = [],
    current = S.available(d, [])[0],
    story = true;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'lamplight' : 'daylight';
  const drafts = new Map(),
    hints = new Map(),
    reveals = new Set();
  let message = '';
  let validationErrors = [],
    validationActive = false;
  function el(tag, text, attrs = {}) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }
  function button(text, id, action) {
    const node = el('button', text, { type: 'button', id });
    node.addEventListener('click', action);
    return node;
  }
  function sourceLinks(ids) {
    const row = el('p', undefined, { class: 'source-links' });
    for (const id of ids) {
      const record = d.records.find((r) => r.id === id);
      const link = el('a', record.title, { href: `#record-${id}` });
      link.addEventListener('click', () => document.getElementById(`record-${id}`).focus());
      row.append(link);
    }
    return row;
  }
  function errorSummary(errors) {
    const claimCount = new Set(errors.map((error) => error.claimId).filter(Boolean)).size;
    if (!claimCount)
      return `${errors.length} submission ${errors.length === 1 ? 'error' : 'errors'}. Your draft is retained.`;
    return `${errors.length} validation ${errors.length === 1 ? 'error' : 'errors'} across ${claimCount} ${claimCount === 1 ? 'claim' : 'claims'}. Your draft is retained.`;
  }
  function firstErrorTarget(errors) {
    const first = errors.find(
      (error) => error.claimId && ['verdict', 'citations'].includes(error.code),
    );
    if (!first) return 'status';
    return first.code === 'citations' ? `citations-${first.claimId}` : `verdict-${first.claimId}`;
  }
  function errorText(code) {
    return code === 'citations'
      ? 'Choose the smallest sufficient source set for this claim. Your draft is retained.'
      : 'Choose the verdict supported by the records. Your draft is retained.';
  }
  function refreshValidation(focusId, answers, claims) {
    if (!validationActive) return;
    const result = S.submit(
      d,
      completed,
      current,
      claims.map((claim) => answers.get(claim.id)),
    );
    validationErrors = result.ok ? [] : result.errors;
    message = result.ok
      ? 'All validation issues are corrected. Check reasoning to recheck this stage.'
      : errorSummary(validationErrors);
    render(focusId);
  }
  function playtestSection() {
    const section = el('section', undefined, {
      class: 'playtest',
      'aria-labelledby': 'playtest-title',
    });
    section.append(el('h2', 'Local playtest receipt', { id: 'playtest-title' }));
    const actions = el('div', undefined, { class: 'toolbar' });
    const discard = button('Discard receipt', 'playtest-cancel', () => {
      playtest.cancel();
      reviewing = false;
      message = 'Playtest receipt discarded. Nothing was copied or sent.';
      render('playtest-start');
    });
    if (!playtest.enabled) {
      section.append(
        el(
          'p',
          'Optional, for consenting testers, and off until you start it. It counts stage visits, story mode, hint and reveal requests and checks in this page only: no answers, citations, notes, saves, timings or device details. Nothing is sent; you review, edit and copy it yourself. Restarting or reloading discards it.',
        ),
      );
      actions.append(
        button('Start playtest receipt', 'playtest-start', () => {
          playtest.start(story, current);
          message = 'Playtest receipt started. Counts stay in this page until you copy them.';
          render('playtest-review');
        }),
      );
    } else if (!reviewing) {
      section.append(el('p', 'Recording counts in this page only.', { id: 'playtest-state' }));
      actions.append(
        button('Review receipt', 'playtest-review', () => {
          reviewing = true;
          render('playtest-observation');
        }),
        discard,
      );
    } else {
      const draft = playtest.draft();
      const limits = el('ul');
      for (const line of draft.limitations) limits.append(el('li', line));
      const label = el('label', 'Your observation (optional, up to 500 characters)', {
        for: 'playtest-observation',
      });
      const note = el('textarea', undefined, {
        id: 'playtest-observation',
        maxlength: '500',
        rows: '3',
      });
      note.value = draft.observation;
      const preview = el('pre', JSON.stringify(draft, null, 2), {
        id: 'playtest-preview',
        tabindex: '-1',
      });
      note.addEventListener('input', () => {
        playtest.observe(note.value);
        preview.textContent = JSON.stringify(playtest.draft(), null, 2);
      });
      actions.append(
        button('Copy receipt', 'playtest-copy', async () => {
          try {
            await navigator.clipboard.writeText(JSON.stringify(playtest.draft(), null, 2));
            reviewing = false;
            message = 'Receipt copied. Nothing was sent.';
            render('playtest-review');
          } catch {
            message = 'The browser blocked copying. Select the receipt text to copy it yourself.';
            render('playtest-preview');
          }
        }),
        button('Close review', 'playtest-close', () => {
          reviewing = false;
          render('playtest-review');
        }),
        discard,
      );
      section.append(
        el('p', 'Review exactly what would be copied. Limitations:'),
        limits,
        label,
        note,
        preview,
      );
    }
    section.append(actions);
    return section;
  }
  function render(focusId) {
    const view = S.project(d, completed, current, story);
    const mode = story ? 'storyOn' : 'storyOff';
    const prior = focusId || document.activeElement?.id;
    document.documentElement.dataset.theme = theme;
    root.replaceChildren();
    const header = el('header');
    header.append(
      el('p', 'POSTERN / AUTHORING PREVIEW', { class: 'eyebrow' }),
      el('h1', d.title),
      el('p', d.intro[mode]),
    );
    header.append(
      el(
        'p',
        'Unsaved experiment. No accounts, storage or network. Refreshing or closing this file resets progress.',
        { class: 'notice' },
      ),
    );
    const toolbar = el('div', undefined, { class: 'toolbar' });
    const storyButton = button(`Story: ${story ? 'on' : 'off'}`, 'story', () => {
      story = !story;
      playtest.mode(story);
      render('story');
    });
    storyButton.setAttribute('aria-pressed', String(story));
    toolbar.append(
      storyButton,
      button(`Light: ${theme === 'daylight' ? 'Daylight' : 'Lamplight'}`, 'theme', () => {
        theme = theme === 'daylight' ? 'lamplight' : 'daylight';
        render('theme');
      }),
      button('Restart preview', 'restart', () => {
        if (
          !confirm('Reset this unsaved preview? Your answers, hints and progress will be cleared.')
        )
          return;
        completed = [];
        current = S.available(d, [])[0];
        drafts.clear();
        hints.clear();
        reveals.clear();
        playtest.cancel();
        reviewing = false;
        validationErrors = [];
        validationActive = false;
        message = 'Preview restarted.';
        render('step-title');
      }),
    );
    header.append(toolbar);
    root.append(header);
    const nav = el('nav', undefined, { 'aria-label': 'Investigation stages' });
    const available = S.available(d, completed);
    d.steps.forEach((step, index) => {
      const open = available.includes(step.id);
      const text = open
        ? `${index + 1}. ${step.title}${completed.includes(step.id) ? ' (reviewed)' : ''}`
        : `Question ${index + 1} (locked)`;
      const control = button(text, `stage-${step.id}`, () => {
        current = step.id;
        playtest.open(current);
        validationErrors = [];
        validationActive = false;
        message = '';
        render('step-title');
      });
      control.disabled = !open;
      if (step.id === current) control.setAttribute('aria-current', 'step');
      nav.append(control);
    });
    root.append(nav);
    const main = el('main');
    main.append(
      el('p', `${completed.length} of ${d.steps.length} stages reviewed`, {
        id: 'progress',
        class: 'eyebrow',
      }),
      el('h2', view.title, { id: 'step-title', tabindex: '-1' }),
      el('p', view.prompt),
    );
    const status = el('p', message, { role: 'status', id: 'status', tabindex: '-1' });
    main.append(status);
    const layout = el('div', undefined, { class: 'layout' });
    const sources = el('section', undefined, { 'aria-labelledby': 'sources-title' });
    sources.append(el('h3', 'Available sources', { id: 'sources-title' }));
    for (const record of view.records) {
      const card = el('article', undefined, {
        class: 'record',
        id: `record-${record.id}`,
        tabindex: '-1',
      });
      card.append(
        el('p', record.kind, { class: 'eyebrow' }),
        el('h4', record.title),
        el('p', record.text),
        el('p', record.source, { class: 'provenance' }),
      );
      sources.append(card);
    }
    const investigation = el('section', undefined, { 'aria-labelledby': 'claims-title' });
    investigation.append(el('h3', 'Your conclusions', { id: 'claims-title' }));
    investigation.append(
      el(
        'p',
        'Supported: follows from the records. Contradicted: conflicts with them. Not established: both alternatives remain possible.',
      ),
    );
    const form = el('form');
    if (!drafts.has(current)) drafts.set(current, new Map());
    const answers = drafts.get(current);
    for (const claim of view.claims) {
      if (!answers.has(claim.id))
        answers.set(claim.id, { id: claim.id, verdict: '', citations: [] });
      const answer = answers.get(claim.id);
      const claimErrors = validationErrors.filter((error) => error.claimId === claim.id);
      const verdictError = claimErrors.find((error) => error.code === 'verdict');
      const citationsError = claimErrors.find((error) => error.code === 'citations');
      const field = el('fieldset', undefined, { id: `claim-${claim.id}` });
      if (claimErrors.length) {
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute(
          'aria-describedby',
          claimErrors.map((error) => `error-${claim.id}-${error.code}`).join(' '),
        );
      }
      field.append(el('legend', claim.text, { id: `label-${claim.id}` }));
      const select = el('select', undefined, {
        id: `verdict-${claim.id}`,
        'aria-labelledby': `label-${claim.id}`,
      });
      if (verdictError) {
        select.setAttribute('aria-invalid', 'true');
        select.setAttribute('aria-describedby', `error-${claim.id}-verdict`);
      }
      for (const [value, text] of [
        ['', 'Choose a verdict'],
        ['supported', 'Supported'],
        ['contradicted', 'Contradicted'],
        ['not-established', 'Not established'],
      ]) {
        const option = el('option', text, { value });
        option.selected = answer.verdict === value;
        select.append(option);
      }
      select.addEventListener('change', () => {
        answer.verdict = select.value;
        refreshValidation(select.id, answers, view.claims);
      });
      field.append(select);
      if (verdictError)
        field.append(
          el('p', errorText('verdict'), {
            id: `error-${claim.id}-verdict`,
            class: 'form-error',
          }),
        );
      const citationGroup = el('fieldset', undefined, {
        id: `citations-${claim.id}`,
        class: 'citation-group',
        'aria-labelledby': `label-${claim.id} citation-label-${claim.id}`,
        tabindex: '-1',
      });
      if (citationsError) {
        citationGroup.setAttribute('aria-invalid', 'true');
        citationGroup.setAttribute('aria-describedby', `error-${claim.id}-citations`);
      }
      citationGroup.append(
        el('legend', 'Cite the smallest sufficient source set:', {
          id: `citation-label-${claim.id}`,
        }),
      );
      if (citationsError)
        citationGroup.append(
          el('p', errorText('citations'), {
            id: `error-${claim.id}-citations`,
            class: 'form-error',
          }),
        );
      for (const record of view.records) {
        const label = el('label', undefined, { class: 'citation' });
        const check = el('input', undefined, {
          type: 'checkbox',
          id: `cite-${claim.id}-${record.id}`,
        });
        if (citationsError) {
          check.setAttribute('aria-invalid', 'true');
          check.setAttribute('aria-describedby', `error-${claim.id}-citations`);
        }
        check.checked = answer.citations.includes(record.id);
        check.addEventListener('change', () => {
          answer.citations = check.checked
            ? [...answer.citations, record.id]
            : answer.citations.filter((id) => id !== record.id);
          refreshValidation(check.id, answers, view.claims);
        });
        label.append(check, el('span', record.title));
        citationGroup.append(label);
      }
      field.append(citationGroup);
      form.append(field);
    }
    const submit = el('button', 'Check reasoning', { type: 'submit', id: 'check' });
    form.append(submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const submitted = view.claims.map((c) => answers.get(c.id));
      const result = S.submit(d, completed, current, submitted);
      playtest.submission(current, result, submitted);
      completed = result.completed;
      let focusTarget = 'status';
      if (result.ok) {
        validationErrors = [];
        validationActive = false;
        message = 'Reasoning accepted. The cited sources support these classifications.';
      } else {
        validationActive = true;
        validationErrors = result.errors;
        message = errorSummary(validationErrors);
        focusTarget = firstErrorTarget(validationErrors);
      }
      render(focusTarget);
    });
    investigation.append(form);
    const hintSection = el('section', undefined, { 'aria-labelledby': 'help-title' });
    hintSection.append(el('h3', 'Help, on your terms', { id: 'help-title' }));
    const count = hints.get(current) || 0;
    const hintButton = button(
      count < 3 ? `Show hint ${count + 1} of 3` : 'All three hints shown',
      'hint',
      () => {
        hints.set(current, Math.min(3, count + 1));
        playtest.hint(current);
        render('hint-list');
      },
    );
    hintButton.disabled = count >= 3;
    hintSection.append(hintButton);
    const hintList = el('div', undefined, { id: 'hint-list', tabindex: '-1' });
    for (let i = 0; i < count; i++) {
      const h = S.hint(view, i);
      const section = el('article', undefined, { class: 'hint' });
      section.append(el('h4', h.level), el('p', h.text), sourceLinks(h.records));
      hintList.append(section);
    }
    hintSection.append(hintList);
    hintSection.append(
      button(reveals.has(current) ? 'Hide worked answer' : 'Reveal worked answer', 'reveal', () => {
        if (reveals.has(current)) reveals.delete(current);
        else {
          reveals.add(current);
          playtest.reveal(current);
        }
        render(reveals.has(current) ? 'worked' : 'reveal');
      }),
    );
    if (reveals.has(current)) {
      const answer = S.worked(d, completed, current, story);
      const panel = el('article', undefined, { id: 'worked', class: 'hint', tabindex: '-1' });
      panel.append(
        el('h4', 'Worked answer'),
        el('p', 'Reading this does not mark the stage complete.'),
        el('p', answer.text),
        sourceLinks(answer.records),
      );
      hintSection.append(panel);
    }
    investigation.append(hintSection);
    if (completed.includes(current)) {
      const next = d.steps.find((s) => available.includes(s.id) && !completed.includes(s.id));
      if (next)
        investigation.append(
          button('Continue investigation', 'continue', () => {
            current = next.id;
            playtest.open(current);
            validationErrors = [];
            validationActive = false;
            message = '';
            render('step-title');
          }),
        );
    }
    layout.append(sources, investigation);
    main.append(layout);
    if (completed.length === d.steps.length) {
      const ending = el('section', undefined, { class: 'ending', id: 'ending' });
      ending.append(el('h2', 'An account you can defend'), el('p', d.ending[mode]));
      main.append(ending);
    }
    root.append(main);
    root.append(playtestSection());
    const footer = el('footer');
    footer.append(
      el('p', d.provenance),
      el('p', `Source revision ${receipt.revision} · ${receipt.sourceSha256}`, { class: 'hash' }),
      el(
        'p',
        'Authoring preview. Structural and bounded-model tests are not human playtesting or production save acceptance.',
      ),
    );
    root.append(footer);
    if (prior) document.getElementById(prior)?.focus();
  }
  render();
})();
