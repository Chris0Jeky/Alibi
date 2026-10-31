import { CARDS, CLAIMS } from './case.mjs';

export const KEYS = ['upper', 'lower', 'pulse', 'quay', 'yard'];
export const WORLDS = Array.from({ length: 32 }, (_, bits) =>
  Object.fromEntries(KEYS.map((key, index) => [key, Boolean(bits & (1 << index))])),
);
const rules = {
  A1: (w) => w.pulse === (w.upper !== w.lower),
  A2: (w) => Number(w.quay) + Number(w.yard) === Number(w.pulse),
  B1: (w) => w.upper !== w.lower,
  B2: (w) => !w.yard,
};

export function remaining(citations) {
  if (
    !Array.isArray(citations) ||
    citations.length > CARDS.length ||
    new Set(citations).size !== citations.length ||
    citations.some((id) => typeof id !== 'string' || !Object.hasOwn(rules, id))
  )
    return null;
  return WORLDS.filter((world) => citations.every((id) => rules[id](world)));
}

export function classify(worlds, claim) {
  if (
    !Object.hasOwn(CLAIMS, claim) ||
    !Array.isArray(worlds) ||
    !worlds.length ||
    worlds.length > 32 ||
    worlds.some((w) => !w || KEYS.some((key) => typeof w[key] !== 'boolean'))
  ) {
    return 'unavailable';
  }
  const values = worlds.map((world) => world[claim]);
  if (values.every(Boolean)) return 'supported';
  if (values.every((value) => !value)) return 'refuted';
  return 'uncertain';
}
