"""Independent, bounded rule/uniqueness checks. Python standard library only.
Does not import Alibi's solvers. Counts semantic arrangements, not symmetric encodings.
Usage: python tools/independent_check.py [pack.json ...] --out report.json
"""
from __future__ import annotations
import argparse, itertools as it, json, time
from pathlib import Path

class Budget(Exception): pass

def adjacent(c,n):
 r,k=divmod(c,n)
 return [rr*n+cc for rr,cc in ((r-1,k),(r+1,k),(r,k-1),(r,k+1)) if 0<=rr<n and 0<=cc<n]
def runs(a):
 out=[];x=0
 for v in list(a)+[0]:
  if v==1:x+=1
  elif x:out.append(x);x=0
 return out or [0]
def turn(m):return ((m<<1)&15)|(m>>3)
def graph(p):
 n=p['size']; cells=[x['cell'] for x in p['islands']]; edges=[]
 for a,c in enumerate(cells):
  r,col=divmod(c,n)
  for horizontal in (True,False):
   opts=[(d,b) for b,d in enumerate(cells) if (d//n==r and d%n>col) if horizontal] if horizontal else [(d,b) for b,d in enumerate(cells) if d%n==col and d//n>r]
   if opts:edges.append((a,min(opts)[1]))
 crosses=[]
 for i,(a,b) in enumerate(edges):
  ar,ac=divmod(cells[a],n);br,bc=divmod(cells[b],n)
  for j,(c,d) in enumerate(edges[:i]):
   cr,cc=divmod(cells[c],n);dr,dc=divmod(cells[d],n)
   if ar==br and cc==dc and ac<cc<bc and cr<ar<dr or ac==bc and cr==dr and cc<ac<dc and ar<cr<br:crosses.append((i,j))
 return edges,crosses

def connected(vertices,edges):
 if not vertices:return False
 seen={next(iter(vertices))}
 while True:
  nxt=seen|{b for a,b in edges if a in seen}|{a for a,b in edges if b in seen}
  if nxt==seen:return seen==set(vertices)
  seen=nxt

def matching(trees,tents,n):
 assigned={}
 def aug(t,seen):
  for c in adjacent(t,n):
   if c in tents and c not in seen:
    seen.add(c)
    if c not in assigned or aug(assigned[c],seen):assigned[c]=t;return True
  return False
 return len(tents)==len(trees) and all(aug(t,set()) for t in trees)

def solve(p,limit=2,budget=800000):
 n=p['size'];N=n*n;t=p['type'];found=[];nodes=0
 def tick():
  nonlocal nodes
  nodes+=1
  if nodes>budget:raise Budget(f'node budget {budget} exhausted')
 def add(x):
  if x not in found:found.append(x)
 if t=='witness':
  for culprit in range(len(p['people'])):
   tick();count=sum((culprit not in s['suspects']) if s['kind']=='not' else (culprit in s['suspects']) for s in p['statements'])
   if count==p['trueCount']:add(culprit)
 elif t=='dossier':
  for a in it.permutations(range(4)):
   for b in it.permutations(range(4)):
    tick();s=a+b;ok=True
    for cl in p['clues']:
     if cl['kind']=='link':v=b[a.index(cl['a'])]==cl['b']
     else:v=(s[cl['cat']*4+cl['who']]==cl['value'])==(cl['kind']=='eq')
     if not v:ok=False;break
    if ok:add(list(s))
    if len(found)>=limit:return found,nodes
 elif t=='scene':
  ids=[a['id'] for a in p['people']];blocked={o['cell'] for o in p['objects']};domains={who:[] for who in ids}
  def good(cl,s):
   if cl['who'] not in s:return True
   a=s[cl['who']];r,c=divmod(a,n);k=cl['kind'];v=cl.get('value')
   if 'other' in cl:
    if cl['other'] not in s:return True
    b=s[cl['other']]
    return {'left':c<b%n,'above':r<b//n,'sameRoom':p['rooms'][a]==p['rooms'][b],'differentRoom':p['rooms'][a]!=p['rooms'][b]}[k]
   if k=='room':return p['rooms'][a]==v
   if k=='notRoom':return p['rooms'][a]!=v
   if k=='row':return r==v
   if k=='col':return c==v
   if k=='near':return v in adjacent(a,n)
   edge=r in (0,n-1) or c in (0,n-1)
   return edge if k=='edge' else not edge
  for who in ids:domains[who]=[c for c in range(N) if c not in blocked and all(good(cl,{who:c}) for cl in p['clues'])]
  def go(s):
   tick()
   if len(found)>=limit:return
   if len(s)==len(ids):
    if sum(p['rooms'][c]==p['rooms'][s[p['victim']]] for c in s.values())==2:add(s.copy())
    return
   opts={who:[c for c in domains[who] if all(c//n!=v//n and c%n!=v%n for v in s.values()) and all(good(cl,{**s,who:c}) for cl in p['clues'])] for who in ids if who not in s};who=min(opts,key=lambda x:len(opts[x]))
   for c in opts[who]:s[who]=c;go(s);del s[who]
  go({})
 elif t in ('sudoku','futoshiki'):
  a=p['givens'][:];groups=[[r*n+c for c in range(n)] for r in range(n)]+[[r*n+c for r in range(n)] for c in range(n)]
  if t=='sudoku':
   h,w=p['boxRows'],p['boxCols'];groups += [[(r+dr)*n+c+dc for dr in range(h) for dc in range(w)] for r in range(0,n,h) for c in range(0,n,w)]
  peers=[set().union(*(set(g) for g in groups if c in g))-{c} for c in range(N)]
  qs=p.get('inequalities',[])
  def go():
   tick()
   if len(found)>=limit:return
   domains={c:set(range(1,n+1))-{a[j] for j in peers[c]} for c in range(N) if a[c]==0}
   ds=[{a[c]} if a[c] else domains[c] for c in range(N)]
   change=True
   while change:
    change=False
    for q in qs:
     l,r=q['a'],q['b']
     if q['op']=='>':l,r=r,l
     dl={v for v in ds[l] if any(v<w for w in ds[r])};dr={w for w in ds[r] if any(v<w for v in dl)}
     if not dl or not dr:return
     if dl!=ds[l] or dr!=ds[r]:ds[l]=dl;ds[r]=dr;change=True
   if not domains:
    if all(len({a[c] for c in g})==n for g in groups):add(a[:])
    return
   c=min(domains,key=lambda x:len(ds[x]))
   for v in sorted(ds[c]):a[c]=v;go()
   a[c]=0
  go()
 elif t in ('binary','nonogram'):
  if t=='nonogram':rp=[[list(x) for x in it.product((0,1),repeat=n) if runs(x)==p['rowClues'][r]] for r in range(n)];cp=[[list(x) for x in it.product((0,1),repeat=n) if runs(x)==p['colClues'][c]] for c in range(n)]
  else:
   pats=[list(x) for x in it.product((0,1),repeat=n) if sum(x)==n//2 and not any(x[j]==x[j+1]==x[j+2] for j in range(n-2))]
   rp=[[x for x in pats if all(p['givens'][r*n+c] in (-1,x[c]) for c in range(n))] for r in range(n)];cp=[[x for x in pats if all(p['givens'][r*n+c] in (-1,x[r]) for r in range(n))] for c in range(n)]
  def go(rows,colp):
   tick()
   if len(found)>=limit:return
   r=len(rows)
   if r==n:
    if t!='binary' or len({tuple(row) for row in rows})==n and len({tuple(row[c] for row in rows) for c in range(n)})==n:add(sum(rows,[]))
    return
   for row in rp[r]:
    if t=='binary' and row in rows:continue
    nxt=[[x for x in colp[c] if x[r]==row[c]] for c in range(n)]
    if all(nxt):go(rows+[row],nxt)
  go([],cp)
 elif t in ('lightup','tents'):
  if t=='lightup':
   floors=[i for i,w in enumerate(p['walls']) if w==-2];constraints=[]
   for c in floors:
    visible={c};r,k=divmod(c,n)
    for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
     rr,cc=r+dr,k+dc
     while 0<=rr<n and 0<=cc<n and p['walls'][rr*n+cc]==-2:visible.add(rr*n+cc);rr+=dr;cc+=dc
    constraints.append((visible,1,len(visible)))
    for d in visible-{c}:constraints.append(({c,d},0,1))
   for c,w in enumerate(p['walls']):
    if w>=0:constraints.append((set(adjacent(c,n))&set(floors),w,w))
   check=lambda a:True
  else:
   trees=set(p['trees']);floors=sorted(set().union(*(set(adjacent(c,n)) for c in trees))-trees);constraints=[]
   for a in floors:
    for b in floors:
     if b>a and max(abs(a//n-b//n),abs(a%n-b%n))<=1:constraints.append(({a,b},0,1))
   for r,goal in enumerate(p['rowTargets']):constraints.append(({c for c in floors if c//n==r},goal,goal))
   for k,goal in enumerate(p['colTargets']):constraints.append(({c for c in floors if c%n==k},goal,goal))
   for c in trees:constraints.append((set(adjacent(c,n))&set(floors),1,4))
   check=lambda a:matching(trees,{c for c,v in a.items() if v},n)
  constraints=list({(tuple(sorted(cs)),lo,hi) for cs,lo,hi in constraints});weight={c:sum(c in cs for cs,_,_ in constraints) for c in floors}
  def go(a):
   tick()
   if len(found)>=limit:return
   change=True
   while change:
    change=False
    for cs,lo,hi in constraints:
     have=sum(a.get(c,0) for c in cs);unknown=[c for c in cs if c not in a]
     if have>hi or have+len(unknown)<lo:return
     if unknown and (have==hi or have+len(unknown)==lo):
      v=int(have+len(unknown)==lo)
      for c in unknown:a[c]=v
      change=True
   unknown=[c for c in floors if c not in a]
   if not unknown:
    if check(a):add([a.get(c,0) for c in range(N)])
    return
   c=max(unknown,key=lambda x:weight[x])
   for v in (1,0):go({**a,c:v})
  go({})
 elif t=='aquarium':
  k=max(p['tanks'])+1;rows=[sorted({c//n for c,v in enumerate(p['tanks']) if v==a},reverse=True) for a in range(k)];choices=[]
  for a in range(k):
   vals=[]
   for level in range(len(rows[a])+1):
    filled={c for c,v in enumerate(p['tanks']) if v==a and c//n in rows[a][:level]};vals.append([sum(c//n==r for c in filled) for r in range(n)]+[sum(c%n==col for c in filled) for col in range(n)])
   choices.append(vals)
  targets=p['rowTargets']+p['colTargets']
  def go(ds):
   tick()
   if len(found)>=limit:return
   change=True
   while change:
    change=False
    for j,target in enumerate(targets):
     mins=[min(choices[a][l][j] for l in ds[a]) for a in range(k)];maxs=[max(choices[a][l][j] for l in ds[a]) for a in range(k)]
     if sum(mins)>target or sum(maxs)<target:return
     for a in range(k):
      nxt=[l for l in ds[a] if sum(mins)-mins[a]+choices[a][l][j]<=target<=sum(maxs)-maxs[a]+choices[a][l][j]]
      if not nxt:return
      if nxt!=ds[a]:ds[a]=nxt;change=True
   free=[a for a in range(k) if len(ds[a])>1]
   if not free:add([x[0] for x in ds]);return
   a=min(free,key=lambda a:len(ds[a]))
   for l in ds[a]:nxt=[x[:] for x in ds];nxt[a]=[l];go(nxt)
  go([list(range(len(v))) for v in choices])
 elif t=='network':
  ds=[];pairs=[]
  for c,v in enumerate(p['tiles']):
   opts={v}
   if c not in p['locked']:
    for _ in range(3):v=turn(v);opts.add(v)
   r,k=divmod(c,n);allowed=[m for m in opts if not(r==0 and m&1 or k==n-1 and m&2 or r==n-1 and m&4 or k==0 and m&8)];ds.append(allowed)
   if r<n-1:pairs.append((c,c+n,4,1))
   if k<n-1:pairs.append((c,c+1,2,8))
  def go(d):
   tick()
   if len(found)>=limit:return
   change=True
   while change:
    change=False
    for a,b,ba,bb in pairs:
     da=[m for m in d[a] if any(bool(m&ba)==bool(v&bb) for v in d[b])];db=[v for v in d[b] if any(bool(m&ba)==bool(v&bb) for m in da)]
     if not da or not db:return
     if da!=d[a] or db!=d[b]:d[a]=da;d[b]=db;change=True
   free=[c for c in range(N) if len(d[c])>1]
   if not free:
    if all(d) and connected(set(range(N)),[(a,b) for a,b,ba,bb in pairs if d[a][0]&ba]):add([v[0] for v in d])
    return
   c=min(free,key=lambda c:len(d[c]))
   for v in d[c]:nxt=[x[:] for x in d];nxt[c]=[v];go(nxt)
  go(ds)
 elif t=='trail':
  fixed={v:c for c,v in enumerate(p['givens']) if v};given_cells=set(fixed.values());visited={fixed[1]};path=[fixed[1]]
  def go():
   tick()
   if len(found)>=limit:return
   k=len(path)
   if k==N:
    a=[0]*N
    for v,c in enumerate(path,1):a[c]=v
    add(a);return
   upcoming=min(v for v in fixed if v>k);dist=abs(path[-1]//n-fixed[upcoming]//n)+abs(path[-1]%n-fixed[upcoming]%n)
   if dist>upcoming-k or (upcoming-k-dist)%2:return
   for c in adjacent(path[-1],n):
    if c in visited or (k+1 in fixed and c!=fixed[k+1]) or (c in given_cells and fixed.get(k+1)!=c):continue
    visited.add(c);path.append(c);go();path.pop();visited.remove(c)
  go()
 elif t=='bridges':
  edges,crosses=graph(p);incident=[[j for j,(a,b) in enumerate(edges) if c in (a,b)] for c in range(len(p['islands']))]
  def go(ds):
   tick()
   if len(found)>=limit:return
   change=True
   while change:
    change=False
    for cs,isl in zip(incident,p['islands']):
     target=isl['count'];lo=sum(min(ds[j]) for j in cs);hi=sum(max(ds[j]) for j in cs)
     if lo>target or hi<target:return
     for j in cs:
      nxt=[v for v in ds[j] if lo-min(ds[j])+v<=target<=hi-max(ds[j])+v]
      if not nxt:return
      if nxt!=ds[j]:ds[j]=nxt;change=True
    for a,b in crosses:
     for j,k in ((a,b),(b,a)):
      if min(ds[j])>0:
       if 0 not in ds[k]:return
       if ds[k]!=[0]:ds[k]=[0];change=True
   if not connected(set(range(len(p['islands']))),[e for e,d in zip(edges,ds) if max(d)>0]):return
   free=[j for j,d in enumerate(ds) if len(d)>1]
   if not free:add([d[0] for d in ds]);return
   j=min(free,key=lambda j:len(ds[j]))
   for v in ds[j]:nxt=[d[:] for d in ds];nxt[j]=[v];go(nxt)
  go([[0,1,2] for _ in edges])
 else:raise ValueError(t)
 return found,nodes

def semantic_solution(p):
 if p['type']=='network':
  out=[]
  for m,k in zip(p['tiles'],p['solution']):
   for _ in range(k):m=turn(m)
   out.append(m)
  return out
 return p['solution']

def audit(p):
 start=time.perf_counter()
 try:
  sols,nodes=solve(p)
  return dict(id=p['id'],type=p['type'],unique=len(sols)==1,storedAnswerMatches=len(sols)==1 and sols[0]==semantic_solution(p),solutionCountCappedAtTwo=len(sols),nodes=nodes,milliseconds=round((time.perf_counter()-start)*1000,2))
 except Exception as e:return dict(id=p.get('id'),type=p.get('type'),error=str(e),unique=False)

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('files',nargs='*');ap.add_argument('--out',default='independent-report.json');args=ap.parse_args();files=[Path(f) for f in args.files] or sorted((Path(__file__).resolve().parent.parent/'packs').glob('*.json'));results=[]
 for f in files:
  content=json.loads(f.read_text(encoding='utf-8'))
  for p in content['puzzles']:
   r=audit(p);results.append(r);print(p['id'],r.get('unique'),r.get('storedAnswerMatches'),r.get('error',''),flush=True)
 summary={'checker':'independent Python implementation; no Alibi solver imports','count':len(results),'passed':all(r.get('unique') and r.get('storedAnswerMatches') for r in results),'results':results};Path(args.out).write_text(json.dumps(summary,indent=2),encoding='utf-8')
 raise SystemExit(0 if summary['passed'] else 1)
