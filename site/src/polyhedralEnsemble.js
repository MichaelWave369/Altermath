/**
 * POLY-03 / R26: an exhaustive census of *labeled* simple cubic graphs on
 * exactly eight vertices and an exact binary Keyhole comparison.
 *
 * All graphs have eight vertices, twelve undirected edges, degree 3 at each
 * vertex, and are connected. This fixes size/degree while varying topology.
 *
 * No physical, neural, quantum, E8, or production-routing conclusion follows.
 */
import {validateGraph} from './polyhedralKeyhole.js';
import {exactWeightedKeyhole,RULES,PRIORS} from './polyhedralRobustness.js';

const N=8;
const EXPECTED=Object.freeze({
  '4:2':2520, '2:2':10080, '1:3':3360, '0:6':840, '0:4':2520,
});
const FAMILY_DATA=[
  {
    id:'four-triangles',name:'Four-triangle structure',signature:'4:2',
    edges:[[0,1],[0,2],[0,3],[1,2],[1,3],[2,4],[3,5],[4,6],[4,7],[5,7],[5,6],[6,7]],
  },
  {
    id:'two-triangles',name:'Two-triangle structure',signature:'2:2',
    edges:[[0,1],[0,2],[0,3],[1,2],[1,4],[2,5],[3,4],[3,6],[4,7],[5,6],[5,7],[6,7]],
  },
  {
    id:'one-triangle',name:'One-triangle structure',signature:'1:3',
    edges:[[0,1],[0,2],[0,3],[1,2],[1,4],[2,5],[3,6],[3,7],[4,6],[5,6],[4,7],[5,7]],
  },
  {
    id:'cube',name:'Cube · octahedron face dual',signature:'0:6',
    edges:[[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]],
  },
  {
    id:'four-squares',name:'Four-square structure',signature:'0:4',
    edges:[[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,7],[4,7],[5,6],[6,7]],
  },
];
export const POLY03_FAMILIES=Object.freeze(FAMILY_DATA.map(x=>Object.freeze({
  ...x,edges:Object.freeze(x.edges.map(pair=>Object.freeze([...pair]))),
  triangles:Number(x.signature.split(':')[0]),
  squares:Number(x.signature.split(':')[1]),
  labeledCount:EXPECTED[x.signature],
})));

function graphFromEdges(edges,id='eight-cubic',label='Eight-pocket cubic graph'){
  if(!Array.isArray(edges)||edges.length!==12)
    throw new Error('Expected twelve unique undirected edges');
  const neighbors=Array.from({length:N},()=>[]);
  const seen=new Set();
  for(const pair of edges){
    if(!Array.isArray(pair)||pair.length!==2)throw new Error('Malformed edge');
    const [a,b]=pair;
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=N||b>=N||a===b)
      throw new Error('Invalid edge endpoint');
    const key=Math.min(a,b)+':'+Math.max(a,b);
    if(seen.has(key))throw new Error('Duplicate edge');
    seen.add(key);
    neighbors[a].push(b);neighbors[b].push(a);
  }
  const coordinates=Array.from({length:N},(_,i)=>{
    const theta=2*Math.PI*i/N;
    return [Math.cos(theta),Math.sin(theta),.16*Math.sin(i*3)];
  });
  const graph={id,label,coordinates,neighbors:neighbors.map(row=>row.sort((a,b)=>a-b))};
  validateGraph(graph);
  return graph;
}
export function makePoly03Graph(id){
  const def=POLY03_FAMILIES.find(x=>x.id===id);
  if(!def)throw new RangeError('Unknown eight-pocket graph signature representative');
  return graphFromEdges(def.edges,def.id,def.name);
}
function masksFromEdges(edges){
  const adj=Array(N).fill(0);
  for(const [a,b] of edges){adj[a]|=1<<b;adj[b]|=1<<a;}
  return adj;
}
function popcount(v){let count=0;while(v){count++;v&=v-1;}return count;}
function connectedMasks(adj){
  let reached=1;
  for(let t=0;t<N;t++){
    let expanded=reached;
    for(let i=0;i<N;i++)if(reached&(1<<i))expanded|=adj[i];
    if(expanded===reached)break;
    reached=expanded;
  }
  return reached===(1<<N)-1;
}
function cycleSignatureMasks(adj){
  let triangles=0,squaresTwice=0;
  for(let a=0;a<N;a++)for(let b=a+1;b<N;b++)for(let c=b+1;c<N;c++){
    if((adj[a]&(1<<b))&&(adj[a]&(1<<c))&&(adj[b]&(1<<c)))triangles++;
  }
  // Every 4-cycle has exactly two opposite-vertex pairs. For each pair,
  // choose two common neighbors and divide the total by two.
  for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){
    const common=popcount(adj[a]&adj[b]);
    squaresTwice+=common*(common-1)/2;
  }
  if(squaresTwice%2!==0)throw new Error('Nonintegral four-cycle invariant');
  return triangles+':'+(squaresTwice/2);
}
export function signatureOfGraph(graph){
  validateGraph(graph);
  if(graph.neighbors.length!==N||graph.neighbors.some(x=>x.length!==3))
    throw new Error('Signature is restricted to eight-vertex cubic graphs');
  const edges=graph.neighbors.flatMap((row,a)=>row.filter(b=>a<b).map(b=>[a,b]));
  return cycleSignatureMasks(masksFromEdges(edges));
}
/**
 * Exhaustive generator: at every recursive step, connect the smallest
 * unfinished vertex to all k-subsets of eligible higher-index vertices,
 * where k is its remaining required degree. Every undirected edge is
 * introduced exactly once. No graph is counted more than once.
 */
