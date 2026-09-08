"""Export the retained Quiet Wing city sources and compatible original modules.

Run through the pinned local Blender executable.  The source OBJ files remain unmodified;
this creates an editable .blend master, self-contained GLBs and measured thumbnails.
"""
import bpy, json, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets-source', 'library', 'realm')
SRC = os.path.join(ROOT, 'assets-source', 'quiet-wing', 'city')
PALETTE = {
    'petrol': '#173e49', 'ink': '#172d38', 'cream': '#f4ead4', 'amber': '#dbac60',
    'sage': '#87a997', 'terracotta': '#b76d52', 'stone': '#77807a', 'water': '#5d9ca5',
    'timber': '#765443', 'crop': '#b9b75d',
}
EXISTING = [
    (m, 'castle') for m in ('tower-square-base','tower-square-mid','tower-square-top','tower-square-roof','tower-hexagon-base','tower-hexagon-mid','tower-hexagon-roof','wall','wall-corner','wall-doorway','stairs-stone','bridge-straight')
] + [(m, 'town') for m in ('wall-window-shutters','wall-wood-window-shutters','wall-door','wall-wood-door','roof-gable','roof-point','tree','tree-high','lantern','stall-red','road','road-bend')]
ORIGINAL = [
    'ground-grass','ground-path','ground-cobble','water-tile','water-edge','water-corner',
    'wall-gate','wall-end','bridge-arched','cottage-small','cottage-long','farm-barn',
    'crop-wheat','crop-rows','orchard','tree-oak',
]

def rgb(hexcode):
    h = hexcode.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4)) + (1,)
def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = rgb(PALETTE.get(name, '#f4ead4'))
    m.metallic = 0; m.roughness = .84
    m.use_nodes = True
    principled = m.node_tree.nodes.get('Principled BSDF')
    if principled:
        principled.inputs['Base Color'].default_value = rgb(PALETTE.get(name, '#f4ead4'))
        principled.inputs['Roughness'].default_value = .84
    return m
def clean():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for d in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass
def mesh_box(name, location, scale, material):
    bpy.ops.mesh.primitive_cube_add(location=location)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(mat(material)); return o
def cyl(name, location, radius, depth, material, vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat(material)); return o
def cone(name, location, r1, r2, depth, material, vertices=8):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=location)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat(material)); return o
def join_as(name, parts):
    bpy.ops.object.select_all(action='DESELECT')
    for x in parts: x.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); parts[0].name=name; return parts[0]
