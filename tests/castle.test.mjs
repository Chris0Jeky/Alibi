import test from 'node:test';
import assert from 'node:assert/strict';
import W from '../src/castle/content.mjs';
import * as E from '../src/castle/engine.mjs';

for (const id of E.ids) test(`Wrenmere: ${id} accepts its worked solution`, () => {
  assert.equal(E.check(id, W.puzzles[id].solution), true);
});
test('The story is reachable; each activity grants points once', () => {
  let s = E.initial();
  for (const id of ['gate', 'shelves', 'clock', 'route', 'inference', 'lamps', 'hanoi', 'bridges', 'magic', 'ur']) {
    const r = E.complete(s, id, W.puzzles[id].solution);
    assert.equal(r.ok, true, id);
    s = E.validate(r.state);
    assert.equal(E.complete(s, id, W.puzzles[id].solution).newAward, false);
  }
  assert.equal(E.score(s), 100);
  assert.equal(E.evidence(s).length, 4);
  assert.equal(E.roomStatus(s, W.rooms.find(r => r.id === 'west-stair')).open, true);
});
test('Museum investigations provide a second route into the Map Room', () => {
  for (const id of ['bridges', 'magic']) {
    const s = E.complete(E.initial(), id, W.puzzles[id].solution).state;
    assert.equal(E.available(s, 'route'), true);
    assert.equal(E.available(s, 'inference'), false);
  }
});
test('A feasible route does not establish an eyewitness account', () => {
  assert.equal(E.check('inference', 'definitely-present'), false);
  assert.equal(E.check('inference', 'too-late'), false);
  assert.equal(E.check('route', ['S', 'L', 'A', 'T']), false);
  assert.equal(E.routeTime(['S', 'B', 'O', 'T']), 7);
  assert.equal(E.complete(E.initial(), 'clock', '21:00').ok, false);
});
test('Gate and shelf constraints have exactly one semantic solution', () => {
  const gate=[];
  for(let a=0;a<7;a++)for(let b=0;b<7;b++)for(let c=0;c<7;c++)if(E.check('gate',[a,b,c]))gate.push([a,b,c]);
  assert.deepEqual(gate, [[1,3,5]]);
  const permute = xs => xs.length ? xs.flatMap((x,i) => permute(xs.filter((_,j)=>i!==j)).map(ys=>[x,...ys])) : [[]];
  assert.equal(permute(W.puzzles.shelves.setup).filter(p=>E.check('shelves',p)).length,1);
});
test('Lo Shu accepts symmetry; Hanoi rejects illegal and unbounded logs', () => {
  assert.equal(E.check('magic', [8,3,4,1,5,9,6,7,2]), true);
  assert.equal(E.hanoi([[0,1],[0,1]]), null);
  assert.equal(E.hanoi(Array(1001).fill([0,1])), null);
  assert.equal(E.routeTime(['S','B','S']), null);
});
test('Unknown and nested future fields remain protected', () => {
  for (const edit of [s=>s.version=2,s=>s.preferences.future=true,s=>s.completed.gate={answer:[1,3,5],guided:false,future:1},s=>s.drafts.constructor=[]]) {
    const s=E.initial();edit(s);assert.throws(()=>E.validate(s));
  }
  const s=E.initial();s.completed.clock={answer:'21:00',guided:false};assert.throws(()=>E.validate(s));
});
test('Unfinished boards need valid shapes, not solved states', () => {
  const s=E.initial();s.drafts.gate=[0,0,0];s.notes='<script>text, never markup</script>';
  assert.deepEqual(E.validate(s),s);
  s.notes='a'.repeat(12001);assert.throws(()=>E.validate(s));
});
test('Planned rooms are not presented as undiscovered content', () => {
  assert.equal(W.rooms.length,32);
  assert.equal(W.rooms.filter(r=>r.implemented).length,10);
  for(const r of W.rooms.filter(r=>!r.implemented))assert.equal(E.roomStatus(E.initial(),r).open,false);
});
