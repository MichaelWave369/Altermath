import {compare} from '../site/src/aqdSourceCircuit.js';
const seeds=[369,636,963,1369,1636,1963,2369,2636];
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const exact=seeds.map(seed=>compare({n:6,seed,basis:'exact'}));
const legacy=seeds.map(seed=>compare({n:6,seed,law:'legacyE2',basis:'sampled'}));
const sampleRuns=[8,32,128].map(samples=>({samples,runs:seeds.map(seed=>compare({n:6,seed,basis:'sampled',samples}))}));
const summary=runs=>runs[0].rows.map((r,i)=>({name:r.name,edge:mean(runs.flatMap(d=>['X','Z'].flatMap(a=>d.rows[i].byAxis[a].map(p=>p.alignedEdge)))),bulk:mean(runs.flatMap(d=>['X','Z'].flatMap(a=>d.rows[i].byAxis[a].map(p=>p.alignedBulk)))),last:mean(runs.flatMap(d=>['X','Z'].map(a=>d.rows[i].byAxis[a].at(-1).alignedEdge)))}));
const convergence=sampleRuns.map(({samples,runs})=>({samples,rmse:Math.sqrt(mean(runs.flatMap((d,i)=>d.rows.flatMap((r,j)=>['X','Z'].flatMap(a=>r.byAxis[a].map((p,k)=>(p.alignedEdge-exact[i].rows[j].byAxis[a][k].alignedEdge)**2))))))}));
console.log(JSON.stringify({schema:'aqd-e21-audit-v1',runs:exact,legacy,sampleRuns,summary:{correctedExact:summary(exact),legacySampled:summary(legacy),correctedSampled:summary(sampleRuns[0].runs)},convergence},null,2));
