"""Z-up Blender source master and portable GLB export for the Quiet Wing asset library."""
import bpy, json, math, os
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'));OUT=os.path.join(ROOT,'assets-source','library','realm');SRC=os.path.join(ROOT,'assets-source','quiet-wing','city')
PALETTE={'petrol':'#173e49','ink':'#172d38','cream':'#f4ead4','amber':'#dbac60','sage':'#87a997','terracotta':'#b76d52','stone':'#77807a','water':'#5d9ca5','timber':'#765443','crop':'#b9b75d'}
EXISTING=[(n,'castle') for n in ('tower-square-base','tower-square-mid','tower-square-top','tower-square-roof','tower-hexagon-base','tower-hexagon-mid','tower-hexagon-roof','wall','wall-corner','wall-doorway','stairs-stone','bridge-straight')]+[(n,'town') for n in ('wall-window-shutters','wall-wood-window-shutters','wall-door','wall-wood-door','roof-gable','roof-point','tree','tree-high','lantern','stall-red','road','road-bend')]
ORIGINAL=['ground-grass','ground-path','ground-cobble','water-tile','water-edge','water-corner','wall-gate','wall-end','bridge-arched','cottage-small','cottage-long','farm-barn','crop-wheat','crop-rows','orchard','tree-oak']
def col(k):h=PALETTE[k][1:];return tuple(int(h[i:i+2],16)/255 for i in(0,2,4))+(1,)
def mat(k):
 m=bpy.data.materials.get(k)or bpy.data.materials.new(k);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=col(k);p.inputs['Roughness'].default_value=.84;return m
def cube(n,x,y,z,a,b,c,k):
 bpy.ops.mesh.primitive_cube_add(location=(x,y,z));o=bpy.context.object;o.name=n;o.scale=(a,b,c);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat(k));return o
def cyl(n,x,y,z,r,h,k):
 bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=h,location=(x,y,z));o=bpy.context.object;o.name=n;o.data.materials.append(mat(k));return o
def cone(n,x,y,z,a,b,h,k):
 bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=a,radius2=b,depth=h,location=(x,y,z));o=bpy.context.object;o.name=n;o.data.materials.append(mat(k));return o
def join(n,items):
 if len(items)==1:items[0].name=n;return items[0]
 bpy.ops.object.select_all(action='DESELECT');[o.select_set(True)for o in items];bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name=n;return items[0]
def box(items):
 bpy.context.view_layer.update()
 p=[o.matrix_world@Vector(c)for o in items for c in o.bound_box];lo=Vector((min(v.x for v in p),min(v.y for v in p),min(v.z for v in p)));hi=Vector((max(v.x for v in p),max(v.y for v in p),max(v.z for v in p)));return lo,hi,hi-lo
def data(o):
 lo,hi,size=box([o]);return {'min':[round(v,4)for v in lo],'max':[round(v,4)for v in hi],'size':[round(v,4)for v in size],'pivot':[round(v,4)for v in o.location]}
def normalize(o,scale=2):
 # Retained sources share Kenney world units; apply one common conversion rather than
 # inflating narrow details such as lanterns to a two-unit footprint.
 o.scale*=scale;bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);lo,hi,size=box([o]);o.location.x-=(lo.x+hi.x)/2;o.location.y-=(lo.y+hi.y)/2;o.location.z-=lo.z;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);return o
