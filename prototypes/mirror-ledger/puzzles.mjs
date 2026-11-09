export const PUZZLES = [
  {
    id: 'mirror-01',
    title: 'Mirror 1',
    givens: [
      [-1, -1, -1, -1, -1, -1, -1, 0, 0, -1, 0, 1, 1, -1, -1, -1],
      [-1, -1, 1, 0, -1, -1, -1, 1, -1, -1, -1, -1, -1, 0, 1, -1],
    ],
    links: [
      {
        a: 6,
        b: 11,
        relation: 'opposite',
      },
      {
        a: 14,
        b: 1,
        relation: 'opposite',
      },
      {
        a: 10,
        b: 5,
        relation: 'same',
      },
      {
        a: 15,
        b: 11,
        relation: 'same',
      },
    ],
  },
  {
    id: 'mirror-02',
    title: 'Mirror 2',
    givens: [
      [-1, 1, -1, -1, -1, -1, -1, 0, -1, -1, 0, 1, -1, -1, -1, 1],
      [-1, -1, -1, 1, -1, 0, -1, 1, 0, -1, -1, 0, -1, -1, -1, -1],
    ],
    links: [
      {
        a: 7,
        b: 1,
        relation: 'same',
      },
      {
        a: 2,
        b: 13,
        relation: 'opposite',
      },
      {
        a: 13,
        b: 6,
        relation: 'opposite',
      },
      {
        a: 9,
        b: 13,
        relation: 'same',
      },
    ],
  },
  {
    id: 'mirror-03',
    title: 'Mirror 3',
    givens: [
      [-1, 1, -1, 0, -1, -1, -1, 0, 1, -1, -1, -1, 0, -1, -1, -1],
      [-1, -1, 1, -1, -1, 1, 0, -1, -1, -1, 1, -1, -1, 1, -1, -1],
    ],
    links: [
      {
        a: 7,
        b: 0,
        relation: 'opposite',
      },
      {
        a: 0,
        b: 7,
        relation: 'same',
      },
      {
        a: 14,
        b: 9,
        relation: 'opposite',
      },
      {
        a: 4,
        b: 5,
        relation: 'same',
      },
    ],
  },
  {
    id: 'mirror-04',
    title: 'Mirror 4',
    givens: [
      [-1, -1, 0, 1, -1, -1, 0, -1, -1, -1, -1, -1, 1, -1, 1, -1],
      [1, 0, -1, -1, -1, -1, -1, -1, -1, -1, 1, -1, -1, 1, 0, -1],
    ],
    links: [
      {
        a: 15,
        b: 7,
        relation: 'same',
      },
      {
        a: 7,
        b: 7,
        relation: 'opposite',
      },
      {
        a: 6,
        b: 5,
        relation: 'same',
      },
      {
        a: 5,
        b: 6,
        relation: 'same',
      },
    ],
  },
  {
    id: 'mirror-05',
    title: 'Mirror 5',
    givens: [
      [1, -1, -1, -1, -1, -1, 0, 1, -1, -1, 1, 0, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, 1, -1, -1, 1, 0, -1, -1, 0, 0, -1],
    ],
    links: [
      {
        a: 2,
        b: 7,
        relation: 'same',
      },
      {
        a: 5,
        b: 4,
        relation: 'same',
      },
      {
        a: 8,
        b: 8,
        relation: 'opposite',
      },
      {
        a: 1,
        b: 3,
        relation: 'opposite',
      },
    ],
  },
  {
    id: 'mirror-06',
    title: 'Mirror 6',
    givens: [
      [-1, 0, -1, -1, -1, -1, -1, 0, 1, 0, 0, -1, -1, -1, -1, -1],
      [1, 0, -1, 1, -1, -1, -1, 0, -1, 1, -1, -1, -1, -1, -1, -1],
    ],
    links: [
      {
        a: 7,
        b: 10,
        relation: 'same',
      },
      {
        a: 4,
        b: 10,
        relation: 'opposite',
      },
      {
        a: 0,
        b: 12,
        relation: 'same',
      },
      {
        a: 3,
        b: 8,
        relation: 'opposite',
      },
    ],
  },
  {
    id: 'mirror-07',
    title: 'Mirror 7',
    givens: [
      [0, -1, -1, 0, -1, 0, -1, -1, -1, -1, 0, -1, -1, -1, -1, 1],
      [-1, -1, 1, 0, -1, -1, 0, -1, -1, 1, -1, -1, 0, -1, -1, -1],
    ],
    links: [
      {
        a: 9,
        b: 7,
        relation: 'same',
      },
      {
        a: 8,
        b: 13,
        relation: 'opposite',
      },
      {
        a: 2,
        b: 1,
        relation: 'same',
      },
      {
        a: 6,
        b: 1,
        relation: 'same',
      },
    ],
  },
  {
    id: 'mirror-08',
    title: 'Mirror 8',
    givens: [
      [0, -1, -1, -1, -1, -1, 0, -1, -1, -1, 0, -1, -1, 0, -1, 0],
      [-1, -1, -1, -1, 1, 0, 1, -1, -1, 1, -1, -1, -1, -1, -1, 1],
    ],
    links: [
      {
        a: 0,
        b: 3,
        relation: 'opposite',
      },
      {
        a: 12,
        b: 12,
        relation: 'same',
      },
      {
        a: 1,
        b: 7,
        relation: 'opposite',
      },
      {
        a: 5,
        b: 1,
        relation: 'same',
      },
    ],
  },
];