def procedural(name):
    p=[]
    if name.startswith('ground'):
        p=[mesh_box(name,(0,0.05,0),(1,.05,1),'sage' if name=='ground-grass' else 'stone')]
        if name=='ground-path': p.append(mesh_box('path',(0,.11,0),(.42,.02,1),'cream'))
        if name=='ground-cobble':
            for x in (-.5,0,.5):
                for z in (-.5,0,.5): p.append(mesh_box('cobble',(x,.11,z),(.22,.02,.22),'cream'))
    elif name.startswith('water'):
        p=[mesh_box(name,(0,.03,0),(1,.03,1),'water')]
        if name=='water-edge': p.append(mesh_box('shore',(0,.08,-.88),(1,.04,.12),'cream'))
        if name=='water-corner':
            p += [mesh_box('shoreA',(0,.08,-.88),(1,.04,.12),'cream'),mesh_box('shoreB',(-.88,.08,0),(.12,.04,1),'cream')]
    elif name.startswith('wall'):
        p=[mesh_box('wall',(0,.55,0),(1,.55,.18),'stone')]
        if name=='wall-gate':
            p=[mesh_box('postA',(-.75,.7,0),(.25,.7,.22),'stone'),mesh_box('postB',(.75,.7,0),(.25,.7,.22),'stone'),mesh_box('lintel',(0,1.2,0),(1,.2,.22),'stone'),mesh_box('door',(0,.48,.24),(.45,.48,.04),'timber')]
        elif name=='wall-end': p.append(cyl('cap',(1,.7,0),.25,1.4,'stone'))
    elif name.startswith('bridge'):
        p=[mesh_box('deck',(0,.55,0),(1.35,.12,.55),'timber')]
        for x in (-1.1,1.1): p.append(cyl('pier',(x,.28,0),.18,.55,'stone'))
        if name=='bridge-arched':
            for x in (-.7,0,.7): p.append(cyl('arch',(x,.22,0),.12,.45,'stone'))
    elif name.startswith('cottage') or name=='farm-barn':
        wide=1.25 if name=='cottage-long' else 1
        p=[mesh_box('body',(0,.6,0),(wide,.6,.75),'cream'),mesh_box('door',(0,.38,.77),(.22,.38,.03),'timber')]
        cone('roof',(0,1.5,0),1.22*wide,0,1.05,'terracotta',4); p.append(bpy.context.object); bpy.context.object.rotation_euler[1]=math.pi/4
        if name=='farm-barn': p.append(mesh_box('hay',(wide+.35,.28,0),(.22,.28,.22),'crop'))
    elif name.startswith('crop'):
        p=[mesh_box('soil',(0,.04,0),(1,.04,1),'timber')]
        for x in (-.65,-.22,.22,.65):
            p.append(mesh_box('row',(x,.14,0),(.08,.1,.9),'crop'))
            if name=='crop-wheat':
                for z in (-.55,0,.55): p.append(cone('wheat',(x,.32,z),.08,.02,.35,'crop',5))
    elif name=='orchard':
        p=[mesh_box('soil',(0,.04,0),(1,.04,1),'sage')]
        for x,z in ((-.5,-.4),(.45,.25)):
            p += [cyl('trunk',(x,.38,z),.09,.7,'timber'),cone('crown',(x,.95,z),.42,.12,.65,'sage')]
    elif name=='tree-oak':
        p=[cyl('trunk',(0,.55,0),.14,1.1,'timber'), cone('canopy',(0,1.45,0),.78,.22,1.3,'sage',7)]
    return join_as(name,p)
def source_obj(name, pack):
    path=os.path.join(SRC,pack,name+'.obj'); bpy.ops.wm.obj_import(filepath=path, forward_axis='Y', up_axis='Z')
    items=list(bpy.context.selected_objects)
    if len(items)>1: return join_as(name,items)
    o=items[0]; o.name=name; return o
def bounds(o):
    corners=[o.matrix_world @ Vector(c) for c in o.bound_box]
    mn=Vector((min(p.x for p in corners),min(p.y for p in corners),min(p.z for p in corners)))
    mx=Vector((max(p.x for p in corners),max(p.y for p in corners),max(p.z for p in corners)))
    return {'min':[round(x,4) for x in mn],'max':[round(x,4) for x in mx],'size':[round(x,4) for x in mx-mn],'pivot':[round(x,4) for x in o.location]}
def export_one(o, asset_id, provenance):
    o['alibi_asset_id']=asset_id; o['alibi_provenance']=provenance; o['alibi_palette']='deep petrol, ink, cream, amber, sage, terracotta'
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'glb',asset_id+'.glb'), export_format='GLB', use_selection=True, export_materials='EXPORT')
def thumbnail(o, asset_id):
    clean_camera_lights()
    bpy.context.scene.render.engine='BLENDER_EEVEE'; bpy.context.scene.render.resolution_x=320; bpy.context.scene.render.resolution_y=240; bpy.context.scene.render.resolution_percentage=100
    bpy.context.scene.world.color=rgb('#f4ead4')[:3]
    bpy.context.scene.world.use_nodes=True
    background=bpy.context.scene.world.node_tree.nodes.get('Background')
    if background: background.inputs['Color'].default_value=rgb('#f4ead4'); background.inputs['Strength'].default_value=.45
    b=bounds(o); size=max(b['size']);
    scene_view=asset_id.startswith('scene-')
    bpy.ops.object.camera_add(location=((size*.9 if scene_view else size*1.8),(-size*1.1 if scene_view else -size*2.2),(size*.8 if scene_view else size*1.6))); camera=bpy.context.object; bpy.context.scene.camera=camera
    target=Vector((0, max(.2,b['size'][1]/2),0)); direction=target-camera.location; camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); camera.data.lens=52
    bpy.ops.object.light_add(type='AREA', location=(size,-size,size*2)); bpy.context.object.data.energy=1600; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=size*3
    bpy.ops.mesh.primitive_plane_add(size=size*5, location=(0,-.02,0)); bpy.context.object.data.materials.append(mat('cream'))
    bpy.context.scene.render.filepath=os.path.join(OUT,'thumbnails',asset_id+'.png'); bpy.ops.render.render(write_still=True)
    if scene_view:
        camera.location=Vector((-size*.9,-size*.9,size*.95)); direction=target-camera.location; camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath=os.path.join(OUT,'thumbnails',asset_id+'-alt.png'); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
