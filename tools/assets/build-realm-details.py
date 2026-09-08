"""Build original low-poly detail models for the existing Quiet Wing Realm types."""

import json
import math
import os
import sys

import bpy
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets-source', 'library', 'realm', 'details')
FORCE = '--force' in sys.argv
PALETTE = {
    'petrol': '#173e49',
    'cream': '#f4ead4',
    'amber': '#dbac60',
    'sage': '#87a997',
    'timber': '#765443',
    'water': '#5d9ca5',
}


def colour(name):
    value = PALETTE[name][1:]
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1,)


def material(name):
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = colour(name)
    value.use_nodes = True
    value.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = colour(name)
    value.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.82
    return value


def cube(name, x, y, z, sx, sy, sz, colour_name, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z), rotation=rotation)
    item = bpy.context.object
    item.name = name
    item.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    item.data.materials.append(material(colour_name))
    return item


def cylinder(name, x, y, z, radius, depth, colour_name, vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(x, y, z))
    item = bpy.context.object
    item.name = name
    item.data.materials.append(material(colour_name))
    return item


def cone(name, x, y, z, radius, depth, colour_name, vertices=8):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0, depth=depth, location=(x, y, z))
    item = bpy.context.object
    item.name = name
    item.data.materials.append(material(colour_name))
    return item


def mesh(name, vertices, faces, colour_name):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(material(colour_name))
    item = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(item)
    return item


def join(name, items):
    bpy.ops.object.select_all(action='DESELECT')
    for item in items:
        item.select_set(True)
    bpy.context.view_layer.objects.active = items[0]
    bpy.ops.object.join()
    items[0].name = name
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    return items[0]


def boat():
    items = []
    # A petrol hull keeps the silhouette crisp; the open top exposes the plank seats.
    items.append(mesh('boat-hull', [
        (-.78, -.24, .08), (-.78, .24, .08), (.84, 0, .13),
        (-.68, -.37, .34), (-.68, .37, .34), (.9, 0, .32),
        (-.72, -.18, .22), (-.72, .18, .22),
    ], [
        (0, 1, 2), (0, 2, 5, 3), (2, 1, 4, 5), (0, 3, 7, 1),
        (1, 7, 4), (3, 5, 4, 7), (0, 6, 3), (0, 1, 7, 6),
    ], 'petrol'))
    for y in (-.22, 0, .22):
        items.append(cube('hull-plank', -.05, y, .34, .53, .025, .025, 'timber'))
    for x in (-.28, .22):
        items.append(cube('seat', x, 0, .37, .1, .29, .035, 'amber'))
    items.append(cylinder('mast', -.12, 0, .68, .035, .76, 'timber', 8))
    items.append(mesh('sail', [(-.08, -.012, .47), (-.08, -.012, 1.02), (.45, -.012, .54),
                               (-.08, .012, .47), (.45, .012, .54), (-.08, .012, 1.02)],
                      [(0, 1, 2), (3, 4, 5)], 'cream'))
    return join('boat', items)


def bench():
    items = []
    for x in (-.38, .38):
        items.append(cube('bench-leg', x, 0, .23, .055, .25, .23, 'petrol'))
        items.append(cube('bench-foot', x, 0, .035, .15, .28, .035, 'sage'))
    for y in (-.2, -.065, .07, .205):
        items.append(cube('seat-slat', 0, y, .43, .64, .05, .035, 'timber'))
    for z in (.62, .76, .9):
        items.append(cube('back-slat', 0, .235, z, .64, .035, .042, 'timber', (math.radians(-12), 0, 0)))
    items.append(cube('bench-brace', 0, .02, .24, .58, .035, .035, 'amber'))
    return join('bench', items)


def fountain_well():
    items = [
        cylinder('sage-plinth', 0, 0, .035, .57, .07, 'sage', 10),
        cylinder('cream-basin', 0, 0, .12, .45, .17, 'cream', 10),
        cylinder('water-bowl', 0, 0, .215, .34, .025, 'water', 10),
        cylinder('petrol-column', 0, 0, .39, .095, .36, 'petrol', 8),
        cylinder('amber-spout', 0, 0, .6, .16, .04, 'amber', 8),
        cone('water-cap', 0, 0, .665, .11, .12, 'water', 8),
    ]
    return join('well-fountain', items)


def bounds(item):
    bpy.context.view_layer.update()
    points = [item.matrix_world @ Vector(point) for point in item.bound_box]
    low = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    high = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return low, high


