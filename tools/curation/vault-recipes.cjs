'use strict';
// Reuses the retained Night recipes. Only Sudoku needs a new sketcher.
const Night = require('./night-recipes.cjs');
const { sudoku } = require('./vault-quality.cjs');
function candidate(type, seed) {
  if (type !== 'sudoku') return Night.candidate(type, seed);
  const rnd = Night.random(seed);
  const solution = sudoku(Array(81).fill(0), 1, 50000, rnd).first;
  if (!solution) return null;
  const givens = solution.slice(), cells = Array.from({ length: 81 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const minimum = 24 + seed % 4;
  for (const cell of cells) {
    if (givens.filter(Boolean).length <= minimum) break;
    const value = givens[cell]; givens[cell] = 0;
    const proof = sudoku(givens, 2, 60000);
    if (proof.exhausted || proof.count !== 1) givens[cell] = value;
  }
  return { id: 'vault-sudoku-candidate', revision: 1, type, title: 'Unpublished candidate', subtitle: 'Vault studies', difficulty: 'Expert', difficultyStatus: 'provisional', size: 9, boxRows: 3, boxCols: 3, givens, solution };
}
module.exports = { candidate };
