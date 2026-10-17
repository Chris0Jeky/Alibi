'use strict';
const prose = (s = 'A fictional mechanism.') => ({ storyOn: s, storyOff: s });
function fixture() {
  return {
    format: 'postern-escape-1',
    id: 'test-room',
    revision: 1,
    title: 'Test room',
    provenance: 'Original test fixture.',
    intro: prose(),
    ending: prose(),
    solution: prose(),
    variables: [
      { id: 'key', values: ['held', 'lost'], initial: 'held' },
      { id: 'door', values: ['closed', 'open'], initial: 'closed' },
    ],
    objects: [{ id: 'hatch', title: 'Hatch', when: {}, text: prose(), observations: [] }],
    actions: [
      {
        id: 'leave',
        object: 'hatch',
        label: 'Try the hatch',
        when: {},
        check: { key: 'held' },
        set: { door: 'open' },
        input: false,
        answer: null,
        hints: [prose('Look.'), prose('Compare.'), prose('Test the fit.')],
      },
    ],
    goal: { door: 'open' },
  };
}
module.exports = { fixture, prose };
