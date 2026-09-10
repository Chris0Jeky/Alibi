import * as Cascade from './cascade.mjs';
import {mountSurface} from './surface.mjs';
import {openReplayStore} from './replay-store.mjs';

export function downloadReplay(value,name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importReplay(current,validate) {
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  return new Promise((resolve,reject)=>{
    input.oncancel=()=>resolve(null);
    input.onchange=async()=>{
      try{
        const file=input.files[0];if(!file){resolve(null);return;}
        if(file.size>32*1024)throw Error('Replay must be smaller than 32 KiB.');
        const value=JSON.parse(await file.text());validate(value);
        if(!confirm('Replace the current experiment? A recovery replay will be downloaded first.')){resolve(null);return;}
        downloadReplay(current,'alibi-cascade-before-import');resolve(value);
      }catch(error){reject(error);}
    };
    input.click();
  });
}
export async function cascadeAdapter() {
  const store=await openReplayStore();
  const run=()=>store.read();
  const update=async(fn)=>{const next=run();fn(next);await store.commit(next);};
  return {
    advanced:true,read:()=>Cascade.replay(run()),shape:Cascade.shape,legal:Cascade.legal,
    canUndo:()=>run().log.length>0,canRedo:()=>run().redo.length>0,
    saveLabel:store.label,
    async place(slot,cell,rotation){await update((r)=>{r.log.push({slot,cell,rotation});r.redo=[];});},
    async undo(){await update((r)=>{if(r.log.length)r.redo.push(r.log.pop());});},
    async redo(){await update((r)=>{if(r.redo.length)r.log.push(r.redo.pop());});},
    async new(){
      const seed=prompt('New Cascade seed (letters and numbers):','ATELIER-01');if(seed===null)return;
      Cascade.seedText(seed);
      if(run().log.length&&!confirm('Start a new expedition? Export the current replay first to keep it.'))return;
      await store.commit(Cascade.record(seed));
    },
    export(){downloadReplay(run(),'alibi-cascade-replay');},
    async import(){const value=await importReplay(run(),Cascade.replay);if(value)await store.commit(value);},
    dispose:store.close,
  };
}

/** Standalone demonstrator. Production Classic uses Alibi's existing engine instead of these deals. */
export function practiceAdapter() {
  const initial=()=>({...Cascade.initial('DEMO-01'),board:Array(64).fill(0),relics:0,done:false,won:false});
  const history=[initial()],future=[];
  return {
    read:()=>history.at(-1),shape:(id)=>Cascade.shape(id),
    legal:(s,slot,cell)=>Cascade.legal(s,slot,cell,0),
    canUndo:()=>history.length>1,canRedo:()=>future.length>0,
    saveLabel:()=> 'Classic prototype: session-only, separate demo deals. Alibi integration keeps the original Club engine and saves.',
    place(slot,cell){
      const s=history.at(-1);if(!Cascade.legal(s,slot,cell,0))throw Error('Illegal placement.');
      const board=s.board.slice(),piece=Cascade.shape(s.tray[slot]);piece.cells.forEach(([x,y])=>{board[cell+y*8+x]=1;});
      const clear=Cascade.completedLines(board);
      board.forEach((v,i)=>{if(clear.rows.includes(Math.floor(i/8))||clear.columns.includes(i%8))board[i]=0;});
      const tray=s.tray.slice();tray[slot]=Cascade.initial('DEMO-'+(s.turn+1)).tray[slot];
      const next={...s,board,tray,turn:s.turn+1,lastClear:clear,waves:[],score:s.score+piece.cells.length+10*(clear.rows.length+clear.columns.length)};
      next.done=![0,1,2].some((i)=>Cascade.placements(next,i,0).length);history.push(next);future.length=0;
    },
    undo(){if(history.length>1)future.push(history.pop());},redo(){if(future.length)history.push(future.pop());},
    new(){if(confirm('Start a fresh classic demo?')){history.splice(0,history.length,initial());future.length=0;}},
  };
}
export async function mountPrototype(root) {
  let adapter=practiceAdapter(),surface=null,epoch=0;
  async function switchMode(){
    const token=++epoch,isAdvanced=!!adapter.advanced;
    const next=isAdvanced?practiceAdapter():await cascadeAdapter();
    if(token!==epoch){next.dispose?.();return;}
    surface?.dispose();adapter.dispose?.();adapter=next;
    surface=mountSurface(root,adapter,{onSwitch:switchMode});
    globalThis.BlockCabinetPrototype={diagnostics:()=>surface.diagnostics()};
  }
  surface=mountSurface(root,adapter,{onSwitch:switchMode});
  globalThis.BlockCabinetPrototype={diagnostics:()=>surface.diagnostics()};
  return {dispose(){epoch++;surface?.dispose();adapter.dispose?.();}};
}
