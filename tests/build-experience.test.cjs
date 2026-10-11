'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const buildExperience = require('../tools/build-experience.cjs');

function validCatalogues() {
  return {
    realm: {
      scenes: [
        {
          id: 'scene-1',
          title: 'Scene',
          design: 'original',
          derivatives: [
            'assets-source/library/realm/scenes/scene-1.glb',
            'assets-source/library/realm/thumbnails/scene-1.png',
          ],
        },
      ],
      assets: [
        {
          id: 'module-1',
          title: 'Module',
          design: 'original',
          derivatives: [
            'assets-source/library/realm/glb/module-1.glb',
            'assets-source/library/realm/thumbnails/module-1.png',
          ],
        },
      ],
    },
    details: {
      assets: [
        {
          id: 'detail-1',
          title: 'Detail',
          design: 'original',
          derivatives: [
            'assets-source/library/realm/details/detail-1.glb',
            'assets-source/library/realm/details/detail-1.png',
          ],
        },
      ],
    },
    companions: {
      assets: [
        {
          id: 'cat',
          title: 'Miso',
          derivatives: ['assets-source/library/companions/rigs/cat-idle.svg'],
        },
      ],
    },
    audio: {
      assets: [
        {
          id: 'ui-focus-soft',
          description: 'A focus cue',
          derivatives: { ogg: 'assets-source/library/audio/production/ui-focus-soft.ogg' },
        },
      ],
    },
    motion: {
      items: [
        {
          id: 'film-1',
          title: 'Film',
          derivatives: [
            { type: 'mp4', path: 'renders/film-1.mp4' },
            { type: 'poster', path: 'posters/film-1.jpg' },
          ],
          metadata: { durationSec: 10 },
        },
      ],
    },
    editorial: [
      {
        id: 'essay-1',
        title: 'Essay',
        derivatives: ['assets-source/library/editorial/essay-1.webp'],
      },
    ],
  };
}

function run(catalogues) {
  const originalRead = fs.readFileSync;
  const originalExists = fs.existsSync;
  const originalWrite = fs.writeFileSync;
  const jsonFor = (key) => {
    if (key.endsWith('realm/details/catalogue.json')) return JSON.stringify(catalogues.details);
    if (key.endsWith('realm/catalogue.json')) return JSON.stringify(catalogues.realm);
    if (key.endsWith('companions/catalogue.json'))
      return JSON.stringify(catalogues.companions);
    if (key.endsWith('audio/catalogue.json')) return JSON.stringify(catalogues.audio);
    if (key.endsWith('motion/catalogue.json')) return JSON.stringify(catalogues.motion);
    if (key.endsWith('editorial/catalogue.json')) return JSON.stringify(catalogues.editorial);
    return null;
  };
  fs.readFileSync = (p, encoding) => {
    const json = jsonFor(String(p));
    if (json !== null) return encoding ? json : Buffer.from(json);
    return Buffer.from(`bytes:${String(p)}`);
  };
  fs.existsSync = (p) =>
    String(p).endsWith('editorial/catalogue.json')
      ? catalogues.editorial !== undefined
      : originalExists(p);
  fs.writeFileSync = () => {};
  try {
    return buildExperience('/fake-root', '/fake-dist');
  } finally {
    fs.readFileSync = originalRead;
    fs.existsSync = originalExists;
    fs.writeFileSync = originalWrite;
  }
}

function clone(catalogues) {
  return structuredClone(catalogues);
}

test('valid stubbed catalogues build without throwing', () => {
  assert.ok(run(validCatalogues()).manifest);
});

test('realm asset without a .glb derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.realm.scenes[0].derivatives = ['foo.png'];
  assert.throws(() => run(catalogues), /Invalid realm catalogue: scene-1.*\.glb/);
});

test('realm asset without a .png derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.realm.assets[0].derivatives = ['assets-source/library/realm/glb/module-1.glb'];
  assert.throws(() => run(catalogues), /Invalid realm catalogue: module-1.*\.png/);
});

test('companions asset without an .svg derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.companions.assets[0].derivatives = [
    'assets-source/library/companions/thumbnails/cat-idle.png',
  ];
  assert.throws(() => run(catalogues), /Invalid companions catalogue: cat.*\.svg/);
});

test('audio asset without an ogg derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.audio.assets[0].derivatives = {};
  assert.throws(() => run(catalogues), /Invalid audio catalogue: ui-focus-soft.*ogg/);
});

test('motion item without an mp4 derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.motion.items[0].derivatives = [{ type: 'poster', path: 'posters/film-1.jpg' }];
  assert.throws(() => run(catalogues), /Invalid motion catalogue: film-1.*mp4/);
});

test('motion item without a poster derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.motion.items[0].derivatives = [{ type: 'mp4', path: 'renders/film-1.mp4' }];
  assert.throws(() => run(catalogues), /Invalid motion catalogue: film-1.*poster/);
});

test('editorial asset without a .webp derivative names the asset id', () => {
  const catalogues = clone(validCatalogues());
  catalogues.editorial[0].derivatives = ['assets-source/library/editorial/essay-1.png'];
  assert.throws(() => run(catalogues), /Invalid editorial catalogue: essay-1.*\.webp/);
});