def metadata(item):
    low, high = bounds(item)
    triangles = sum(max(0, len(face.vertices) - 2) for face in item.data.polygons)
    if triangles > 250:
        raise RuntimeError(f'{item.name} exceeds the 250-triangle detail budget: {triangles}')
    return {
        'min': [round(value, 4) for value in low],
        'max': [round(value, 4) for value in high],
        'size': [round(high[index] - low[index], 4) for index in range(3)],
        'pivot': [round(value, 4) for value in item.location],
        'triangleCount': triangles,
        'palette': PALETTE,
    }


def ensure_output(path):
    if os.path.exists(path) and not FORCE:
        raise RuntimeError(f'Refusing to overwrite {path}; rerun with --force after review.')


def render(item, target):
    hidden = {candidate: candidate.hide_render for candidate in bpy.context.scene.objects}
    for candidate in hidden:
        candidate.hide_render = candidate != item
    low, high = bounds(item)
    centre = (low + high) / 2
    span = max(*(high - low), 1)
    bpy.ops.object.camera_add(location=centre + Vector((span * 1.25, -span * 1.45, span * 1.1)))
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = span * 1.7
    camera.rotation_euler = (centre - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=centre + Vector((-span, -span, span * 1.8)))
    light = bpy.context.object
    light.data.energy = 125 * span * span
    light.data.shape = 'DISK'
    light.data.size = span * 1.8
    bpy.ops.mesh.primitive_plane_add(size=span * 8, location=(0, 0, -.02))
    floor = bpy.context.object
    floor.data.materials.append(material('cream'))
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 320
    scene.render.resolution_y = 240
    scene.render.resolution_percentage = 100
    scene.render.filepath = target
    scene.world.color = colour('cream')[:3]
    bpy.ops.render.render(write_still=True)
    for transient in (camera, light, floor):
        bpy.data.objects.remove(transient, do_unlink=True)
    for candidate, value in hidden.items():
        candidate.hide_render = value


def export(item, target):
    bpy.ops.object.select_all(action='DESELECT')
    item.select_set(True)
    bpy.context.view_layer.objects.active = item
    bpy.ops.export_scene.gltf(filepath=target, export_format='GLB', use_selection=True, export_materials='EXPORT')


def main():
    os.makedirs(OUT, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    outputs = [os.path.join(OUT, name) for name in (
        'boat.glb', 'bench.glb', 'well-fountain.glb', 'boat.png', 'bench.png', 'well-fountain.png',
        'realm-details.blend', 'catalogue.json',
    )]
    for target in outputs:
        ensure_output(target)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    entries = []
    for source_id, saved_type, title, maker in (
        ('boat', 'boat', 'Little boat', boat),
        ('bench', 'bench', 'Garden bench', bench),
        ('well-fountain', 'well', 'Village fountain', fountain_well),
    ):
        item = maker()
        item.name = source_id
        export(item, os.path.join(OUT, source_id + '.glb'))
        render(item, os.path.join(OUT, source_id + '.png'))
        entries.append({
            'id': source_id,
            'type': saved_type,
            'title': title,
            'category': 'realm-detail',
            'status': 'current',
            'design': 'original',
            'source': 'tools/assets/build-realm-details.py',
            'derivatives': [
                f'assets-source/library/realm/details/{source_id}.glb',
                f'assets-source/library/realm/details/{source_id}.png',
            ],
            'metadata': metadata(item),
            'provenance': 'Original Alibi low-poly detail model, authored locally in Blender.',
            'accessibility': 'Static PNG thumbnail accompanies the GLB; no runtime GLB loader is used.',
            'integration': 'Converted into src/quiet-wing/assets/library-models.json for the existing saved type.',
            'qa': 'Measured bounds and triangle budget are recorded during deterministic local generation.',
        })
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'realm-details.blend'))
    catalogue = {
        'schemaVersion': 1,
        'master': {
            'id': 'realm-details-master',
            'title': 'Realm details Blender master',
            'category': 'realm-detail',
            'status': 'current',
            'design': 'original',
            'source': 'tools/assets/build-realm-details.py',
            'derivatives': ['assets-source/library/realm/details/realm-details.blend'],
            'metadata': {'coordinateSystem': 'Blender Z-up; standard glTF Y-up export', 'gridUnits': 2},
            'provenance': 'Original Alibi editable master for the live Realm detail modules.',
            'accessibility': 'Each exported GLB includes a static PNG thumbnail.',
            'integration': 'Selected models are converted into compact runtime geometry.',
            'qa': 'Opened and exported by Blender 5.2.1 LTS.',
        },
        'assets': entries,
        'generator': 'Blender 5.2.1 LTS',
    }
    with open(os.path.join(OUT, 'catalogue.json'), 'w', encoding='utf8', newline='\n') as handle:
        json.dump(catalogue, handle, indent=2)
        handle.write('\n')


if __name__ == '__main__':
    main()
