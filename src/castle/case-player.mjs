import Session from '../../tools/case-session.cjs';
import { freshCase, verdicts, CASE_HASH } from './case-state.mjs';
import { fetchPack } from '../workshop-add.mjs';
import { escape } from './html.mjs';
import { createShare } from './case-share.mjs';

// The activity owns the record; this optional surface owns only its controls and fetch lifetime.
export function mount({ root, store, save }) {
  const controller = new AbortController();
  const { signal } = controller;
  const share = createShare();
  let receiptModule, receipt;
  signal.addEventListener('abort', () => share.dispose(), { once: true });
  signal.addEventListener('abort', () => receipt?.dispose(), { once: true });
  const config = CASE_DELIVERY;
  const base = new URL(import.meta.url);
  const sourceURL = new URL(config.download, base);
  const cacheName = 'alibi-case-pack-' + CASE_HASH;
  let definition,
    priorHelp = new Set(),
    stage = 0,
    busy = false,
    message = '',
    offline = false,
    previousStory;
  const record = () => store.state.caseStudy;
  const completed = () => definition.steps.slice(0, record().answers.length).map((s) => s.id);
  const button = (text, action, value = '') =>
    `<button id="case-${action}-${escape(value)}" type="button" data-case-action="${action}" data-value="${escape(value)}">${escape(text)}</button>`;
  const current = () => !signal.aborted && root.isConnected;
  function receiptMarkup() {
    if (receipt) return receipt.markup();
    return `<section class="card case-receipt" aria-labelledby="case-receipt-title"><h2 id="case-receipt-title">Local playtest receipt</h2><p>Off until started. It counts stages, modes, hints, reveals and checks; earlier help is marked prior. No answers, citations, notes, saves, devices or timings. It stays in memory; nothing is sent. First use may download the module.</p><div class="actions">${button('Start local playtest receipt', 'receipt-start')}</div></section>`;
  }
  function status() {
    if (!current()) return;
    root.querySelector('[data-case-status]').textContent = message;
    for (const el of root.querySelectorAll('button,select,input,textarea'))
      el.disabled = busy || store.mode !== 'local';
  }
  function draw(focused = root.getRootNode().activeElement?.id) {
    if (!current()) return;
    const story = store.state.preferences.story;
    if (previousStory !== undefined && previousStory !== story) receipt?.mode(story);
    previousStory = story;
    root.innerHTML = `<style>.case-player fieldset{margin:1rem 0;padding:1rem;min-width:0}.case-player label{display:block;margin:.5rem 0}.case-player select{max-width:100%;min-height:44px}.case-player input{min-width:24px;min-height:24px;vertical-align:middle}.case-player article{scroll-margin:1rem}.case-player .actions{flex-wrap:wrap}</style><section class="page case-player"><p class="eyebrow">Experimental evidence case · revision 1</p><h1>The Reading Room Blackout</h1><p>This fictional study is separate from Wrenmere Chapter I. Wording and fairness still await editorial review. It adds no points.</p><p role="status" aria-live="polite" data-case-status></p><div data-case-content></div></section>`;
    const area = root.querySelector('[data-case-content]');
    if (!definition || !record()) {
      area.innerHTML = `<p>Install on request to keep drafts and accepted answers in your Castle notebook. Export it from the Notebook before changing devices. Installation needs a connection and device storage.</p>${button(record() ? 'Retry opening saved case' : 'Install experimental case', 'install')}`;
    } else {
      const c = record(),
        step = definition.steps[stage];
      const projection = Session.project(definition, completed(), step.id, story);
      const refs = (ids) =>
        ids
          .map((id) => button(definition.records.find((r) => r.id === id).title, 'source', id))
          .join(' ');
      area.innerHTML = `<p>${offline ? 'Case ready offline.' : 'Offline files unavailable; reconnect to retain them.'} ${c.answers.length}/3 stages accepted.</p>${button('Share invitation', 'share-open')}${share.text === null ? '' : `<section class="card" aria-labelledby="case-share-title"><h2 id="case-share-title">Share an invitation</h2><p>No progress, notes or answers are included. Copy only if you choose.</p><p id="case-share-text" tabindex="-1" style="white-space:pre-wrap">${escape(share.text)}</p><div class="actions">${button('Copy invitation', 'share-copy')}${button('Cancel', 'share-cancel')}</div></section>`}${receiptMarkup()}<p>${escape(definition.intro[story ? 'storyOn' : 'storyOff'])}</p>${button(story ? 'Turn story off' : 'Turn story on', 'story')}<nav class="actions" aria-label="Case stages">${definition.steps
        .filter((s) => Session.available(definition, completed()).includes(s.id))
        .map((s) => button(s.title, 'stage', s.id))
        .join(
          '',
        )}</nav><h2 tabindex="-1" id="case-stage">${escape(step.title)}</h2><p>${escape(projection.prompt)}</p><section aria-label="Case sources">${projection.records.map((r) => `<article class="card" tabindex="-1" id="case-source-${escape(r.id)}"><h3>${escape(r.title)}</h3><p>${escape(r.kind)} · ${escape(r.source)}</p><p>${escape(r.text)}</p></article>`).join('')}</section><form>${projection.claims.map((claim, i) => `<fieldset><legend>${escape(claim.text)}</legend><label for="case-verdict-${i}">Verdict</label><select id="case-verdict-${i}" data-case-verdict="${i}">${verdicts.map((v) => `<option value="${v}" ${c.drafts[stage][i][0] === v ? 'selected' : ''}>${v ? v.replaceAll('-', ' ') : 'Choose a verdict'}</option>`).join('')}</select><p>Smallest sufficient source set</p>${projection.records.map((r, j) => `<label><input type="checkbox" id="case-cite-${i}-${j}" data-case-cite="${i}" value="${escape(r.id)}" ${c.drafts[stage][i][1].includes(r.id) ? 'checked' : ''}> ${escape(r.title)}</label>`).join('')}</fieldset>`).join('')}<div class="actions">${button('Check this stage', 'check')}${button('Next hint', 'hint')}${button('Show worked answer', 'reveal')}</div></form>${projection.hints
        .slice(0, c.hints[stage])
        .map(
          (h) =>
            `<aside class="card"><h3>${escape(h.level)}</h3><p>${escape(h.text)}</p>${refs(h.records)}</aside>`,
        )
        .join(
          '',
        )}${c.revealed[stage] ? `<aside class="card"><h3>Worked answer · does not complete the stage</h3><p>${escape(Session.worked(definition, completed(), step.id, story).text)}</p>${refs(step.workedAnswer.records)}</aside>` : ''}${c.answers.length === 3 ? `<h2>Case complete</h2><p>${escape(definition.ending[story ? 'storyOn' : 'storyOff'])}</p>` : ''}`;
    }
    if (focused) root.querySelector(`#${CSS.escape(focused)}`)?.focus({ preventScroll: true });
    status();
  }
  async function change(edit) {
    if (!current()) return;
    const next = structuredClone(store.state);
    edit(next);
    next.revision++;
    if (!(await save(next)))
      throw Error(
        store.error || 'Case progress was not saved. Export the Castle notebook before reloading.',
      );
  }
  async function load(install) {
    const downloadSignal = AbortSignal.any([signal, AbortSignal.timeout(15000)]);
    const cache = await caches.open(cacheName);
    const cached = await cache.match(sourceURL);
    const bytes = await fetchPack(
      config,
      base,
      (url, options) => cached || fetch(url, { ...options, signal: downloadSignal }),
      () => {
        if (current()) {
          message = 'Downloading and checking the case…';
          status();
        }
      },
    );
    if (config.sha256 !== CASE_HASH)
      throw Error('This case source is not supported by this reader.');
    const source = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!current()) return;
    // Verified source bytes are committed to the optional cache before the save claims installation.
    if (!(await cache.match(base))) await cache.add(new Request(base, { signal: downloadSignal }));
    if (!current()) return;
    await cache.put(
      sourceURL,
      new Response(bytes, { headers: { 'Content-Type': 'application/json' } }),
    );
    if (!current()) return;
    offline = !!(await cache.match(base)) && !!(await cache.match(sourceURL));
    if (!offline) throw Error('Case files were not retained. Nothing was installed.');
    definition = source;
    if (install && !record())
      await change((n) => {
        n.caseStudy = freshCase();
      });
    stage = Math.min(record()?.answers.length || 0, 2);
    message = install ? 'Case installed and saved on this device.' : '';
  }
  async function loadReceiptModule() {
    const spec = config.receipt;
    const entry = { ...spec, id: 'receipt', kind: 'module' };
    const url = new URL(spec.download, base);
    const cache = await caches.open(cacheName);
    let verified;
    const cached = await cache.match(url);
    if (cached) {
      try {
        verified = await fetchPack(
          entry,
          base,
          () => cached,
          () => {},
          signal,
        );
      } catch {
        await cache.delete(url);
      }
    }
    if (!verified) {
      if (!current()) return null;
      const downloadSignal = AbortSignal.any([signal, AbortSignal.timeout(15000)]);
      try {
        verified = await fetchPack(entry, base, fetch, () => {}, downloadSignal);
      } catch {
        throw Error('Receipt unavailable. No collection started; reconnect and retry.');
      }
      if (!current()) return null;
      await cache.put(
        url,
        new Response(verified, { headers: { 'Content-Type': 'text/javascript' } }),
      );
      if (!current()) return null;
    }
    if (!current()) return null;
    // The existing case-pack service-worker cache serves this same-origin hashed URL offline.
    // Without a controller, import() may issue its own request; a verified Cache Storage read
    // alone does not promise which response the browser executes.
    const module = await import(url.href);
    return current() ? module : null;
  }
  async function run(operation, focusAfter) {
    if (busy || !current()) return;
    const focused = root.getRootNode().activeElement?.id;
    busy = true;
    message = 'Saving or preparing the case…';
    status();
    try {
      await operation();
    } catch (error) {
      if (current()) message = error.message;
    } finally {
      busy = false;
      draw(focusAfter?.() || focused);
    }
  }
  root.addEventListener('submit', (e) => e.preventDefault(), { signal });
  root.addEventListener(
    'change',
    (e) => {
      const el = e.target;
      if (!el.matches('[data-case-verdict],[data-case-cite]')) return;
      const i = Number(el.dataset.caseVerdict ?? el.dataset.caseCite);
      const value = el.value,
        checked = el.checked;
      run(async () => {
        await change((n) => {
          const a = n.caseStudy.drafts[stage][i];
          if (el.dataset.caseVerdict !== undefined) a[0] = value;
          else a[1] = checked ? [...a[1], value] : a[1].filter((id) => id !== value);
        });
        message = 'Draft saved.';
      });
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest('[data-case-action]');
      if (!el || !root.contains(el) || busy || store.mode !== 'local') return;
      const action = el.dataset.caseAction,
        value = el.dataset.value;
      if (action === 'source') {
        root.querySelector('#case-source-' + value)?.focus();
        return;
      }
      run(
        async () => {
          if (action === 'install') return load(true);
          if (action === 'share-open') {
            share.open(definition, completed());
            message = '';
          } else if (action === 'share-cancel') {
            share.cancel();
            message = 'Invitation closed.';
          } else if (action === 'share-copy') {
            const result = await share.copy((text) => navigator.clipboard.writeText(text));
            if (result === 'copied') message = 'Invitation copied.';
            else if (result === 'blocked')
              message =
                'The browser blocked copying. Select the invitation text to copy it yourself.';
          } else if (action === 'receipt-start') {
            const stageId = definition.steps[stage].id;
            const saved = record();
            priorHelp = new Set(
              definition.steps
                .filter((_, i) => saved.hints[i] > 0 || saved.revealed[i] === true)
                .map((step) => step.id),
            );
            const startReceipt = {
              storyOn: store.state.preferences.story,
              stageId,
              completed: completed().includes(stageId),
              priorAssistance: priorHelp.has(stageId),
            };
            if (!receipt) {
              receiptModule ??= await loadReceiptModule();
              if (!receiptModule || !current()) return;
              receipt = receiptModule.createCaseReceipt({ definition, sourceSha256: CASE_HASH });
              receipt.attach({
                root,
                signal,
                run,
                setMessage: (text) => (message = text),
                canAct: () => !busy && store.mode === 'local',
              });
            }
            receipt.start(startReceipt);
            message = 'Receipt on for this page.';
          } else if (action === 'stage') {
            const index = definition.steps.findIndex((s) => s.id === value);
            if (index < 0 || index > record().answers.length) return;
            stage = index;
            const stageId = definition.steps[index].id;
            receipt?.open(stageId, completed().includes(stageId), priorHelp.has(stageId));
            message = '';
          } else if (action === 'story') {
            await change((n) => {
              n.preferences.story = !n.preferences.story;
            });
            receipt?.mode(store.state.preferences.story);
            message = 'Story mode changed. Drafts and progress retained.';
          } else if (action === 'check') {
            const step = definition.steps[stage],
              answers = record().drafts[stage];
            const result = Session.submit(
              definition,
              completed(),
              step.id,
              step.claims.map((c, i) => ({
                id: c.id,
                verdict: answers[i][0],
                citations: answers[i][1],
              })),
            );
            const receiptShape = () =>
              answers.map(([verdict, citations]) => ({
                hasVerdict: Boolean(verdict),
                citations: Array.isArray(citations) ? citations.map(() => true) : citations,
              }));
            if (!result.ok) {
              if (receipt?.enabled) receipt.submission(step.id, false, receiptShape());
              message =
                'Check your verdicts and smallest sufficient source sets. Your draft is kept.';
            } else if (stage < record().answers.length) {
              if (receipt?.enabled) receipt.submission(step.id, true, receiptShape());
              message = 'This stage was already accepted. Progress unchanged.';
            } else {
              await change((n) => {
                n.caseStudy.answers.push(structuredClone(answers));
              });
              if (receipt?.enabled) receipt.submission(step.id, true, receiptShape());
              message = 'Stage accepted and saved. Choose the next stage above.';
            }
          } else if (action === 'hint') {
            if (record().hints[stage] >= 3) {
              message = 'All hints for this stage are shown.';
              return;
            }
            await change((n) => {
              n.caseStudy.hints[stage]++;
            });
            receipt?.hint(definition.steps[stage].id);
            message = 'Hint shown. This does not complete the stage.';
          } else if (action === 'reveal') {
            await change((n) => {
              n.caseStudy.revealed[stage] = true;
            });
            receipt?.reveal(definition.steps[stage].id);
            message = 'Worked answer shown. This does not complete the stage.';
          }
        },
        action.startsWith('share-')
          ? () => (share.text === null ? 'case-share-open-' : 'case-share-text')
          : action === 'receipt-start'
            ? () => receipt?.focus(action)
            : undefined,
      );
    },
    { signal },
  );
  draw();
  if (record()) run(() => load(false));
  return { dispose: () => controller.abort(), refresh: draw };
}
