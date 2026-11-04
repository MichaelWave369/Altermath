import {useState} from 'react';
import {runBenchmark} from './experiments.js';
import './experiment.css';

function saveJson(data){
  const exportRecord={...data,generatedAt:new Date().toISOString(),
    origin:'Altermath Live Rung 7 · local synthetic experiment'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(exportRecord,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='altermath-threefold-benchmark.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Trend({points}){
  const W=320,H=70;
  const d=points.map((p,i)=>(i?'L':'M')+(8+(i/Math.max(1,points.length-1))*(W-16)).toFixed(1)+' '+(H-8-(p.order*(H-16))).toFixed(1)).join(' ');
  return <svg viewBox={'0 0 '+W+' '+H} role="img" aria-label="Synchronization over simulation time, from zero to one">
    <line x1="8" y1="8" x2="312" y2="8" stroke="currentColor" opacity=".1"/>
    <line x1="8" y1="62" x2="312" y2="62" stroke="currentColor" opacity=".16"/>
    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>;
}

export default function ExperimentLab(){
  const [seed,setSeed]=useState(369);
  const [count,setCount]=useState(3);
  const [report,setReport]=useState(()=>runBenchmark({seedCount:3}));
  const [completed,setCompleted]=useState(1);
  const conduct=()=>{
    const next=runBenchmark({startSeed:seed,seedCount:count});
    setReport(next);setCompleted(x=>x+1);
  };
  const p=report.parameters;
  return <section className="experiment" id="experiments">
    <div className="section-head">
      <div><span className="micro">RUNG 7 · REPEATABLE EXPERIMENTS</span>
        <h2>Test the sixth-point relationships.</h2></div>
      <p>Identical seeded states, equal-degree network alternatives, a scheduled disturbance, and measured outcomes.</p>
    </div>
    <div className="exp-frame">
      <div className="exp-tools">
        <label>Starting seed
          <input type="number" min="-999999" max="999999" step="1" value={seed}
            onChange={e=>setSeed(Number(e.target.value))}/>
        </label>
        <label>Seeded trials per topology
          <select value={count} onChange={e=>setCount(Number(e.target.value))}>
            <option value={3}>3</option><option value={6}>6</option><option value={9}>9</option>
          </select>
        </label>
        <button className="primary" onClick={conduct}>Run comparison</button>
        <button onClick={()=>saveJson(report)}>Export complete report</button>
      </div>
      <div className="exp-meta">
        <span>Run #{completed}</span><span>{p.seedCount} seeds × 4 scenarios</span>
        <span>Fault tick {p.faultAt} · Junction repair tick {p.repairAt}</span>
      </div>
      <div className="exp-results">
        {report.scenarios.map((s,i)=><div key={s.id} className="exp-case">
          <div className="exp-case-title"><b>{String(i+1).padStart(2,'0')} · {s.label}</b>
            <small>{s.category==='matched'?'Matched degrees + edges':'Isolation control; fewer active edges'}</small></div>
          <div className="exp-chart"><Trend points={s.sampleTrace}/></div>
          <div className="exp-order"><strong>{(s.meanFinalOrder*100).toFixed(1)}%</strong><span>mean final sync</span></div>
          <div className="exp-track"><div style={{width:(s.meanFinalOrder*100).toFixed(2)+'%'}}/></div>
          <div className="exp-facts"><span>{s.activeCrossEdges} active cross links</span>
            <span>{s.recoveryCount}/{p.seedCount} recovered</span>
            <span>Mean recovery: {s.meanRecoveryTicks===null?'not reached':s.meanRecoveryTicks.toFixed(1)+' ticks'}</span>
          </div>
        </div>)}
      </div>
      <p className="exp-note">Recovery is defined as synchronization reaching at least 90% of its pre-fault value after reopening. Rewiring keeps all 18 node degrees and 30 edges unchanged, but the isolated control has fewer active edges. Synchronization is a mathematical metric, not a measure of awareness or spiritual truth.</p>
    </div>
  </section>;
}
