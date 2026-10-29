'use strict';
// Build-only composition into the existing pack desk. No runtime observer or new route owner.
// #433: one action imports the optional adder module, which hands verified bytes to #pack-input.
function composePackDesk(source, adder) {
  if (typeof adder !== 'string' || !/^\.\/assets\/workshop\/add\.[a-f0-9]{12}\.js$/.test(adder))
    throw Error('Invalid collection adder URL');
  const start = source.indexOf('  function packDesk() {');
  const end = source.indexOf('  function authorGuide()', start);
  if (start < 0 || end < start) throw Error('Workshop pack desk boundary changed');
  let desk = source.slice(start, end);
  const replace = (before, after) => {
    if (desk.split(before).length !== 2) throw Error('Workshop pack desk copy changed');
    desk = desk.replace(before, () => after);
  };
  replace(
    'Import a JSON puzzle pack. The browser checks the format, rules and uniqueness in a background worker before adding anything.',
    'Import data-only puzzles. A worker checks format, rules and uniqueness before adding anything.',
  );
  replace('<p>A data-only pack for any supported puzzle family.</p>', '');
  replace(
    'Maximum 3 MB, 150 puzzles per pack. Imports cannot overwrite an existing puzzle ID. Validation is bounded and aborts safely if a pack is too expensive to check.',
    'Up to 3 MB and 150 puzzles. Existing IDs cannot be overwritten. Expensive validation aborts safely.',
  );
  replace(
    'Installed custom packs stay local. To share one, export it and give the JSON file to another player.',
    'Custom packs stay local. Export a JSON file to share.',
  );
  replace(
    '<h2>Bring another collection.</h2>',
    "<h2>Bring another collection.</h2>${globalThis.ALIBI_BUILD_TARGET ? '' : B('Add a curated collection', 'collections', 'download', 'secondary')}",
  );
  const rest = source.slice(end),
    anchor = "      case 'import-pack':\n";
  if (rest.split(anchor).length !== 2) throw Error('Workshop import action boundary changed');
  return (
    source.slice(0, start) +
    desk +
    rest.replace(
      anchor,
      // import() in the classic application script resolves against its ./assets/ URL.
      () =>
        `      case 'collections':\n        (await import(${JSON.stringify('.' + adder.slice(8))})).open();\n        break;\n` +
        anchor,
    )
  );
}
module.exports = { composePackDesk };
