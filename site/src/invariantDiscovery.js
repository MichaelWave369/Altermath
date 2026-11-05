/**
 * Altermath R20 — representation-invariant graph discovery.
 * Synthetic, bounded mathematics. No machine-learning, physics, or novelty claims.
 * The exact small-graph isomorphism checker is the test oracle.
 */

export const R20_SCHEMA = 'altermath-r20:v1';
export const METHODS = Object.freeze([
  {id:'edge-count',name:'Edge count only',description:'Compares vertex and edge counts.'},
  {id:'degree',name:'Degree multiset',description:'Adds the sorted vertex-degree sequence.'},
  {id:'triangles',name:'Local motifs',description:'Adds connected-component and triangle counts.'},
  {id:'four-cycles',name:'Extended motifs',description:'Adds the number of distinct four-cycles.'},
]);

const graph = (n,edges) => ({n,edges});
const cycle = n => Array.from({length:n},(_,i)=>[i,(i+1)%n]);
const cube = () => {
  const edges=[];
  for(let i=0;i<8;i++) for(const bit of [1,2,4]) if(i<(i^bit)) edges.push([i,i^bit]);
  return graph(8,edges);
};
const mobius = () => graph(8,[...cycle(8),...Array.from({length:4},(_,i)=>[i,i+4])]);
const families = {
  cycle: graph(6,cycle(6)),
  triangles: graph(6,[[0,1],[1,2],[0,2],[3,4],[4,5],[3,5]]),
  k33: graph(6,[0,1,2].flatMap(i=>[3,4,5].map(j=>[i,j]))),
  prism: graph(6,[[0,1],[1,2],[0,2],[3,4],[4,5],[3,5],[0,3],[1,4],[2,5]]),
  path: graph(6,[[0,1],[1,2],[2,3],[3,4],[4,5]]),
  star: graph(6,[[0,1],[0,2],[0,3],[0,4],[0,5]]),
  cube: cube(),
  mobius: mobius(),
};
const designs = [
  ['cycle','cycle',true],['cycle','triangles',false],
  ['k33','k33',true],['k33','prism',false],
  ['path','path',true],['path','star',false],
  ['cube','cube',true],['cube','mobius',false],
];
const forms = ['edges','matrix','neighbors'];

