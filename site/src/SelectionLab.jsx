import {useState} from 'react';
import {runSelection} from './selection.js';
import './selection.css';

const signed=v=>(v>=0?'+':'')+(100*v).toFixed(3)+' pp';

function exportJson(data){
  const record={...data,exportedAt:new Date().toISOString(),
    provenance:'Altermath Rung 9 · synthetic deterministic training/holdout evidence'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='altermath-junction-selection.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Curve({samples,label}){
  const w=340,h=84;
  const points=samples.map((p,i)=>{
    const x=9+i*(w-18)/Math.max(1,samples.length-1);
    const y=h-9-p.order*(h-18);
    return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);
  }).join(' ');
  return <svg className="selection-curve" viewBox={'0 0 '+w+' '+h} role="img" aria-label={label+' synchronization trajectory from 0 to 1'}>
    {[0,.5,1].map(k=><line key={k} x1="9" x2={w-9} y1={h-9-k*(h-18)}
      y2={h-9-k*(h-18)} stroke="currentColor" opacity=".1"/>)}
    <path d={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>;
}

export default function SelectionLab(){
  const [budget,setBudget]=useState(6);
  const [seed,setSeed]=useState(369);
  const [count,setCount]=useState(3);
  const [report,setReport]=useState(()=>runSelection({trainingSeeds:3,holdoutSeeds:3}));
  const [runId,setRunId]=useState(1);
  const params=report.parameters;
  const comparison=report.pairedComparison;
  const run=()=>{
    const next=runSelection({startSeed:seed,trainingSeeds:count,holdoutSeeds:count,budget});
    setReport(next);setRunId(n=>n+1);
  };
  return <section className="selection-section" id="selection">
    <div className="section-head"><div>
      <span className="micro">RUNG 9 · CONNECTION BUDGETS</span>
      <h2>Can the network choose which junctions to keep?</h2>
    </div><p>Learn connection priorities from one set of worlds, then test against entirely different seeded worlds.</p></div>
    <div className="selection-shell">
      <div className="selection-toolbar">
        <label>Connection budget
          <select value={budget} onChange={e=>setBudget(Number(e.target.value))}>
            {[0,3,6,9,12].map(n=><option key={n} value={n}>{n} of 12 links</option>)}
          </select>
        </label>
        <label>Training seed
          <input type="number" min="-999999" max="999999" step="1"
            value={seed} onChange={e=>setSeed(Number(e.target.value))}/>
        </label>
        <label>Seeds per split
          <select value={count} onChange={e=>setCount(Number(e.target.value))}>
            {[3,6,9].map(n=><option value={n} key={n}>{n} train / {n} holdout</option>)}
          </select>
        </label>
        <button type="button" className="selection-primary" onClick={run}>Train & test</button>
        <button type="button" onClick={()=>exportJson(report)}>Export research JSON</button>
      </div>
      <div className="selection-partition">
        <div><small>Training seeds</small><strong>{params.startSeed} to {params.startSeed+params.trainingSeeds-1}</strong></div>
        <span className="selection-separator">→ LOCK SELECTION →</span>
        <div><small>Unseen holdout seeds</small><strong>{params.holdoutStart} to {params.holdoutStart+params.holdoutSeeds-1}</strong></div>
        <span className="selection-run">Run #{runId}</span>
      </div>
      <div className="selection-headline">
        <div><small>Learned vs seeded shuffle · matched budget</small>
          <strong className={comparison.meanDelta>=0?'positive':'negative'}>{signed(comparison.meanDelta)}</strong>
          <span>Paired difference in mean phase synchronization</span>
        </div>
        <div><small>Holdout comparisons</small>
          <strong>{comparison.positive} higher · {comparison.negative} lower · {comparison.ties} ties</strong>
          <span>Observed outcomes, not statistical confidence</span>
        </div>
      </div>
      <div className="selection-outcomes">
        {report.outcomes.map((item,i)=><article key={item.id} className={'selection-case '+(item.id==='learned'?'learned':'')}>
          <div className="selection-case-top"><b>{String(i+1).padStart(2,'0')} · {item.label}</b>
            <small>{item.category==='budget-matched'?'Matched link budget':'Unmatched reference'}</small></div>
          <Curve samples={item.exampleTrace} label={item.label}/>
          <div className="selection-grade"><strong>{(100*item.meanOrder).toFixed(2)}%</strong><span>mean holdout sync</span></div>
          <div className="selection-track"><i style={{width:(100*item.meanOrder)+'%'}}/></div>
          <footer>{item.activeJunctions} active junctions · {item.trials.length} held-out trials</footer>
        </article>)}
      </div>
      <div className="selection-chosen">
        <div><strong>Selected sixth-point junctions</strong><p>The rule keeps the {params.budget} links whose removal most reduced training coherence. This is a heuristic, not an optimality guarantee.</p></div>
        <div className="selection-chip-list">{report.training.selected.length===0?
          <span className="selection-empty">No cross-layer links selected</span>:
          report.training.selected.map(id=><span key={id} className="selection-chip">{id}</span>)}</div>
      </div>
      <p className="selection-disclaimer">All five simulations start from matched states within each holdout seed. Three methods use exactly the same junction count; full and off deliberately use different budgets. The rule trains offline, makes a fixed choice, and is not a live authorization system. Measurements concern oscillator synchronization, not consciousness, physics, or theology.</p>
    </div>
  </section>;
}
