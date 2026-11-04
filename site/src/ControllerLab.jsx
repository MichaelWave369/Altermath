import {useState} from 'react';
import {runController} from './controller.js';
import './controller.css';

const pct=n=>(n*100).toFixed(2)+'%';
const signed=n=>(n>=0?'+':'')+(n*100).toFixed(3)+' pp';

function download(data){
  const record={...data,exportedAt:new Date().toISOString(),
    provenance:'Altermath Rung 10, local deterministic oscillator controller'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='altermath-adaptive-controller.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function MiniPlot({samples,heading,policyStart,policyEnd}){
  const W=340,H=100;
  const last=Math.max(...samples.map(x=>x.tick),1);
  const path=samples.map((p,i)=>{
    const x=10+(p.tick/last)*(W-20);
    const y=H-10-p.order*(H-20);
    return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);
  }).join(' ');
  const xFor=t=>10+t/last*(W-20);
  const x1=xFor(policyStart),x2=xFor(policyEnd);
  return <svg className="controller-plot" viewBox={'0 0 '+W+' '+H}
    role="img" aria-label={heading+' simulated synchronization, with shaded policy-revocation interval'}>
    <rect x={x1} y="10" width={x2-x1} height={H-20} fill="#bb8c6f" opacity=".18"/>
    {[0,.5,1].map(n=><line key={n} x1="10" x2={W-10}
      y1={H-10-n*(H-20)} y2={H-10-n*(H-20)}
      stroke="currentColor" opacity=".09"/>)}
    <path d={path} fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinejoin="round" strokeLinecap="round"/>
  </svg>;
}

export default function ControllerLab(){
  const [budget,setBudget]=useState(6);
  const [count,setCount]=useState(3);
  const [seed,setSeed]=useState(369);
  const [cost,setCost]=useState(0.002);
  const [result,setResult]=useState(()=>runController());
  const [runs,setRuns]=useState(1);
  const params=result.parameters;
  const policy=result.syntheticPolicy;
  const delta=result.pairedAdaptiveVsFrozen;
  const adaptive=result.outcomes.find(x=>x.id==='adaptive');
  const conduct=()=>{
    const data=runController({budget,trainingSeeds:count,holdoutSeeds:count,
      startSeed:seed,switchCost:cost});
    setResult(data);setRuns(n=>n+1);
  };
  return <section id="controller" className="controller-section">
    <div className="section-head">
      <div><span className="micro">RUNG 10 · ADAPTIVE JUNCTION RESEARCH</span>
        <h2>Let the junctions respond to change.</h2></div>
      <p>Re-evaluate allowed cross-layer links using present-state phase information, with limited switching and explicit policy gates.</p>
    </div>
    <div className="controller-shell">
      <div className="controller-tools">
        <label>Maximum junctions<select value={budget}
          onChange={e=>setBudget(Number(e.target.value))}>
          {[0,3,6,9,12].map(v=><option key={v} value={v}>{v} of 12</option>)}
        </select></label>
        <label>Seeds per split<select value={count}
          onChange={e=>setCount(Number(e.target.value))}>
          {[3,6,9].map(v=><option key={v} value={v}>{v} train / {v} test</option>)}
        </select></label>
        <label>Starting seed<input type="number" min="-999999" max="999999" step="1"
          value={seed} onChange={e=>setSeed(Number(e.target.value))}/></label>
        <label>Switch fee<select value={cost} onChange={e=>setCost(Number(e.target.value))}>
          {[0,0.001,0.002,0.005,0.01].map(v=><option key={v} value={v}>{v.toFixed(3)}</option>)}
        </select></label>
        <button className="controller-run" type="button" onClick={conduct}>Run adaptive test</button>
        <button type="button" onClick={()=>download(result)}>Export JSON evidence</button>
      </div>
      <div className="controller-policy">
        <div><strong>Simulated Horos gate</strong>
          <span>Three junctions revoked from tick {policy.revokedFrom} to {policy.restoredAt}</span></div>
        <div><strong>Switch restrictions</strong>
          <span>Every {params.selectionEvery} ticks · max {params.maxSwaps} swaps · {params.minDwell}-tick dwell</span></div>
        <small>Run #{runs} · {params.holdoutSeeds.length} unseen seeds</small>
      </div>
      <div className="controller-kpis">
        <div><small>Adaptive minus frozen · raw coherence</small>
          <strong className={delta.meanCoherenceDelta>=0?'positive':'negative'}>{signed(delta.meanCoherenceDelta)}</strong></div>
        <div><small>Adaptive minus frozen · after switching fee</small>
          <strong className={delta.meanNetDelta>=0?'positive':'negative'}>{signed(delta.meanNetDelta)}</strong></div>
        <div><small>Holdout outcomes, cost adjusted</small>
          <strong>{delta.positive} better · {delta.negative} worse · {delta.tied} tied</strong></div>
      </div>
      <div className="controller-cases">
        {result.outcomes.map((m,i)=><article key={m.id}
          className={'controller-case '+(m.id==='adaptive'?'is-adaptive':'')}>
          <div className="controller-case-head"><b>{String(i+1).padStart(2,'0')} · {m.label}</b>
            <small>{m.category==='budgeted'?'Max-budget constrained':'Unmatched reference'}</small></div>
          <MiniPlot samples={m.sampleTrace} heading={m.label}
            policyStart={policy.revokedFrom} policyEnd={policy.restoredAt}/>
          <div className="controller-scores">
            <div><strong>{pct(m.meanOrder)}</strong><span>Mean synchronization</span></div>
            <div><strong>{pct(m.meanNetScore)}</strong><span>After switch fee</span></div>
          </div>
          <div className="controller-stats"><span>Avg links {m.averageActive.toFixed(1)}</span>
            <span>Avg activations {m.meanActivations.toFixed(1)}</span>
            <span>{m.policyViolations===0?'0 permission violations':'Policy invariant failed'}</span></div>
        </article>)}
      </div>
      <div className="controller-footer">
        <div><b>Original selected junctions</b>
          <div className="controller-tags">{result.training.selected.length?
            result.training.selected.map(id=><span key={id}>{id}</span>):
            <span>None selected</span>}</div></div>
        <div><b>Controlled experiment</b>
          <p>Adaptive, frozen, rotating, and static-shuffled cases use the same maximum budget, though active counts can differ during revocation. The shaded region marks a synthetic denied-permission interval. All measurements are mathematical oscillator results, not physical or awareness measurements.</p></div>
      </div>
    </div>
  </section>;
}