export function* enumerateLabeledCubic8(){
  function* visit(degrees,edges){
    const a=degrees.findIndex(d=>d>0);
    if(a<0){yield edges;return;}
    const remaining=degrees[a],options=[];
    for(let b=a+1;b<N;b++)if(degrees[b]>0)options.push(b);
    if(options.length<remaining)return;
    function* choose(start,partners){
      if(partners.length===remaining){
        const nextDegrees=degrees.slice();
        nextDegrees[a]=0;
        for(const b of partners)nextDegrees[b]--;
        if(nextDegrees.some(d=>d<0))return;
        yield* visit(nextDegrees,[...edges,...partners.map(b=>[a,b])]);
        return;
      }
      const left=remaining-partners.length;
      for(let i=start;i<=options.length-left;i++){
        yield* choose(i+1,[...partners,options[i]]);
      }
    }
    yield* choose(0,[]);
  }
  yield* visit(Array(N).fill(3),[]);
}
/** Exact uniform-prior H(next sum | current sum) for one mask adjacency.
 * Kept separate from R25's weighted graph-object implementation so the
 * census gives an independent cross-check at p=0.5.
 */
function majorityEntropyMasks(adj){
  const bucket=Array.from({length:N+1},()=>new Uint16Array(N+1));
  for(let initial=0;initial<(1<<N);initial++){
    const observedCount=popcount(initial);
    let nextCount=0;
    for(let i=0;i<N;i++){
      const positiveNeighbors=popcount(initial&adj[i]);
      if(positiveNeighbors>=2)nextCount++;
    }
    bucket[observedCount][nextCount]++;
  }
  let entropy=0;
  for(const outcomes of bucket){
    const mass=outcomes.reduce((a,b)=>a+b,0);
    if(mass===0)continue;
    for(const count of outcomes)if(count>0){
      const conditional=count/mass;
      entropy-=(count/(1<<N))*Math.log2(conditional);
    }
  }
  return entropy;
}
export function exhaustivePoly03Census(){
  let labeledTotal=0,connectedTotal=0,disconnectedTotal=0;
  const groups=new Map();
  for(const edges of enumerateLabeledCubic8()){
    labeledTotal++;
    const masks=masksFromEdges(edges);
    if(!connectedMasks(masks)){disconnectedTotal++;continue;}
    connectedTotal++;
    const signature=cycleSignatureMasks(masks);
    const entropy=majorityEntropyMasks(masks);
    if(!groups.has(signature))groups.set(signature,{
      signature,count:0,minMajorityBits:Infinity,maxMajorityBits:-Infinity,
      firstEdges:edges,firstMajorityBits:entropy,
    });
    const entry=groups.get(signature);
    entry.count++;
    entry.minMajorityBits=Math.min(entry.minMajorityBits,entropy);
    entry.maxMajorityBits=Math.max(entry.maxMajorityBits,entropy);
  }
  return {
    protocol:'POLY-03',method:'exhaustive labeled cubic n=8 enumeration',
    labeledTotal,connectedTotal,disconnectedTotal,
    groups:[...groups.values()].sort((a,b)=>a.signature.localeCompare(b.signature)),
  };
}
export function runPoly03({rule='majority',prior=0.5}={}){
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unsupported update rule');
  if(!PRIORS.includes(prior))throw new RangeError('Expected one of the predeclared priors');
  const families=POLY03_FAMILIES.map(def=>{
    const graph=makePoly03Graph(def.id);
    if(signatureOfGraph(graph)!==def.signature)
      throw new Error('Registered graph signature mismatch');
    const result=exactWeightedKeyhole(graph,{rule,prior});
    return {
      id:def.id,name:def.name,signature:def.signature,
      triangles:def.triangles,squares:def.squares,labeledCount:def.labeledCount,
      entropyBits:result.conditionalEntropyBits,
      graph,distribution:result.distribution,
    };
  });
  const cube=families.find(x=>x.id==='cube');
  const values=families.map(x=>x.entropyBits);
  return {
    protocol:'POLY-03',version:1,evidence:'EXACT SYNTHETIC',authority:'NONE',
    vertexCount:8,degree:3,edges:12,rule,prior,
    labeledGraphs:19355,connectedGraphs:19320,disconnectedGraphs:35,
    claimedSignatureGroups:5,
    families,
    cubeBits:cube.entropyBits,
    minBits:Math.min(...values),maxBits:Math.max(...values),
    spanBits:Math.max(...values)-Math.min(...values),
    caveats:[
      'Five triangle/four-cycle signature groups are established by finite exhaustive enumeration; the signature is not a general graph-isomorphism oracle.',
      'Entropies are evaluated on a representative of each signature group for the selected rule/prior.',
      'A full exhaustive entropy invariance test across all connected labeled graphs is performed for the uniform-majority rule only.',
      'All values concern a toy graph transition model; no physical effect or practical routing advantage is established.',
    ],
  };
}