def clean_camera_lights():
    for o in list(bpy.data.objects):
        if o.type in {'CAMERA','LIGHT'} or o.name.startswith('Plane'): bpy.data.objects.remove(o, do_unlink=True)
def ground_center(o):
    b=bounds(o); o.location.x-=(b['min'][0]+b['max'][0])/2; o.location.z-=(b['min'][2]+b['max'][2])/2; o.location.y-=b['min'][1]
def scene_scale(o):
    extent=max(bounds(o)['size']) or 1
    o.scale *= 1.65 / extent
def main():
    for d in ('glb','thumbnails','scenes'): os.makedirs(os.path.join(OUT,d),exist_ok=True)
    mode = '--originals-only' if '--originals-only' in sys.argv else '--scenes-only' if '--scenes-only' in sys.argv else 'full'
    clean(); collection=bpy.context.collection
    metadata=[]; objects={}
    if mode == 'full':
        for name,pack in EXISTING:
            o=source_obj(name,pack); objects[name]=o; export_one(o,name,'quiet-wing-city/'+pack+'/'+name+'.obj (CC0-1.0)'); metadata.append({'id':name,'category':'retained-city','status':'current','source':'assets-source/quiet-wing/city/'+pack+'/'+name+'.obj','derivatives':['glb/'+name+'.glb','thumbnails/'+name+'.png'],'metadata':bounds(o),'provenance':'CC0-1.0 retained city source','integrationReference':'src/quiet-wing/assets/city-models.json'}); thumbnail(o,name)
    if mode in ('full','--originals-only'):
        for name in ORIGINAL:
            clean(); o=procedural(name); objects[name]=o; export_one(o,name,'original Alibi library module'); thumbnail(o,name)
    # compose three fully self-contained scenes from GLB modules, each deliberately different.
    scene_sets={'harbour':['ground-cobble','water-tile','water-edge','bridge-arched','stall-red','lantern','cottage-small','tree'], 'hillfort':['ground-grass','wall-gate','wall-end','tower-square-base','tower-square-top','tower-square-roof','road','tree-oak'], 'farmstead':['ground-grass','farm-barn','crop-wheat','crop-rows','orchard','cottage-long','road-bend','lantern']}
    for scene_id,names in scene_sets.items():
        clean(); made=[]
        for i,name in enumerate(names):
            if name in dict(EXISTING): o=source_obj(name,dict(EXISTING)[name])
            else: o=procedural(name)
            ground_center(o)
            scene_scale(o)
            o.location.x=(i%4)*2.6-3.9; o.location.z=(i//4)*2.7-1.4; made.append(o)
        bpy.ops.object.select_all(action='DESELECT')
        for o in made:o.select_set(True)
        bpy.context.view_layer.objects.active=made[0]
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'scenes',scene_id+'.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT')
        joined=join_as(scene_id,made); thumbnail(joined,'scene-'+scene_id)
    clean(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'realm-kit.blend'))
    if mode != 'full': return
    catalogue={'schemaVersion':1,'palette':PALETTE,'assets':metadata,'scenes':list(scene_sets),'generator':'Blender 5.2.1'}
    for filename in ('export-metadata.json','catalogue.json'):
        with open(os.path.join(OUT,filename),'w',encoding='utf8') as f: json.dump(catalogue,f,indent=2)
if __name__=='__main__': main()
