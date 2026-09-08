/* Original editorial vectors and stamps. Run from repo root; --write updates derivatives.
 * The authored shapes below are masters. Hand edits to output require explicit --force. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const ctx = {}; vm.createContext(ctx);
for (const f of ['presentation.js','quiet-wing/calm.js','quiet-wing/engine.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src',f),'utf8'),ctx);
const P = {ink:'#172d38',petrol:'#173e49',paper:'#f4ead4',gold:'#dbac60',sage:'#87a997',clay:'#b76d52'};
const rect=(x,y,w,h,c,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}"/>`;
const line=(d,c=P.gold,w=3)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shape=(d,c)=>`<path d="${d}" fill="${c}"/>`;
const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const windowAt=(x,y,w=34,h=53)=>rect(x,y,w,h,P.gold,16)+line(`M${x+w/2} ${y}v${h}M${x} ${y+h*.55}h${w}`,P.petrol,4);
const leaves=(x,y)=>`<g transform="translate(${x} ${y})">${line('M0 50V-45',P.sage)}${[-30,-8,14].map((n,i)=>shape(`M0 ${n+15}Q${i%2?-35:35} ${n+10} ${i%2?-25:25} ${n-12}Q0 ${n-7} 0 ${n+15}`,P.sage)).join('')}</g>`;
const lamp=(x,y)=>`<g transform="translate(${x} ${y})">${circle(0,0,63,'#28515a')}${rect(-22,-27,44,59,P.gold,5)}${line('M-28-31H28M-28 35H28M0-31V-46M-16-46H16',P.paper,5)}${line('M-13-24V29M13-24V29',P.petrol,4)}</g>`;
const book=(x,y,c=P.clay)=>`<g transform="translate(${x} ${y}) rotate(-8)">${rect(0,0,105,17,c,3)}${rect(8,4,94,9,P.paper,1)}${line('M10 8H93',P.gold,1)}</g>`;
const scenes = [
 ['bellweather-witness-03','Porch in the sea air','The earliest record establishes the lighthouse setting without illustrating the missing object.',
  rect(74,30,220,230,'#234852')+shape('M48 59 182 5 322 59Z',P.ink)+rect(103,101,82,159,P.ink,40)+windowAt(214,98)+line('M45 269H352M35 280H365',P.sage,5)+leaves(342,211)+lamp(130,132)],
 ['bellweather-witness-01','Weather at the window','The squall is public story context; no account or person is encoded.',
  rect(68,34,264,216,P.paper,8)+rect(82,47,236,185,P.petrol,70)+line('M199 50V231M86 141H315',P.sage,8)+[0,1,2,3,4].map(i=>line(`M${104+i*42} 70l-17 35M${118+i*42} 164l-17 35`,'#54727a',2)).join('')+rect(54,243,297,12,P.clay)+book(242,244)+circle(141,224,20,P.gold)],
 ['bellweather-dossier-01','Archive shelves','Editorial texture for a linked inventory, without readable labels or evidence assignments.',
  rect(53,36,296,239,'#234852',5)+[85,156,227].map((y,j)=>line(`M61 ${y}H341`,P.sage,7)+[0,1,2,3,4,5].map((_,i)=>rect(77+i*39,y-43,22,40,[P.clay,P.paper,P.sage][(i+j)%3],2)).join('')).join('')+lamp(294,233)],
 ['bellweather-scene-01','Lantern gallery','An architectural exterior avoids revealing the actual floor plan or any placement.',
  shape('M119 263 141 90 259 90 281 263Z',P.sage)+rect(133,66,134,50,P.ink,3)+[151,183,215,247].map(x=>rect(x,74,10,33,P.gold)).join('')+shape('M124 65 200 24 276 65Z',P.clay)+line('M122 121H278M135 136H265',P.paper,3)+rect(187,195,29,68,P.petrol,14)+line('M55 267Q119 241 166 272T350 268',P.paper,4)],
 ['bellweather-witness-02','The lens workshop','Workshop material, with no key, hand, suspect or ownership cue.',
  rect(54,235,290,16,P.clay)+[84,304].map(x=>rect(x,249,12,40,P.sage)).join('')+circle(216,146,77,P.sage)+circle(216,146,65,P.petrol)+[26,39,52].map(r=>line(`M${216-r} 146a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 -${2*r} 0`,P.paper,2)).join('')+line('M216 211V232M184 231H249',P.gold,6)+book(67,215)],
 ['bellweather-dossier-02','The harbour office','A harbour desk marks the later record without illustrating its objects or assignments.',
  rect(59,47,285,170,P.sage,3)+rect(72,59,259,145,P.petrol)+line('M73 156Q130 138 186 158T329 151M73 179Q120 163 184 181T329 176',P.paper,2)+shape('M183 142 220 142 214 155 189 155Z',P.clay)+line('M202 97V141M202 97 229 134H202',P.gold,3)+rect(43,237,311,16,P.clay)+book(72,219)+lamp(295,216)],
 ['scene-01','The dining room after dusk','The first published scene is a useful return point; a single place setting implies no clue counts.',
  shape('M60 263 87 192 305 192 347 263Z',P.clay)+shape('M94 193 290 193 319 240 80 240Z',P.paper)+`<ellipse cx="200" cy="223" rx="38" ry="11" fill="${P.sage}"/>`+rect(196,105,8,80,P.paper)+shape('M200 102Q182 89 201 75Q218 94 200 102Z',P.gold)+line('M173 185H226',P.gold,5)+windowAt(74,38,55,111)+leaves(321,128)],
 ['scene-03','Behind the curtain','A theatre silhouette distinguishes this scene while leaving the backstage floor plan unknown.',
  rect(54,44,294,217,P.ink)+shape('M54 44H170Q148 146 64 224L54 257Z',P.clay)+shape('M348 44H232Q252 146 338 224L348 257Z',P.clay)+line('M66 53Q90 130 68 201M91 52Q125 107 85 177M330 53Q306 130 330 201',P.gold,3)+`<ellipse cx="202" cy="246" rx="87" ry="17" fill="#35545a"/>`+line('M120 271H290',P.paper,3)+circle(202,106,11,P.gold)],
 ['lightup-01','A glasshouse at dusk','A gentle first illumination puzzle earns a welcoming botanical vignette, not a solved board.',
  shape('M69 257V120L201 32 333 120V257Z','#345861')+line('M69 257V120L201 32 333 120V257ZM201 32V257M69 120H333M110 95V257M290 95V257',P.sage,4)+leaves(115,203)+leaves(290,206)+lamp(201,149)+rect(57,263,290,10,P.clay)],
 ['tents-01','Woodland margin','A woodland mood avoids depicting trees and tents in rule-bearing arrangements.',
  [90,315].map((x,i)=>rect(x,98,15,173,P.clay)+[112,148,180].map(y=>shape(`M${x-49} ${y+25} ${x+7} ${y-76} ${x+64} ${y+25}Z`,i?P.sage:'#426b63')).join('')).join('')+shape('M155 272 210 183 273 272Z',P.paper)+shape('M210 183 222 272 273 272Z',P.gold)+line('M210 199V267',P.petrol,4)+circle(242,64,23,P.gold)],
 ['aquarium-01','A drop of blue','This category highlight depicts a vessel rather than a puzzle tank arrangement.',
  shape('M129 53H270V87Q326 127 312 214Q301 267 199 269Q97 267 87 214Q74 131 129 87Z',P.sage)+shape('M104 161Q149 145 205 165T296 160L293 220Q267 253 199 250Q126 253 108 219Z',P.petrol)+line('M139 61H260M99 166Q142 150 203 170T300 164',P.paper,4)+leaves(179,193)+circle(243,197,7,P.gold)+circle(254,130,4,P.paper)],
 ['network-01','Signal cottage','An architectural signal motif introduces the family without drawing a valid network or solution.',
  rect(85,128,225,136,P.sage)+shape('M64 129 196 53 332 129Z',P.clay)+windowAt(108,164)+windowAt(245,164)+rect(183,194,34,70,P.petrol,16)+line('M197 52V20M156 21H238M168 34H226',P.gold,4)+line('M48 268H353',P.paper,4)+leaves(330,207)]
];
// Authored central silhouettes. Paths live on a 24-unit grid and contain no text.
const glyphs = {
 'first-stone':'M4 8 12 4 20 8v10l-8 4-8-4ZM4 8l8 4 8-4M12 12v10',
 hamlet:'M2 12 7 7l5 5v9H2ZM13 8l5-5 5 5v13H13M5 21v-5h4v5M16 12h4',
 borough:'M2 21V9h5v12M8 21V3h7v18M16 21V7h6v14M10 7h3m-3 4h3m-3 4h3',
 castle:'M3 21V7h3V3h3v4h6V3h3v4h3v14ZM10 21v-6a2 2 0 0 1 4 0v6',
 gardener:'M12 22V10M12 16C1 18 1 8 3 7c7-1 9 4 9 9ZM12 12C10 3 18 1 21 3c1 7-3 10-9 9Z',
 architect:'M2 20h20M5 20V9l7-6 7 6v11M3 9h18M8 12h8M8 16h8',
 'new-angle':'M3 14a9 9 0 0 1 16-8l2 3M21 3v6h-6M21 13a9 9 0 0 1-16 5l-2-3M3 21v-6h6',
 postcard:'M2 5h20v14H2ZM14 8v8M17 8h2v3h-2ZM4 16l4-6 4 6',
 maker:'M3 7 12 2l9 5v10l-9 5-9-5ZM3 7l9 5 9-5M12 12v10M6 9v6l6 3 6-3V9',
 hello:'M5 10 3 3l7 4h4l7-4-2 7v7q-7 7-14 0ZM8 13h1m6 0h1M10 17l2 1 2-1',
 menagerie:'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
 kindred:'M12 21 3 12C-2 4 7 1 12 7c5-6 14-3 9 5ZM8 11l4 4 4-4',
 wanderer:'M4 21Q17 17 9 13T13 3M15 15l4-9 4 9ZM19 15v5',
 seed:'M12 22V10M12 12C1 12 1 2 3 2c9 0 10 7 9 10ZM12 14c0-8 7-9 10-7 0 7-5 9-10 7Z',
 pressed:'M3 3h18v18H3ZM12 19v-8M12 11C4 15 4 4 12 7c8-3 8 8 0 4ZM12 17l-5-3',
 herbarium:'M3 3h18v18H3ZM6 17V8m0 5 4-3M14 17V7m0 5 4-3M9 20h6',
 hanoi:'M12 2v18M8 7h8v3H8ZM5 12h14v3H5ZM2 17h20v4H2Z',
 ferryman:'M2 14h20l-4 7H6ZM12 14V2l8 9h-8M1 23h22',
 measure:'M5 3h10v18H5ZM15 6h4v10h-4M7 16h5m-5-4h3m-3-4h5',
 queens:'M3 7l5 5 4-9 4 9 5-5-3 13H6ZM7 23h10',
 'lo-shu':'M3 3h18v18H3ZM9 3v18M15 3v18M3 9h18M3 15h18M5 6h1m11 12h1m-7-6h1',
 knight:'M5 21h15l-2-7 1-7-7-5-1 4-7 7 5 3 5-5M15 7h1M7 21l3-6',
 scholar:'M2 6l10-4 10 4-10 5ZM5 9v7q7 5 14 0V9M22 7v11M4 22h16',
 restorer:'M3 3h18v18H3ZM3 9h18M9 3v18M15 3v12M3 15h12M15 15l6 6',
 curator:'M2 7 12 2l10 5ZM4 10v9m5-9v9m6-9v9m5-9v9M2 22h20',
 'club-first-light':'M6 7h12v13H6ZM9 3h6M12 3v4M9 10v7m6-7v7M4 22h16',
 'club-curious':'M3 3h8v8H3ZM13 3h8v8h-8ZM3 13h8v8H3ZM17 13v8m-4-4h8',
 'club-town':'M2 21V10l7-7 7 7v11M6 21v-7h6v7M17 12h5v9M19 16h1',
 'club-duel':'M2 4h20v16H2ZM9 4v16M15 4v16M2 12h20M5 8h1m11 8h1',
 'club-archive':'M3 6h18v15H3ZM2 3h20v3H2ZM9 10h6M8 15l4 3 4-3',
 'club-zen':'M19 3A10 10 0 1 0 21 18 9 9 0 0 1 19 3ZM3 21h6'
};
function badgeBody(id,earned){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true"><path d="M29 61 24 96 49 83 76 96 70 61" fill="${earned?P.sage:'#bec4bc'}"/><circle cx="50" cy="43" r="37" fill="${earned?P.gold:'#dedfd6'}" stroke="${earned?P.petrol:'#737d76'}" stroke-width="2"/><circle cx="50" cy="43" r="30" fill="${earned?P.paper:'#eeeee7'}"/><g transform="translate(25 18) scale(2.08)" fill="none" stroke="${earned?P.petrol:'#65736c'}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="${glyphs[id]}"/></g>${earned?'':`<rect x="72" y="69" width="17" height="15" rx="3" fill="${P.paper}" stroke="#65736c" stroke-width="2"/><path d="M76 69v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#65736c" stroke-width="2"/>`}</svg>`;}
function vignette(i){let grain='';for(let n=0;n<90;n++){const x=(n*137+13)%400,y=(n*79+17)%300;grain+=circle(x,y,n%3===0?1.2:.65,n%2?P.paper:P.gold);}return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="800" height="600">${rect(0,0,400,300,P.petrol)}${circle(317,39,100,'#214752')}${scenes[i][3]}<g opacity=".10">${grain}</g></svg>`;}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const sharp=require('sharp'), entries=[], force=process.argv.includes('--force');
 const ledgerPath=path.join(ROOT,'assets-source/library/visuals/generated.json');
 const previous=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath)):{};const next={};
 function put(rel,data){const p=path.join(ROOT,rel),b=Buffer.from(data);if(fs.existsSync(p)&&!fs.readFileSync(p).equals(b)&&previous[rel]!==hash(fs.readFileSync(p))&&!force)throw Error('Hand-edited output: '+rel+'; review and use --force');fs.mkdirSync(path.dirname(p),{recursive:true});if(!fs.existsSync(p)||!fs.readFileSync(p).equals(b))fs.writeFileSync(p,b);next[rel]=hash(b);}
 const original={author:'Alibi project',method:'Original deterministic SVG geometry',license:'Project original; no separate public reuse grant',source:'tools/assets/visuals.cjs'};
 for(let i=0;i<scenes.length;i++){
  const [id,title,selection]=scenes[i],source=`assets-source/library/visuals/highlight-${id}.svg`,derivative=`src/artwork/highlight-${id}.webp`;
  put(source,vignette(i));const webp=await sharp(Buffer.from(vignette(i))).resize(320,240).webp({quality:70,effort:6}).toBuffer();put(derivative,webp);
  entries.push({id:'highlight-'+id,title,category:'highlights',status:'current',design:'original',source,derivatives:[derivative],dimensions:[320,240],selection,spoiler:false,provenance:original,accessibility:'Decorative empty alt; puzzle title remains editable. Hidden in Zen.',integration:'src/app.js:puzzleCard'});
 }
 const club=[['club-first-light','First light'],['club-curious','A curious mind'],['club-town','Town planner'],['club-duel','A seat at the table'],['club-archive','In good order'],['club-zen','A quiet practice']];
 for(const [id,title] of [...ctx.QWEngine.BADGES,...club]){
  if(!glyphs[id])throw Error('Missing glyph '+id);const source=`assets-source/library/visuals/badge-${id}.svg`,locked=`assets-source/library/visuals/badge-${id}-locked.svg`;
  put(source,badgeBody(id,true));put(locked,badgeBody(id,false));
  entries.push({id:'badge-'+id,title,category:'badges',status:'current',design:'original',source,derivatives:[locked],dimensions:[100,100],provenance:original,accessibility:'Adjacent name and earned status; lock glyph is an additional non-colour cue.',integration:id.startsWith('club-')?'src/club.js:clubJournal':'src/quiet-wing/app.js:badgeSVG'});
 }
 for(const [type,m] of Object.entries(ctx.AlibiUI.data)){
  const source=`assets-source/library/visuals/family-${type}.svg`;const body=ctx.AlibiUI.icon(m.icon).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace('currentColor',P.petrol);put(source,body);
  const card=`assets-source/library/visuals/card-${type}.svg`;put(card,ctx.AlibiUI.art(type).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
  entries.push({id:'family-'+type,title:m.title,category:'families',status:'current',design:'reused',source,derivatives:[card],dimensions:[24,24],provenance:{author:'Alibi project',method:'Unchanged export from current AlibiUI icon/art',source:'src/presentation.js',license:'Existing project rights unchanged'},accessibility:'Existing labelled family controls; decorative diagrams are not instructional claims.',integration:'src/presentation.js; src/app.js:familyCard'});
 }
 const runtime=`/* Generated from tools/assets/visuals.cjs. Edit the master, then regenerate. */\n(function(G){'use strict';const glyphs=${JSON.stringify(glyphs)};const P=${JSON.stringify(P)};const highlights=${JSON.stringify(Object.fromEntries(scenes.map(([id])=>[id,'highlight-'+id])))};${badgeBody.toString()}G.AlibiAssets={highlights,badge:(id,earned)=>glyphs[id]?badgeBody(id,earned):''};})(globalThis);\n`;
 const formatted = await require('prettier').format(runtime, { parser:'babel', ...await require('prettier').resolveConfig(path.join(ROOT,'src/asset-library.js')) });
 put('src/asset-library.js',formatted);
 put('assets-source/library/visuals/catalogue.json',JSON.stringify(entries,null,2)+'\n');
 fs.mkdirSync(path.dirname(ledgerPath),{recursive:true});fs.writeFileSync(ledgerPath,JSON.stringify(next,null,2)+'\n');
 console.log(JSON.stringify({originalHighlights:scenes.length,originalBadges:31,reusedFamilyDesigns:13,files:Object.keys(next).length}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={scenes,glyphs,badgeBody,vignette};
