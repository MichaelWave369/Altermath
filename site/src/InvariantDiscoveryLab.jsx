import {useState} from 'react';
import {METHODS,runStudy} from './invariantDiscovery.js';
import './invariantDiscovery.css';

const INITIAL={seed:369,trainSeeds:3,holdoutSeeds:6};
const SEED_OPTIONS=[3,6,9];

function downloadReport(report){
  const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='altermath-r20-seed-'+report.seed+'.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Percent({value}){return <>{(value*100).toFixed(1)}%</>;}

export default function InvariantDiscoveryLab(){
  const [seed,setSeed]=useState(String(INITIAL.seed));
  const [trainSeeds,setTrainSeeds]=useState(INITIAL.trainSeeds);
  const [holdoutSeeds,setHoldoutSeeds]=useState(INITIAL.holdoutSeeds);
  const [report,setReport]=useState(()=>runStudy(INITIAL));
  const [inspected,setInspected]=useState('triangles');
  const [error,setError]=useState('');
  function run(){
    try{
      const next=runStudy({seed:Number(seed),trainSeeds,holdoutSeeds});
      setReport(next);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Invalid experiment settings');}
  }
  const selected=report.holdout.metrics.find(m=>m.method===report.selectedByTraining);
  const inspectedMethod=METHODS.find(m=>m.id===inspected);
  const negative=report.holdout.rows.find(r=>!r.oracleSame&&r.predictions[inspected]);
  const positives=report.holdout.rows.filter(r=>r.oracleSame).length;
  return <section id="invariants" className="r20-lab" aria-labelledby="r20-heading">
    <div className="r20-heading">
      <div>
        <div className="micro">RUNG 20 · REPRESENTATION-INVARIANT DISCOVERY</div>
        <h2 id="r20-heading">Beyond notation. <em>Test the relationship.</em></h2>
        <p>Could two descriptions hide the same structure, or make different structures look identical?
          Compare graph invariants under relabeling and three data encodings. Exact graph isomorphism supplies the small-graph oracle.</p>
      </div>
      <span className="r20-status">SYNTHETIC / NO PHYSICAL CLAIM</span>
    </div>
    <div className="r20-grid">
      <div className="r20-control">
        <h3>Blind representation challenge</h3>
        <p>Candidate methods receive graph data only. The benchmark compares their decisions with the oracle after running.</p>
        <div className="r20-fields">
          <label>Base seed
            <input type="number" min="1" max="999980000" step="1" value={seed} onChange={e=>setSeed(e.target.value)}/>
          </label>
          <label>Training seeds
            <select value={trainSeeds} onChange={e=>setTrainSeeds(Number(e.target.value))}>
              {SEED_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Unseen holdout seeds
            <select value={holdoutSeeds} onChange={e=>setHoldoutSeeds(Number(e.target.value))}>
              {SEED_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="r20-buttons">
          <button type="button" onClick={run} className="r20-primary">Run predeclared comparison</button>
          <button type="button" onClick={()=>downloadReport(report)}>Export full JSON</button>
        </div>
        {error&&<p className="r20-error" role="alert">{error}</p>}
        <p className="r20-small">Train first, lock the best method, then score a separate +10,000 seed block. Identical graph structures are relabeled and presented as matrices, edge lists, or neighbor lists.</p>
      </div>
      <div className="r20-results" aria-live="polite">
        <div className="r20-statgrid">
          <div><span>Held-out pairs</span><strong>{report.holdout.size}</strong></div>
          <div><span>Same structure</span><strong>{positives}</strong></div>
          <div><span>Different structure</span><strong>{report.holdout.size-positives}</strong></div>
        </div>
        <div className="r20-lock">
          <span>Method locked by training</span>
          <strong>{METHODS.find(m=>m.id===report.selectedByTraining)?.name}</strong>
          <small>Holdout accuracy: <Percent value={selected.accuracy}/> · False matches: {selected.falsePositive}</small>
        </div>
        <div className="r20-table-wrap">
          <table>
            <caption>Held-out comparison; higher accuracy and fewer false matches are better for these particular fixtures.</caption>
            <thead><tr><th scope="col">Method</th><th scope="col">Accuracy</th><th scope="col">False matches</th><th scope="col">False rejections</th></tr></thead>
            <tbody>{report.holdout.metrics.map(m=><tr key={m.method} className={m.method===report.selectedByTraining?'r20-winner':''}>
              <th scope="row">{m.name}</th>
              <td><Percent value={m.accuracy}/></td><td>{m.falsePositive}</td><td>{m.falseNegative}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div className="r20-counterexample">
      <div>
        <h3>Find the false equivalence</h3>
        <label htmlFor="r20-method">Inspection method</label>
        <select id="r20-method" value={inspected} onChange={e=>setInspected(e.target.value)}>
          {METHODS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="r20-case">
        {negative ? <>
          <span className="r20-alert">COUNTEREXAMPLE FOUND</span>
          <strong>{negative.challenge}</strong>
          <p>{inspectedMethod.name} says equivalent, but exact isomorphism says different. Views: {negative.left.kind} versus {negative.right.kind}. The method's chosen properties failed to distinguish these two graphs.</p>
        </> : <>
          <span className="r20-ok">NO FALSE MATCH IN THIS FIXTURE SET</span>
          <strong>{inspectedMethod.name}</strong>
          <p>No false equivalences occurred for this bounded collection. This does not mean the signature uniquely identifies every graph.</p>
        </>}
      </div>
    </div>
    <div className="r20-footer">
      <p><strong>Scientific boundary:</strong> these are known graph invariants tested on synthetic examples with at most eight vertices. No AI generates hypotheses in R20; no new mathematics, physical theory, or general graph-isomorphism guarantee is claimed. Negative results are retained.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/invariant-discovery-r20.md" target="_blank" rel="noreferrer">Read protocol and falsifiers ↗</a>
    </div>
  </section>;
}
