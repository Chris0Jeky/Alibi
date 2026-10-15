/* Player-facing engine metadata and original inline SVG illustrations. */
(function (root) {
  'use strict';
  const data = {
    bridges: {
      title: 'Tidal bridges',
      line: 'Bring every island into one connected world.',
      group: 'visual',
      tag: 'Hashi / Bridges',
      color: 'blue',
      icon: 'bridges',
      goal: 'Connect the islands with bridges so every number is satisfied and the whole archipelago is connected.',
      gesture:
        'Tap an island, then its nearest neighbour in the same row or column. Repeat the pair for two bridges, then none.',
      rules: [
        'An island’s number is the total number of bridges touching it.',
        'Connect only the nearest island in a straight horizontal or vertical line. A pair can share one or two bridges.',
        'Bridges cannot cross, pass through an island, or run diagonally.',
        'Every island must join the same network. Separate groups do not count, even when their numbers fit.',
      ],
      tip: 'Count the available neighbours. A corner island with a 4 needs two bridges in both directions.',
      lesson:
        'These two islands each need 2 bridges and have no other neighbours. How many bridges must join them?',
      lessonNote:
        'Two bridges satisfy both islands. In a full puzzle, every island must also join the same network.',
    },
    scene: {
      title: 'Crime scenes',
      line: 'Place the people. Find the murderer.',
      group: 'mystery',
      tag: 'Murdoku-inspired',
      color: 'green',
      icon: 'scene',
      goal: 'Reconstruct the floor plan, then identify who was alone with the victim.',
      gesture: 'Choose a person, then tap an empty square to place them.',
      rules: [
        'Place every person, including the victim. Use exactly one square in each row and each column.',
        'Furniture blocks a square. Room boundaries do not block rows or columns.',
        'Every clue is true. “Next to” means one square up, down, left or right, never diagonally.',
        'The victim shares a room with exactly one suspect. Once every position fits, accuse that suspect.',
      ],
      tip: 'Start with a person whose room and row are known. The victim often falls into the one unused row and column.',
      lesson: 'Iris was in row 2, column C. Select Iris, then place her in the highlighted square.',
      lessonNote:
        'A clue names a location. Place the person at the intersection; use the remaining rows and columns for everyone else.',
    },
    dossier: {
      title: 'Alibi files',
      line: 'Connect people, places and evidence.',
      group: 'mystery',
      tag: 'Logic grid',
      color: 'rose',
      icon: 'dossier',
      goal: 'Match each person to one room and one object, then answer the case’s final question.',
      gesture: 'Tap a square to cycle ✓ yes, × no, and blank. You can also choose a marking tool.',
      rules: [
        'Every person has exactly one match in each category. Every room and object is used once.',
        'A ✓ records a match. By default, the other cells in its row and column become ×.',
        'Use both grids. Some clues connect a room to an object, so evidence carries between them.',
        'Clue checkboxes are your notes, not automatic verdicts. Complete both grids before answering the final question.',
      ],
      tip: 'Record the direct exclusions first. A linked room/object clue can turn a match in one grid into a match in the other.',
      lesson: 'The clue says: “Iris was in the study.” Tap the intersection of Iris and Study.',
      lessonNote:
        'A confirmed match rules out every other option in that row and column. You can turn automatic crossing off in Settings.',
    },
    witness: {
      title: 'Witness statements',
      line: 'Not every account can be true.',
      group: 'mystery',
      tag: 'Truth & lies',
      color: 'amber',
      icon: 'witness',
      goal: 'Identify the only candidate who makes exactly the stated number of accounts true.',
      gesture:
        'Mark accounts as true or false while thinking. Select a candidate, then submit your conclusion.',
      rules: [
        'Exactly one listed candidate fits the event in the record. There is no unlisted candidate.',
        'The file tells you exactly how many statements are true. The rest are false.',
        'Evaluate what a statement says, not whether you trust the speaker. Statements all refer to the same event.',
        'True/false marks are optional working notes. They do not change the facts or the final answer.',
      ],
      tip: 'Assume each candidate fits the stated event. Count the true statements under that assumption. Repeat until only one candidate fits.',
      lesson:
        'Exactly two statements are true: “Iris was responsible.” “Iris was not responsible.” “Theo was responsible.” Who fits the record?',
      lessonNote:
        'The first two accounts always contribute one truth. The third must also be true, so Theo is the only possible answer.',
    },
    sudoku: {
      title: 'Sudoku',
      line: 'Find a little order in the numbers.',
      group: 'classic',
      tag: 'Number placement',
      color: 'blue',
      icon: 'sudoku',
      goal: 'Fill the grid so each row, column and outlined box contains every number exactly once.',
      gesture: 'Select an empty square, then choose a number. Pencil mode records possibilities.',
      rules: [
        'Use 1–4, 1–6 or 1–9, depending on the grid size.',
        'Each number appears once in every row, column and bold-outlined box.',
        'Printed numbers are fixed. You cannot change them.',
        'Pencil notes are possibilities, not final entries. Erase removes an entry and its notes.',
      ],
      tip: 'Look for a row, column or box missing just one number. Then compare where each missing number can go.',
      lesson: 'This 4-cell row already contains 1, 2 and 3. What belongs in the last square?',
      lessonNote: 'Each number appears once in a row, so the missing number is 4.',
    },
    nonogram: {
      title: 'Picture logic',
      line: 'A picture, one deduction at a time.',
      group: 'visual',
      tag: 'Nonogram',
      color: 'rose',
      icon: 'nonogram',
      goal: 'Reveal the hidden picture by filling exactly the runs described along the edges.',
      gesture: 'Choose Fill, Cross or Erase, then tap or drag over squares.',
      rules: [
        'Each clue is the length of a consecutive run of filled squares. Read row clues left to right and column clues top to bottom.',
        'Separate different runs by at least one empty square. There may also be empty squares before and after the runs.',
        'A clue of 0 means the whole line is empty. A cross marks a square you know is empty.',
        'Only the filled pattern is required to finish. You do not have to cross every remaining blank square.',
      ],
      tip: 'A run longer than half a line overlaps the same middle squares in every possible placement. Those squares must be filled.',
      lesson:
        'The clue is 4. The first of these five squares is crossed out. Fill the remaining four.',
      lessonNote:
        'The single run must have exactly four connected squares. A cross is an empty square, never part of a run.',
    },
    binary: {
      title: 'Sun & moon',
      line: 'Two symbols. A perfect balance.',
      group: 'classic',
      tag: 'Binary logic',
      color: 'amber',
      icon: 'binary',
      goal: 'Complete every row and column with an equal number of suns and moons.',
      gesture:
        'Tap an editable square to cycle sun, moon, blank. Or choose a symbol below the grid.',
      rules: [
        'Each row and column contains the same number of suns and moons.',
        'Three identical symbols cannot be consecutive, horizontally or vertically.',
        'No two completed rows are identical. No two completed columns are identical.',
        'Printed symbols are fixed. The symbols are also labelled, so colour is never the only clue.',
      ],
      tip: 'Two matching neighbours force the square before and after them to be the other symbol.',
      lesson:
        'There are two suns in a row. What must go in the next square to avoid three in a row?',
      lessonNote: 'A moon breaks the run. The same restriction applies vertically.',
    },
    futoshiki: {
      title: 'Futoshiki',
      line: 'A little greater. A little less.',
      group: 'classic',
      tag: 'Inequalities',
      color: 'blue',
      icon: 'futoshiki',
      goal: 'Use each number once per row and column while respecting every inequality.',
      gesture: 'Select a square, then choose a number. Pencil mode records candidates.',
      rules: [
        'Fill each row and column with 1 through the grid size, each used exactly once.',
        'The pointed end of an inequality faces the smaller number. For example, 2 < 4.',
        'There are no Sudoku boxes in this game. Only rows, columns and inequality signs matter.',
        'Printed numbers are fixed. Vertical signs work exactly like horizontal ones.',
      ],
      tip: 'A chain of inequalities restricts several values at once. In a 5-cell chain, every position may be forced.',
      lesson: 'The available digits are 1–4. Which value satisfies 2 < □ < 4?',
      lessonNote: 'Only 3 is larger than 2 and smaller than 4.',
    },
    lightup: {
      title: 'Lanterns',
      line: 'Bring every corner into the light.',
      group: 'visual',
      tag: 'Akari / Light Up',
      color: 'amber',
      icon: 'lightup',
      goal: 'Light every floor square without letting any two lanterns shine directly at one another.',
      gesture:
        'Choose Lantern, Cross or Erase, then tap a floor square. Tap an existing lantern to remove it.',
      rules: [
        'A lantern illuminates its own square and all visible squares in its row and column. Walls stop the light.',
        'Two lanterns cannot see each other in a straight, unblocked line. Light beams may cross; that is allowed.',
        'A number on a wall is the exact number of lanterns immediately beside it, not diagonally. Unnumbered walls impose no count.',
        'Every floor square must be illuminated. A cross rules out a lantern but does not block light.',
      ],
      tip: 'A wall labelled 0 rules out every neighbouring square. A wall with as many open neighbours as its number forces lanterns in all of them.',
      lesson: 'Place one lantern at the left end of this empty corridor.',
      lessonNote:
        'One lantern lights the entire corridor. Another lantern in that corridor would shine at the first, so none is allowed.',
    },
    tents: {
      title: 'Tents & trees',
      line: 'Find a place for everyone to camp.',
      group: 'visual',
      tag: 'Spatial deduction',
      color: 'green',
      icon: 'tents',
      goal: 'Place one tent for each tree while matching the row and column totals.',
      gesture: 'Choose Tent, Grass or Erase, then tap or drag. Trees cannot be moved.',
      rules: [
        'Every tent pairs with exactly one tree, one square up, down, left or right. Every tree needs its own tent.',
        'A tent may happen to be beside multiple trees, provided a distinct one-to-one pairing is possible.',
        'Tents cannot touch each other, even diagonally. Trees can touch each other and tents.',
        'Edge numbers count tents, not trees. You do not need to mark all remaining grass to finish.',
      ],
      tip: 'A row or column with a target of 0 contains no tents. A tree with only one possible neighbour forces a tent there.',
      lesson:
        'The top row needs one tent and the other rows need none. Put a tent directly above the tree.',
      lessonNote:
        'A tent shares an edge with its tree. Other tents would be excluded from all eight surrounding squares.',
    },
    aquarium: {
      title: 'Aquariums',
      line: 'Let the water find its level.',
      group: 'visual',
      tag: 'Waterline logic',
      color: 'blue',
      icon: 'aquarium',
      goal: 'Set each tank’s waterline to match the water-square totals along the edges.',
      gesture:
        'Tap a square to fill its tank from that height down. Tap the current waterline to lower it one level.',
      rules: [
        'Bold outlines separate tanks. Each tank can be empty, full or partly filled.',
        'Within a tank, water fills all squares at a given height together, and every square below them. Water cannot float.',
        'Tanks have independent waterlines. Connected-looking squares in different tanks do not share water.',
        'Edge numbers count filled squares, not waterlines. Use Drain to empty a tank.',
      ],
      tip: 'A target of 0 forces every square on that line to be dry. Remember that filling one square can force several others in the same tank.',
      lesson: 'Fill the bottom two rows of this tank by tapping its middle row.',
      lessonNote:
        'Every square at that height and below fills together. You adjust a whole waterline rather than paint individual squares.',
    },
    network: {
      title: 'Signal paths',
      line: 'Turn the pieces. Make the connection.',
      group: 'visual',
      tag: 'Rotation puzzle',
      color: 'green',
      icon: 'network',
      goal: 'Rotate the tiles until every line joins a single network connected to the source.',
      gesture: 'Tap a tile to turn it clockwise, or use Turn left and Turn right.',
      rules: [
        'A line must meet a line on the neighbouring tile. No line may point outside the board or end against a blank edge.',
        'Every tile must connect to the circular source tile. Separate closed networks do not count.',
        'Lit tiles are currently connected to the source. Lit does not mean their orientation is final.',
        'Tiles rotate in place; they cannot be moved or swapped. All open connectors must disappear to finish.',
      ],
      tip: 'Start with corners and edges. Any orientation that points off the board can be ruled out immediately.',
      lesson: 'The middle pipe points up and down. Tap it once to join the left and right pipes.',
      lessonNote:
        'Matching ends connect. The source’s signal spreads only through matching connections.',
    },
    trail: {
      title: 'Number trails',
      line: 'One continuous path through every square.',
      group: 'visual',
      tag: 'Sequential path',
      color: 'rose',
      icon: 'trail',
      goal: 'Place every number from 1 to the grid size squared in one continuous path.',
      gesture:
        'Choose a number, then tap a square. The next unused number is selected automatically.',
      rules: [
        'Every square contains one number, used exactly once.',
        'Consecutive numbers must share an edge, not merely a corner. The path cannot jump.',
        'Printed numbers, including the first and last, are fixed.',
        'Re-entering an existing editable number moves it. Use Erase to remove a number without changing the clues.',
      ],
      tip: 'Count the steps between fixed numbers. If that matches their shortest possible distance, the path cannot afford a detour.',
      lesson: 'The path goes from 1 to 3. Tap the square between them to place 2.',
      lessonNote: 'Consecutive numbers share an edge. Continue in order and use every square once.',
    },
  };
  const paths = {
    home: '<path d="M3 14h18M5 14v7m14-7v7M4 11h7v3H4ZM16 5v9m-2-9h4l-1-3h-2Z"/>',
    library:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M7 6v3m4-3v3m4-3 2 3M7 15v3m4-3v3m4-3h3v3h-3Z"/>',
    scene:
      '<path d="M12 21H3V3h18v8M3 10h7V3M8 15H3"/><circle cx="15.5" cy="15.5" r="4.5"/><path d="m19 19 3 3"/>',
    dossier:
      '<path d="M3 7V4h7l2 3h9v14H3ZM3 10h18M7 14h4m-4 3h3"/><circle cx="16.5" cy="15.5" r="2"/>',
    witness:
      '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3H3V6a2 2 0 0 1 2-2Z M7 8h3v4H7V8Zm7 0h3v4h-3V8ZM7 12l-1 2m8-2-1 2"/>',
    sudoku:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18 M5.5 5.5h1m11 6h1m-7 6h1"/>',
    nonogram:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 6h4v4H6Zm4 4h4v4h-4Zm4-4h4v4h-4Zm0 8h4v4h-4Z" fill="currentColor" stroke="none"/>',
    binary:
      '<circle cx="7" cy="7" r="3"/><path d="M7 1v1m0 10v1M1 7h1m10 0h1M2.8 2.8l.7.7m7 7 .7.7M2.8 11.2l.7-.7m7-7 .7-.7M20 14.5A6 6 0 0 1 12.5 7 7 7 0 1 0 20 14.5Z"/>',
    futoshiki:
      '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="16" y="16" width="5" height="5" rx="1"/><path d="m11 3 3 2.5L11 8m2 8-3 2.5 3 2.5M3 11l2.5 3L8 11"/>',
    lightup:
      '<path d="M7 7h10l2 3v10H5V10l2-3ZM7 7V5h10v2M9 5V3h6v2M5 10h14M8 10v10m8-10v10M4 22h16 M12 12c-3 3-2 5 0 5s3-2 0-5Z"/>',
    tents: '<path d="m2 21 7-13 7 13H2Zm7-9v9M13 10l5-8 4 8h-3l4 6h-6m1 0v5"/>',
    aquarium:
      '<path d="M3 4h18M4 4v17h16V4M4 10c3-3 5 3 8 0s5 3 8 0 M8 15c2-2 4-2 6 0-2 2-4 2-6 0Zm6 0 3-2v4l-3-2Z"/>',
    network:
      '<rect x="3" y="3" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/><path d="M7 5h12v6H5v8h12"/><circle cx="5" cy="19" r="1" fill="currentColor"/>',
    trail:
      '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a3 3 0 0 1 0 6H8a4 4 0 0 0 0 8h9M12 3v4m0 10v4"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    book: '<path d="M12 6c-3-2-6-3-9-2v15c3-1 6 0 9 2 3-2 6-3 9-2V4c-3-1-6 0-9 2Zm0 0v15M6 8l3 1m-3 3 3 1m6-4 3-1m-3 5 3-1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 5 3l-2 2m0 3v1"/>',
    undo: '<path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12"/>',
    redo: '<path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',
    pencil: '<path d="m4 15-1 6 6-1L21 8l-5-5ZM13 6l5 5M4 15l5 5"/>',
    erase: '<path d="m3 13 10-10 8 8-10 10H7l-4-4Zm6-6 8 8M11 21h11"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    settings:
      '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/>',
    workshop: '<path d="M3 21h18M5 18 16 3l4 3L9 21M14 6l4 3M3 4l7 7m-7-7v5m0-5h5"/>',
    journal:
      '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M8 3v18M3 7h3m-3 5h3m-3 5h3M12 7h5m-5 4h5m-5 4h3"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    moon: '<path d="M19 15.5A8 8 0 0 1 8.5 5 8 8 0 1 0 19 15.5Z"/>',
    plant:
      '<path d="M7 15h10l-2 7H9l-2-7Zm5 0V9M12 11C6 12 3 8 4 4c5-1 9 2 8 7Zm0-3c1-5 4-7 8-6 1 4-2 7-8 7Z"/>',
    tree: '<path d="m12 2-6 8h3l-5 7h16l-5-7h3L12 2Zm0 15v5"/>',
    table:
      '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M5 17v4m14-4v4M6 3h4v4M14 3h4v4M7 12h3m4 0h3"/>',
    piano: '<path d="M4 3h11a6 6 0 0 1 6 6v10H4Z"/><path d="M4 13h17M8 13v6m4-6v6m4-6v6"/>',
    shelf:
      '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18M7 5v5m4-5v5m4-4 3 4M7 14v5m4-5v5m4-5v5"/>',
    lamp: '<path d="m8 3-4 9h16l-4-9Zm4 9v9m-4 0h8"/>',
    star: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    refresh: '<path d="M20 8a8 8 0 1 0 0 9m0-15v6h-6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    heart: '<path d="M20 4c-3-2-6 0-8 3-2-3-5-5-8-3s-2 7 1 10l7 7 7-7c3-3 4-8 1-10Z"/>',
    device: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
    zoom: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    grass: '<path d="M3 21h18M8 21c0-8-3-11-5-13m9 13c0-10 1-15 4-19m-2 19c0-6 3-10 7-12"/>',
    volume: '<path d="M3 9h4l5-5v16l-5-5H3Zm13-1c3 3 3 5 0 8m3-11c5 5 5 9 0 14"/>',
    flag: '<path d="M5 22V3c5-5 9 4 15 0v10c-6 4-10-5-15 0"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
    bridges:
      '<circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><circle cx="5" cy="19" r="2.5"/><path d="M7.5 4h9m-9 2h9M18 7.5v9m2-9v9M7.5 19h9M5 7.5v9"/>',
    quiet: '<path d="M12 21v-9M12 15C5 16 2 12 3 7c6-1 10 2 9 8Zm0-5c0-6 4-9 9-8 1 5-2 9-9 8Z"/>',
    castle: '<path d="M3 21V7h3V3h3v4h6V3h3v4h3v14H3Zm6 0v-5a3 3 0 0 1 6 0v5M6 10v2m12-2v2"/>',
  };
  function icon(name, cls = '') {
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sudoku}</svg>`;
  }
  const palettes = {
    green: ['#e1e8dc', '#cedac8', '#244d3f', '#e6b879'],
    blue: ['#e0eaf0', '#c9dbe5', '#365f75', '#c89e6c'],
    rose: ['#eee1dc', '#e3ccc4', '#805d55', '#d4a960'],
    amber: ['#f2e8d0', '#e4d4af', '#80693c', '#d99756'],
  };
  function art(type, p = null, variant = 0) {
    const d = data[type] || data.scene,
      col = palettes[d.color],
      fg = col[2];
    let parts = `<rect width="320" height="180" fill="${col[0]}"/><circle cx="290" cy="-18" r="105" fill="${col[1]}" opacity=".6"/><circle cx="24" cy="190" r="72" fill="${col[1]}" opacity=".5"/>`;
    const line = (x1, y1, x2, y2, c = fg, w = 3) =>
        `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`,
      txt = (x, y, t, c = fg, size = 14) =>
        `<text x="${x}" y="${y}" font-size="${size}" font-family="system-ui,sans-serif" font-weight="500" text-anchor="middle" fill="${c}">${t}</text>`;
    if (type === 'sudoku') {
      parts += '<g transform="translate(88,18)">';
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++) {
          parts += `<rect x="${c * 16}" y="${r * 16}" width="16" height="16" fill="#fffaf0" stroke="${col[1]}" stroke-width=".5"/>`;
          if ((r * 7 + c * 3 + variant) % 5 < 2)
            parts += txt(
              c * 16 + 8,
              r * 16 + 12,
              ((r * 3 + Math.floor(r / 3) + c) % 9) + 1,
              fg,
              11,
            );
        }
      for (let i = 0; i <= 9; i += 3)
        parts += line(i * 16, 0, i * 16, 144, fg, 2) + line(0, i * 16, 144, i * 16, fg, 2);
      parts += '</g>';
    } else if (type === 'bridges') {
      parts +=
        line(90, 42, 230, 42, fg, 2) +
        line(90, 47, 230, 47, fg, 2) +
        line(90, 45, 90, 140, fg, 2) +
        line(230, 45, 230, 140, fg, 2) +
        line(90, 140, 160, 140, fg, 2);
      for (const [x, y, value] of [
        [90, 45, 3],
        [230, 45, 3],
        [90, 140, 2],
        [160, 140, 1],
        [230, 140, 1],
      ]) {
        parts +=
          `<circle cx="${x}" cy="${y}" r="17" fill="#fffaf0" stroke="${fg}" stroke-width="2"/>` +
          txt(x, y + 5, value, fg, 15);
      }
    } else if (type === 'scene') {
      parts += `<g transform="translate(87,18) rotate(-7 75 75)"><rect x="3" y="5" width="151" height="151" rx="7" fill="${fg}" opacity=".12"/><rect width="150" height="150" rx="5" fill="#faf9f1" stroke="${fg}" stroke-width="2"/>`;
      const colors = ['#e6dccb', '#d0ddce', '#e1d1c7', '#d0dce2'];
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++) {
          const room = (r < 2 ? 0 : 2) + (c < 3 ? 0 : 1);
          parts += `<rect x="${c * 30 + 1}" y="${r * 30 + 1}" width="28" height="28" fill="${colors[room]}"/>`;
        }
      parts += line(90, 0, 90, 150, fg, 2) + line(0, 60, 150, 60, fg, 2);
      [
        [15, 45, 'I'],
        [105, 15, 'T'],
        [45, 105, '?'],
        [135, 135, 'O'],
      ].forEach(([x, y, t], i) => {
        parts +=
          `<circle cx="${x}" cy="${y}" r="10" fill="${[fg, '#927257', '#b17665', '#567487'][i]}"/>` +
          txt(x, y + 4, t, '#fff', 11);
      });
      parts += `<rect x="8" y="69" width="15" height="12" rx="3" fill="${fg}" opacity=".35"/><rect x="66" y="128" width="18" height="9" rx="3" fill="${fg}" opacity=".3"/></g><g transform="rotate(8 65 111)"><rect x="32" y="105" width="55" height="57" rx="3" fill="#faf9f1" stroke="${col[1]}"/>${line(42, 120, 74, 120, fg, 2)}${line(42, 129, 70, 129, fg, 2)}${line(42, 138, 61, 138, fg, 2)}</g>`;
    } else if (type === 'witness') {
      for (let i = 0; i < 3; i++) {
        let x = 45 + i * 75,
          y = 28 + (i % 2) * 24;
        parts +=
          `<rect x="${x}" y="${y}" width="65" height="100" rx="7" fill="#fffaf0" stroke="${col[1]}"/><circle cx="${x + 32}" cy="${y + 27}" r="14" fill="${i === 1 ? fg : col[3]}"/>` +
          txt(x + 32, y + 32, ['I', 'T', 'M'][i], '#fff', 13) +
          line(x + 14, y + 53, x + 51, y + 53, fg, 2) +
          line(x + 14, y + 63, x + 43, y + 63, fg, 2) +
          txt(x + 32, y + 89, ['?', '✓', '?'][i], fg, 17);
      }
      parts += `<path d="M118 157h84" stroke="${fg}" stroke-width="2" stroke-dasharray="4 4"/>`;
    } else if (type === 'dossier') {
      parts += `<g transform="translate(70,22) rotate(-5 80 60)"><rect width="160" height="130" rx="7" fill="#fffaf5" stroke="${fg}" opacity=".95"/>`;
      for (let i = 1; i < 5; i++) {
        parts +=
          line(36, i * 25 + 3, 145, i * 25 + 3, col[1], 1) +
          line(36 + i * 27, 18, 36 + i * 27, 117, col[1], 1);
      }
      ['I', 'T', 'M', 'O'].forEach((t, i) => (parts += txt(20, 42 + i * 25, t, fg, 13)));
      [
        [50, 39, '✓'],
        [78, 64, '×'],
        [105, 89, '✓'],
        [132, 114, '✓'],
      ].forEach((a) => (parts += txt(...a, fg, 17)));
      parts += '</g>';
    } else if (type === 'aquarium') {
      parts += `<g transform="translate(89,15)"><rect width="142" height="152" rx="6" fill="#f9fcff" stroke="${fg}" stroke-width="3"/><path d="M1 61h60v90H1Z" fill="#81b1c5"/><path d="M63 91h78v60H63Z" fill="#92bdcd"/><path d="M62 0v152M62 62h80" stroke="${fg}" stroke-width="3"/>`;
      for (let y = 1; y < 5; y++) parts += line(0, y * 30, 142, y * 30, '#fff', 1);
      for (let x = 1; x < 5; x++) parts += line(x * 28, 0, x * 28, 152, '#fff', 1);
      parts += `<path d="M7 62c7-5 13 5 20 0s14 5 23 0" stroke="#f7fcff" fill="none" stroke-width="2"/><circle cx="108" cy="122" r="4" fill="#c4e0e8"/><circle cx="101" cy="139" r="2" fill="#c4e0e8"/></g>`;
    } else if (type === 'network') {
      const n = 4,
        s = 32,
        tiles = p?.tiles?.slice(0, 16) || [6, 10, 12, 4, 5, 6, 9, 5, 3, 13, 2, 9, 2, 11, 10, 8];
      parts += `<g transform="translate(96,24)"><rect x="-7" y="-7" width="142" height="142" rx="10" fill="${fg}"/>`;
      for (let i = 0; i < 16; i++) {
        const x = (i % 4) * s,
          y = Math.floor(i / 4) * s,
          m = tiles[i];
        parts += `<rect x="${x}" y="${y}" width="30" height="30" rx="3" fill="#365d4d"/>`;
        for (let b = 0; b < 4; b++)
          if (m & (1 << b))
            parts += line(
              x + 15,
              y + 15,
              x + [15, 31, 15, -1][b],
              y + [-1, 15, 31, 15][b],
              i < 7 ? '#e4c891' : '#9bb9a5',
              4,
            );
        parts += `<circle cx="${x + 15}" cy="${y + 15}" r="3" fill="#d6e3d5"/>`;
      }
      parts += '</g>';
    } else {
      const n = 5,
        s = 26,
        startX = 95,
        startY = 24;
      parts += `<g transform="translate(${startX},${startY}) rotate(${variant % 2 ? 4 : -4} 65 65)"><rect x="-5" y="-5" width="140" height="140" rx="7" fill="#fcfbf5" stroke="${col[1]}"/>`;
      for (let i = 0; i < n * n; i++) {
        const x = (i % n) * s,
          y = Math.floor(i / n) * s;
        let fill = '#fafaf4',
          t = '',
          tc = fg;
        if (type === 'nonogram') {
          const mask = ['00100', '01110', '11111', '01110', '00100'];
          fill = mask[Math.floor(i / n)][i % n] === '1' ? fg : '#f4f0e8';
        }
        if (type === 'lightup') {
          if ([1, 7, 13, 19, 20].includes(i)) {
            fill = fg;
            t = i === 7 ? '1' : i === 19 ? '0' : '';
            tc = '#fff';
          } else {
            fill = [3, 11, 22].includes(i) ? '#ecd08b' : '#faf3d9';
            if ([3, 11, 22].includes(i)) t = '✦';
          }
        }
        if (type === 'tents') {
          if ([1, 8, 15, 18].includes(i)) t = '♧';
          if ([2, 9, 20].includes(i)) {
            t = '△';
            tc = '#a7784b';
          }
        }
        if (type === 'binary' && i % 3 !== 1) t = i % 2 ? '☾' : '☀';
        if (type === 'trail' && [0, 2, 3, 8, 13, 12, 11, 10, 15, 20].includes(i))
          t = String([0, 2, 3, 8, 13, 12, 11, 10, 15, 20].indexOf(i) + 1);
        if (['sudoku', 'futoshiki'].includes(type) && i % 3 !== 1)
          t = String(((i * 3 + Math.floor(i / 5)) % 5) + 1);
        parts +=
          `<rect x="${x}" y="${y}" width="25" height="25" rx="2" fill="${fill}" stroke="${col[1]}" stroke-width=".5"/>` +
          (t ? txt(x + 12, y + 18, t, tc, 14) : '');
      }
      if (type === 'futoshiki') parts += txt(51, 44, '&lt;', fg, 16);
      parts += '</g>';
    }
    return `<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false" class="puzzle-art">${parts}</svg>`;
  }
  root.AlibiUI = { data, icon, art };
})(globalThis);
