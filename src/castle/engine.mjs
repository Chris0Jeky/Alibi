import W from './content.mjs';
const ids=['gate','shelves','clock','route','lamps','hanoi','bridges','magic','ur','inference'];
const edges=[['S','B',2],['B','O',3],['O','T',2],['S','L',4],['L','A',4],['A','T',3],['B','A',5]];
const river=[['N','I'],['N','I'],['S','I'],['S','I'],['I','E'],['N','E'],['S','E']];
const clone=x=>JSON.parse(JSON.stringify(x));
const has=(s,id)=>Object.hasOwn(s.completed,id);
function initial(){return {version:1,revision:0,completed:{},notes:'',visited:[],drafts:{},revealed:[],preferences:{motion:true,sound:false,story:true}};}
function lights(presses){const a=[1,1,1,1,1,1,1,1,1];for(const i of [0,4,8])toggle(a,i);for(let i=0;i<9;i++)if(presses[i])toggle(a,i);return a;}
function toggle(a,i){const r=Math.floor(i/3),c=i%3;for(const [dr,dc]of[[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<3&&cc>=0&&cc<3)a[rr*3+cc]^=1;}}
function hanoi(log){const pegs=[[3,2,1],[],[]];if(!Array.isArray(log)||log.length>1000)return null;for(const pair of log){if(!Array.isArray(pair)||pair.length!==2)return null;const[a,b]=pair;if(![a,b].every(n=>Number.isInteger(n)&&n>=0&&n<3)||a===b||!pegs[a].length)return null;const d=pegs[a].at(-1);if(pegs[b].length&&pegs[b].at(-1)<d)return null;pegs[a].pop();pegs[b].push(d);}return pegs;}
function routeTime(route){if(!Array.isArray(route)||route.length<1||route.length>6||new Set(route).size!==route.length||route[0]!=='S')return null;let t=0;for(let i=1;i<route.length;i++){const e=edges.find(e=>(e[0]===route[i-1]&&e[1]===route[i])||(e[1]===route[i-1]&&e[0]===route[i]));if(!e)return null;t+=e[2];}return t;}
function check(id,a){try{switch(id){
 case'gate':return Array.isArray(a)&&a.length===3&&a.every(n=>Number.isInteger(n)&&n>=0&&n<=6)&&a[0]<a[1]&&a[1]<a[2]&&a.reduce((x,y)=>x+y,0)===9&&a[2]-a[0]===4;
 case'shelves':return Array.isArray(a)&&a.length===5&&new Set(a).size===5&&['atlas','tides','stars','moss','letters'].every(n=>a.includes(n))&&a[0]==='atlas'&&a[4]==='letters'&&a.indexOf('tides')===a.indexOf('atlas')+1&&a.indexOf('stars')<a.indexOf('moss');
 case'clock':return a==='21:00';
 case'route':return Array.isArray(a)&&a.at(-1)==='T'&&routeTime(a)!==null&&routeTime(a)<10;
 case'lamps':return Array.isArray(a)&&a.length===9&&a.every(n=>n===0||n===1)&&lights(a).every(n=>n===1);
 case'hanoi':{const p=hanoi(a);return !!p&&p[2].length===3;}
 case'bridges':return a&&a.conclusion==='impossible'&&Array.isArray(a.odd)&&a.odd.length===4&&new Set(a.odd).size===4&&['N','S','I','E'].every(n=>a.odd.includes(n));
 case'magic':return Array.isArray(a)&&a.length===9&&new Set(a).size===9&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=9)&&[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].every(xs=>xs.reduce((s,i)=>s+a[i],0)===15);
 case'ur':return a===2;
 case'inference':return a==='possible-not-proven';
 default:return false;
 }}catch{return false;}}
