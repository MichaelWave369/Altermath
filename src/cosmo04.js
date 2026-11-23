/** COSMO-04 R32: structural holdout graph routing, equal indexed baselines.
 * Synthetic CPU-work proxy only; NOT GR, a cosmology test or production router.
 */
export const COSMO04_AUTHORITY = 'SIMULATED / authority NONE';
export const COSMO04_FAMILIES = Object.freeze(['chain','ring','star','mesh']);
export const COSMO04_SPLITS = Object.freeze({
  train:[['chain',11],['chain',13],['ring',11],['ring',13]],
  validation:[['star',17],['star',19]],
  holdout:[['mesh',23],['mesh',29]],
});
export const COSMO04_NODE_COUNT = 16;
const N=16;
function guardSeed(seed){if(!Number.isInteger(seed)||seed<0||seed>1000000)throw new RangeError('seed must be integer 0..1000000');}
function guardNode(n){if(!Number.isInteger(n)||n<0||n>=N)throw new RangeError('invalid node');}
function guardFamily(f){if(!COSMO04_FAMILIES.includes(f))throw new TypeError('invalid family');}
function groupOf(node){return Math.floor(node/4);}
function pairKey(u,v){return [Math.min(u,v),Math.max(u,v)].join(':');}
function w(u,v,seed){const x=Math.min(u,v)+1,y=Math.max(u,v)+1;return 1+((x*97+y*53+seed*41+(x*y)*7)%9);}
function assemble(nodes,edges){
  const adj=Array.from({length:N},()=>[]);
  for(const e of edges){adj[e.u].push({v:e.v,w:e.w});adj[e.v].push({v:e.u,w:e.w});}
  for(const row of adj)row.sort((a,b)=>a.v-b.v);
  return {nodes:nodes.slice(),edges:edges.map(e=>({...e})),adj};
}
export function cosmo04Graph(family='chain',seed=11){
  guardFamily(family);guardSeed(seed);
  const seen=new Map();
  const add=(u,v)=>{
    if(u===v)throw new Error('self edge');
    const key=pairKey(u,v);
    if(!seen.has(key))seen.set(key,{u:Math.min(u,v),v:Math.max(u,v),w:w(u,v,seed)});
  };
  for(let g=0;g<4;g++){
    const o=g*4;add(o,o+1);add(o+1,o+2);add(o+2,o+3);
    if((g+seed)%2===0)add(o,o+2);
    else add(o+1,o+3);
  }
  if(family==='chain'||family==='ring'||family==='mesh'){
    add(3,4);add(7,8);add(11,12);
  }
  if(family==='ring'||family==='mesh')add(15,0);
  if(family==='star') {add(3,4);add(3,8);add(3,12);}
  if(family==='mesh'){add(2,9);add(6,13);add(10,1);}
  const graph=assemble(Array.from({length:N},(_,i)=>i),[...seen.values()]);
  return {family,seed,...graph};
}
/** Same naive deterministic Dijkstra kernel for every route algorithm.
 * Work units: one vertex scan or examined directed adjacency = one unit.
 */
