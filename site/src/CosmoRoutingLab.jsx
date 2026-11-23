import {useMemo,useState} from 'react';
import {COSMO04_FAMILIES,cosmo04Case,cosmo04Report} from '../../src/cosmo04.js';
import './cosmoRouting.css';

const fmt=n=>Number(n).toLocaleString();
const methods=[
  {key:'raw',title:'Raw flat Dijkstra',note:'No precomputed index'},
  {key:'indexedFlat',title:'Flat with portal index',note:'Preprocessing charged'},
  {key:'nested',title:'Nested with same index',note:'Equal search, added metadata'}
];
function download(report){
  const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='altermath-r32-cosmo04-routing.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Stat({title,value,detail}){
  return <div className="cosmo04-stat"><small>{title}</small>
    <strong>{value}</strong><span>{detail}</span></div>;
}
export default function CosmoRoutingLab(){
  const [family,setFamily]=useState('mesh');
  const [seed,setSeed]=useState(23);
  const [source,setSource]=useState(0);
  const [target,setTarget]=useState(15);
  const study=useMemo(()=>cosmo04Report(),[]);
  const sample=useMemo(()=>cosmo04Case(family,seed,source,target),
    [family,seed,source,target]);
  const heldout=study.heldout;
  const maxWork=Math.max(...methods.map(m=>heldout[m.key].totalWork));
  const disadvantage=100*(heldout.indexedFlat.totalWork/heldout.raw.totalWork-1);
  return <section className="cosmo04-lab" id="cosmo04" aria-labelledby="cosmo04-title">
    <div className="cosmo04-heading">
      <div>
        <div className="micro">RUNG 32 · COSMO-04 / SYNTHETIC ROUTING UNDER TOPOLOGY SHIFT</div>
        <h2 id="cosmo04-title">Nested gears meet the <em>unseen network.</em></h2>
        <p>A 16-node routing challenge with four groups, exact weighted shortest paths
          and precomputed portal shortcuts. Train on chain/ring layouts, select on
          star layouts, then evaluate on mesh layouts never used for selection.</p>
      </div>
      <span className="cosmo04-flag">SIMULATED · AUTHORITY NONE</span>
    </div>
    <div className="cosmo04-pipeline" aria-label="Training validation and heldout protocol">
      <div><strong>TRAIN</strong><span>4 chain/ring graphs · 960 queries</span></div>
      <span aria-hidden="true">→</span>
      <div><strong>VALIDATE</strong><span>2 star graphs · 480 queries</span></div>
      <span aria-hidden="true">→</span>
      <div><strong>HOLD OUT</strong><span>2 mesh graphs · 480 queries</span></div>
    </div>
    <div className="cosmo04-compare">
      <div className="cosmo04-panel">
        <div className="micro">HELD-OUT MESH · TOTAL DETERMINISTIC WORK UNITS</div>
        <h3>Correct routes can still be inefficient</h3>
        <p>Every method finds the exact shortest path. Preprocessing is charged
          once per graph, while the nested and flat-indexed routes use the same
          search kernel and information.</p>
        {methods.map(m=><div className="cosmo04-method" key={m.key}>
          <div className="cosmo04-method-top"><span>{m.title}</span>
            <strong>{fmt(heldout[m.key].totalWork)}</strong></div>
          <div className="cosmo04-track">
            <div className={m.key==='raw'?'raw':'indexed'}
              style={{width:(heldout[m.key].totalWork/maxWork*100)+'%'}}/>
          </div>
          <small>{m.note} · {heldout[m.key].queries} routes · {heldout[m.key].correct} optimal</small>
        </div>)}
        <p className="cosmo04-result">Indexed routing required <strong>{disadvantage.toFixed(1)}% more
          counted work</strong> than flat raw Dijkstra on the held-out mesh.
          The hierarchy did not outperform the equivalent flat index.</p>
      </div>
      <div className="cosmo04-panel">
        <div className="micro">SELECTION AUDIT</div>
        <h3>Why the wrong strategy was selected</h3>
        <div className="cosmo04-stats">
          <Stat title="Chosen on validation" value={study.validationSelection.winner}
            detail="Selected without inspecting mesh test costs"/>
          <Stat title="Training policy" value={study.trainingPolicy.same+' / '+study.trainingPolicy.cross}
            detail="Same-group / cross-group routing"/>
          <Stat title="Holdout correctness" value="480 / 480"
            detail="Independently checked shortest paths"/>
          <Stat title="Index setup work" value={fmt(heldout.indexedFlat.indexSetupWork)}
            detail="Charged once for each of two held-out graphs"/>
        </div>
        <div className="cosmo04-table-wrap"><table>
          <thead><tr><th>Validation candidate</th><th>Work</th><th>Correct routes</th></tr></thead>
          <tbody>{study.validationSelection.candidates.map(x=><tr key={x.name}
            className={x.name===study.validationSelection.winner?'winner':''}>
            <th>{x.name}</th><td>{fmt(x.work)}</td><td>{x.correct}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>
    <div className="cosmo04-compare">
      <div className="cosmo04-panel">
        <div className="micro">INDIVIDUAL ROUTE INSPECTOR</div>
        <h3>Change the graph, inspect a route</h3>
        <div className="cosmo04-controls">
          <label>Topology
            <select value={family} onChange={e=>setFamily(e.target.value)}>
              {COSMO04_FAMILIES.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>Graph seed
            <select value={seed} onChange={e=>setSeed(Number(e.target.value))}>
              {[11,13,17,19,23,29].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Source
            <select value={source} onChange={e=>setSource(Number(e.target.value))}>
              {Array.from({length:16},(_,i)=><option value={i} key={i}>Node {i}</option>)}
            </select>
          </label>
          <label>Destination
            <select value={target} onChange={e=>setTarget(Number(e.target.value))}>
              {Array.from({length:16},(_,i)=><option value={i} key={i}>Node {i}</option>)}
            </select>
          </label>
        </div>
        <div className="cosmo04-stats">
          <Stat title="Exact shortest distance" value={sample.raw.distance}
            detail="Positive integer edge weights"/>
          <Stat title="Raw search units" value={sample.raw.work} detail="No preprocessing"/>
          <Stat title="Indexed query units" value={sample.flatIndexed.work} detail="Overlay preparation included"/>
          <Stat title="Gateway nodes" value={sample.portals.length}
            detail="Affects indexed overlay size"/>
        </div>
        <p className="cosmo04-caption">The inspector lets you choose any registered layout
          and seed; the held-out benchmark and preselected policy remain fixed.
          Inspection does not retune the results.</p>
      </div>
      <div className="cosmo04-panel">
        <div className="micro">RESOURCE & EVIDENCE BOUNDARY</div>
        <h3>Where the hierarchy costs extra</h3>
        <div className="cosmo04-table-wrap"><table>
          <thead><tr><th>Heldout mesh</th><th>Flat-index JSON bytes</th><th>Nested JSON bytes</th><th>Gateways</th></tr></thead>
          <tbody>{study.holdoutGraphs.map(g=><tr key={g.seed}>
            <th>Seed {g.seed}</th><td>{fmt(g.flatIndexJsonBytes)}</td>
            <td>{fmt(g.nestedJsonBytes)}</td><td>{g.portalCount}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="cosmo04-caption">The byte figures measure one JSON serialization
          format, not production RAM/latency, and the indexed representation's extra
          metadata means its storage is not equal to the flat raw baseline.
          The two indexed variants have matched search data and search work.
          Our "learned" selector is a two-feature policy fitted to synthetic training
          workloads, not a trained AI agent.</p>
        <button type="button" className="cosmo04-export" onClick={()=>download({report:study,inspectedRoute:sample})}>
          Export full reproducibility record
        </button>
      </div>
    </div>
    <div className="cosmo04-boundary">
      <p><strong>Claim boundary:</strong> This is small deterministic synthetic graph routing,
        not real network telemetry, observed CPU time, a universal cost model, improved AI,
        or physical cosmology. The indexed strategy wins validation but loses the held-out
        mesh. Nulls and failures are part of the result.</p>
      <a target="_blank" rel="noreferrer"
        href="https://github.com/MichaelWave369/Altermath/blob/main/docs/cosmo04.md">
        Read COSMO-04 protocol ↗
      </a>
    </div>
  </section>;
}