function assert(condition,message){ if(!condition)throw new Error(message); }
function validInteger(value,min,max,label){
  assert(Number.isSafeInteger(value)&&value>=min&&value<=max,'Invalid '+label);
  return value;
}
function random(seed){
  let s=seed>>>0;
  return () => {s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
}
function permute(g,rng){
  const p=Array.from({length:g.n},(_,i)=>i);
  for(let i=p.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  const edges=g.edges.map(([a,b])=>[Math.min(p[a],p[b]),Math.max(p[a],p[b])]);
  edges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return graph(g.n,edges);
}
function adjacency(g){
  const a=Array.from({length:g.n},()=>Array(g.n).fill(false));
  for(const [u,v] of g.edges){a[u][v]=true;a[v][u]=true;}
  return a;
}
export function encodeGraph(g,kind){
  assert(forms.includes(kind),'Unknown graph encoding');
  const a=adjacency(g);
  if(kind==='matrix') return {kind,n:g.n,matrix:a.map(row=>row.map(Number))};
  if(kind==='neighbors') return {kind,n:g.n,neighbors:a.map(row=>row.flatMap((v,i)=>v?[i]:[]))};
  return {kind,n:g.n,edges:g.edges.map(e=>e.slice())};
}
export function decodeGraph(view){
  assert(view&&typeof view==='object'&&forms.includes(view.kind),'Invalid graph view');
  const n=validInteger(view.n,2,8,'vertex count');
  const edgeSet=new Set();
  function add(u,v){
    validInteger(u,0,n-1,'edge endpoint');validInteger(v,0,n-1,'edge endpoint');
    assert(u!==v,'Self loops are forbidden');
    const key=Math.min(u,v)+':'+Math.max(u,v);
    assert(!edgeSet.has(key),'Duplicate edge');
    edgeSet.add(key);
  }
  if(view.kind==='edges'){
    assert(Array.isArray(view.edges),'Missing edge list');
    for(const edge of view.edges){
      assert(Array.isArray(edge)&&edge.length===2,'Invalid edge');
      add(edge[0],edge[1]);
    }
  }else if(view.kind==='matrix'){
    assert(Array.isArray(view.matrix)&&view.matrix.length===n,'Invalid adjacency matrix');
    for(let i=0;i<n;i++){
      assert(Array.isArray(view.matrix[i])&&view.matrix[i].length===n,'Invalid matrix row');
      for(let j=0;j<n;j++){
        const v=view.matrix[i][j];
        assert(v===0||v===1,'Nonbinary matrix entry');
        if(i===j)assert(v===0,'Matrix diagonal must be zero');
        else assert(v===view.matrix[j]?.[i],'Asymmetric matrix');
        if(i<j&&v===1)add(i,j);
      }
    }
  }else{
    assert(Array.isArray(view.neighbors)&&view.neighbors.length===n,'Invalid neighbor list');
    for(let i=0;i<n;i++){
      const row=view.neighbors[i];
      assert(Array.isArray(row),'Invalid neighbors');
      const unique=new Set(row);
      assert(unique.size===row.length,'Repeated neighbor');
      for(const j of row){
        validInteger(j,0,n-1,'neighbor');assert(j!==i,'Self neighbor');
        assert(view.neighbors[j]?.includes(i),'Asymmetric neighbors');
        if(i<j)add(i,j);
      }
    }
  }
  const edges=[...edgeSet].map(s=>s.split(':').map(Number)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return graph(n,edges);
}
function features(g){
  const a=adjacency(g);
  const degree=a.map(row=>row.filter(Boolean).length);
  const visited=new Set();
  let components=0,triangles=0,fourCyclesTwice=0;
  for(let i=0;i<g.n;i++) if(!visited.has(i)){
    components++;visited.add(i);const queue=[i];
    for(let h=0;h<queue.length;h++)for(let j=0;j<g.n;j++)
      if(a[queue[h]][j]&&!visited.has(j)){visited.add(j);queue.push(j);}
  }
  for(let i=0;i<g.n;i++) for(let j=i+1;j<g.n;j++) {
    if(a[i][j])for(let k=j+1;k<g.n;k++)if(a[i][k]&&a[j][k])triangles++;
    let common=0;
    for(let k=0;k<g.n;k++)if(a[i][k]&&a[j][k])common++;
    fourCyclesTwice+=common*(common-1)/2;
  }
  return {vertices:g.n,edges:g.edges.length,
    degrees:degree.slice().sort((x,y)=>x-y),components,triangles,
    fourCycles:fourCyclesTwice/2};
}
export function signature(view,methodId){
  assert(METHODS.some(m=>m.id===methodId),'Unknown method');
  const f=features(decodeGraph(view));
  const parts=[f.vertices,f.edges];
  if(methodId!=='edge-count')parts.push(f.degrees.join(','));
  if(methodId==='triangles'||methodId==='four-cycles')parts.push(f.components,f.triangles);
  if(methodId==='four-cycles')parts.push(f.fourCycles);
  return JSON.stringify(parts);
}
/** Exact backtracking isomorphism for simple graphs with at most eight vertices. */
export function isomorphic(left,right){
  const A=decodeGraph(left),B=decodeGraph(right);
  if(A.n!==B.n||A.edges.length!==B.edges.length)return false;
  const a=adjacency(A),b=adjacency(B);
  const da=a.map(row=>row.filter(Boolean).length),db=b.map(row=>row.filter(Boolean).length);
  if(da.slice().sort((x,y)=>x-y).join(',')!==db.slice().sort((x,y)=>x-y).join(','))return false;
  const order=Array.from({length:A.n},(_,i)=>i).sort((i,j)=>da[j]-da[i]||i-j);
  const assigned=Array(A.n).fill(-1),used=Array(A.n).fill(false);
  function search(depth){
    if(depth===A.n)return true;
    const i=order[depth];
    for(let j=0;j<A.n;j++){
      if(used[j]||da[i]!==db[j])continue;
      let compatible=true;
      for(let k=0;k<depth;k++){
        const prev=order[k];
        if(a[i][prev]!==b[j][assigned[prev]]){compatible=false;break;}
      }
      if(!compatible)continue;
      assigned[i]=j;used[j]=true;
      if(search(depth+1))return true;
      assigned[i]=-1;used[j]=false;
    }
    return false;
  }
  return search(0);
}
export function makeTrials(seed){
  validInteger(seed,1,1000000000,'seed');
  const rng=random(seed);
  return designs.map(([familyA,familyB,intendedSame],index)=>{
    const first=permute(families[familyA],rng),second=permute(families[familyB],rng);
    const left=encodeGraph(first,forms[(seed+index)%3]);
    const right=encodeGraph(second,forms[(seed+index+1)%3]);
    const oracleSame=isomorphic(left,right);
    assert(oracleSame===intendedSame,'Fixture invalid: '+familyA+' / '+familyB);
    return {id:seed+':'+index,challenge:familyA+' / '+familyB,
      left,right,oracleSame};
  });
}
function score(trials){
  const rows=trials.map(t=>{
    const predictions={};
    for(const m of METHODS)predictions[m.id]=signature(t.left,m.id)===signature(t.right,m.id);
    return {...t,predictions};
  });
  const metrics=METHODS.map(m=>{
    const confusion={truePositive:0,trueNegative:0,falsePositive:0,falseNegative:0};
    for(const r of rows){
      if(r.oracleSame&&r.predictions[m.id])confusion.truePositive++;
      else if(!r.oracleSame&&!r.predictions[m.id])confusion.trueNegative++;
      else if(!r.oracleSame&&r.predictions[m.id])confusion.falsePositive++;
      else confusion.falseNegative++;
    }
    return {method:m.id,name:m.name,...confusion,
      accuracy:(confusion.truePositive+confusion.trueNegative)/rows.length};
  });
  return {size:rows.length,metrics,rows};
}
/**
 * Train and holdout use globally disjoint seed blocks.
 * No scoring, ranking, or model fitting is permitted on holdout before selection.
 */
export function runStudy({seed=369,trainSeeds=3,holdoutSeeds=3}={}){
  validInteger(seed,1,999980000,'seed');
  validInteger(trainSeeds,1,9,'training seed count');
  validInteger(holdoutSeeds,1,9,'holdout seed count');
  const trainBlock=Array.from({length:trainSeeds},(_,i)=>seed+i);
  const holdoutBlock=Array.from({length:holdoutSeeds},(_,i)=>seed+10000+i);
  assert(trainBlock.every(s=>!holdoutBlock.includes(s)),'Overlapping splits');
  const train=score(trainBlock.flatMap(makeTrials));
  const ranked=train.metrics.slice().sort((a,b)=>b.accuracy-a.accuracy||
    a.falsePositive-b.falsePositive||METHODS.findIndex(m=>m.id===a.method)-METHODS.findIndex(m=>m.id===b.method));
  const selected=ranked[0].method; // Locked from training before holdout is scored.
  const holdout=score(holdoutBlock.flatMap(makeTrials));
  return {
    schema:R20_SCHEMA,authority:'SIMULATED / NONE',
    claimBoundary:'These are known graph invariants and controlled synthetic tests, not newly discovered mathematics, physics, or AI reasoning.',
    seed,trainSeeds:trainBlock,holdoutSeeds:holdoutBlock,selectedByTraining:selected,
    selectionRule:'Highest training accuracy, then fewer false positives, then declared method order.',
    methods:METHODS,training:train,holdout,
  };
}