function shortest(nodes,adj,s,t){
  const present=new Set(nodes);
  if(!present.has(s)||!present.has(t))throw new RangeError('route endpoint absent');
  const dist=Array(N).fill(Infinity),used=Array(N).fill(false);
  dist[s]=0;
  let scans=0,edgeChecks=0;
  for(let k=0;k<nodes.length;k++){
    let u=-1,best=Infinity;
    for(const candidate of nodes){scans++;if(!used[candidate]&&dist[candidate]<best){best=dist[candidate];u=candidate;}}
    if(u<0)break;
    used[u]=true;
    if(u===t)break;
    for(const {v,w} of adj[u]){
      edgeChecks++;
      if(!used[v]&&dist[u]+w<dist[v])dist[v]=dist[u]+w;
    }
  }
  return {distance:dist[t],scans,edgeChecks,work:scans+edgeChecks};
}
export function cosmo04RawRoute(graph,s,t){guardNode(s);guardNode(t);return shortest(graph.nodes,graph.adj,s,t);}
/** Build exact within-group all-pairs distances, gateway shortcut overlay. */
export function cosmo04Index(graph){
  if(!graph||!COSMO04_FAMILIES.includes(graph.family)||!Array.isArray(graph.edges))throw new TypeError('invalid graph');
  const gateways=new Set();
  const cross=[];
  for(const e of graph.edges)if(groupOf(e.u)!==groupOf(e.v)){
    gateways.add(e.u);gateways.add(e.v);cross.push({...e});
  }
  const intra=Array.from({length:N},()=>Array(N).fill(Infinity));
  let setupWork=0;
  for(let g=0;g<4;g++){
    const nodes=Array.from({length:4},(_,i)=>4*g+i);
    const adj=Array.from({length:N},()=>[]);
    for(const e of graph.edges)if(groupOf(e.u)===g&&groupOf(e.v)===g){
      adj[e.u].push({v:e.v,w:e.w});adj[e.v].push({v:e.u,w:e.w});
    }
    for(const u of nodes){
      // Exactly 16 within-group Dijkstra runs, not 256.
      const computed=singleSource(nodes,adj,u);
      setupWork+=computed.work;
      for(const j of nodes)intra[u][j]=computed.dist[j];
    }
  }
  const portalNodes=[...gateways].sort((a,b)=>a-b);
  const baseEdges=cross.slice();
  for(let g=0;g<4;g++){
    const ps=portalNodes.filter(node=>groupOf(node)===g);
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      baseEdges.push({u:ps[i],v:ps[j],w:intra[ps[i]][ps[j]]});
    }
  }
  return {family:graph.family,seed:graph.seed,portalNodes,baseEdges,intra,setupWork,
    grouping:[0,1,2,3].map(g=>Array.from({length:4},(_,i)=>g*4+i))};
}
function singleSource(nodes,adj,s){
  const dist=Array(N).fill(Infinity),used=Array(N).fill(false);
  dist[s]=0;let scans=0,edgeChecks=0;
  for(let k=0;k<nodes.length;k++){
    let u=-1,best=Infinity;
    for(const v of nodes){scans++;if(!used[v]&&dist[v]<best){u=v;best=dist[v];}}
    if(u<0)break;
    used[u]=true;
    for(const {v,w} of adj[u]){edgeChecks++;if(!used[v]&&dist[u]+w<dist[v])dist[v]=dist[u]+w;}
  }
  return {dist,work:scans+edgeChecks};
}
function queryOverlay(index,s,t){
  guardNode(s);guardNode(t);
  const nodes=[...new Set([...index.portalNodes,s,t])].sort((a,b)=>a-b);
  const edgeMap=new Map();let buildWork=0;
  const add=(u,v,weight)=>{
    if(u===v)return;
    const key=pairKey(u,v),e=edgeMap.get(key);
    if(!e||weight<e.w)edgeMap.set(key,{u:Math.min(u,v),v:Math.max(u,v),w:weight});
  };
  for(const e of index.baseEdges){buildWork++;add(e.u,e.v,e.w);}
  for(const endpoint of [s,t]){
    for(const p of index.portalNodes){buildWork++;
      if(groupOf(endpoint)===groupOf(p))add(endpoint,p,index.intra[endpoint][p]);
    }
  }
  buildWork++;
  if(groupOf(s)===groupOf(t))add(s,t,index.intra[s][t]);
  return {graph:assemble(nodes,[...edgeMap.values()]),buildWork};
}
export function cosmo04IndexedRoute(index,s,t){
  const overlay=queryOverlay(index,s,t);
  const solved=shortest(overlay.graph.nodes,overlay.graph.adj,s,t);
  return {...solved,overlayBuildWork:overlay.buildWork,work:solved.work+overlay.buildWork};
}
/** Metadata-bearing variant uses the exact same index/search, to avoid unequal information. */
export function cosmo04NestedRoute(nested,s,t){
  if(!nested||!Array.isArray(nested.parents)||nested.parents.length!==4||!nested.overlay)throw new TypeError('invalid nested index');
  return cosmo04IndexedRoute(nested.overlay,s,t);
}
export function cosmo04NestedIndex(flatIndex){
  return {parents:flatIndex.grouping.map((nodes,i)=>({id:'G'+i,nodes:nodes.slice()})),
    childRelations:flatIndex.portalNodes.map(p=>({node:p,parentId:'G'+groupOf(p)})),
    overlay:flatIndex};
}
export function cosmo04Oracle(graph){
  const d=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>i===j?0:Infinity));
  for(const e of graph.edges){d[e.u][e.v]=Math.min(d[e.u][e.v],e.w);d[e.v][e.u]=Math.min(d[e.v][e.u],e.w);}
  for(let k=0;k<N;k++)for(let i=0;i<N;i++)for(let j=0;j<N;j++)
    d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
  return d;
}
const queryPairs=()=>Array.from({length:N},(_,s)=>Array.from({length:N},(_,t)=>({s,t})).filter(q=>q.s!==q.t)).flat();
function evaluateGraph(family,seed){
  const graph=cosmo04Graph(family,seed),index=cosmo04Index(graph),nested=cosmo04NestedIndex(index);
  const oracle=cosmo04Oracle(graph),rows=[];
  for(const {s,t} of queryPairs()){
    const raw=cosmo04RawRoute(graph,s,t);
    const indexed=cosmo04IndexedRoute(index,s,t);
    const hierarchical=cosmo04NestedRoute(nested,s,t);
    if(raw.distance!==oracle[s][t]||raw.distance!==indexed.distance||raw.distance!==hierarchical.distance)
      throw new Error('shortest-path oracle mismatch at '+family+'/'+seed+'/'+s+'/'+t);
    if(indexed.work!==hierarchical.work)throw new Error('indexed work parity failure');
    rows.push({s,t,sameGroup:groupOf(s)===groupOf(t),raw:raw.work,indexed:indexed.work,distance:raw.distance});
  }
  const indexBytes=JSON.stringify({portalNodes:index.portalNodes,baseEdges:index.baseEdges,intra:index.intra,grouping:index.grouping}).length;
  const nestedBytes=JSON.stringify(nested).length;
  return {family,seed,vertices:N,originalEdges:graph.edges.length,portalCount:index.portalNodes.length,
    indexEdges:index.baseEdges.length,queries:rows.length,indexSetupWork:index.setupWork,
    flatIndexJsonBytes:indexBytes,nestedJsonBytes:nestedBytes,rows};
}
function chooseRoute(row,policy){
  if(policy==='raw')return row.raw;
  if(policy==='indexed')return row.indexed;
  if(typeof policy==='object'&&policy){
    const key=row.sameGroup?'same':'cross';return policy[key]==='indexed'?row.indexed:row.raw;
  }
  throw new TypeError('bad route policy');
}
function workload(graphs,policy){
  let rawWork=0,indexQueryWork=0,policyQueryWork=0,setupWork=0;
  let optimalQueries=0,totalQueries=0,indexUsed=0;
  const byFamily=[];
  for(const g of graphs){
    let used=false,local=0;
    for(const r of g.rows){
      rawWork+=r.raw;indexQueryWork+=r.indexed;
      const useIndexed=policy==='indexed'||(typeof policy==='object'&&policy!==null&&policy[r.sameGroup?'same':'cross']==='indexed');
      if(useIndexed){indexUsed++;used=true;}
      const cost=chooseRoute(r,policy);policyQueryWork+=cost;local+=cost;optimalQueries++;totalQueries++;
    }
    if(used)setupWork+=g.indexSetupWork;
    byFamily.push({family:g.family,seed:g.seed,queryWork:local,setupCharged:used?g.indexSetupWork:0,queries:g.queries});
  }
  return {graphs:graphs.length,queries:totalQueries,correct:optimalQueries,
    routeAccuracy:totalQueries?optimalQueries/totalQueries:0,
    rawQueryWork:rawWork,indexedQueryWork:indexQueryWork,
    queryWork:policyQueryWork,indexSetupWork:setupWork,totalWork:policyQueryWork+setupWork,
    workPerQuery:(policyQueryWork+setupWork)/totalQueries,indexedRequests:indexUsed,byFamily};
}
function learnRule(train){
  const policy={same:'raw',cross:'raw'};
  for(const key of ['same','cross']){
    const rows=train.flatMap(g=>g.rows).filter(r=>r.sameGroup===(key==='same'));
    const raw=rows.reduce((s,r)=>s+r.raw,0),indexed=rows.reduce((s,r)=>s+r.indexed,0);
    if(indexed<raw)policy[key]='indexed';
  }
  return policy;
}
function selection(validate,learned){
  const candidates=[{name:'raw',policy:'raw'},{name:'indexed',policy:'indexed'},
    {name:'trained-policy',policy:learned}];
  const scored=candidates.map(c=>({...c,validation:workload(validate,c.policy)}));
  let winner=scored[0];for(const c of scored.slice(1))if(c.validation.totalWork<winner.validation.totalWork)winner=c;
  return {winner:winner.name,policy:winner.policy,
    candidates:scored.map(c=>({name:c.name,work:c.validation.totalWork,
      correct:c.validation.correct,setupWork:c.validation.indexSetupWork}))};
}
export function cosmo04Report(){
  const sets=Object.fromEntries(Object.entries(COSMO04_SPLITS).map(([split,configs])=>[
    split,configs.map(([family,seed])=>evaluateGraph(family,seed))]));
  const trained=learnRule(sets.train),chosen=selection(sets.validation,trained);
  const heldout={
    raw:workload(sets.holdout,'raw'),
    indexedFlat:workload(sets.holdout,'indexed'),
    nested:workload(sets.holdout,'indexed'),
    chosenFlat:workload(sets.holdout,chosen.policy),
    chosenNested:workload(sets.holdout,chosen.policy)
  };
  return {authority:COSMO04_AUTHORITY,
    task:'exact shortest-path routing in small deterministic weighted synthetic networks',
    splitDefinitions:COSMO04_SPLITS,description:'Train=chain/ring; validation=star; heldout=mesh; no heldout labels in policy selection',
    trainingPolicy:trained,validationSelection:chosen,
    heldout,holdoutGraphs:sets.holdout.map(g=>({family:g.family,seed:g.seed,vertices:g.vertices,
      originalEdges:g.originalEdges,indexEdges:g.indexEdges,portalCount:g.portalCount,
      queries:g.queries,setupWork:g.indexSetupWork,flatIndexJsonBytes:g.flatIndexJsonBytes,
      nestedJsonBytes:g.nestedJsonBytes})),
    rawRoutesPerHoldoutGraph:240,
    warning:'Synthetic graph routing only. Work is deterministic vertex-scan + edge-check + overlay-build operations, not CPU time or real deployment resource efficiency.'};
}
export function cosmo04Case(family='mesh',seed=23,s=0,t=15){
  const graph=cosmo04Graph(family,seed),index=cosmo04Index(graph),nested=cosmo04NestedIndex(index);
  return {family,seed,source:s,target:t,
    originalEdges:graph.edges.length,portals:index.portalNodes,
    raw:cosmo04RawRoute(graph,s,t),flatIndexed:cosmo04IndexedRoute(index,s,t),
    nested:cosmo04NestedRoute(nested,s,t),setupWork:index.setupWork};
}
