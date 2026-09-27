/* Voices sheet, survey form and panels (docs/FEEDBACK-AND-SURVEYS.md). A deferred, precached
chunk that src/voices.js loads the first time the player opens Feedback or the survey, taps a
rating, finishes an official puzzle, opens Settings or Privacy, or has messages waiting. It wires
src/voices-queue.js to this browser and renders one modal <dialog> for both forms. */
(function (G) {
  'use strict';
  // A second execution (a retried load) must not register a second set of listeners.
  if (G.AlibiVoicesSheet) return;
  const V = G.ALIBI_VOICES || {},
    A = G.AlibiVoices,
    doc = document,
    release = G.ALIBI_CONFIG?.version,
    STATE = 'alibi:voices:state:v1',
    $ = (s) => doc.querySelector(s),
    esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
    icon = (n) => G.AlibiUI?.icon?.(n) || '',
    device = () => (G.innerWidth < 768 ? 'mobile' : G.innerWidth < 1024 ? 'tablet' : 'desktop'),
    Q = G.AlibiVoicesQueue({
      storage: (() => {
        try {
          return G.localStorage;
        } catch {}
      })(),
      fetch: (...a) => G.fetch(...a),
      uuid: () => G.crypto.randomUUID(),
      collector: V.collector,
      online: () => G.navigator?.onLine !== false,
    }),
    taste = Q.SURVEYS['alibi-taste-1'],
    // Local only: rating row switch, last ratings and answers, invitation snoozes.
    state = () => {
      let s;
      try {
        s = JSON.parse(G.localStorage.getItem(STATE));
      } catch {}
      return { ...s, rated: { ...s?.rated } };
    },
    save = (s) => {
      try {
        G.localStorage.setItem(STATE, JSON.stringify(s));
      } catch {}
    },
    // First completions of official puzzles, from the device's own records.
    done = () =>
      [...(A.records?.values?.() || [])]
        .map((r) => A.official(r) && Date.parse(r.firstCompletedAt || r.completedAt))
        .filter((t) => t > 0),
    // Re-decorates the page; focus stays on the same control or moves to the next safe one.
    refresh = () => {
      const id = doc.activeElement?.id;
      A(A.run, A.records);
      if (doc.activeElement === doc.body)
        (doc.getElementById(id) || $('.play-end .btn') || $('#vo-send') || $('#main'))?.focus();
    },
    ASK = {
      often: 'How often do you play?',
      more: 'What would you like more of?',
      difficulty: 'How does the difficulty feel?',
      tiers: 'Which tiers do you enjoy most?',
      next: 'What should come next?',
      feel: 'How does Alibi feel to use?',
      recommend: 'Would you recommend Alibi to a friend?',
    },
    NAMES = {
      bug: 'Something’s broken',
      idea: 'An idea',
      puzzle: 'A puzzle',
      other: 'Something else',
      'few-a-week': 'A few times a week',
      'first-time': 'Just started',
      'new-families': 'New kinds of puzzle',
      'club-games': 'More games-room games',
      polish: 'Polish what’s here',
      'archive-heist': 'Archive Heist',
      borough: 'Pocket Borough',
      duel: 'Lantern Duel',
      'block-cabinet': 'Block Cabinet',
      gardens: 'Lantern Gardens',
      casebooks: 'Mystery casebooks',
      castle: 'Wrenmere Castle',
    },
    name = (v) =>
      NAMES[v] || G.AlibiUI?.data?.[v]?.title || v[0].toUpperCase() + v.slice(1).replace(/-/g, ' '),
    // The contract's route vocabulary for the screen the sheet was opened from.
    route = () => {
      const [page = '', part = ''] = G.location.hash.slice(2).split(/[/?]/);
      return !page || page === 'home'
        ? 'home'
        : /^(play|story)$/.test(page)
          ? 'puzzle'
          : page === 'quiet'
            ? part === 'castle'
              ? 'castle'
              : 'quiet-wing'
            : /^(salon|club|lab)$/.test(page)
              ? 'games'
              : /^(settings|privacy)$/.test(page)
                ? 'settings'
                : 'other';
    },
    chips = (type, id, options, picked, required) =>
      `<div class="chips">${options.map((v) => `<label><input class="sr-only" type="${type}" name="${id}" value="${v}" ${[picked].flat().includes(v) ? 'checked' : ''} ${required ? 'required' : ''}>${esc(name(v))}</label>`).join('')}</div>`,
    actions = (send) =>
      `<p class="vo-error" role="alert"></p><div class="dialog-actions"><button class="btn">${send}</button><button type="button" class="btn secondary" data-vo-close>Cancel</button></div>`,
    full = 'Twenty messages are already waiting. Delete them in Settings or try later.',
    small = (n, what, act, label) =>
      n
        ? `<p class="fine">${n} message${n > 1 ? 's' : ''} ${what}. <button type="button" class="btn ghost" id="vo-${act}" data-vo-act="${act}">${label}</button></p>`
        : '';
  doc.head.append(
    Object.assign(doc.createElement('style'), {
      textContent:
        '.vo-sheet fieldset{border:0;padding:0;margin:0 0 18px}.vo-sheet legend{font-weight:600;font-size:14px;margin-bottom:9px}.vo-sheet small{font-weight:400;color:var(--muted)}.vo-sheet .chips label{display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;border:1px solid var(--line);border-radius:30px;font-size:12px;cursor:pointer}.vo-sheet .chips label:has(:checked){background:var(--green);border-color:var(--green);color:#fff}.vo-sheet .chips label:has(:focus-visible){outline:3px solid #b48c45;outline-offset:2px}.vo-sheet .dialog-close{width:44px;height:44px}.vo-sheet .field{margin-bottom:12px}.vo-sheet .field label{font-size:13px}.vo-rate{align-items:center;margin-top:14px}.vo-rate .chip{min-height:44px;font-size:12px}.vo-rate .chip:not(.active){background:var(--paper)}.vo-rate [role=status]{flex-basis:100%;font-size:12px}.vo-error:empty{display:none}.vo-error{color:var(--red);font-weight:600}.vo-offer{margin-top:18px;padding:14px 16px;border:1px dashed var(--line);border-radius:14px}.vo-offer .row{flex-wrap:wrap;gap:6px}.vo-offer .btn{margin-top:6px}',
    }),
  );
  // One modal sheet for both forms: focus moves in, Tab wraps, Escape closes, focus returns.
  let sheet, opener, context;
  function show(title, body) {
    if (!sheet) {
      sheet = doc.createElement('dialog');
      sheet.className = 'vo-sheet';
      // Clicking plain text inside focuses the sheet, never the page behind it.
      sheet.tabIndex = -1;
      sheet.setAttribute('aria-labelledby', 'vo-title');
      doc.body.append(sheet);
      sheet.addEventListener('keydown', (e) => {
        // Board shortcuts behind the sheet never see keys pressed here.
        e.stopPropagation();
        if (e.key !== 'Tab') return;
        const stops = [
            ...sheet.querySelectorAll('button,a[href],input,textarea,[tabindex]'),
          ].filter((el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length),
          edge = e.shiftKey ? stops[0] : stops[stops.length - 1];
        if (!stops.includes(doc.activeElement) || doc.activeElement === edge) {
          e.preventDefault();
          (e.shiftKey ? stops[stops.length - 1] : stops[0])?.focus();
        }
      });
      sheet.addEventListener('click', (e) => {
        if (e.target.closest('[data-vo-close]')) sheet.close();
      });
      sheet.addEventListener('close', () => {
        // The issue report opens the app's own dialog, which then owns focus.
        if (doc.querySelector('dialog[open]')) return;
        const target = opener?.isConnected ? opener : doc.getElementById(opener?.id);
        (target?.getClientRects().length ? target : $('#main'))?.focus({ preventScroll: true });
      });
      sheet.addEventListener('change', (e) => {
        const box = e.target,
          max = taste.questions.find((q) => q[0] === box.name)?.[1];
        if (
          box.checked &&
          max > 1 &&
          sheet.querySelectorAll(`[name="${box.name}"]:checked`).length > max
        ) {
          box.checked = false;
          say(`Choose up to ${max}.`);
        }
      });
      sheet.addEventListener('input', (e) => {
        if (e.target.id === 'vo-text')
          $('#vo-count').textContent = `${e.target.value.length} of 2,000 characters`;
      });
      sheet.addEventListener('submit', (e) => {
        e.preventDefault();
        (e.target.id === 'vo-form' ? sendFeedback : sendSurvey)(e.target);
      });
    }
    if (!sheet.open) opener = doc.activeElement;
    sheet.innerHTML = `<button type="button" class="dialog-close" data-vo-close aria-label="Close">${icon('close')}</button><h2 id="vo-title" tabindex="-1">${title}</h2>${body}`;
    if (!sheet.open) sheet.showModal();
    $('#vo-title').focus();
  }
  // A short-lived note in the app's toast area (cleared unless the app replaced it).
  function toast(text) {
    const area = $('#toasts'),
      html = `<div class="toast">${text}</div>`;
    if (!area) return;
    area.innerHTML = html;
    setTimeout(() => area.innerHTML === html && (area.innerHTML = ''), 5500);
  }
  const say = (text, focus) => {
    sheet.querySelector('.vo-error').textContent = text;
    focus?.focus();
  };
  // The confirmation replaces the form; if the player already closed the sheet it is a toast.
  function thanks(sent, answers) {
    const text = sent
      ? answers
        ? 'Your answers were sent.'
        : 'Your message was sent.'
      : G.navigator?.onLine === false
        ? 'You’re offline. It is saved on this device and will send when you’re back online.'
        : 'Saved on this device. It will send when the connection allows.';
    if (sheet.open)
      show(
        'Thank you.',
        `<p>${text}</p><div class="dialog-actions"><button type="button" class="btn solo" data-vo-close>Close</button></div>`,
      );
    else toast(text);
  }
  // True once the collector accepted the payload; after four seconds it stays queued.
  async function deliver(payload) {
    const key = JSON.stringify(payload);
    await Promise.race([Q.flush(), new Promise((r) => setTimeout(r, 4e3))]);
    return !Q.pending().some((x) => JSON.stringify(x.payload) === key);
  }
  function open(kind, subject) {
    if (!A.eligible)
      return show(
        'Feedback.',
        `<p>Sending feedback works on the main Alibi site, <a href="${V.origin}/" target="_blank" rel="noopener noreferrer">${esc(V.origin?.slice(8))}</a>. This copy sends nothing.</p><p>You can still export an issue report and share it yourself.</p><div class="dialog-actions"><button type="button" class="btn" data-action="feedback-report" data-vo-close>Create issue report</button><button type="button" class="btn secondary" data-vo-close>Close</button></div>`,
      );
    context = { kind, subject: subject || '', route: route() };
    show(
      kind === 'puzzle' ? 'Report a problem.' : 'Send feedback.',
      `<form id="vo-form" novalidate><fieldset><legend>What is it about?</legend>${chips('radio', 'kind', ['bug', 'idea', 'puzzle', 'praise', 'other'], kind)}</fieldset><div class="field"><label for="vo-text">Your message</label><textarea id="vo-text" maxlength="2000" rows="5" aria-describedby="vo-count vo-attached"></textarea><span class="fine" id="vo-count">0 of 2,000 characters</span></div><p class="fine" id="vo-attached">Sent with it: app version ${esc(release)}, this screen (${context.route})${context.subject ? `, puzzle ${esc(context.subject)}` : ''} and device type (${device()}). No saves, names or e-mail. We can’t reply, so leave out personal details.</p>${actions('Send')}</form>`,
    );
  }
  async function sendFeedback(form) {
    const text = $('#vo-text'),
      payload = Q.feedback({
        ...context,
        kind: form.elements.kind.value || 'other',
        text: text.value,
        release,
        device: device(),
      });
    if (!Q.clean(text.value)) return say('Write a message first.', text);
    if (!payload) return say('This browser cannot send feedback.');
    if (!Q.enqueue(payload)) return say(full);
    form.querySelector('.btn').disabled = true;
    thanks(await deliver(payload));
    refresh();
  }
  function survey() {
    if (!A.eligible) return open();
    const s = state(),
      prior = s.answers || {};
    show(
      s.taken ? 'Update your answers.' : 'What do you enjoy?',
      `<p class="fine">Seven short questions, two required. Send again any time to update your answers; you still count once. Nothing is sent until you press Send answers.</p><form id="vo-answers" novalidate>${taste.questions
        .map(
          ([id, max, options, required]) =>
            `<fieldset><legend>${ASK[id]} <small>${required ? '(required)' : max > 1 ? `(optional, up to ${max})` : '(optional)'}</small></legend>${chips(max > 1 ? 'checkbox' : 'radio', id, options, prior[id], required)}</fieldset>`,
        )
        .join(
          '',
        )}<div class="field"><label for="vo-comment">Anything else? <small>(optional)</small></label><textarea id="vo-comment" maxlength="500" rows="3">${esc(prior.comment)}</textarea></div><p class="fine">Your answers carry a random survey key made on this device, so a new answer replaces the old one. You can reset it in Privacy.</p>${actions('Send answers')}</form>`,
    );
  }
  async function sendSurvey(form) {
    const answers = {};
    for (const [id, max, , required] of taste.questions) {
      const picked = [...form.querySelectorAll(`[name="${id}"]:checked`)].map((i) => i.value);
      if (picked.length) answers[id] = max > 1 ? picked : picked[0];
      else if (required)
        return say(`Please answer: ${ASK[id]}`, form.querySelector(`[name="${id}"]`));
    }
    const comment = $('#vo-comment').value,
      payload = Q.survey({ survey: 'alibi-taste-1', answers, comment, release, device: device() });
    if (!payload) return say('This browser cannot send the survey.');
    if (!Q.enqueue(payload)) return say(full);
    save({
      ...state(),
      answers: { ...answers, comment: Q.clean(comment) },
      taken: { at: Date.now(), n: done().length, release },
      snoozes: 0,
      until: 0,
    });
    form.querySelector('.btn').disabled = true;
    thanks(await deliver(payload), 1);
    refresh();
  }
  doc.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-vo-act]'),
      a = el?.dataset.voAct,
      s = state();
    if (a === 'rate' || a === 'more') return A.official(A.run) && tap(el, A.official(A.run));
    if (!a || a === 'hide') return;
    if (a === 'snooze') save({ ...s, snoozes: (s.snoozes || 0) + 1, until: Date.now() + 6048e5 });
    if (a === 'never') save({ ...s, never: 1 });
    if (a === 'delete') Q.clear();
    if (a === 'dismiss') Q.dismissNotes();
    if (a === 'reset') (Q.resetRespondent(), save({ ...s, rated: {} }));
    refresh();
    if (a === 'reset') {
      const status = $('#vo-reset-status');
      status.textContent = 'Reset. A new key is made the next time you answer.';
      status.focus();
    }
  });
  doc.addEventListener('change', (e) => {
    if (e.target.dataset?.voAct === 'hide') save({ ...state(), hide: !e.target.checked });
  });
  // A rating tap: shown at once, kept locally, and sent (queued offline) when it has a difficulty.
  function tap(el, o) {
    const s = state(),
      r = { ...s.rated[o.subject] },
      before = JSON.stringify(r),
      row = el.closest('.vo-rate'),
      tell = (t) => (row.querySelector('[role=status]').textContent = t);
    if (el.dataset.voAct === 'rate') r.difficulty = el.dataset.value;
    else if (r.more) delete r.more;
    else r.more = 'yes';
    for (const b of row.querySelectorAll('button')) {
      const on = b.dataset.voAct === 'more' ? !!r.more : b.dataset.value === r.difficulty;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    }
    if (JSON.stringify(r) === before) return;
    const keep = () => save({ ...s, rated: { ...s.rated, [o.subject]: r } });
    if (!r.difficulty) return (keep(), tell('Choose how it felt to send this.'));
    const payload = Q.survey({
      survey: 'puzzle-rating',
      subject: o.subject,
      answers: r,
      meta: { family: o.family, tier: o.tier },
      release,
      device: device(),
    });
    // A choice that could not be queued is not remembered, so the same tap can retry.
    if (!payload || !Q.enqueue(payload)) return tell('Not sent. Try again later.');
    keep();
    deliver(payload).then((sent) => tell(sent ? 'Thanks, sent.' : 'Saved. It sends when online.'));
  }
  G.AlibiVoicesSheet = {
    // The rating row after the completion text; the Settings switch hides it.
    'vo-rate'(el) {
      const s = state(),
        r = s.rated[A.official(A.run)?.subject] || {},
        pick = (act, value, label, on) =>
          `<button type="button" class="chip${on ? ' active' : ''}" id="vo-${value}" data-vo-act="${act}" data-value="${value}" aria-pressed="${!!on}">${label}</button>`;
      if (s.hide) return el.remove();
      el.className = 'vo-rate chips';
      el.setAttribute('role', 'group');
      el.setAttribute('aria-labelledby', 'vo-rate-h');
      el.innerHTML = `<strong id="vo-rate-h">How was it?</strong>${[
        ['too-easy', 'Too easy'],
        ['just-right', 'Just right'],
        ['too-hard', 'Too hard'],
      ]
        .map(([v, label]) => pick('rate', v, label, r.difficulty === v))
        .join(
          '',
        )}${pick('more', 'yes', icon('heart') + 'More like this', r.more)}<span role="status"></span>`;
    },
    open,
    survey,
    flush: () => Q.flush(),
    'vo-offer'(el) {
      const kind = Q.due(state(), done(), release);
      if (!kind) return el.remove();
      el.className = 'vo-offer';
      el.innerHTML = `<p><strong>${kind > 1 ? 'Update your answers?' : 'Got a minute?'}</strong> ${kind > 1 ? 'Tell us if your taste has changed.' : 'Seven quick questions about what you enjoy and want more of.'} Nothing is sent until you submit.</p><div class="row actions"><button type="button" class="btn" id="vo-take" data-voice="survey">${kind > 1 ? 'Update answers' : 'Take the survey'}</button><button type="button" class="btn ghost" data-vo-act="snooze">Not now</button><button type="button" class="btn ghost" data-vo-act="never">Don’t ask again</button></div>`;
    },
    'vo-panel'(el) {
      const s = state(),
        on = A.eligible;
      el.className = 'panel';
      el.innerHTML = `<h2>Feedback and surveys.</h2><p>${on ? 'Tell the maintainer what works and what doesn’t, answer a short survey, or rate puzzles as you finish them. Nothing is sent until you press Send, submit or tap.' : 'Sending feedback works on the main Alibi site. Here you can create an issue report instead.'}</p><div class="row actions"><button type="button" class="btn" id="vo-send" data-voice="open">Send feedback</button>${on ? `<button type="button" class="btn secondary" id="vo-survey" data-voice="survey">${s.taken ? 'Update survey answers' : 'Take the short survey'}</button>` : ''}</div>${on ? `<div class="setting-row"><label for="vo-hide">Ask how a puzzle felt<small>“Too easy · Just right · Too hard” after official puzzles.</small></label><input type="checkbox" id="vo-hide" data-vo-act="hide" ${s.hide ? '' : 'checked'}></div>` : ''}${small(Q.pending().length, 'waiting to send', 'delete', 'Delete')}${small(Q.notes().length, 'could not be sent', 'dismiss', 'Dismiss')}`;
    },
    'vo-privacy'(el) {
      el.innerHTML = `<h2>Feedback, surveys and ratings.</h2><p>On the primary Cloudflare site you can send the maintainer a message, answer a short survey or rate a puzzle. Nothing is sent unless you press Send, submit the survey or tap a rating; the occasional survey invitation only asks. These go to Pulseboard whatever your Beta choices, because you chose to send them; Global Privacy Control and Do Not Track do not block them.</p><p><strong>Messages</strong> carry no identifier: your text, its kind, the screen, an official puzzle ID if you were on one, app version, the day you wrote it and device type (mobile, tablet or desktop). Pulseboard removes e-mail addresses, IP addresses, links and phone numbers it finds (best effort) and keeps messages 365 days. We can’t reply, so leave out personal details.</p><p><strong>Surveys and ratings</strong> carry a random survey key created on this device when you first submit one, so a new answer replaces your old one instead of counting as another player. It is never sent with usage counts, diagnostics or journeys, and Pulseboard stores only a one-way hash of it. Ratings add the puzzle ID, family and difficulty tier. Answers are kept 400 days.</p><p>No IP address, browser string, page address, name or e-mail is stored; country, browser and system are derived on the server as for usage data. Offline, up to 20 items wait on this device for up to 30 days; Settings shows them and can delete them. The fallback site, standalone file and Android app send nothing.</p>${Q.respondent() ? '<button type="button" class="btn secondary" id="vo-reset" data-vo-act="reset">Reset survey key</button>' : ''}<p class="fine" id="vo-reset-status" tabindex="-1" role="status"></p>`;
    },
    clear: () => Q.clear(),
  };
})(globalThis);
