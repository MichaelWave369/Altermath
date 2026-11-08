import {useMemo,useState} from 'react';
import {RULES} from './polyhedralRobustness.js';
import {runCrossTopologyTransfer,TRANSFER_BUDGETS} from './keyholeTransfer.js';
import './keyholeTransfer.css';

function pct(n){return (100*n).toFixed(1)+'%';}
function pp(n){return (n>0?'+':'')+(n*100).toFixed(1)+' pp';}
function download(data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;
  a.download='altermath-r28-poly05-cross-topology.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Bar({label,value,kind}){
  return <div className="r28-meter">
    <div className="r28-meter-head"><span>{label}</span><strong>{pct(value)}</strong></div>
    <div className="r28-track"><div className={kind} style={{width:(value*100)+'%'}}/></div>
  </div>;
}
function Measure({name,value,detail}){
  return <div className="r28-measure"><small>{name}</small><strong>{value}</strong><span>{detail}</span></div>;
}
export default function KeyholeTransferLab(){
  const [rule,setRule]=useState('majority');
  const [budget,setBudget]=useState(1);
  const [graphId,setGraphId]=useState('cube');
  const [variant,setVariant]=useState('canonical');
  const study=useMemo(()=>runCrossTopologyTransfer({rule,budget}),[rule,budget]);
  const fold=study.folds.find(x=>x.holdoutId===graphId);
  const result=fold.results.find(x=>x.label===variant);
  const byVariant=study.byVariant.find(x=>x.label===variant);
  return <section className="r28-lab" id="keyhole-transfer" aria-labelledby="r28-title">
    <div className="r28-heading">
      <div>
        <div className="micro">RUNG 28 · NBG POLY-05 / TRANSFER UNDER DOMAIN SHIFT</div>
        <h2 id="r28-title">Unseen Networks. <em>Honest Predictions.</em></h2>
        <p>Train on three network structures, tune sensor positions on a fourth,
          and test on a fifth. Then permute the held-out graph's node labels without
          altering its behavior. Does the chosen Keyhole still predict?</p>
      </div>
      <span className="r28-badge">SYNTHETIC DOMAIN SHIFT · NO AUTHORITY</span>
    </div>
    <div className="r28-pipeline" aria-label="Five-fold train, validation and heldout design">
      <div><strong>3 graphs</strong><span>Training · 768 states</span></div>
      <span aria-hidden="true">→</span>
      <div><strong>1 graph</strong><span>Validation · 256 states</span></div>
      <span aria-hidden="true">→</span>
      <div><strong>1 unseen graph</strong><span>Holdout · 256 states</span></div>
    </div>
    <div className="r28-layout">
      <aside className="r28-controls">
        <h3>Domain-shift settings</h3>
        <label htmlFor="r28-rule">Update rule</label>
        <select id="r28-rule" value={rule} onChange={e=>setRule(e.target.value)}>
          {RULES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div className="r28-field">
          <span className="r28-label">Additional sensed pocket signs</span>
          <div className="r28-budget" role="group" aria-label="Extra sensor budget">
            {TRANSFER_BUDGETS.map(b=><button key={b} type="button" aria-pressed={budget===b}
              className={budget===b?'current':''} onClick={()=>setBudget(b)}>{b}</button>)}
          </div>
        </div>
        <label htmlFor="r28-family">Unseen test network</label>
        <select id="r28-family" value={graphId} onChange={e=>setGraphId(e.target.value)}>
          {study.folds.map(row=><option key={row.holdoutId} value={row.holdoutId}>{row.holdoutName}</option>)}
        </select>
        <label htmlFor="r28-relabel">Node index mapping on test network</label>
        <select id="r28-relabel" value={variant} onChange={e=>setVariant(e.target.value)}>
          {study.byVariant.map(row=><option key={row.label} value={row.label}>
            {row.label==='canonical'?'Original node labels':row.label.replace('relabel-','Relabeled · seed ')}
          </option>)}
        </select>
        <div className="r28-fold">
          <small>Graph roles · all structurally disjoint</small>
          <p><strong>Train:</strong> {fold.trainIds.join(', ')}</p>
          <p><strong>Validate:</strong> {fold.validationId}</p>
          <p><strong>Test:</strong> {fold.holdoutId}</p>
          <p><strong>Validation-chosen sensors:</strong> {fold.selectedSensors.length?
            fold.selectedSensors.map(i=>'#'+(i+1)).join(', '):'none'}</p>
        </div>
        <button type="button" className="r28-export" onClick={()=>download(study)}>Export full research record</button>
        <p className="r28-explainer">No held-out labels are used to choose sensor indices or fit
          forecasts. Relabeling changes arbitrary index assignments, not the underlying
          graph's connectivity or the theoretical transition law.</p>
      </aside>
      <div className="r28-results">
        <div className="micro">UNSEEN GRAPH · EXACT-MATCH ONE-STEP AGGREGATE FORECAST</div>
        <h3>{fold.holdoutName}</h3>
        <p className="r28-note">{variant==='canonical'?'Original node indexing':'Test graph labels independently permuted'}
          . All candidate methods see the current aggregate; extra observations obey the same {budget}-bit budget.</p>
        <Bar label="Aggregate-only baseline" value={result.aggregate.accuracy}/>
        <Bar label="First k sensors · fixed baseline" value={result.fixed.accuracy} kind="fixed"/>
        <Bar label="Seeded random sensor locations" value={result.random.accuracy} kind="random"/>
        <Bar label="Validation-selected sensor locations" value={result.selected.accuracy} kind="candidate"/>
        <div className="r28-metrics">
          <Measure name="Candidate vs fixed" value={pp(result.deltaVsFixed)}
            detail="Held-out percentage-point difference"/>
          <Measure name="Candidate vs aggregate" value={pp(result.deltaVsAggregate)}
            detail="Extra information compared with aggregate only"/>
          <Measure name="Candidate MAE" value={result.selected.mae.toFixed(3)}
            detail="Mean absolute next-aggregate prediction error"/>
          <Measure name="All-family holdout cases" value={study.evaluatedPredictionsPerModel.toLocaleString()}
            detail="Five graphs × four label variants × 256 states"/>
        </div>
        <p className="r28-interpretation">
          {result.deltaVsFixed>0
            ? 'Positive within this synthetic condition. We still need cross-family and relabel stability before inferring utility.'
            :result.deltaVsFixed<0
              ? 'Negative result: validation-selected sensing performed worse than the fixed same-budget baseline on this unseen graph.'
              :'No improvement over the fixed baseline under this condition.'}
        </p>
      </div>
    </div>
    <div className="r28-across">
      <div className="r28-across-head">
        <div>
          <div className="micro">FIVE-FOLD HELDOUT COMPARISON</div>
          <h3>Does the result survive changed graph labels?</h3>
          <p>Compare all holdout graphs for the selected node-label treatment.
            A relabeling is an exact graph isomorphism, not a new topology.</p>
        </div>
        <span>20 graph × label-variant conditions</span>
      </div>
      <div className="r28-summary">
        <Measure name="Aggregate-only mean" value={pct(byVariant.means.aggregate)} detail="No added raw bits"/>
        <Measure name="Fixed sensor mean" value={pct(byVariant.means.fixed)} detail="Equal sensor budget"/>
        <Measure name="Random sensor mean" value={pct(byVariant.means.random)} detail="Preselected positions"/>
        <Measure name="Selected sensor mean" value={pct(byVariant.means.selected)} detail="Validation-optimized positions"/>
      </div>
      <div className="r28-tablewrap">
        <table>
          <thead><tr><th>Unseen graph</th><th>Aggregate</th><th>Fixed</th><th>Random</th><th>Selected</th><th>Δ vs fixed</th></tr></thead>
          <tbody>{study.folds.map(f=>{
            const row=f.results.find(r=>r.label===variant);
            return <tr key={f.holdoutId} className={f.holdoutId===graphId?'selected':''}>
              <td><button type="button" onClick={()=>setGraphId(f.holdoutId)}>{f.holdoutName}</button></td>
              <td>{pct(row.aggregate.accuracy)}</td><td>{pct(row.fixed.accuracy)}</td>
              <td>{pct(row.random.accuracy)}</td><td>{pct(row.selected.accuracy)}</td>
              <td>{pp(row.deltaVsFixed)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
    <div className="r28-boundary">
      <p><strong>Scope:</strong> All target labels derive from known synthetic update rules.
        The same 256 binary state masks occur on different graphs, so this is
        out-of-graph transfer, not generalization to new kinds of real observations.
        Five graph representatives are not a statistical sample of all agent tasks.
        Relabeling tests index sensitivity rather than physical motion. No result
        authorizes NBGPocketMesh access, proves intelligence, or supports new physics.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/keyhole-transfer-r28.md"
        target="_blank" rel="noreferrer">POLY-05 protocol ↗</a>
    </div>
  </section>;
}
