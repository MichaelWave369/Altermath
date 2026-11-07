// R24 · POLY-01. Deterministic finite graph experiment, not a model of physical realms.
// Each vertex is the center of one solid face; edges connect neighboring faces.
// In graph-theoretic terms these are the *dual graphs* of the Platonic solids.
const PHI=(1+Math.sqrt(5))/2;

export const POLYHEDRA=Object.freeze([
  {id:'tetrahedron',label:'Tetrahedron',faces:4,degree:3,dual:'Tetrahedron'},
  {id:'octahedron',label:'Octahedron',faces:8,degree:3,dual:'Cube'},
  {id:'dodecahedron',label:'Dodecahedron',faces:12,degree:5,dual:'Icosahedron'},
]);

function coordinates(id){
  if(id==='tetrahedron')return [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]];
  if(id==='octahedron'){
    const out=[];
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])out.push([x,y,z]);
    return out;
  }
  if(id==='dodecahedron'){
    const out=[];
    for(const a of [-1,1])for(const b of [-1,1]){
      out.push([0,a,b*PHI],[a,b*PHI,0],[a*PHI,0,b]);
    }
    return out;
  }
  throw new RangeError('Unsupported polyhedron: '+id);
}
function distanceSquared(a,b){return a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);}
function edgeKey(a,b){return Math.min(a,b)+':'+Math.max(a,b);}
function connected(neighbors){
  const visited=new Set([0]),queue=[0];
  for(let p=0;p<queue.length;p++)for(const j of neighbors[queue[p]])if(!visited.has(j)){
    visited.add(j);queue.push(j);
  }
  return visited.size===neighbors.length;
}
export function validateGraph(graph){
  const {neighbors,coordinates:points}=graph||{};
  if(!Array.isArray(neighbors)||![4,8,12].includes(neighbors.length))
    throw new Error('Expected a 4-, 8-, or 12-pocket graph');
  if(!Array.isArray(points)||points.length!==neighbors.length)
    throw new Error('Missing 3D node positions');
  const n=neighbors.length,degree=n===12?5:3;
  for(let i=0;i<n;i++){
    const row=neighbors[i];
    if(!Array.isArray(row)||row.length!==degree||new Set(row).size!==degree)
      throw new Error('Invalid degree or duplicate neighbor');
    for(const j of row)if(!Number.isInteger(j)||j<0||j>=n||j===i||
      !Array.isArray(neighbors[j])||!neighbors[j].includes(i))
      throw new Error('Non-simple or asymmetric graph');
    if(!Array.isArray(points[i])||points[i].length!==3||
      points[i].some(v=>!Number.isFinite(v)))throw new Error('Invalid coordinates');
  }
  if(!connected(neighbors))throw new Error('Graph must be connected');
  return true;
}
function graphWithNeighbors(template,neighbors){
  const graph={
    id:template.id, label:template.label,
    coordinates:template.coordinates.map(p=>[...p]),
    neighbors:neighbors.map(row=>[...row].sort((a,b)=>a-b)),
  };
  validateGraph(graph);
  return graph;
}
export function makePolyhedralGraph(id){
  const spec=POLYHEDRA.find(s=>s.id===id);
  if(!spec)throw new RangeError('Unknown polyhedron: '+id);
  const points=coordinates(id),n=points.length;
  let minDistance=Infinity;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
    minDistance=Math.min(minDistance,distanceSquared(points[i],points[j]));
  const neighbors=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(distanceSquared(points[i],points[j])-minDistance)<1e-8){
    neighbors[i].push(j);neighbors[j].push(i);
  }
  return graphWithNeighbors({id,label:spec.label,coordinates:points},neighbors);
}
export function graphEdges(graph){
  validateGraph(graph);
  return graph.neighbors.flatMap((row,i)=>row.filter(j=>j>i).map(j=>[i,j]));
}
export function totalState(mask,n){
  if(!Number.isInteger(n)||n<1||n>12||!Number.isInteger(mask)||mask<0||mask>=2**n)
    throw new RangeError('Invalid binary pocket state');
  let on=0;
  for(let i=0;i<n;i++)on+=(mask>>>i)&1;
  return 2*on-n;
}
export function nextState(graph,mask){
  validateGraph(graph);
  const n=graph.neighbors.length;
  totalState(mask,n);
  let next=0;
  for(let i=0;i<n;i++){
    let votes=0;
    for(const j of graph.neighbors[i])votes+=((mask>>>j)&1)?1:-1;
    // All three graphs have odd vertex degree, so ties are impossible.
    if(votes>0)next|=(1<<i);
  }
  return next;
}
export function exactKeyholeStudy(graph){
  validateGraph(graph);
  const n=graph.neighbors.length,buckets=new Map(),sampleCount=2**n;
  for(let mask=0;mask<sampleCount;mask++){
    const seen=totalState(mask,n),outcome=totalState(nextStateUnchecked(graph,mask),n);
    if(!buckets.has(seen))buckets.set(seen,{count:0,outcomes:new Map(),examples:new Map()});
    const bucket=buckets.get(seen);
    bucket.count++;
    bucket.outcomes.set(outcome,(bucket.outcomes.get(outcome)||0)+1);
    if(!bucket.examples.has(outcome))bucket.examples.set(outcome,mask);
  }
  const distributions=[...buckets.entries()].sort((a,b)=>a[0]-b[0]).map(([observed,b])=>({
    observed,count:b.count,
    outcomes:[...b.outcomes.entries()].sort((a,c)=>a[0]-c[0]).map(([next,count])=>({next,count})),
  }));
  let bits=0;
  for(const bucket of buckets.values()){
    for(const count of bucket.outcomes.values()){
      const conditional=count/bucket.count;
      bits+=(bucket.count/sampleCount)*(-conditional*Math.log2(conditional));
    }
  }
  // Same observed aggregate but distinct next aggregate, whenever possible.
  const collisionBucket=[...buckets.entries()]
    .filter(([,b])=>b.outcomes.size>1)
    .sort((a,b)=>Math.abs(a[0])-Math.abs(b[0])||a[0]-b[0])[0];
  let collision=null;
  if(collisionBucket){
    const [observed,bucket]=collisionBucket;
    const examples=[...bucket.examples.entries()].sort((a,b)=>a[0]-b[0]);
    collision={observed,
      a:{mask:examples[0][1],next:examples[0][0]},
      b:{mask:examples[examples.length-1][1],next:examples[examples.length-1][0]}};
  }
  return {pockets:n,degree:graph.neighbors[0].length,edges:n*graph.neighbors[0].length/2,
    samples:sampleCount,conditionalEntropyBits:bits,collision,distributions};
}
// Fast inner loop for the exhaustively enumerated graph, after one validation.
function nextStateUnchecked(graph,mask){
  let next=0;
  for(let i=0;i<graph.neighbors.length;i++){
    let votes=0;
    for(const j of graph.neighbors[i])votes+=((mask>>>j)&1)?1:-1;
    if(votes>0)next|=1<<i;
  }
  return next;
}
function makeRandom(seed){
  let x=seed>>>0||1;
  return ()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296;
  };
}
export function degreePreservingControl(graph,seed){
  validateGraph(graph);
  if(!Number.isInteger(seed)||seed<1||seed>10000000)throw new RangeError('Seed must be 1..10000000');
  const random=makeRandom(seed),neighbors=graph.neighbors.map(row=>new Set(row));
  const n=neighbors.length;
  // A 4-vertex simple 3-regular graph is necessarily K4. No distinct control exists.
  if(n===4)return graphWithNeighbors(graph,graph.neighbors);
  const edges=()=>neighbors.flatMap((row,i)=>[...row].filter(j=>j>i).map(j=>[i,j]));
  let successes=0;
  for(let t=0;t<1500&&successes<6*n;t++){
    const available=edges();
    const e1=available[Math.floor(random()*available.length)];
    const e2=available[Math.floor(random()*available.length)];
    const [a,b]=e1,[c,d]=e2;
    if(new Set([a,b,c,d]).size!==4)continue;
    const flip=random()<.5;
    const u=flip?c:d,v=flip?d:c;
    if(neighbors[a].has(u)||neighbors[b].has(v))continue;
    for(const [x,y] of [[a,b],[c,d]]){neighbors[x].delete(y);neighbors[y].delete(x);}
    for(const [x,y] of [[a,u],[b,v]]){neighbors[x].add(y);neighbors[y].add(x);}
    if(!connected([...neighbors].map(s=>[...s]))){
      for(const [x,y] of [[a,u],[b,v]]){neighbors[x].delete(y);neighbors[y].delete(x);}
      for(const [x,y] of [[a,b],[c,d]]){neighbors[x].add(y);neighbors[y].add(x);}
      continue;
    }
    successes++;
  }
  return graphWithNeighbors(graph,[...neighbors].map(s=>[...s]));
}
export function runPolyhedralStudy(id='octahedron',seed=369,controlCount=8){
  if(!Number.isInteger(controlCount)||controlCount<1||controlCount>24)
    throw new RangeError('Control count must be 1..24');
  const graph=makePolyhedralGraph(id),baseline=exactKeyholeStudy(graph);
  const controls=Array.from({length:controlCount},(_,index)=>{
    const controlSeed=seed+index*101;
    const alternative=degreePreservingControl(graph,controlSeed);
    const result=exactKeyholeStudy(alternative);
    return {seed:controlSeed,graph:alternative,bits:result.conditionalEntropyBits};
  });
  const mean=controls.reduce((sum,c)=>sum+c.bits,0)/controls.length;
  return {
    protocol:'POLY-01',version:1,kind:'SIMULATED',authority:'NONE',rule:'synchronous neighbor-majority',
    observer:'sum of binary pocket states',prior:'uniform over all 2^n binary states',
    id,seed,graph,baseline,controls,
    controlMeanBits:mean,
    controlRangeBits:[Math.min(...controls.map(c=>c.bits)),Math.max(...controls.map(c=>c.bits))],
    caveat:'Different face counts do not isolate geometry. Controls preserve vertex count, degree and connectivity; same-degree rewiring is impossible for K4. No physical or dimensional inference.',
  };
}
