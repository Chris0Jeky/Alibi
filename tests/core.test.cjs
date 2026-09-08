'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../src/core.js');const C=require('../src/engines.js');
const pack=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/catalog.json'))),old=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/legacy.json')));
let assertions=0;const ok=(v,msg)=>{assert.ok(v,msg);assertions++;},eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);assertions++;},throws=(f,msg)=>{assert.throws(f,undefined,msg);assertions++;};
const results=[];
function solvedState(p){const E=C.registry[p.type];let s=E.initial(p);const apply=a=>s=E.reduce(p,s,a);
 if(p.type==='scene'){for(const person of p.people)apply({type:'place',who:person.id,cell:p.solution[person.id]});ok(!E.complete(p,s),p.id+' requires final accusation');apply({type:'accuse',who:C.murderer(p,s)});}
 else if(p.type==='dossier'){for(let cat=0;cat<2;cat++)for(let r=0;r<p.size;r++)apply({type:'mark',cell:cat*p.size**2+r*p.size+p.solution[cat*p.size+r],value:1});ok(!E.complete(p,s),p.id+' requires final accusation');apply({type:'accuse',who:p.solution.slice(p.size).indexOf(p.targetItem)});}
 else if(p.type==='witness')apply({type:'accuse',who:p.solution});
 else if(p.type==='aquarium')p.solution.forEach((value,tank)=>apply({type:'level',tank,value}));
 else if(p.type==='network')p.solution.forEach((v,cell)=>{for(let k=0;k<v;k++)apply({type:'rotate',cell});});
 else p.solution.forEach((value,cell)=>apply({type:'set',cell,value}));
 return s;
}
ok(pack.puzzles.length===102,'102 puzzles');ok(C.TYPES.length===12,'12 types');
for(const p of pack.puzzles){const start=performance.now();C.validateDefinition(p);assertions++;const result=C.solve(p);ok(result.solutions.length===1,p.id+' has exactly one solution');
 if(p.type==='scene')for(const k of Object.keys(p.solution))eq(result.solutions[0][k],p.solution[k],p.id+' solution '+k);
 else if(p.type==='network')eq(result.solutions[0].map((v,i)=>C.extras.rot(p.tiles[i],v)),p.solution.map((v,i)=>C.extras.rot(p.tiles[i],v)),p.id+' semantic rotation solution');
 else eq(result.solutions[0],p.solution,p.id+' published solution');
 const E=C.registry[p.type],initial=E.initial(p),snapshot=C.clone(initial);C.validateState(p,initial);assertions++;ok(!E.complete(p,initial),p.id+' not initially solved');
 const solved=solvedState(p);ok(E.complete(p,solved),p.id+' completed through reducers');C.validateState(p,solved);assertions++;ok(E.validate(p,solved).length===0,p.id+' final rules valid');eq(initial,snapshot,p.id+' original state immutable');
 if(p.givens){const blank=p.type==='binary'?-1:0,i=p.givens.findIndex(v=>v!==blank);eq(E.reduce(p,solved,{type:'set',cell:i,value:blank}),solved,p.id+' fixed clue cannot be edited');}
 results.push({id:p.id,type:p.type,unique:true,milliseconds:Math.round(performance.now()-start)});
}
for(const legacy of old.puzzles){const p=pack.puzzles.find(p=>p.id===legacy.id);ok(!!p,p.id+' retained');eq(p.revision,legacy.revision,p.id+' revision preserved');for(const k of Object.keys(legacy))eq(p[k],legacy[k],p.id+' legacy field '+k);const state=solvedState(legacy);C.validateState(p,state);assertions++;}
for(let seed=1;seed<=25;seed++){const p=C.createSceneDraft({seed});ok(C.solve(p).solutions.length===1,'generated scene unique '+seed);C.validateDefinition(p);assertions++;}
for(const type of C.TYPES){const p=C.clone(pack.puzzles.find(p=>p.type===type));p.id='__proto__';throws(()=>C.validateDefinition(p),type+' rejects unsafe ID');delete p.id;throws(()=>C.validateDefinition(p),type+' rejects missing ID');}
const duplicate=C.clone(pack);duplicate.puzzles.push(duplicate.puzzles[0]);throws(()=>C.validatePack(duplicate,false),'duplicate IDs rejected');
const future=C.clone(pack);future.schemaVersion=99;throws(()=>C.validatePack(future,false),'future format rejected');
const small=C.clone(pack.puzzles.find(p=>p.type==='sudoku'&&p.size===4));small.givens.fill(0);ok(C.solve(small).solutions.length===2,'solution count stops at two');
const dossier=pack.puzzles.find(p=>p.type==='dossier'),ds=solvedState(dossier);const spare=ds.marks.findIndex(v=>v!==1);ds.marks[spare]=1;ok(!C.registry.dossier.complete(dossier,ds),'extra YES cannot bypass dossier completion');ok(C.registry.dossier.validate(dossier,ds).length>0,'duplicate dossier YES reported');
for(const type of ['scene','dossier','witness']){const p=pack.puzzles.find(p=>p.type===type),s=solvedState(p);if(type==='scene')s.accused=p.people.find(w=>w.id!==s.accused&&w.id!==p.victim).id;else s.accused=(s.accused+1)%p.size;ok(!C.registry[type].complete(p,s),type+' wrong accusation rejected');}
const aqu=pack.puzzles.find(p=>p.type==='aquarium'),as=C.registry.aquarium.initial(aqu);eq(C.registry.aquarium.reduce(aqu,as,{type:'level',tank:0,value:999}),as,'invalid water level ignored');
const net=pack.puzzles.find(p=>p.type==='network'),ns=C.registry.network.initial(net);eq(C.registry.network.reduce(net,ns,{type:'rotate',cell:-1}),ns,'out-of-range tile ignored');
for(const type of ['lightup','tents']){const p=pack.puzzles.find(p=>p.type===type),s=C.registry[type].initial(p),i=type==='lightup'?p.walls.findIndex(w=>w!==-2):p.trees[0];eq(C.registry[type].reduce(p,s,{type:'set',cell:i,value:1}),s,type+' obstacle is immutable');}
const books=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/casebooks.json')));ok(books.length===3,'three casebooks');for(const b of books)for(const ch of b.chapters)ok(pack.puzzles.some(p=>p.id===ch.id),'casebook chapter resolves '+ch.id);
const output={passed:true,assertions,puzzles:102,types:12,legacyPuzzles:40,generatedScenes:25,scope:'Pure engine, bounded solver, reducer and data-contract checks',results};fs.writeFileSync(path.join(__dirname,'core-results.json'),JSON.stringify(output,null,2));console.log('PASS',assertions,'engine/content assertions.');
