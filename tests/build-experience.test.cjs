'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const buildExperience = require('../tools/build-experience.cjs');
const root = path.resolve(__dirname, '..');

const SCENE_GLB = 'assets-source/library/realm/scenes/harbour.glb';
const SCENE_PNG = 'assets-source/library/realm/thumbnails/scene-harbour.png';
const MODULE_GLB = 'assets-source/library/realm/glb/tower-square-base.glb';
const MODULE_PNG = 'assets-source/library/realm/thumbnails/tower-square-base.png';
const DETAIL_GLB = 'assets-source/library/realm/details/boat.glb';
const DETAIL_PNG = 'assets-source/library/realm/details/boat.png';
const COMPANION_SVG = 'assets-source/library/companions/rigs/cat-idle.svg';
const AUDIO_OGG = 'assets-source/library/audio/production/ui-focus-soft.ogg';
const MOTION_MP4 = 'assets-source/library/motion/renders/alibi-intro.mp4';
const MOTION_POSTER = 'assets-source/library/motion/posters/alibi-intro.jpg';
const EDITORIAL_WEBP = 'assets-source/library/editorial/reading-room.webp';

function writeTree(fixture, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(fixture, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content ?? 'test-bytes');
  }
}

function buildFixture(name, sceneDerivatives) {
  const fixture = path.join(root, 'test-results', 'build-experience', name);
  fs.rmSync(fixture, { recursive: true, force: true });
  writeTree(fixture, {
    [SCENE_GLB]: 'glb-bytes',
    [SCENE_PNG]: 'png-bytes',
    [MODULE_GLB]: 'glb-bytes',
    [MODULE_PNG]: 'png-bytes',
    [DETAIL_GLB]: 'glb-bytes',
    [DETAIL_PNG]: 'png-bytes',
    [COMPANION_SVG]: '<svg></svg>',
    [AUDIO_OGG]: 'ogg-bytes',
    [MOTION_MP4]: 'mp4-bytes',
    [MOTION_POSTER]: 'jpg-bytes',
    [EDITORIAL_WEBP]: 'webp-bytes',
    'assets-source/library/realm/catalogue.json': JSON.stringify({
      scenes: [
        {
          id: 'harbour',
          title: 'Harbour',
          design: 'original',
          derivatives: sceneDerivatives,
        },
      ],
      assets: [
        {
          id: 'tower-square-base',
          title: 'Tower Square Base',
          design: 'reused',
          derivatives: [MODULE_GLB, MODULE_PNG],
        },
      ],
    }),
    'assets-source/library/realm/details/catalogue.json': JSON.stringify({
      assets: [
        {
          id: 'boat',
          title: 'Little boat',
          design: 'original',
          derivatives: [DETAIL_GLB, DETAIL_PNG],
        },
      ],
    }),
    'assets-source/library/companions/catalogue.json': JSON.stringify({
      assets: [{ id: 'cat', title: 'Miso', derivatives: [COMPANION_SVG] }],
    }),
    'assets-source/library/audio/catalogue.json': JSON.stringify({
      assets: [
        {
          id: 'ui-focus-soft',
          description: 'A small wooden lift for a deliberate focus change.',
          derivatives: { ogg: AUDIO_OGG },
        },
      ],
    }),
    'assets-source/library/motion/catalogue.json': JSON.stringify({
      items: [
        {
          id: 'alibi-intro',
          title: 'Alibi intro',
          derivatives: [
            { type: 'mp4', path: 'renders/alibi-intro.mp4' },
            { type: 'poster', path: 'posters/alibi-intro.jpg' },
          ],
          metadata: { durationSec: 36 },
        },
      ],
    }),
    'assets-source/library/editorial/catalogue.json': JSON.stringify([
      { id: 'reading-room', title: 'Reading room', derivatives: [EDITORIAL_WEBP] },
    ]),
  });
  const dist = path.join(fixture, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  return { fixture, dist };
}

test('missing .glb derivative raises an explicit invalid-catalogue error before any write', () => {
  const { fixture, dist } = buildFixture('missing-glb', [SCENE_PNG]);
  assert.throws(
    () => buildExperience(fixture, dist),
    (err) => {
      assert.ok(err instanceof Error, 'an error is raised');
      assert.ok(!(err instanceof TypeError), 'not the previous TypeError from emit');
      assert.match(err.message, /invalid catalogue/);
      assert.match(err.message, /harbour/);
      assert.match(err.message, /glb/);
      return true;
    },
  );
  assert.deepEqual(fs.readdirSync(path.join(dist, 'assets')), []);
});

test('valid catalogues build as before', () => {
  const { fixture, dist } = buildFixture('happy-path', [SCENE_GLB, SCENE_PNG]);
  const { manifest } = buildExperience(fixture, dist);
  assert.equal(manifest.scenes.length, 1);
  assert.match(manifest.scenes[0].model, /\.glb$/);
  assert.match(manifest.scenes[0].image, /\.png$/);
  assert.equal(manifest.modules.length, 2);
  assert.deepEqual(Object.keys(manifest.companions[0].states), ['idle']);
  assert.match(manifest.audio[0].url, /\.ogg$/);
  assert.match(manifest.films[0].url, /\.mp4$/);
  assert.match(manifest.films[0].image, /\.jpg$/);
  assert.match(manifest.editorial[0].image, /\.webp$/);
  for (const url of [
    manifest.scenes[0].model,
    manifest.scenes[0].image,
    manifest.audio[0].url,
    manifest.films[0].url,
    manifest.editorial[0].image,
  ]) {
    assert.ok(fs.existsSync(path.join(dist, url)), `${url} is emitted`);
  }
});