def proc(n):
 p=[]
 if n.startswith('ground'):p=[cube(n,0,0,.05,1,1,.05,'sage'if n=='ground-grass'else'stone')];p+=[]if n=='ground-grass'else[cube('path',0,0,.11,.42,1,.02,'cream')]if n=='ground-path'else[cube('cobble',x,y,.11,.22,.22,.02,'cream')for x in(-.5,0,.5)for y in(-.5,0,.5)]
 elif n.startswith('water'):p=[cube(n,0,0,.03,1,1,.03,'water')];p+=[]if n=='water-tile'else[cube('shore',0,-.88,.08,1,.12,.04,'cream')]if n=='water-edge'else[cube('shore-a',0,-.88,.08,1,.12,.04,'cream'),cube('shore-b',-.88,0,.08,.12,1,.04,'cream')]
 elif n.startswith('wall'):
  p=[cube('wall',0,0,.55,1,.18,.55,'stone')]
  if n=='wall-gate':p=[cube('post-a',-.75,0,.7,.25,.22,.7,'stone'),cube('post-b',.75,0,.7,.25,.22,.7,'stone'),cube('lintel',0,0,1.2,1,.22,.2,'stone'),cube('door',0,-.24,.48,.45,.04,.48,'timber')]
  if n=='wall-end':p+=[cyl('cap',1,0,.7,.25,1.4,'stone')]
 elif n.startswith('bridge'):p=[cube('deck',0,0,.55,1.35,.55,.12,'timber')]+[cyl('pier',x,0,.28,.18,.55,'stone')for x in(-1.1,1.1)]
 elif n.startswith('cottage')or n=='farm-barn':
  w=1.25 if n=='cottage-long'else 1;p=[cube('body',0,0,.6,w,.75,.6,'cream'),cube('door',0,-.77,.38,.22,.03,.38,'timber')];r=cone('roof',0,0,1.575,.85*w,0,.75,'terracotta');r.rotation_euler[2]=math.pi/4;p+=[r];p+=[]if n!='farm-barn'else[cube('hay',w+.35,0,.28,.22,.22,.28,'crop')]
 elif n.startswith('crop'):
  p=[cube('soil',0,0,.04,1,1,.04,'timber')]
  for x in(-.65,-.22,.22,.65):p+=[cube('row',x,0,.14,.08,.9,.1,'crop')]+([]if n=='crop-rows'else[cone('wheat',x,y,.32,.08,.02,.35,'crop')for y in(-.55,0,.55)])
 elif n=='orchard':p=[cube('ground',0,0,.04,1,1,.04,'sage')]+[x for a,b in((-.5,-.4),(.45,.25))for x in(cyl('trunk',a,b,.38,.09,.7,'timber'),cone('crown',a,b,.95,.42,.12,.65,'sage'))]
 elif n=='tree-oak':p=[cyl('trunk',0,0,.55,.14,1.1,'timber'),cone('canopy',0,0,1.45,.78,.22,1.3,'sage')]
 return normalize(join(n,p),1)
def source(n,pack):
 # Kenney OBJ coordinates are Y-up.  Blender's default OBJ conversion maps that height into Z;
 # the previous Y-forward override kept retained city geometry on its side.
 bpy.ops.wm.obj_import(filepath=os.path.join(SRC,pack,n+'.obj'),forward_axis='NEGATIVE_Z',up_axis='Y');return normalize(join(n,list(bpy.context.selected_objects)))
def make(n):return source(n,dict(EXISTING)[n])if n in dict(EXISTING)else proc(n)
def select(items):bpy.ops.object.select_all(action='DESELECT');[o.select_set(True)for o in items];bpy.context.view_layer.objects.active=items[0]
def glb(items,path):select(items);bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_materials='EXPORT')
def render(items,path,alt=False,large=False):
 hidden={o:o.hide_render for o in bpy.context.scene.objects}
 for o in hidden:o.hide_render=o not in items
 lo,hi,size=box(items);s=max(size.x,size.y,size.z,1);target=(lo+hi)/2;bpy.ops.object.camera_add(location=target+Vector(((-1.25 if alt else 1.25)*s,-1.4*s,1.2*s)));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=s*(2.4 if large else 1.85);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();bpy.ops.object.light_add(type='AREA',location=(-s,-s,2*s));light=bpy.context.object;light.data.energy=100*s*s;light.data.shape='DISK';light.data.size=2*s;bpy.ops.mesh.primitive_plane_add(size=12*s,location=(0,0,-.02));floor=bpy.context.object;floor.data.materials.append(mat('cream'));sc=bpy.context.scene;sc.camera=cam;sc.render.engine='BLENDER_EEVEE';sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs['Color'].default_value=col('cream');sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4;sc.view_settings.view_transform='AgX';res=640 if large else 320;sc.render.resolution_x=res;sc.render.resolution_y=res*3//4;sc.render.resolution_percentage=100;sc.render.filepath=path;bpy.ops.render.render(write_still=True);[bpy.data.objects.remove(x,do_unlink=True)for x in(cam,light,floor)]
 for o,value in hidden.items():o.hide_render=value
