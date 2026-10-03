'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Run the actual authoring command with its production validator in an isolated tree.
function writeFixture(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-afterlight-cli-'));
  try {
    for (const relative of ['tools/curation/afterlight-pictures.cjs', 'src/core.js']) {
      const target = path.join(root, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.resolve(__dirname, '../..', relative), target);
    }
    const blueprint = path.join(root, 'content/curation/editorial/afterlight-blueprints.json');
    const output = path.join(root, 'content/workshop/afterlight-pictures.json');
    for (const file of [blueprint, output]) fs.mkdirSync(path.dirname(file), { recursive: true });
    const before = fs.readFileSync(
      path.resolve(__dirname, '../../content/workshop/afterlight-pictures.json'),
    );
    fs.writeFileSync(blueprint, JSON.stringify(source));
    fs.writeFileSync(output, before);
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'tools/curation/afterlight-pictures.cjs'), '--write'],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    return { result, before, after: fs.readFileSync(output) };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
module.exports = { writeFixture };