function available(s,id){return id==='clock'?has(s,'shelves'):id==='route'?has(s,'gate')||has(s,'bridges')||has(s,'magic'):id==='inference'?has(s,'clock')&&has(s,'route'):ids.includes(id);}
function complete(s,id,answer,guided=false){if(!available(s,id)||!check(id,answer))return {ok:false,state:s,error:'Check the remaining constraints before submitting.'};if(has(s,id))return {ok:true,state:s,newAward:false};const n=clone(s);n.completed[id]={answer:clone(answer),guided:!!guided};n.revision++;delete n.drafts[id];return {ok:true,state:n,newAward:true};}
function roomStatus(s,room){switch(room.gate){case'planned':return {open:false,reason:'This room is planned. It has no playable investigation yet.'};case'observatory':return {open:has(s,'shelves'),reason:'Recover the maintenance slip in the Long Library.'};case'cartography':return {open:has(s,'gate')||has(s,'bridges')||has(s,'magic'),reason:'Solve the Gatehouse lock, or complete Bridges or Lo Shu in the museum.'};case'study':return {open:has(s,'clock')&&has(s,'route'),reason:'Correct the ticket in the Observatory and trace the Map Room footpath.'};case'west':return {open:has(s,'inference'),reason:'Compare the three records in the Keeper’s Study.'};default:return {open:true,reason:''};}}
function score(s){return Object.keys(s.completed).length*10;}
function evidence(s){return W.evidence.filter(x=>has(s,x.requires));}
function validDraft(id,a){try{switch(id){case'gate':return Array.isArray(a)&&a.length===3&&a.every(n=>Number.isInteger(n)&&n>=0&&n<=6);case'shelves':return Array.isArray(a)&&a.length===5&&new Set(a).size===5&&['atlas','tides','stars','moss','letters'].every(x=>a.includes(x));case'clock':return typeof a==='string'&&a.length<=5;case'route':return routeTime(a)!==null;case'lamps':return Array.isArray(a)&&a.length===9&&a.every(n=>n===0||n===1);case'hanoi':return hanoi(a)!==null;case'magic':return Array.isArray(a)&&a.length===9&&new Set(a).size===9&&a.every(n=>Number.isInteger(n)&&n>0&&n<10);case'bridges':return a&&Array.isArray(a.odd)&&a.odd.length<=4&&new Set(a.odd).size===a.odd.length&&a.odd.every(n=>['N','S','I','E'].includes(n))&&['','impossible','possible'].includes(a.conclusion);case'ur':return a===null||Number.isInteger(a)&&a>=0&&a<=4;case'inference':return typeof a==='string'&&a.length<80;default:return false;}}catch{return false;}}
const plain = o => !!o && typeof o === 'object' && !Array.isArray(o) && [Object.prototype, null].includes(Object.getPrototypeOf(o));
function shape(o, keys) {
 if (!plain(o) || Object.keys(o).some(k => !keys.includes(k))) throw Error('Unknown record fields. The stored record has been preserved.');
}
function validate(s){
 shape(s,['version','revision','completed','notes','visited','drafts','revealed','preferences']);
 shape(s.completed,ids);shape(s.drafts,ids);shape(s.preferences,['motion','sound','story']);
 for(const record of Object.values(s.completed))shape(record,['answer','guided']);
if(s&&typeof s==='object'&&Object.keys(s).some(k=>!['version','revision','completed','notes','visited','drafts','revealed','preferences'].includes(k)))throw Error('Unknown save fields. Original data was not overwritten.');if(!s||s.version!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!s.completed||Array.isArray(s.completed)||typeof s.completed!=='object')throw Error('Unrecognised or future save. Original data was not overwritten.');if(JSON.stringify(s).length>150000||typeof s.notes!=='string'||s.notes.length>12000)throw Error('Invalid notebook.');if(!Array.isArray(s.visited)||s.visited.length>W.rooms.length||new Set(s.visited).size!==s.visited.length||!s.visited.every(id=>W.rooms.some(r=>r.id===id)))throw Error('Invalid visits.');if(!s.preferences||!['motion','sound','story'].every(k=>typeof s.preferences[k]==='boolean'))throw Error('Invalid preferences.');if(!s.drafts||typeof s.drafts!=='object'||Array.isArray(s.drafts))throw Error('Invalid drafts.');for(const[id,a]of Object.entries(s.drafts))if(!ids.includes(id)||!validDraft(id,a))throw Error('Invalid unfinished board.');for(const[id,record]of Object.entries(s.completed))if(!ids.includes(id)||!record||typeof record.guided!=='boolean'||!check(id,record.answer))throw Error('Invalid completion.');for(const id of ['clock','route','inference'])if(has(s,id)&&!available(s,id))throw Error('Completion prerequisites missing.');if(s.revealed!==undefined&&(!Array.isArray(s.revealed)||s.revealed.length>ids.length||new Set(s.revealed).size!==s.revealed.length||!s.revealed.every(x=>ids.includes(x))))throw Error('Invalid reveal history.');const clean=initial();clean.revealed=[...(s.revealed??[])];clean.revision=s.revision;clean.completed=clone(s.completed);clean.notes=s.notes;clean.visited=[...s.visited];clean.drafts=clone(s.drafts);clean.preferences={motion:s.preferences.motion,sound:s.preferences.sound,story:s.preferences.story};return clean;}

export { initial, check, complete, available, roomStatus, score, evidence, validate, validDraft, lights, hanoi, routeTime, edges, river, has, clone, ids };
