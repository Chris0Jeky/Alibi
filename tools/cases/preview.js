'use strict';
(() => {
  const { definition: d, receipt } = JSON.parse(document.getElementById('case-data').textContent);
  const S = globalThis.PosternCaseSession;
  const root = document.getElementById('workbench');
  let completed = [], current = S.available(d, [])[0], story = true;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'lamplight' : 'daylight';
  const drafts = new Map(), hints = new Map(), reveals = new Set();
  let message = '';
  function el(tag, text, attrs = {}) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }
  function button(text, id, action) {
    const node = el('button', text, { type: 'button', id });
    node.addEventListener('click', action); return node;
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
  function render(focusId) {
    const view = S.project(d, completed, current, story);
    const mode = story ? 'storyOn' : 'storyOff';
    const prior = focusId || document.activeElement?.id;
    document.documentElement.dataset.theme = theme;
    root.replaceChildren();
    const header = el('header');
    header.append(el('p', 'POSTERN / AUTHORING PREVIEW', { class: 'eyebrow' }), el('h1', d.title), el('p', d.intro[mode]));
    header.append(el('p', 'Unsaved experiment. No accounts, storage or network. Refreshing or closing this file resets progress.', { class: 'notice' }));
    const toolbar = el('div', undefined, { class: 'toolbar' });
    const storyButton = button(`Story: ${story ? 'on' : 'off'}`, 'story', () => { story = !story; render('story'); });
    storyButton.setAttribute('aria-pressed', String(story));
    toolbar.append(storyButton, button(`Light: ${theme === 'daylight' ? 'Daylight' : 'Lamplight'}`, 'theme', () => { theme = theme === 'daylight' ? 'lamplight' : 'daylight'; render('theme'); }), button('Restart preview', 'restart', () => {
      if (!confirm('Reset this unsaved preview? Your answers, hints and progress will be cleared.')) return;
      completed = []; current = S.available(d, [])[0]; drafts.clear(); hints.clear(); reveals.clear(); message = 'Preview restarted.'; render('step-title');
    }));
    header.append(toolbar); root.append(header);
    const nav = el('nav', undefined, { 'aria-label': 'Investigation stages' });
    const available = S.available(d, completed);
    d.steps.forEach((step, index) => {
      const open = available.includes(step.id);
      const text = open ? `${index + 1}. ${step.title}${completed.includes(step.id) ? ' (reviewed)' : ''}` : `Question ${index + 1} (locked)`;
      const control = button(text, `stage-${step.id}`, () => { current = step.id; message = ''; render('step-title'); });
      control.disabled = !open;
      if (step.id === current) control.setAttribute('aria-current', 'step');
      nav.append(control);
    });
    root.append(nav);
    const main = el('main');
    main.append(el('p', `${completed.length} of ${d.steps.length} stages reviewed`, { id: 'progress', class: 'eyebrow' }), el('h2', view.title, { id: 'step-title', tabindex: '-1' }), el('p', view.prompt));
    const status = el('p', message, { role: 'status', id: 'status', tabindex: '-1' }); main.append(status);
    const layout = el('div', undefined, { class: 'layout' });
    const sources = el('section', undefined, { 'aria-labelledby': 'sources-title' }); sources.append(el('h3', 'Available sources', { id: 'sources-title' }));
    for (const record of view.records) {
      const card = el('article', undefined, { class: 'record', id: `record-${record.id}`, tabindex: '-1' });
      card.append(el('p', record.kind, { class: 'eyebrow' }), el('h4', record.title), el('p', record.text), el('p', record.source, { class: 'provenance' })); sources.append(card);
    }
    const investigation = el('section', undefined, { 'aria-labelledby': 'claims-title' }); investigation.append(el('h3', 'Your conclusions', { id: 'claims-title' }));
    investigation.append(el('p', 'Supported: follows from the records. Contradicted: conflicts with them. Not established: both alternatives remain possible.'));
    const form = el('form');
    if (!drafts.has(current)) drafts.set(current, new Map());
    const answers = drafts.get(current);
    for (const claim of view.claims) {
      if (!answers.has(claim.id)) answers.set(claim.id, { id: claim.id, verdict: '', citations: [] });
      const answer = answers.get(claim.id);
      const field = el('fieldset'); field.append(el('legend', claim.text, { id: `label-${claim.id}` }));
      const select = el('select', undefined, { id: `verdict-${claim.id}`, 'aria-labelledby': `label-${claim.id}` });
      for (const [value, text] of [['', 'Choose a verdict'], ['supported', 'Supported'], ['contradicted', 'Contradicted'], ['not-established', 'Not established']]) {
        const option = el('option', text, { value }); option.selected = answer.verdict === value; select.append(option);
      }
      select.addEventListener('change', () => { answer.verdict = select.value; }); field.append(select, el('p', 'Cite the smallest sufficient source set:'));
      for (const record of view.records) {
        const label = el('label', undefined, { class: 'citation' });
        const check = el('input', undefined, { type: 'checkbox', id: `cite-${claim.id}-${record.id}` }); check.checked = answer.citations.includes(record.id);
        check.addEventListener('change', () => { answer.citations = check.checked ? [...answer.citations, record.id] : answer.citations.filter((id) => id !== record.id); });
        label.append(check, el('span', record.title)); field.append(label);
      }
      form.append(field);
    }
    const submit = el('button', 'Check reasoning', { type: 'submit', id: 'check' }); form.append(submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = S.submit(d, completed, current, view.claims.map((c) => answers.get(c.id)));
      completed = result.completed;
      if (result.ok) message = 'Reasoning accepted. The cited sources support these classifications.';
      else {
        const first = result.errors[0], claim = view.claims.find((c) => c.id === first.claimId);
        message = `${claim ? `Review “${claim.text}”. ` : ''}${first.code === 'citations' ? 'Check the smallest sufficient source set; unrelated or missing records do not establish the claim.' : 'Compare your verdict with the records. A possible example is not necessarily an established fact.'} Your draft is retained.`;
      }
      render('status');
    });
    investigation.append(form);
    const hintSection = el('section', undefined, { 'aria-labelledby': 'help-title' }); hintSection.append(el('h3', 'Help, on your terms', { id: 'help-title' }));
    const count = hints.get(current) || 0;
    const hintButton = button(count < 3 ? `Show hint ${count + 1} of 3` : 'All three hints shown', 'hint', () => { hints.set(current, Math.min(3, count + 1)); render('hint-list'); }); hintButton.disabled = count >= 3;
    hintSection.append(hintButton);
    const hintList = el('div', undefined, { id: 'hint-list', tabindex: '-1' });
    for (let i = 0; i < count; i++) { const h = S.hint(view, i); const section = el('article', undefined, { class: 'hint' }); section.append(el('h4', h.level), el('p', h.text), sourceLinks(h.records)); hintList.append(section); }
    hintSection.append(hintList);
    hintSection.append(button(reveals.has(current) ? 'Hide worked answer' : 'Reveal worked answer', 'reveal', () => { if (reveals.has(current)) reveals.delete(current); else reveals.add(current); render(reveals.has(current) ? 'worked' : 'reveal'); }));
    if (reveals.has(current)) {
      const answer = S.worked(d, completed, current, story);
      const panel = el('article', undefined, { id: 'worked', class: 'hint', tabindex: '-1' }); panel.append(el('h4', 'Worked answer'), el('p', 'Reading this does not mark the stage complete.'), el('p', answer.text), sourceLinks(answer.records)); hintSection.append(panel);
    }
    investigation.append(hintSection);
    if (completed.includes(current)) {
      const next = d.steps.find((s) => available.includes(s.id) && !completed.includes(s.id));
      if (next) investigation.append(button('Continue investigation', 'continue', () => { current = next.id; message = ''; render('step-title'); }));
    }
    layout.append(sources, investigation); main.append(layout);
    if (completed.length === d.steps.length) { const ending = el('section', undefined, { class: 'ending', id: 'ending' }); ending.append(el('h2', 'An account you can defend'), el('p', d.ending[mode])); main.append(ending); }
    root.append(main);
    const footer = el('footer'); footer.append(el('p', d.provenance), el('p', `Source revision ${receipt.revision} · ${receipt.sourceSha256}`, { class: 'hash' }), el('p', 'Authoring preview. Structural and bounded-model tests are not human playtesting or production save acceptance.'));
    root.append(footer);
    if (prior) document.getElementById(prior)?.focus();
  }
  render();
})();
