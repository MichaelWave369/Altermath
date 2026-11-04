import {useState} from 'react';
import {runRobustness} from './robustness.js';
import './robustness.css';

const format=number=>(number>=0?'+':'')+(number*100).toFixed(3)+' pp';
const opponents=[
  {id:'adaptiveVsFrozen',label:'Frozen trained'},
  {id:'adaptiveVsRotating',label:'Rotating priority'},
  {id:'adaptiveVsShuffled',label:'Static shuffled'}
];
function exportReport(data){
  const record={...data,exportedAt:new Date().toISOString(),
    provenance:'Altermath Rung 11: fixed-selection deterministic stress study'};
  const url=URL.createObjectURL(new Blob(
    [JSON.stringify(record,null,2)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download='altermath-r11-robustness.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const average=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;

export default function RobustnessLab(){
  const [budget,setBudget]=useState(6);
  const [seed,setSeed]=useState(369);
  const [count,setCount]=useState(3);
  const [opponent,setOpponent]=useState('adaptiveVsFrozen');
  const [report,setReport]=useState(()=>runRobustness());
  const [attempt,setAttempt]=useState(1);
  const run=()=>{
    const r=runRobustness({budget,startSeed:seed,trainingSeeds:count,holdoutSeeds:count});
    setReport(r);setAttempt(n=>n+1);
  };
  const scenarios=report.scenarios;
  const selectedLabel=opponents.find(x=>x.id===opponent).label;
  const defaultFee=report.switchFees[1];
  const byFee=report.switchFees.map(fee=>{
    const differences=scenarios.map(s=>s.costs.find(c=>c.fee===fee)[opponent].meanDelta);
    return {fee,average:average(differences),
      favorable:differences.filter(d=>d>1e-12).length,
      adverse:differences.filter(d=>d < -1e-12).length,
      tied:differences.filter(d=>Math.abs(d)<=1e-12).length};
  });
  const summary=byFee[1];
  const worst=scenarios.reduce((best,item)=>{
    const value=item.costs.find(c=>c.fee===defaultFee)[opponent].meanDelta;
    return !best || value<best.value?{name:item.label,value}:best;
  },null);
  return <section id="robustness" className="robustness-section">
    <div className="section-head">
      <div><span className="micro">RUNG 11 · CONTROLLER STRESS TEST</span>
        <h2>Can the sixth-point controller survive a change of conditions?</h2></div>
      <p>The same trained links face five independent stress profiles. No retraining between tests, no hidden favorable-case selection.</p>
    </div>
    <div className="robustness-panel">
      <div className="robustness-controls">
        <label>Starting junction budget<select value={budget}
          onChange={e=>setBudget(Number(e.target.value))}>
          {[0,3,6,9,12].map(x=><option value={x} key={x}>{x} of 12</option>)}
        </select></label>
        <label>Training seed<input type="number" step="1" min="-999999" max="999999"
          value={seed} onChange={e=>setSeed(Number(e.target.value))}/></label>
        <label>Seeds per split<select value={count}
          onChange={e=>setCount(Number(e.target.value))}>
          {[3,6,9].map(x=><option value={x} key={x}>{x} train / {x} test</option>)}
        </select></label>
        <label>Compare against<select value={opponent} onChange={e=>setOpponent(e.target.value)}>
          {opponents.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
        </select></label>
        <button className="robustness-run" onClick={run} type="button">Run stress matrix</button>
        <button type="button" onClick={()=>exportReport(report)}>Export full JSON</button>
      </div>
      <div className="robustness-metadata">
        <span>Run #{attempt}</span>
        <span>{report.setup.trainingSeeds.length} train / {report.setup.holdoutSeeds.length} unseen seeds</span>
        <span>{report.selection.fixedStartingJunctions.length} links selected once</span>
        <span>5 stress profiles × 3 switching fees</span>
      </div>
      <div className="robustness-headline">
        <div><small>Across-profile mean vs {selectedLabel}</small>
          <strong className={summary.average>=0?'positive':'negative'}>{format(summary.average)}</strong>
          <span>Fee: 0.002 units per voluntary activation</span></div>
        <div><small>Scenarios at the reference switching fee</small>
          <strong>{summary.favorable} improved · {summary.adverse} worse · {summary.tied} tied</strong>
          <span>Not a confidence interval or proof of broad advantage</span></div>
        <div><small>Worst observed stress profile</small><strong>{worst.name}</strong>
          <span>{format(worst.value)} vs {selectedLabel}</span></div>
      </div>
      <div className="robustness-matrix-scroll">
        <table className="robustness-matrix">
          <thead><tr><th scope="col">Stress profile</th>
            {report.switchFees.map(fee=><th key={fee} scope="col">
              Switch fee {fee.toFixed(3)}</th>)}</tr></thead>
          <tbody>
            {scenarios.map(s=><tr key={s.id}>
              <th scope="row"><strong>{s.label}</strong>
                <small>Gain {s.gain.toFixed(1)} · denial {s.revocationStart}–{s.revocationEnd}</small>
                <small>{s.change}</small></th>
              {s.costs.map(c=>{
                const d=c[opponent];
                return <td key={c.fee} className={d.meanDelta>=0?'rb-positive':'rb-negative'}>
                  <strong>{format(d.meanDelta)}</strong>
                  <small>{d.positive} better · {d.negative} worse · {d.tied} ties</small>
                </td>;
              })}</tr>)}
          </tbody>
          <tfoot><tr><th scope="row">Mean across profiles</th>
            {byFee.map(s=><td key={s.fee} className={s.average>=0?'rb-positive':'rb-negative'}>
              <strong>{format(s.average)}</strong>
              <small>{s.favorable} favorable / {s.adverse} adverse</small>
            </td>)}</tr></tfoot>
        </table>
      </div>
      <div className="robustness-tail">
        <div><b>Locked trained junctions</b><div className="robustness-tags">
          {report.selection.fixedStartingJunctions.length?
            report.selection.fixedStartingJunctions.map(id=><span key={id}>{id}</span>):
            <span>No links selected</span>}</div></div>
        <div><b>What these results do and don't say</b>
          <p>Each cell is the signed mean difference in oscillator phase coherence after an illustrative switching fee. Favorable and adverse outcomes are both shown. The same synthetic permission gate applies to every control, and the selection is never retrained between profiles. The Aero-Alter physics stations are independent of this experiment.</p></div>
      </div>
    </div>
  </section>;
}
