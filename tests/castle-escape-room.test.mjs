import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import S from '../tools/escape-state.cjs';
import {
  createEscapeAdapter,
  createEscapeHost,
  roomMarkup,
  inspectorMarkup,
} from '../src/castle/escape-room.mjs';
import { appendObservation } from '../src/castle/objects-runtime.mjs';

const dir = new URL('../content/escape-rooms/', import.meta.url);
const rooms = Object.fromEntries(
  fs
    .readdirSync(dir)
    .map((file) => JSON.parse(fs.readFileSync(new URL(file, dir), 'utf8')))
    .map((d) => [d.id, d]),
);
const handle = (d, a) => `${d.id}@${d.revision}/${a.object}/${a.id}`;
const input = (a) => (a.input ? a.answer : null);
const handles = (markup) =>
  [...markup.matchAll(/data-do="escape-act" data-value="([^"]*)"/g)].map((m) => m[1]);
const attr = (tag, name) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];
function renderedButton(markup, action, value) {
  const tag = [...markup.matchAll(/<button\b[^>]*>/g)]
    .map((match) => match[0])
    .find(
      (candidate) =>
        attr(candidate, 'data-do') === action && attr(candidate, 'data-value') === value,
    );
  assert.ok(tag, `rendered ${action} control for ${value}`);
  return { route: attr(tag, 'data-escape-route'), value: attr(tag, 'data-value') };
}
function renderedAnswer(markup, handle) {
  const tag = [...markup.matchAll(/<input\b[^>]*>/g)]
    .map((match) => match[0])
    .find((candidate) => attr(candidate, 'data-escape-answer') === handle);
  assert.ok(tag, `rendered answer input for ${handle}`);
  return { route: attr(tag, 'data-escape-route'), value: attr(tag, 'data-escape-answer') };
}

// Breadth-first over the declared model; each reachable state with the shortest action path to it.
function reachable(d) {
  const start = S.initial(d);
  const seen = new Map([[JSON.stringify(start), { state: start, path: [] }]]);
  for (const { state, path } of seen.values()) {
    for (const a of d.actions) {
      const next = S.transition(d, state, a.id, input(a));
      const key = JSON.stringify(next.state);
      if (next.ok && !seen.has(key)) seen.set(key, { state: next.state, path: [...path, a] });
    }
  }
  return [...seen.values()];
}
function replay(d, path) {
  const room = createEscapeAdapter(d);
  for (const a of path) assert.equal(room.act(handle(d, a), input(a)).ok, true);
  return room;
}

test('Every reachable state offers the same actions in the list and the inspector', () => {
  let states = 0;
  for (const d of Object.values(rooms))
    for (const { path } of reachable(d)) {
      states++;
      const view = replay(d, path).view(true);
      const list = handles(roomMarkup(view)).sort();
      const inspected = view.objects.flatMap((o) => handles(inspectorMarkup(view, o.id))).sort();
      assert.deepEqual(list, inspected, `${d.id} after ${path.map((a) => a.id)}`);
      assert.deepEqual(list, view.objects.flatMap((o) => o.actions.map((a) => a.handle)).sort());
    }
  assert.equal(states, 648);
});

test('Unoffered handles are no-ops and every applied action undoes exactly', () => {
  for (const d of Object.values(rooms))
    for (const { state, path } of reachable(d)) {
      const room = replay(d, path);
      const before = room.view(true);
      const offered = new Set(before.objects.flatMap((o) => o.actions.map((a) => a.handle)));
      assert.deepEqual(
        before.inventory,
        d.variables.filter((v) => state[v.id] === 'held').map((v) => v.id),
      );
      for (const a of d.actions) {
        const result = room.act(handle(d, a), input(a));
        if (!offered.has(handle(d, a))) assert.equal(result.code, 'stale');
        if (result.ok) {
          assert.equal(room.undo(), true);
        } else assert.match(result.message, /unchanged|complete/i);
        assert.deepEqual(room.view(true), before, `${d.id} ${a.id} after ${path.map((p) => p.id)}`);
      }
    }
});

test('Picking up or placing an item twice never clones it', () => {
  const d = rooms['tidekeeper-workshop'];
  const room = createEscapeAdapter(d);
  const act = (id, value = null) => room.act(`tidekeeper-workshop@1/${id}`, value);
  assert.equal(act('locker/take-handle').code, 'stale');
  assert.equal(act('locker/open-cabinet', '9 4 7 2').code, 'incorrect');
  assert.equal(room.view().undoDepth, 0);
  assert.equal(act('locker/open-cabinet', ' 9472 ').ok, true);
  assert.equal(act('locker/take-handle').ok, true);
  assert.deepEqual(room.view().inventory, ['handle']);
  assert.equal(act('locker/take-handle').code, 'stale');
  assert.deepEqual(room.view().inventory, ['handle']);
  assert.equal(act('lifting-gear/install-handle').ok, true);
  assert.equal(act('lifting-gear/install-handle').code, 'stale');
  assert.equal(act('locker/stow-handle').code, 'stale');
  assert.deepEqual(room.view().inventory, []);
  assert.match(roomMarkup(room.view()), /Nothing in hand\./);
  // A handle naming the wrong object for a real action is refused.
  assert.equal(act('locker/remove-handle').code, 'stale');
  assert.equal(act('lifting-gear/remove-handle').ok, true);
  assert.match(roomMarkup(room.view()), /In hand: handle/);
});

