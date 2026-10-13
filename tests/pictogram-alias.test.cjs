'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os');
const { sync } = require('../tools/assets/club-pictograms.cjs');
const root = path.resolve(__dirname, '..');
for (const kind of ['hardlink', 'symlink', 'junction']) {
  for (const check of [false, true]) {
    test(`${kind} is refused before any pictogram write (check=${check})`, async () => {
      const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pictogram-alias-'));
      try {
        const fixture = path.join(base, 'root'),
          external = path.join(base, 'external');
        fs.mkdirSync(path.join(fixture, 'assets-source/library/club-pictograms'), {
          recursive: true,
        });
        fs.mkdirSync(path.join(fixture, 'src'));
        fs.mkdirSync(external);
        fs.cpSync(
          path.join(root, 'assets-source/library/club-pictograms'),
          path.join(fixture, 'assets-source/library/club-pictograms'),
          { recursive: true },
        );
        fs.copyFileSync(
          path.join(root, 'src/presentation.js'),
          path.join(fixture, 'src/presentation.js'),
        );
        fs.copyFileSync(
          path.join(root, '.prettierrc.json'),
          path.join(fixture, '.prettierrc.json'),
        );
        const target = path.join(fixture, 'assets-source/library/club-pictograms/achievement.svg');
        const sentinel = path.join(external, 'sentinel.svg');
        fs.writeFileSync(sentinel, fs.readFileSync(target));
        if (kind === 'junction') {
          fs.rmSync(path.join(fixture, 'src'), { recursive: true });
          fs.copyFileSync(
            path.join(root, 'src/presentation.js'),
            path.join(external, 'presentation.js'),
          );
          fs.symlinkSync(external, path.join(fixture, 'src'), 'junction');
        } else {
          fs.unlinkSync(target);
          try {
            if (kind === 'hardlink') fs.linkSync(sentinel, target);
            else fs.symlinkSync(sentinel, target);
          } catch (e) {
            if (kind === 'symlink' && e.code === 'EPERM') return; // Windows privilege unavailable; junction still exercises reparse rejection.
            throw e;
          }
        }
        const before = fs.readFileSync(sentinel);
        const presentation = fs.readFileSync(
          kind === 'junction'
            ? path.join(external, 'presentation.js')
            : path.join(fixture, 'src/presentation.js'),
        );
        await assert.rejects(async () => sync(fixture, check), /Unsafe pictogram path/);
        assert.deepEqual(fs.readFileSync(sentinel), before);
        assert.deepEqual(
          fs.readFileSync(
            kind === 'junction'
              ? path.join(external, 'presentation.js')
              : path.join(fixture, 'src/presentation.js'),
          ),
          presentation,
        );
      } finally {
        fs.rmSync(base, { recursive: true, force: true });
      }
    });
  }
}
