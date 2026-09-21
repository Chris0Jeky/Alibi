'use strict';

const range = (n) => Array.from({ length: n }, (_, index) => index);
const adjacent = (cell, size) =>
  [cell - size, cell + 1, cell + size, cell - 1].filter(
    (next) =>
      next >= 0 &&
      next < size * size &&
      Math.abs(Math.floor(cell / size) - Math.floor(next / size)) +
        Math.abs((cell % size) - (next % size)) ===
        1,
  );
const near = (a, b, size) =>
  Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1 &&
  Math.abs((a % size) - (b % size)) <= 1;

module.exports = { range, adjacent, near };