def move(o,c):[q.objects.unlink(o)for q in list(o.users_collection)];c.objects.link(o)
def scene(sid):
 c=bpy.data.collections.new(sid);bpy.context.scene.collection.children.link(c);items=[]
 def add(n,x,y,z=0,r=0,k=1):o=make(n);o.scale*=k;o.location=(x,y,z);o.rotation_euler[2]=r;move(o,c);items.append(o)
 if sid=='harbour':
  for x in(-3,-1,1,3):
   for y in(1,3):add('water-tile',x,y)
  for x in(-3,-1,1,3):add('ground-cobble',x,-1)
  add('bridge-arched',0,1,0,math.pi/2);add('stall-red',-2,-1);add('lantern',0,-1,0,0,.4);add('cottage-small',2,-1);add('tree',3,-.5,0,0,.42)
 elif sid=='hillfort':
  for x in(-2,0,2):
   for y in(-2,0,2):add('ground-grass',x,y)
  for x,y,r in((-3,0,0),(3,0,0),(0,3,math.pi/2),(0,-3,math.pi/2)):add('wall',x,y,0,r)
  for x,y in((-3,-3),(3,-3),(3,3),(-3,3)):add('tower-square-base',x,y)
  add('wall-gate',0,-3,0,math.pi/2);add('tower-square-mid',-3,-3,2.02);add('tower-square-roof',-3,-3,4.04);add('tree-oak',1,1,0,0,.45)
 else:
  for x in(-3,-1,1,3):
   for y in(-1,1):add('ground-grass',x,y)
  add('farm-barn',-2,0);add('cottage-long',1,0);add('crop-wheat',3,1);add('crop-rows',3,-1);add('orchard',-3,1,0,0,.6);add('ground-path',0,-1);add('lantern',0,1,0,0,.4)
 return items
def main():
 bpy.context.preferences.filepaths.save_version=0
 for d in('glb','thumbnails','scenes'):os.makedirs(os.path.join(OUT,d),exist_ok=True)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);meta=[]
 for n,p in EXISTING:
  o=source(n,p);glb([o],os.path.join(OUT,'glb',n+'.glb'));render([o],os.path.join(OUT,'thumbnails',n+'.png'));meta.append({'id':n,'category':'retained-city','status':'current','source':'assets-source/quiet-wing/city/'+p+'/'+n+'.obj','derivatives':['glb/'+n+'.glb','thumbnails/'+n+'.png'],'metadata':data(o),'provenance':'CC0 retained source normalized to two-unit Z-up footprint.','integrationReference':'src/quiet-wing/assets/city-models.json'});bpy.data.objects.remove(o,do_unlink=True)
 for n in ORIGINAL:
  o=proc(n);glb([o],os.path.join(OUT,'glb',n+'.glb'));render([o],os.path.join(OUT,'thumbnails',n+'.png'));meta.append({'id':n,'category':'compatible-module','status':'proposed','source':'tools/assets/build-realm-library.py','derivatives':['glb/'+n+'.glb','thumbnails/'+n+'.png'],'metadata':data(o),'provenance':'Original Alibi two-unit Z-up modular geometry.','integrationReference':'candidate library only; no runtime import'});bpy.data.objects.remove(o,do_unlink=True)
 total=0
 for sid in('harbour','hillfort','farmstead'):
  items=scene(sid);total+=len(items);glb(items,os.path.join(OUT,'scenes',sid+'.glb'));render(items,os.path.join(OUT,'thumbnails','scene-'+sid+'.png'),large=True);render(items,os.path.join(OUT,'thumbnails','scene-'+sid+'-alt.png'),True,large=True)
 bpy.ops.file.pack_all()
 for name in ('hillfort','farmstead'):
  bpy.data.collections[name].hide_viewport=True;bpy.data.collections[name].hide_render=True
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'realm-kit.blend'))
 catalog={'schemaVersion':1,'palette':PALETTE,'assets':meta,'scenes':['harbour','hillfort','farmstead'],'master':{'coordinateSystem':'Blender Z-up; standard glTF Y-up export','gridUnits':2,'collections':['harbour','hillfort','farmstead'],'objects':total},'generator':'Blender 5.2.1'}
 for f in('export-metadata.json','catalogue.json'):json.dump(catalog,open(os.path.join(OUT,f),'w',encoding='utf8'),indent=2)
if __name__=='__main__':main()
