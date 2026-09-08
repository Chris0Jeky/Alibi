/* Replay published solutions through the real reducers, not by assigning final state.
   Usage (from repository): node <bundle>/tools/runtime_check.cjs <repo-root> <pack> ...
   Optional ALIBI_ENGINE_BUNDLE and ALIBI_INSIGHTS point to pinned audit fixtures. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(process.argv[2]||'.');
let C;
if(process.env.ALIBI_ENGINE_BUNDLE) C=require(path.resolve(process.env.ALIBI_ENGINE_BUNDLE));
else {C=require(path.join(repo,'src/core.js'));globalThis.AlibiCore=C;require(path.join(repo,'src/engines.js'));require(path.join(repo,'src/bridges.js'));}
globalThis.AlibiCore=C;require(process.env.ALIBI_INSIGHTS||path.join(repo,'src/insights.js'));
const files=process.argv.slice(3),results=[];
function actions(p){let a=[];switch(p.type){
 case 'scene':a=Object.entries(p.solution).map(([who,cell])=>({type:'place',who,cell}));a.push({type:'accuse',who:C.murderer(p,{placements:p.solution,notes:{},clueMarks:[]})});break;
 case 'dossier':a=p.solution.map((v,i)=>({type:'mark',cell:Math.floor(i/p.size)*p.size**2+(i%p.size)*p.size+v,value:1,auto:true}));a.push({type:'accuse',who:p.solution.slice(p.size).indexOf(p.targetItem)});break;
 case 'witness':a=p.statements.map((s,cell)=>({type:'mark',cell,value:Number(s.kind==='not'?!s.suspects.includes(p.solution):s.suspects.includes(p.solution))}));a.push({type:'accuse',who:p.solution});break;
 case 'aquarium':a=p.solution.map((value,tank)=>({type:'level',tank,value}));break;
 case 'network':a=p.solution.flatMap((v,cell)=>Array.from({length:v},()=>({type:'rotate',cell})));break;
 default:a=p.solution.map((value,cell)=>({type:'set',cell,value}));
}return a;}
for(const file of files){const pack=JSON.parse(fs.readFileSync(file,'utf8'));C.validatePack(pack,true);for(const p of pack.puzzles){const e=C.registry[p.type],base=e.initial(p),start=JSON.stringify(base),answer={...p};Object.defineProperty(answer,'solution',{get(){throw Error('reasoning hint read stored solution')}});
 let hint=C.insights.deduction(answer,base);assert.equal(JSON.stringify(base),start,'hint mutated state');let s=base,steps=0;for(const a of actions(p)){const before=JSON.stringify(s),q=e.reduce(p,s,a);assert.equal(JSON.stringify(s),before,'reducer mutated prior state');C.validateState(p,q);s=q;steps++;}assert(e.complete(p,s),p.id+' did not complete');
 const negative=JSON.parse(JSON.stringify(p));negative.id='negative-'+p.id.slice(0,54);if(p.type==='witness'){negative.trueCount=p.statements.length+1;assert.throws(()=>C.validateDefinition(negative));}
 let trace=[],hs=e.initial(p);for(let j=0;j<200;j++){const h=C.insights.deduction(answer,hs);if(!h||!h.cells?.length||h.value===undefined)break;const a={type:'set',cell:h.cells[0],value:h.value},next=e.reduce(p,hs,a);if(JSON.stringify(next)===JSON.stringify(hs))break;trace.push(h);hs=next;if(e.complete(p,hs))break;}
 results.push({id:p.id,type:p.type,definitionAndUnique:true,reducerReplayComplete:true,immutableReplay:true,replayActions:steps,firstReasoningHint:hint,reasoningReadsStoredAnswer:false,nativeDeductionTrace:trace,nativeTraceCompletes:e.complete(p,hs),recap:C.insights.recap(p,s)});
}}
const report={method:'Exact pinned runtime validators; semantic solution enumeration; reducer action replay; state validation; prior-state immutability; solution getter throws during reasoning hints. Native hint trace completeness is not a human difficulty rating.',puzzles:results.length,allPassed:results.every(x=>x.reducerReplayComplete),results};
fs.writeFileSync(process.env.ALIBI_REPORT||'runtime-results.json',JSON.stringify(report,null,2));console.log(`${results.length} reducer replays passed`);
