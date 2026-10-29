import Session from '../../tools/case-session.cjs';
import { freshCase, verdicts, CASE_HASH } from './case-state.mjs';
import { fetchPack } from '../workshop-add.mjs';
import { escape } from './html.mjs';

// The activity owns the record; this optional surface owns only its controls and fetch lifetime.
export function mount({ root, store, save }) {
  const controller = new AbortController();
  const { signal } = controller;
  const config = CASE_DELIVERY;
  const base = new URL(import.meta.url);
  const sourceURL = new URL(config.download, base);
  const cacheName = 'alibi-case-pack-' + CASE_HASH;
  let definition,
    stage = 0,
    busy = false,
    message = '',
    offline = false;
  const record = () => store.state.caseStudy;
  const completed = () => definition.steps.slice(0, record().answers.length).map((s) => s.id);
  const button = (text, action, value = '') =>
    `<button id="case-${action}-${escape(value)}" type="button" data-case-action="${action}" data-value="${escape(value)}">${escape(text)}</button>`;
  const current = () => !signal.aborted && root.isConnected;
  function status() {
    if (!current()) return;
    root.querySelector('[data-case-status]').textContent = message;
    for (const el of root.querySelectorAll('button,select,input'))
      el.disabled = busy || store.mode !== 'local';
  }
  function draw(focused = root.getRootNode().activeElement?.id) {
    if (!current()) return;
    const story = store.state.preferences.story;
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
      area.innerHTML = `<p>${offline ? 'Case ready offline.' : 'Offline files unavailable; reconnect to retain them.'} ${c.answers.length}/3 stages accepted.</p><p>${escape(definition.intro[story ? 'storyOn' : 'storyOff'])}</p>${button(story ? 'Turn story off' : 'Turn story on', 'story')}<nav class="actions" aria-label="Case stages">${definition.steps
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
  async function run(operation) {
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
      draw(focused);
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
      run(async () => {
        if (action === 'install') return load(true);
        if (action === 'stage') {
          const index = definition.steps.findIndex((s) => s.id === value);
          if (index < 0 || index > record().answers.length) return;
          stage = index;
          message = '';
        } else if (action === 'story') {
          await change((n) => {
            n.preferences.story = !n.preferences.story;
          });
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
          if (!result.ok)
            message =
              'Check your verdicts and smallest sufficient source sets. Your draft is kept.';
          else if (stage < record().answers.length)
            message = 'This stage was already accepted. Progress unchanged.';
          else {
            await change((n) => {
              n.caseStudy.answers.push(structuredClone(answers));
            });
            message = 'Stage accepted and saved. Choose the next stage above.';
          }
        } else if (action === 'hint') {
          await change((n) => {
            n.caseStudy.hints[stage] = Math.min(3, n.caseStudy.hints[stage] + 1);
          });
          message = 'Hint shown. This does not complete the stage.';
        } else if (action === 'reveal') {
          await change((n) => {
            n.caseStudy.revealed[stage] = true;
          });
          message = 'Worked answer shown. This does not complete the stage.';
        }
      });
    },
    { signal },
  );
  draw();
  if (record()) run(() => load(false));
  return () => controller.abort();
}
