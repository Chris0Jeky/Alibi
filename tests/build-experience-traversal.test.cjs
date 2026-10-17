'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const buildExperience = require('../tools/build-experience.cjs');

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function initFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-experience-'));
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  writeJSON(path.join(root, 'assets-source/library/realm/catalogue.json'), {
    scenes: [],
    assets: [],
  });
  writeJSON(path.join(root, 'assets-source/library/realm/details/catalogue.json'), {
    assets: [],
  });
  writeJSON(path.join(root, 'assets-source/library/companions/catalogue.json'), {
    assets: [],
  });
  writeJSON(path.join(root, 'assets-source/library/audio/catalogue.json'), {
    assets: [],
  });
  writeJSON(path.join(root, 'assets-source/library/motion/catalogue.json'), {
    items: [],
  });
  return { root, dist };
}

function setRealmScene(root, derivatives) {
  writeJSON(path.join(root, 'assets-source/library/realm/catalogue.json'), {
    scenes: [{ id: 'test-scene', title: 'Test scene', design: 'original', derivatives }],
    assets: [],
  });
}

function emittedBytes(dist) {
  const assets = path.join(dist, 'assets');
  if (!fs.existsSync(assets)) return [];
  return fs.readdirSync(assets).map((name) => fs.readFileSync(path.join(assets, name)));
}

test('normal .glb/.png derivatives inside the library are accepted', () => {
  const { root, dist } = initFixture();
  try {
    const glb = 'assets-source/library/realm/glb/test-scene.glb';
    const png = 'assets-source/library/realm/thumbnails/test-scene.png';
    fs.mkdirSync(path.join(root, 'assets-source/library/realm/glb'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets-source/library/realm/thumbnails'), {
      recursive: true,
    });
    fs.writeFileSync(path.join(root, glb), 'glb-fixture');
    fs.writeFileSync(path.join(root, png), 'png-fixture');
    setRealmScene(root, [glb, png]);
    const result = buildExperience(root, dist);
    assert.equal(result.manifest.scenes.length, 1);
    assert.match(result.manifest.scenes[0].model, /^\.\/assets\/folio-.*\.glb$/);
    assert.match(result.manifest.scenes[0].image, /^\.\/assets\/folio-.*\.png$/);
    assert.deepEqual(
      fs.readFileSync(path.join(dist, result.manifest.scenes[0].model)),
      Buffer.from('glb-fixture'),
    );
    assert.deepEqual(
      fs.readFileSync(path.join(dist, result.manifest.scenes[0].image)),
      Buffer.from('png-fixture'),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('traversal derivative outside the library is rejected', () => {
  const sentinel = Buffer.from('outside-library-marker');
  {
    const { root, dist } = initFixture();
    try {
      const png = 'assets-source/library/realm/thumbnails/test-scene.png';
      fs.mkdirSync(path.join(root, 'assets-source/library/realm/thumbnails'), {
        recursive: true,
      });
      fs.writeFileSync(path.join(root, png), 'png-fixture');
      fs.writeFileSync(path.join(root, 'outside-marker.glb'), sentinel);
      setRealmScene(root, ['assets-source/library/../../outside-marker.glb', png]);
      assert.throws(() => buildExperience(root, dist), /outside the library/);
      for (const bytes of emittedBytes(dist)) {
        assert.ok(!bytes.equals(sentinel), 'outside bytes are never published to dist');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
  {
    // A root-relative path that never enters the library.
    const { root, dist } = initFixture();
    try {
      fs.writeFileSync(path.join(root, 'package.glb'), sentinel);
      setRealmScene(root, ['package.glb']);
      assert.throws(() => buildExperience(root, dist), /outside the library/);
      for (const bytes of emittedBytes(dist)) {
        assert.ok(!bytes.equals(sentinel), 'outside bytes are never published');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('a link inside the library that points outside it is rejected', () => {
  const { root, dist } = initFixture();
  try {
    // A directory junction needs no privilege on Windows; elsewhere this is a directory symlink.
    fs.mkdirSync(path.join(root, 'outside'));
    fs.writeFileSync(path.join(root, 'outside/secret.glb'), 'private-bytes');
    fs.symlinkSync(
      path.join(root, 'outside'),
      path.join(root, 'assets-source/library/realm/outside'),
      'junction',
    );
    setRealmScene(root, [
      'assets-source/library/realm/outside/secret.glb',
      'assets-source/library/realm/outside/secret.png',
    ]);
    assert.throws(() => buildExperience(root, dist), /outside the library/);
    assert.ok(!emittedBytes(dist).some((b) => b.toString() === 'private-bytes'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
