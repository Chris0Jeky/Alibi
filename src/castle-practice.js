/* The Cabinet owns this narrow bridge from committed official runs to Castle familiarity. */
(function (G) {
  'use strict';

  const bindings = [
    {
      roomId: 'kitchen',
      family: 'aquarium',
      label: 'The Old Kitchens',
      implemented: false,
      detail:
        'Atlas note: the kitchen conversion chart has a pencilled column for the cook’s favourite dented jug. Its measure was useful long before anyone made it tidy.',
      starters: ['curated-aquarium-01@1', 'curated-aquarium-02@1', 'curated-aquarium-05@1'],
    },
    {
      roomId: 'observatory',
      family: 'binary',
      label: 'The Observatory',
      implemented: true,
      detail:
        'Beneath the instrument cloth is a paper constellation, pricked through with a pin. A second set of holes corrects the first. Finch kept both attempts.',
      starters: ['curated-binary-01@1', 'curated-binary-02@1', 'curated-binary-05@1'],
    },
    {
      roomId: 'bridge',
      family: 'bridges',
      label: 'The Seven-Arch Bridge',
      implemented: false,
      detail:
        'Atlas note: a wooden bridge model has removable spans. The keeper lends it with a length of string and a warning to count the islands before walking.',
      starters: ['curated-bridges-01@1', 'curated-bridges-02@1', 'curated-bridges-05@1'],
    },
    {
      roomId: 'library',
      family: 'dossier',
      label: 'The Long Library',
      implemented: true,
      detail:
        'A drawer holds abandoned catalogue labels. Mara kept the crossed-out ones beside their replacements: evidence that a good description can be changed.',
      starters: ['curated-dossier-01@1', 'curated-dossier-02@1', 'curated-dossier-05@1'],
    },
    {
      roomId: 'inequality',
      family: 'futoshiki',
      label: 'The Balancing Hall',
      implemented: false,
      detail:
        'Atlas note: the brass weights have lost their numbers. A former keeper paired them with sketches of the balances, preserving relationships when labels failed.',
      starters: ['curated-futoshiki-01@1', 'curated-futoshiki-02@1', 'curated-futoshiki-05@1'],
    },
    {
      roomId: 'orangery',
      family: 'lightup',
      label: 'The Glass Orangery',
      implemented: true,
      detail:
        'A seed envelope serves as a bookmark in the glazing ledger. On its back, someone has drawn how one lantern lights several panes at once.',
      starters: ['curated-lightup-01@1', 'curated-lightup-02@1', 'curated-lightup-05@1'],
    },
    {
      roomId: 'workshop',
      family: 'network',
      label: 'The Clockmaker’s Workshop',
      implemented: true,
      detail:
        'The apprentice’s smallest practice board fits inside the larger one. Finch scratched the same three instructions on both, then left room for a better method.',
      starters: ['curated-network-01@1', 'curated-network-02@1', 'curated-network-05@1'],
    },
    {
      roomId: 'portrait',
      family: 'nonogram',
      atlasFamily: 'picture',
      label: 'The Portrait Gallery',
      implemented: false,
      detail:
        'Atlas note: the portrait labels record a painter, a sitter and the person who mended the canvas. All three left something visible in the finished object.',
      starters: ['curated-nonogram-01@1', 'curated-nonogram-02@1', 'curated-nonogram-05@1'],
    },
    {
      roomId: 'dining',
      family: 'scene',
      label: 'The Long Dining Room',
      implemented: false,
      detail:
        'Atlas note: the formal seating plan ends at the dining-room door. A separate household sketch follows the people bringing plates from the kitchens.',
      starters: ['curated-scene-01@1', 'curated-scene-02@1', 'curated-scene-05@1'],
    },
    {
      roomId: 'number',
      family: 'sudoku',
      label: 'The Number Cabinet',
      implemented: false,
      detail:
        'Atlas note: a drawer of number tiles contains one blank piece. Its label asks which relationships would identify it without writing a number at all.',
      starters: ['curated-sudoku-01@1', 'curated-sudoku-02@1', 'curated-sudoku-05@1'],
    },
    {
      roomId: 'orchard',
      family: 'tents',
      label: 'The Old Orchard',
      implemented: false,
      detail:
        'Atlas note: the gardener marked a tree’s shade as carefully as its trunk. The empty spaces on the plan were part of the design.',
      starters: ['curated-tents-01@1', 'curated-tents-02@1', 'curated-tents-05@1'],
    },
    {
      roomId: 'cartography',
      family: 'trail',
      label: 'The Map Room',
      implemented: true,
      detail:
        'Inside the map case, a translucent sheet preserves a route rejected by an earlier surveyor. The word “shorter” is crossed out; “passable” is written beneath it.',
      starters: ['curated-trail-01@1', 'curated-trail-02@1', 'curated-trail-05@1'],
    },
    {
      roomId: 'study',
      family: 'witness',
      label: 'The Keeper’s Study',
      implemented: true,
      detail:
        'A visitor has left three empty headings on a scrap: seen, inferred, still unknown. The keeper uses it as a place marker in the report.',
      starters: ['curated-witness-01@1', 'curated-witness-02@1', 'curated-witness-05@1'],
    },
  ].map((binding) => Object.freeze({ ...binding, starters: Object.freeze(binding.starters) }));
  const byRoom = new Map(bindings.map((binding) => [binding.roomId, binding]));

  function keyFor(puzzle) {
    return `${puzzle.id}@${puzzle.revision}`;
  }

  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object')
      return (
        '{' +
        Object.keys(value)
          .sort()
          .map((key) => JSON.stringify(key) + ':' + stable(value[key]))
          .join(',') +
        '}'
      );
    return JSON.stringify(value);
  }

  function sameDefinition(left, right) {
    return !!left && !!right && stable(left) === stable(right);
  }

  function dateMarker(value) {
    return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
  }

  function roomFor(roomId) {
    return byRoom.get(roomId) || null;
  }

  function emptySnapshot() {
    return {
      rooms: Object.fromEntries(
        bindings.map((binding) => [
          binding.roomId,
          {
            family: binding.family,
            label: binding.label,
            completed: 0,
            total: 0,
            starters: [],
            detail: null,
            implemented: binding.implemented,
          },
        ]),
      ),
      available: false,
    };
  }

  function create({ catalogue, readRuns, validateRun, isCurrentCompletion, onOpen } = {}) {
    const puzzles = Array.isArray(catalogue?.puzzles) ? catalogue.puzzles : [];
    const byKey = new Map(),
      byId = new Map(),
      totals = new Map();
    let catalogueValid = puzzles.length > 0;
    for (const puzzle of puzzles) {
      if (
        !puzzle ||
        typeof puzzle.id !== 'string' ||
        !puzzle.id ||
        !Number.isInteger(puzzle.revision) ||
        puzzle.revision < 1 ||
        byKey.has(keyFor(puzzle)) ||
        byId.has(puzzle.id)
      ) {
        catalogueValid = false;
        continue;
      }
      byKey.set(keyFor(puzzle), puzzle);
      byId.set(puzzle.id, puzzle);
      totals.set(puzzle.type, (totals.get(puzzle.type) || 0) + 1);
    }
    for (const binding of bindings) {
      if (
        binding.starters.length !== 3 ||
        binding.starters.some((key) => {
          const puzzle = byKey.get(key);
          return !puzzle || puzzle.type !== binding.family;
        })
      )
        catalogueValid = false;
    }

    function build(runs, available) {
      const completed = new Set();
      if (available && catalogueValid) {
        for (const candidate of Array.isArray(runs) ? runs : []) {
          try {
            const run = validateRun ? validateRun(candidate) : candidate,
              key = typeof run?.key === 'string' ? run.key : '',
              puzzle = byKey.get(key);
            if (!puzzle || !sameDefinition(run.puzzle, puzzle)) continue;
            const markedFirst = dateMarker(run.firstCompletedAt),
              markedCurrent = dateMarker(run.completedAt);
            if (!markedFirst && (!markedCurrent || !isCurrentCompletion?.(run, puzzle))) continue;
            completed.add(key);
          } catch {
            // A malformed save is quarantined by the Cabinet and cannot grant familiarity.
          }
        }
      }
      return {
        rooms: Object.fromEntries(
          bindings.map((binding) => {
            const roomCompleted = [...completed].filter((key) => {
              const puzzle = byKey.get(key);
              return puzzle?.type === binding.family;
            }).length;
            const starters = binding.starters.map((key) => {
              const puzzle = byKey.get(key);
              return {
                id: puzzle.id,
                title: puzzle.title,
                completed: completed.has(key),
              };
            });
            return [
              binding.roomId,
              {
                family: binding.family,
                label: binding.label,
                completed: roomCompleted,
                total: totals.get(binding.family) || 0,
                starters,
                detail: roomCompleted >= 3 ? binding.detail : null,
                implemented: binding.implemented,
              },
            ];
          }),
        ),
        available: !!available && catalogueValid,
      };
    }

    async function snapshot() {
      if (!catalogueValid || typeof readRuns !== 'function') return emptySnapshot();
      try {
        const source = await readRuns();
        const runs = Array.isArray(source) ? source : source?.runs,
          available = Array.isArray(source) ? true : source?.available !== false;
        return build(runs, available);
      } catch {
        return emptySnapshot();
      }
    }

    async function open(puzzleId, roomId) {
      const binding = roomFor(roomId);
      let puzzle = null;
      if (typeof puzzleId === 'string') {
        const [id, revision] = puzzleId.split('@');
        puzzle = revision ? byKey.get(`${id}@${Number(revision)}`) : byId.get(id);
      }
      if (!binding || !puzzle || puzzle.type !== binding.family || typeof onOpen !== 'function')
        return false;
      return (await onOpen(puzzle.id, binding.roomId)) !== false;
    }

    return Object.freeze({ snapshot, open });
  }

  G.AlibiCastlePractice = Object.freeze({
    ROOM_BINDINGS: Object.freeze(bindings),
    roomFor,
    sameDefinition,
    create,
  });
})(globalThis);
