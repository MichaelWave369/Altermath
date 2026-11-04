import {useState} from 'react';
import {junctionCatalogue,runAblation} from './ablation.js';
import './ablation.css';

const catalogue=junctionCatalogue();
const signed=value=>(value>=0?'+':'')+(value*100).toFixed(3)+' pp';
function download(report){
  const content={...report,exportedAt:new Date().toISOString(),
    provenance:'Altermath Rung 8 · synthetic deterministic counterfactual'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download='altermath-junction-ablation.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ComparisonTrace({base,alternative,label}){
  const W=440,H=135;
  const asPath=data=>data.map((p,i)=>{
    const x=18+(i/Math.max(1,data.length-1))*(W-36);
    const y=H-18-Math.max(0,Math.min(1,p.coherence))*(H-36);
    return (i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);
  }).join(' ');
  return <div className="ablation-trace">
    <svg viewBox={'0 0 '+W+' '+H} role="img" aria-label={'Synchronization across the counterfactual window, baseline and '+label}>
      {[0,.5,1].map(n=><g key={n}>
        <line x1="18" x2={W-18} y1={H-18-n*(H-36)} y2={H-18-n*(H-36)} stroke="currentColor" opacity=".12"/>
        <text x="3" y={H-15-n*(H-36)} fill="currentColor" fontSize="9" opacity=".6">{n}</text>
      </g>)}
      <path d={asPath(base)} stroke="#d7b27d" strokeWidth="2.4" fill="none"/>
      <path d={asPath(alternative)} stroke="#7ee0d0" strokeWidth="2.4" fill="none"/>
    </svg>
    <div className="ablation-legend"><span><i className="baseline"/>Full network</span><span><i className="treatment"/>With junction removed</span></div>
  </div>;
}

export default function AblationLab(){
  const [startSeed,setStartSeed]=useState(369);
  const [count,setCount]=useState(3);
  const [report,setReport]=useState(()=>runAblation({seedCount:3}));
  const [selected,setSelected]=useState(catalogue[0].id);
  const [runs,setRuns]=useState(1);
  const rank=report.ranked;
  const row=rank.find(x=>x.id===selected)||rank[0];
  const trial=report.trials[0];
  const selectedCase=trial.outputs.find(x=>x.id===row.id);
  const maxMagnitude=Math.max(...rank.map(x=>Math.abs(x.meanDelta)),1e-12);
  const run=()=>{
    const result=runAblation({startSeed,seedCount:count});
    setReport(result);setRuns(x=>x+1);
  };
  return <section id="ablation" className="ablation-section">
    <div className="section-head">
      <div><span className="micro">RUNG 8 · JUNCTION COUNTERFACTUALS</span>
        <h2>What does each sixth point actually change?</h2></div>
      <p>Hold a system's history fixed. Remove one connection. Measure the difference against its unchanged twin.</p>
    </div>
    <div className="ablation-frame">
      <div className="ablation-controls">
        <label>Starting seed
          <input type="number" step="1" min="-999999" max="999999" value={startSeed}
            onChange={e=>setStartSeed(Number(e.target.value))}/>
        </label>
        <label>Paired seeds
          <select value={count} onChange={e=>setCount(Number(e.target.value))}>
            <option value={3}>3</option><option value={6}>6</option><option value={9}>9</option>
          </select>
        </label>
        <button className="ablation-run" type="button" onClick={run}>Run counterfactuals</button>
        <button type="button" onClick={()=>download(report)}>Export all evidence</button>
        <span className="ablation-run-count">Experiment #{runs}</span>
      </div>
      <div className="ablation-summary">
        <div><small>Baseline edges</small><strong>{report.baseline.activeEdges}</strong></div>
        <div><small>Measured junctions</small><strong>{report.ranked.length}</strong></div>
        <div><small>Paired trials</small><strong>{report.parameters.seedCount*13}</strong></div>
        <div><small>Horizon</small><strong>{report.parameters.horizon} ticks</strong></div>
      </div>
      <div className="ablation-layout">
        <div className="ablation-rows">
          <div className="ablation-subtitle">Single-junction removals, ranked by absolute effect</div>
          {rank.map((item,index)=>{
            const magnitude=Math.abs(item.meanDelta)/maxMagnitude*100;
            return <button type="button" key={item.id}
              className={item.id===row.id?'ablation-row selected':'ablation-row'}
              onClick={()=>setSelected(item.id)} aria-pressed={item.id===row.id}>
              <span className="ablation-rank">{String(index+1).padStart(2,'0')}</span>
              <span className="ablation-row-main">
                <span className="ablation-names">{item.label}</span>
                <span className="ablation-bar-track"><span className={item.meanDelta>=0?'positive':'negative'}
                  style={{width:Math.max(magnitude,1)+'%'}}/></span>
              </span>
              <span className={item.meanDelta>=0?'ablation-value positive':'ablation-value negative'}>{signed(item.meanDelta)}</span>
            </button>;
          })}
        </div>
        <div className="ablation-detail">
          <span className="micro">SELECTED JUNCTION · {row.id}</span>
          <h3>{row.label}</h3>
          <p>Average effect of removing this junction, across {report.parameters.seedCount} paired seeds.</p>
          <strong className={row.meanDelta>=0?'delta positive':'delta negative'}>{signed(row.meanDelta)}</strong>
          <small className="ablation-explainer">{row.meanDelta>=0?'Removal increased':'Removal reduced'} average phase synchronization in this specific model.</small>
          <div className="ablation-detail-figures">
            <div><span>Observed min to max</span><b>{signed(row.minDelta)} to {signed(row.maxDelta)}</b></div>
            <div><span>Direction counts</span><b>{row.improved} higher · {row.degraded} lower · {row.ties} tied</b></div>
          </div>
          <ComparisonTrace base={trial.baseline.trace} alternative={selectedCase.trace} label={row.label}/>
          <p className="ablation-small">Example trajectory: seed {trial.seed}. Values on the chart are synchronization R, from 0 to 1. Mean differences above are in percentage points.</p>
        </div>
      </div>
      <div className="ablation-control">
        <b>All-off reference, not single-edge matched</b>
        <span>Removing all 12 junctions: <strong>{signed(report.isolated.meanDelta)}</strong> average difference versus untouched controls.</span>
      </div>
      <p className="ablation-disclaimer">These are within-model counterfactuals, not measurements of consciousness, theology, or physical dimensionality. One-edge removal changes the endpoint degrees. A positive effect means deletion improved phase synchronization in the selected experiment; junctions are not assumed universally beneficial. Observed ranges are not confidence intervals.</p>
    </div>
  </section>;
}
