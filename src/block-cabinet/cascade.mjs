/** Cascade Cabinet v1: deterministic rules, separate from published Block Cabinet replays. */
export const RULES = 'cascade-cabinet-1';
const definitions = [
  ['Pebble', [[0,0]]], ['Pair', [[0,0],[1,0]]], ['Beam', [[0,0],[1,0],[2,0]]],
  ['Pillar', [[0,0],[0,1],[0,2]]], ['Corner', [[0,0],[0,1],[1,1]]],
  ['Square', [[0,0],[1,0],[0,1],[1,1]]], ['Tee', [[0,0],[1,0],[2,0],[1,1]]],
  ['Stair', [[0,0],[1,0],[1,1],[2,1]]], ['Long beam', [[0,0],[1,0],[2,0],[3,0]]],
  ['Hook', [[0,0],[0,1],[0,2],[1,2]]],
];
export const SHAPES = Object.freeze(definitions.map(([name,cells],id) => Object.freeze({
  id, name, cells: Object.freeze(cells.map((cell) => Object.freeze(cell))),
})));
const integer = (n,a,b) => Number.isInteger(n) && n >= a && n <= b;
export function seedText(seed) {
  if (typeof seed !== 'string' || !/^[A-Za-z0-9 _-]{1,32}$/.test(seed))
    throw Error('Use 1–32 letters, numbers, spaces, hyphens or underscores for a seed.');
  return seed;
}
function random(seed) {
  let n = 2166136261;
  for (const ch of seed) n = Math.imul(n ^ ch.charCodeAt(0),16777619) >>> 0;
  return () => { n = (Math.imul(n,1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
function deal(seed, round) {
  const r = random(`${RULES}:${seed}:${round}`);
  return Array.from({length:3}, () => Math.floor(r() * SHAPES.length));
}
export function shape(id, rotation = 0) {
  if (!integer(id,0,SHAPES.length-1) || !integer(rotation,0,3)) throw Error('Unknown shape or rotation.');
  let cells = SHAPES[id].cells.map((p) => [...p]);
  for (let turn=0; turn<rotation; turn++) {
    cells = cells.map(([x,y]) => [-y,x]);
    const minX = Math.min(...cells.map(([x])=>x)), minY = Math.min(...cells.map(([,y])=>y));
    cells = cells.map(([x,y]) => [x-minX,y-minY]);
  }
  return {...SHAPES[id],cells};
}
export function initial(seed = 'ATELIER-01') {
  seedText(seed);
  const board = Array(64).fill(0);
  // Eight visible relics, two per row, make the excavation goal explicit.
  [33,38,40,45,50,55,59,62].forEach((i) => { board[i] = 2; });
  return {rules:RULES,seed,board,tray:deal(seed,0),round:0,turn:0,score:0,charges:3,
    relics:0,goal:8,limit:35,done:false,won:false,lastClear:{rows:[],columns:[]},waves:[]};
}
export function legal(s,slot,cell,rotation=0) {
  if (!s || s.done || !integer(slot,0,2) || s.tray[slot] === null ||
    !integer(cell,0,63) || !integer(rotation,0,3) || (rotation && !s.charges)) return false;
  const x = cell % 8, y = Math.floor(cell / 8);
  return shape(s.tray[slot],rotation).cells.every(([dx,dy]) =>
    x+dx<8 && y+dy<8 && !s.board[(y+dy)*8+x+dx]);
}
export function placements(s,slot,rotation=0) {
  return Array.from({length:64},(_,i)=>i).filter((i)=>legal(s,slot,i,rotation));
}
export function completedLines(board) {
  const rows=[],columns=[];
  for (let n=0;n<8;n++) {
    if (Array.from({length:8},(_,x)=>board[n*8+x]).every(Boolean)) rows.push(n);
    if (Array.from({length:8},(_,y)=>board[y*8+n]).every(Boolean)) columns.push(n);
  }
  return {rows,columns};
}
export function settle(board) {
  const next=Array(64).fill(0),falls=[];
  for (let x=0;x<8;x++) {
    let dest=7;
    for (let y=7;y>=0;y--) if (board[y*8+x]) {
      next[dest*8+x]=board[y*8+x];
      if (dest!==y) falls.push({from:y*8+x,to:dest*8+x,value:board[y*8+x]});
      dest--;
    }
  }
  return {board:next,falls};
}
export function resolve(board) {
  let next=board.slice(), relics=0,bonus=0;
  const waves=[];
  // Every wave removes >=8 cells; this bound also guards future rule changes.
  for (let depth=1;depth<=8;depth++) {
    const {rows,columns}=completedLines(next);
    if (!rows.length && !columns.length) break;
    const cells=Array.from({length:64},(_,i)=>i).filter((i)=>rows.includes(Math.floor(i/8))||columns.includes(i%8));
    const before=next.slice();
    relics+=cells.filter((i)=>next[i]===2).length;
    cells.forEach((i)=>{next[i]=0;});
    const gravity=settle(next);
    next=gravity.board;
    bonus+=10*(rows.length+columns.length)*depth;
    waves.push({depth,rows,columns,cells,before,after:next.slice(),falls:gravity.falls});
  }
  return {board:next,waves,relics,bonus};
}
export function move(s,slot,cell,rotation=0) {
  if (!legal(s,slot,cell,rotation)) throw Error('That piece does not fit there.');
  const placed=shape(s.tray[slot],rotation).cells.map(([x,y])=>cell+y*8+x);
  const board=s.board.slice(); placed.forEach((i)=>{board[i]=1;});
  const resolved=resolve(board),tray=s.tray.slice(); tray[slot]=null;
  let round=s.round; if(tray.every((p)=>p===null)) { round++; tray.splice(0,3,...deal(s.seed,round)); }
  const lines=resolved.waves.reduce((n,w)=>n+w.rows.length+w.columns.length,0);
  const q={...s,board:resolved.board,tray,round,turn:s.turn+1,
    score:s.score+placed.length+resolved.bonus,charges:Math.min(3,s.charges-(rotation?1:0)+lines),
    relics:s.relics+resolved.relics,waves:resolved.waves,
    lastClear:resolved.waves[0]||{rows:[],columns:[]},done:false,won:false};
  q.won=q.relics>=q.goal;
  q.done=q.won||q.turn>=q.limit||![0,1,2].some((slot)=>
    [0,1,2,3].some((r)=>(!r||q.charges)&&placements(q,slot,r).length));
  return q;
}
export function record(seed='ATELIER-01') { return {rules:RULES,seed:seedText(seed),log:[],redo:[]}; }
export function replay(value) {
  if (!value || Object.keys(value).sort().join(',')!=='log,redo,rules,seed' || value.rules!==RULES ||
    !Array.isArray(value.log)||!Array.isArray(value.redo)||value.log.length+value.redo.length>35)
    throw Error('Unsupported or oversized Cascade replay.');
  const apply=(s,a)=>{
    if(!a||Object.keys(a).sort().join(',')!=='cell,rotation,slot'||!integer(a.rotation,0,3))
      throw Error('Invalid Cascade move.');
    return move(s,a.slot,a.cell,a.rotation);
  };
  let s=initial(value.seed); for(const a of value.log) s=apply(s,a);
  let future=s; for(const a of [...value.redo].reverse()) future=apply(future,a);
  return s;
}
export const cascade={initial,shape,legal,placements,move,replay,score:(s)=>s.score,size:8};