test('A control kept from before an object was hidden cannot operate it', () => {
  const d = rooms['counterweight-loft'];
  const target = reachable(d).find(({ state }) => state.latch === 'set');
  const room = replay(d, target.path);
  const kept = room.view().objects.find((o) => o.id === 'tool-compartment').actions[0];
  assert.equal(kept.handle, 'counterweight-loft@1/tool-compartment/take-tool');
  // Undo re-hides the compartment, leaving the rendered take-tool control stale.
  assert.equal(room.undo(), true);
  const hidden = room.view();
  assert.equal(
    hidden.objects.some((o) => o.id === 'tool-compartment'),
    false,
  );
  assert.equal(room.act(kept.handle).code, 'stale');
  assert.deepEqual(room.view(), hidden);
});

test('A source revision change refuses handles rendered for the old revision', () => {
  const d = rooms['tidekeeper-workshop'];
  const next = createEscapeAdapter({ ...d, revision: 2 });
  assert.equal(next.act('tidekeeper-workshop@1/locker/open-cabinet', '9472').code, 'stale');
  assert.equal(next.act('tidekeeper-workshop@2/locker/open-cabinet', '9472').ok, true);
  assert.equal(next.act(42).code, 'stale');
});

test('Adapter metadata and handles stay bound to captured source primitives', () => {
  const source = { ...rooms['tidekeeper-workshop'] };
  const room = createEscapeAdapter(source);
  const before = room.view();
  const open = before.objects.find((o) => o.id === 'locker').actions[0];

  source.title = 'Changed after adapter creation';
  source.revision = 2;

  const after = room.view();
  assert.equal(after.title, before.title);
  assert.equal(after.revision, before.revision);
  assert.deepEqual(
    after.objects.flatMap((o) => o.actions.map((a) => a.handle)),
    before.objects.flatMap((o) => o.actions.map((a) => a.handle)),
  );
  assert.equal(room.act(open.handle, '9472').ok, true);
  assert.equal(room.act(open.handle.replace('@1/', '@2/'), '9472').code, 'stale');
});

test('A/B/A navigation keeps each room and refuses controls from an earlier visit', () => {
  const host = createEscapeHost([rooms['tidekeeper-workshop'], rooms['counterweight-loft']]);
  const a1 = host.enter('tidekeeper-workshop');
  const open = 'tidekeeper-workshop@1/locker/open-cabinet';
  const a1View = host.view();
  const a1Markup = roomMarkup(a1View);
  const a1Inspector = inspectorMarkup(a1View, 'locker');
  const a1Action = renderedButton(a1Markup, 'escape-act', open);
  assert.equal(a1Action.route, String(a1));
  assert.equal(renderedButton(a1Markup, 'escape-object', 'locker').route, String(a1));
  assert.equal(renderedAnswer(a1Inspector, open).route, String(a1));
  assert.equal(renderedButton(a1Inspector, 'escape-act', open).route, String(a1));
  assert.equal(renderedButton(a1Inspector, 'keep-observation', 'locker').route, String(a1));

  const b = host.enter('counterweight-loft');
  assert.equal(host.act(a1, open, '9472').code, 'stale');
  assert.equal(host.act(b, open, '9472').code, 'stale');
  assert.equal(host.act(b, 'counterweight-loft@1/weight-object-1/weight-1-left').ok, true);
  const a2 = host.enter('tidekeeper-workshop');
  assert.equal(host.act(b, open, '9472').code, 'stale');
  assert.equal(host.act(a1, open, '9472').code, 'stale');
  assert.equal(host.view().undoDepth, 0);
  const a2Markup = roomMarkup(host.view());
  const a2Action = renderedButton(a2Markup, 'escape-act', open);
  assert.equal(a2Action.route, String(a2));
  // Dispatch the exact token read from each rendered control, as a browser's dataset would.
  assert.equal(host.act(a1Action.route, a1Action.value, '9472').code, 'stale');
  assert.equal(host.act(a2Action.route, a2Action.value, '9472').ok, true);
  const b2 = host.enter('counterweight-loft');
  assert.equal(host.view().undoDepth, 1);
  assert.equal(host.enter('unknown') > b2, true);
  assert.equal(host.view(), null);
});

test('Adapter objects fit the Castle inspector, notebook and focus-return conventions', () => {
  const room = createEscapeAdapter(rooms['tidekeeper-workshop']);
  const view = room.view(false);
  const ledger = view.objects.find((o) => o.id === 'ledger');
  assert.equal(appendObservation('', ledger).added, true);
  const markup = roomMarkup(view);
  assert.doesNotMatch(markup, /data-escape-route=/);
  assert.doesNotMatch(inspectorMarkup(view, 'locker'), /data-escape-route=/);
  for (const o of view.objects)
    assert.match(markup, new RegExp(`data-do="escape-object" data-value="${o.id}"`));
  assert.match(
    inspectorMarkup(view, 'locker'),
    /data-escape-answer="tidekeeper-workshop@1\/locker\/open-cabinet"/,
  );
  assert.equal(inspectorMarkup(view, 'missing'), '');
  const hostile = createEscapeAdapter({
    ...rooms['tidekeeper-workshop'],
    title: '<img src=x onerror=alert(1)>',
  }).view();
  assert.doesNotMatch(roomMarkup(hostile), /<img/);
});
