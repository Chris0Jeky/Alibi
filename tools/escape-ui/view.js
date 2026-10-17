'use strict';
(() => {
  const entries = JSON.parse(document.getElementById('room-data').textContent);
  const root = document.getElementById('escape-root');
  const contexts = entries.map(({ definition, receipt }) => ({
    definition,
    receipt,
    session: globalThis.PosternEscapeSession.createRoomSession(definition),
    selected: null,
    drafts: new Map(),
    hints: new Map(),
    notes: '',
    notesOpen: false,
    solutionOpen: false,
    revealed: false,
    message: '',
  }));
  let current = 0,
    generation = 0,
    story = true;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'lamplight' : 'daylight';
  function el(tag, text, attrs = {}) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }
  function render(focusId) {
    const epoch = ++generation;
    const room = contexts[current],
      d = room.definition;
    const view = room.session.view(story),
      key = story ? 'storyOn' : 'storyOff';
    if (!view.objects.some((o) => o.id === room.selected)) room.selected = view.objects[0]?.id;
    const object = view.objects.find((o) => o.id === room.selected);
    function bind(node, event, action) {
      node.addEventListener(event, (e) => {
        if (epoch === generation) action(e);
      });
      return node;
    }
    function button(id, label, action, attrs = {}) {
      return bind(el('button', label, { type: 'button', id, ...attrs }), 'click', action);
    }
    document.documentElement.dataset.theme = theme;
    root.replaceChildren();
    const header = el('header', undefined, { class: 'masthead' });
    header.append(
      el('p', 'POSTERN', { class: 'wordmark' }),
      el('p', 'ROOMS AFTER CLOSING', { class: 'eyebrow' }),
    );
    const toolbar = el('div', undefined, { class: 'toolbar' });
    const roomLabel = el('label', 'Choose a room', { for: 'room-select', class: 'room-label' });
    const select = el('select', undefined, { id: 'room-select' });
    contexts.forEach((c, i) => {
      const option = el(
        'option',
        `${i + 1}. ${c.definition.title}${c.session.view(story).won ? ' · Complete' : ''}`,
        { value: c.definition.id },
      );
      option.selected = i === current;
      select.append(option);
    });
    bind(select, 'change', () => {
      current = contexts.findIndex((c) => c.definition.id === select.value);
      render('room-title');
    });
    roomLabel.append(select);
    toolbar.append(
      roomLabel,
      button(
        'story',
        `Story ${story ? 'on' : 'off'}`,
        () => {
          story = !story;
          render('story');
        },
        { 'aria-pressed': String(story) },
      ),
      button('theme', theme === 'daylight' ? 'Use lamplight' : 'Use daylight', () => {
        theme = theme === 'daylight' ? 'lamplight' : 'daylight';
        render('theme');
      }),
    );
    header.append(toolbar);
    root.append(header);
    const main = el('main');
    const intro = el('section', undefined, { class: 'briefing' });
    intro.append(
      el(
        'p',
        `REHEARSAL ${String(current + 1).padStart(2, '0')} / ${String(contexts.length).padStart(2, '0')} · UNTIMED`,
        { class: 'eyebrow' },
      ),
      el('h1', d.title, { id: 'room-title', tabindex: '-1' }),
      el('p', d.intro[key], { class: 'intro-copy' }),
    );
    const actions = el('div', undefined, { class: 'room-tools' });
    actions.append(
      el('span', view.won ? 'Room complete' : 'Investigation in progress', {
        id: 'room-progress',
        class: 'progress',
      }),
    );
    const undo = button('undo', 'Undo action', () => {
      room.session.undo();
      room.message = 'One room action undone.';
      render('object-title');
    });
    undo.disabled = room.session.undoDepth() === 0;
    actions.append(
      undo,
      button('restart', 'Restart room', () => {
        if (
          !confirm('Restart only this room? Its actions, scratch notes and hints will be cleared.')
        )
          return;
        room.session.restart();
        room.drafts.clear();
        room.hints.clear();
        room.notes = '';
        room.revealed = false;
        room.message = 'This room restarted. Other rooms are unchanged.';
        render('room-title');
      }),
    );
    intro.append(
      actions,
      el(
        'p',
        'No automatic save. Switching rooms keeps this session; refreshing or closing clears all progress and notes.',
        { class: 'save-notice' },
      ),
    );
    main.append(intro);
    const layout = el('div', undefined, { class: 'room-layout' });
    const aside = el('nav', undefined, {
      'aria-label': 'Visible room objects',
      class: 'object-directory',
    });
    aside.append(
      el('h2', 'Look around'),
      el('p', `${view.objects.length} visible objects. Inspect in any order.`, {
        class: 'quiet',
        id: 'available-count',
      }),
    );
    const objectLabel = el('label', 'Inspect an object', {
      for: 'object-select',
      class: 'compact-selector',
    });
    const objectSelect = el('select', undefined, { id: 'object-select' });
    for (const o of view.objects) {
      const option = el('option', o.title, { value: o.id });
      option.selected = o.id === room.selected;
      objectSelect.append(option);
    }
    bind(objectSelect, 'change', () => {
      room.selected = objectSelect.value;
      render('object-title');
    });
    objectLabel.append(objectSelect);
    aside.append(objectLabel);
    const directory = el('div', undefined, { class: 'object-buttons' });
    view.objects.forEach((o, i) => {
      const control = button(
        'inspect-' + o.id,
        undefined,
        () => {
          room.selected = o.id;
          render('object-title');
        },
        { 'aria-current': o.id === room.selected ? 'true' : 'false' },
      );
      control.append(
        el('span', String(i + 1).padStart(2, '0'), {
          class: 'object-number',
          'aria-hidden': 'true',
        }),
        el('span', o.title),
      );
      directory.append(control);
    });
    aside.append(directory);
    layout.append(aside);
    const panel = el('section', undefined, {
      id: 'object-panel',
      class: 'object-panel',
      'aria-labelledby': 'object-title',
    });
    panel.append(el('p', 'INSPECT / UNDERSTAND / OPERATE', { class: 'eyebrow' }));
    panel.append(
      el('h2', object?.title || 'No visible objects', { id: 'object-title', tabindex: '-1' }),
    );
    const feedback = el('p', room.message, {
      id: 'feedback',
      role: 'status',
      tabindex: '-1',
      class: 'feedback',
    });
    panel.append(feedback);
    if (object) {
      panel.append(el('p', object.text));
      if (object.observations.length) {
        const observations = el('div', undefined, {
          class: 'observations',
          'aria-label': 'Current observations',
        });
        object.observations.forEach((text) => observations.append(el('p', text)));
        panel.append(observations);
      }
      for (const action of object.actions) {
        const form = el('form', undefined, { class: 'action' });
        if (action.input) {
          const label = el('label', action.label, { for: 'answer-' + action.id });
          const input = el('input', undefined, {
            id: 'answer-' + action.id,
            type: 'text',
            maxlength: '64',
            autocomplete: 'off',
            spellcheck: 'false',
          });
          input.value = room.drafts.get(action.id) || '';
          bind(input, 'input', () => room.drafts.set(action.id, input.value.slice(0, 64)));
          form.append(label, input);
        }
        const row = el('div', undefined, { class: 'action-row' });
        const apply = el('button', action.input ? 'Try answer' : action.label, {
          id: 'act-' + action.id,
          type: 'submit',
          class: 'apply',
        });
        row.append(apply);
        bind(form, 'submit', (e) => {
          e.preventDefault();
          const result = room.session.attempt(
            action.id,
            action.input ? room.drafts.get(action.id) || '' : null,
          );
          if (result.ok) {
            const after = room.session.view(story);
            const discovered = after.objects.filter(
              (o) => !view.objects.some((old) => old.id === o.id),
            );
            room.message = after.won
              ? 'The way is open. Room complete.'
              : 'Applied: ' + action.label + '.';
            if (discovered.length)
              room.message +=
                ' Newly visible: ' +
                discovered.map((o) => o.title).join(', ') +
                '. Choose it in Look around.';
          } else {
            room.message =
              result.code === 'incorrect'
                ? 'That answer does not fit. Room unchanged; your draft is retained.'
                : result.code === 'unchanged'
                  ? 'Already in that position. Room unchanged.'
                  : result.code === 'invalid'
                    ? 'Use an answer of at most 64 characters. Room unchanged.'
                    : 'The mechanism did not engage. Room unchanged; inspect the current setup.';
          }
          render(result.ok ? 'object-title' : 'feedback');
        });
        const count = room.hints.get(action.id) || 0;
        const help = button(
          'help-' + action.id,
          count < 3 ? `Hint ${count + 1} of 3` : 'Hints shown',
          () => {
            room.hints.set(action.id, Math.min(3, count + 1));
            render('hints-' + action.id);
          },
          {
            class: 'help',
            'aria-label':
              (count < 3 ? `Hint ${count + 1} of 3 for ` : 'All hints shown for ') + action.label,
          },
        );
        help.disabled = count === 3;
        row.append(help);
        form.append(row);
        const hints = el('div', undefined, {
          id: 'hints-' + action.id,
          tabindex: '-1',
          class: 'hints',
        });
        for (let i = 0; i < count; i++)
          hints.append(
            el('p', `${['Orientation', 'Constraint', 'Method'][i]}: ${action.hints[i]}`),
          );
        form.append(hints);
        panel.append(form);
      }
    }
    layout.append(panel);
    main.append(layout);
    if (view.won) {
      const ending = el('section', undefined, { id: 'ending', class: 'ending' });
      ending.append(
        el('p', 'A WAY THROUGH', { class: 'eyebrow' }),
        el('h2', 'Room complete'),
        el('p', d.ending[key]),
      );
      const next = contexts.findIndex((c, i) => i !== current && !c.session.view(story).won);
      if (next >= 0)
        ending.append(
          button('next-room', 'Choose another room', () => {
            current = next;
            render('room-title');
          }),
        );
      main.append(ending);
    }
    const bottom = el('div', undefined, { class: 'notebook-grid' });
    const notes = el('details', undefined, { id: 'notes-disclosure' });
    notes.open = room.notesOpen;
    bind(notes, 'toggle', () => {
      room.notesOpen = notes.open;
    });
    notes.append(el('summary', 'Scratch notebook'));
    notes.append(el('label', 'Your notes for this room', { for: 'scratch-notes' }));
    const textarea = el('textarea', undefined, {
      id: 'scratch-notes',
      rows: '5',
      maxlength: '4000',
      'aria-describedby': 'notes-limit',
    });
    textarea.value = room.notes;
    bind(textarea, 'input', () => {
      room.notes = textarea.value.slice(0, 4000);
    });
    notes.append(
      textarea,
      el(
        'p',
        'Up to 4,000 characters. Kept only in this session; no automatic saving or sending.',
        { id: 'notes-limit', class: 'quiet' },
      ),
    );
    const solution = el('details', undefined, { id: 'solution-disclosure' });
    solution.open = room.solutionOpen;
    bind(solution, 'toggle', () => {
      room.solutionOpen = solution.open;
    });
    solution.append(
      el('summary', 'Worked solution · spoilers'),
      el(
        'p',
        'This reveals the entire room, including later discoveries. It never completes actions for you.',
      ),
    );
    solution.append(
      button(
        'reveal-solution',
        room.revealed ? 'Hide worked solution' : 'Reveal entire solution',
        () => {
          room.revealed = !room.revealed;
          render(room.revealed ? 'solution-panel' : 'reveal-solution');
        },
      ),
    );
    if (room.revealed)
      solution.append(el('p', d.solution[key], { id: 'solution-panel', tabindex: '-1' }));
    bottom.append(notes, solution);
    main.append(bottom);
    root.append(main);
    const footer = el('footer');
    footer.append(
      el('p', d.provenance),
      el('p', `Room revision ${room.receipt.revision} · Source ${room.receipt.sourceSha256}`, {
        class: 'source-hash',
      }),
      el(
        'p',
        'Standalone rehearsal. Finite-model checks are not human difficulty calibration or production save acceptance.',
      ),
    );
    root.append(footer);
    if (focusId) document.getElementById(focusId)?.focus();
  }
  render();
})();
