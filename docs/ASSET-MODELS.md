# Quiet Wing realm and companion asset library

`assets-source/library/` retains editable production masters. The subsequent integration pass
ships selected original geometry in the live realm builder and all model derivatives in the
optional Field notes cabinet. See [REALM-LIVE.md](REALM-LIVE.md) and
[EXPERIENCE-INTEGRATION.md](EXPERIENCE-INTEGRATION.md). Production notes below describe the
original generation workflow; its staging-only boundary has been superseded by that integration.

The realm kit has 40 genuine GLB 2.0 pieces with embedded buffers and material definitions: 24 retained CC0 city modules exported from `assets-source/quiet-wing/city/`, plus 16 original compatible terrain, water, gate, bridge, cottage, farm, crop and tree modules. Each piece has a 320 × 240 rendered thumbnail, measured bounds and pivot metadata in `realm/catalogue.json`. `realm-kit.blend` is the editable Blender master; `harbour.glb`, `hillfort.glb` and `farmstead.glb` are composed references, with alternate rendered views.

The companion library exports the existing original `QWPets.svg` geometry for Miso (cat), Fern (fox), Pip (owl) and Nimbus (cloud dragon). Every rig has named tail/body/arm/head/eyes/hearts/sleep layers and idle, look, attention, happy, sleepy, pet, feed and celebrate states. The current third-party GLB candidates are deliberately left intact at `assets-source/quiet-wing/companions/`; their source and attribution records remain authoritative.

Open `assets-source/library/model-preview.html` through the local server. Its checked-in Three bundle offers realm and state selection, static SVG fallbacks, source links and a download link for the selected export. It does not fetch any network asset.

Rebuild after a source change:

```powershell
node tools/assets/build-companion-library.cjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/assets/build-realm-library.py
node tools/assets/normalize-library-catalogues.cjs
node tools/assets/build-model-preview.cjs
node --test tests/asset-models.test.cjs
```

The current human-action backlog remains [HUMAN_TODO.md](../HUMAN_TODO.md), particularly q-4 physical Quiet Wing checks and q-5 editor-import confirmation.
