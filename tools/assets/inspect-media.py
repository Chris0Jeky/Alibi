"""Parse all produced SVGs and decode/probe image assets from the central catalogue."""
from pathlib import Path
import json, xml.etree.ElementTree as ET, subprocess
ROOT=Path(__file__).resolve().parents[2]
catalog=json.loads((ROOT/'assets-source/library/catalogue.json').read_text(encoding='utf8'))
checked=set();counts={'svg':0,'image':0};image_paths=[]
for a in catalog['assets']:
    for entry in a['files']:
        relative=entry['path']
        if relative in checked: continue
        checked.add(relative);p=ROOT/relative
        if p.suffix=='.svg':
            tree=ET.parse(p);assert tree.getroot().tag=='{http://www.w3.org/2000/svg}svg',relative
            for element in tree.iter():
                assert element.tag.split('}')[-1] not in ['script','foreignObject'],relative
                assert not any(k.startswith('on') for k in element.attrib),relative
            counts['svg']+=1
        elif p.suffix in ['.png','.webp','.jpg']:
            image_paths.append(relative)
            counts['image']+=1
subprocess.run(['node','-e',"const fs=require('fs'),sharp=require('sharp');(async()=>{for(const p of JSON.parse(fs.readFileSync(0,'utf8'))){const s=sharp(p),m=await s.metadata();if(!m.width||!m.height||Math.max(m.width,m.height)>8192)throw Error(p);await s.raw().toBuffer();}})().catch(e=>{console.error(e);process.exitCode=1;});"],input=json.dumps(image_paths),text=True,cwd=ROOT,check=True)
print(json.dumps({'passed':True,'counts':counts,'scope':'Syntax and full image decode; composition still requires visual inspection'}))
