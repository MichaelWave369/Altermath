import {useState} from 'react';
import {runBioLatticeHoldout,HOLDOUT_DEFAULTS} from './bioLatticeHoldout.js';
import {SWEEP_GRID} from './bioLatticeStudy.js';
import './bioLatticeHoldout.css';

const format=(value,digits=3)=>Number(value).toFixed(digits);
const statusLabel={
  NO_TRAIN_DIRECTION:'No direction in training',
  HOLDOUT_TIE:'Holdout returned a tie',
  DIRECTION_RETAINED:'Same sign in held-out seeds',
  DIRECTION_REVERSED:'Direction reversed on holdout'
};
const keys=Object.keys(HOLDOUT_DEFAULTS);
function stripped(params){
  return Object.fromEntries(keys.map(key=>[key,params[key]]));
}
function download(report){
  const blob=new Blob([JSON.stringify({
    ...report,exportedAt:new Date().toISOString(),
    display:'R15 held-out synthetic experiment'
  },null,2)],{type:'application/json'});
  const href=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=href;anchor.download='altermath-r15-biolattice-holdout.json';
  anchor.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
export default function BioLatticeHoldout({base}){
  const [sweepKey,setSweepKey]=useState('disorder');
  const [trainingSeeds,setTrainingSeeds]=useState(3);
  const [holdoutSeeds,setHoldoutSeeds]=useState(3);
  const [startSeed,setStartSeed]=useState(369);
  const [report,setReport]=useState(()=>runBioLatticeHoldout());
  const [runCount,setRunCount]=useState(1);
  const [error,setError]=useState('');
  const run=()=>{
    try{
      const next=runBioLatticeHoldout({
        base:stripped(base),sweepKey,trainingSeeds,holdoutSeeds,startSeed
      });
      setReport(next);setRunCount(count=>count+1);setError('');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  const selection=report.training;
  const test=report.holdout;
  return <section className="bio-holdout" aria-label="Blind holdout validation of synthetic lattice transport">
    <div className="bio-holdout-intro">
      <div><span className="micro">RUNG 15 · OUT-OF-SEED CHALLENGE</span>
        <h3>Can the result survive unseen seeds?</h3>
        <p>First select the largest training-set model difference. Freeze that parameter setting. Only then evaluate it on a separate, non-overlapping seed block. Negative results count.</p>
      </div>
      <div className="bio-holdout-design">
        <b>FROZEN EXPERIMENT</b>
        <span>Train-only selection · lowest-index ties</span>
        <span>10,003-seed holdout offset</span>
        <span>Two no-transport controls</span>
        <small>No biological measurements or consciousness claims</small>
      </div>
    </div>
    <div className="bio-holdout-controls">
      <label>Sweep parameter<select value={sweepKey} onChange={e=>setSweepKey(e.target.value)}>
        {Object.keys(SWEEP_GRID).map(key=><option key={key} value={key}>{key}</option>)}
      </select></label>
      <label>Training seeds<select value={trainingSeeds} onChange={e=>setTrainingSeeds(Number(e.target.value))}>
        {[3,6,9].map(n=><option value={n} key={n}>{n}</option>)}
      </select></label>
      <label>Holdout seeds<select value={holdoutSeeds} onChange={e=>setHoldoutSeeds(Number(e.target.value))}>
        {[3,6,9].map(n=><option value={n} key={n}>{n}</option>)}
      </select></label>
      <label>Initial seed<input type="number" min="0" max="2147473635" step="1"
        value={startSeed} onChange={e=>setStartSeed(Number(e.target.value))}/></label>
      <button className="bio-holdout-run" type="button" onClick={run}>Freeze and evaluate</button>
      <button type="button" onClick={()=>download(report)}>Export evidence JSON</button>
    </div>
    {error&&<p role="alert" className="bio-holdout-error">{error}</p>}
    <p className="bio-holdout-timestamp">Snapshot #{runCount}. Settings shown below are from the last completed run, not from unsubmitted controls. Base model: {report.input.base.rings} rings, {report.input.base.protofilaments} columns, {report.input.base.steps} steps, loss {report.input.base.loss}.</p>
    <div className="bio-holdout-flow">
      <div><span>01 · Train</span><b>{selection.seeds[0]} through {selection.seeds.at(-1)}</b><small>{selection.candidates.length} predefined grid settings</small></div>
      <div><span>02 · Freeze</span><b>{report.input.sweepKey} = {format(selection.selectedValue)}</b><small>Largest absolute mean difference, training only</small></div>
      <div><span>03 · Holdout</span><b>{test.seeds[0]} through {test.seeds.at(-1)}</b><small>One frozen setting · {test.seeds.length} unseen seeds</small></div>
    </div>
    <div className="bio-holdout-summary">
      <div><small>Training mean difference</small><strong>{format(selection.selectedMeanDelta)}</strong><span>Amplitude minus synchronous Markov</span></div>
      <div><small>Holdout mean difference</small><strong>{format(test.meanDelta)}</strong><span>Axial spread in synthetic lattice sites</span></div>
      <div><small>Resampled mean range</small><strong>{format(test.bootstrapMeanPercentileRange[0])} to {format(test.bootstrapMeanPercentileRange[1])}</strong><span>256 deterministic synthetic bootstrap samples, not a biological confidence interval</span></div>
      <div><small>Directional check</small><strong>{statusLabel[test.directionalStatus]}</strong><span>{test.pairedSeedSigns.positive} positive · {test.pairedSeedSigns.negative} negative · {test.pairedSeedSigns.ties} ties</span></div>
    </div>
    <div className="bio-holdout-tables">
      <div className="bio-holdout-tablewrap">
        <h4>Train-only candidate selection</h4>
        <table><thead><tr><th scope="col">{report.input.sweepKey}</th><th scope="col">Mean difference</th><th scope="col">Selection</th></tr></thead>
          <tbody>{selection.candidates.map((candidate,index)=><tr key={candidate.sweepValue}
            className={index===selection.selectedIndex?'bio-holdout-chosen':''}>
            <th scope="row">{format(candidate.sweepValue)}</th>
            <td>{format(candidate.meanDelta)}</td>
            <td>{index===selection.selectedIndex?'Frozen choice':'Not tested on holdout'}</td>
          </tr>)}</tbody></table>
      </div>
      <div className="bio-holdout-tablewrap">
        <h4>Held-out paired outcomes</h4>
        <table><thead><tr><th scope="col">Seed</th><th scope="col">Amplitude spread</th><th scope="col">Markov spread</th><th scope="col">Δ spread</th></tr></thead>
          <tbody>{test.perSeed.map(item=><tr key={item.seed}>
            <th scope="row">{item.seed}</th>
            <td>{format(item.axialSpread.amplitude)}</td>
            <td>{format(item.axialSpread.markov)}</td>
            <td>{format(item.amplitudeMinusMarkov)}</td>
          </tr>)}</tbody></table>
      </div>
    </div>
    <div className="bio-holdout-checks">
      {report.controls.map(control=><div key={control.name}>
        <b>{control.name==='zero_steps'?'Zero elapsed steps':'Zero coupling'}</b>
        <span>{control.passed?'Control satisfied':'CONTROL FAILURE'}</span>
        <small>Max simulated axial spread {control.maxAbsoluteSpread.toExponential(2)}</small>
      </div>)}
      <div><b>Normalization and seed separation</b><span>{report.diagnostics.disjointSeeds&&report.diagnostics.survivalMaxError<1e-9?'Checks satisfied':'CHECK FAILURE'}</span>
        <small>Max mass-budget error {report.diagnostics.survivalMaxError.toExponential(2)}</small></div>
    </div>
    <p className="bio-holdout-caution"><strong>Scope:</strong> a stable sign across held-out mathematical seeds is still a toy-model result. It is not physical validation, independent biological replication or evidence of quantum consciousness. Bootstrap ranges are descriptive resampling of artificial seed differences. The full export preserves losses, ties, controls, and all evaluated held-out seeds.</p>
  </section>;
}
