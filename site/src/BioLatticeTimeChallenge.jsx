import {useState} from 'react';
import {
  runTimeChallenge,CHALLENGE_TIME_GRID,CHALLENGE_THRESHOLD
} from './bioLatticeTimeChallenge.js';
import './bioLatticeTimeChallenge.css';

const fmt=(n,d=3)=>Number(n).toFixed(d);
const colors={amplitude:'#edc17e',hopping:'#83cedb',markov:'#b9b0ff'};
const modes=[['amplitude','Phase-amplitude toy'],['hopping','Sequential hopping'],
  ['markov','Synchronous Markov']];
function exportReport(data){
  const url=URL.createObjectURL(new Blob([JSON.stringify({
    ...data,exportedAt:new Date().toISOString(),
    exportKind:'synthetic_protocol_and_observation_report'
  },null,2)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download='altermath-r18-time-challenge.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function TimePlot({report}){
  const rows=report.training.series;
  const w=770,h=260,left=54,right=19,top=27,bottom=41;
  const pw=w-left-right,ph=h-top-bottom;
  const maximum=Math.max(0.01,...rows.flatMap(row=>
    [row.meanAmplitude,row.meanHopping,row.meanMarkov]))*1.09;
  const x=t=>left+(t/CHALLENGE_TIME_GRID.at(-1))*pw;
  const y=v=>top+ph*(1-v/maximum);
  const selected=report.training.selectedTime;
  const pts=key=>rows.map(r=>x(r.steps)+','+y(r[key])).join(' ');
  return <div className="bio-time-chart">
    <svg role="img" aria-label="Training-only synthetic time series for three mathematical transport modes"
      viewBox={'0 0 '+w+' '+h}>
      {[0,.25,.5,.75,1].map(t=><g key={t}>
        <line x1={left} x2={w-right} y1={y(t*maximum)} y2={y(t*maximum)}
          stroke="#526776" strokeOpacity=".45" strokeDasharray="4 5"/>
        <text x={left-10} y={y(t*maximum)+3} fill="#b5c7cf"
          fontSize="11" textAnchor="end">{(t*maximum).toFixed(1)}</text>
      </g>)}
      <line x1={x(selected)} x2={x(selected)} y1={top} y2={top+ph}
        stroke="#f0bb78" strokeWidth="2" strokeDasharray="5 3"/>
      {modes.map(([key])=><g key={key}>
        <polyline points={pts('mean'+key[0].toUpperCase()+key.slice(1))}
          fill="none" stroke={colors[key]} strokeWidth="2.5"/>
        {rows.map(row=><circle key={row.steps} cx={x(row.steps)}
          cy={y(row['mean'+key[0].toUpperCase()+key.slice(1)])}
          r="3.5" fill={colors[key]}/>)}
      </g>)}
      {rows.map(row=><text key={row.steps} x={x(row.steps)} y={h-14}
        textAnchor="middle" fill="#b4c5ce" fontSize="11">{row.steps}</text>)}
      <text x={left} y="13" fill="#b8cdd4" fontSize="11">Mean training-only metric</text>
      <text x={w-18} y={h-14} fill="#d9bd8c" textAnchor="end"
        fontSize="10">synthetic ticks</text>
    </svg>
  </div>;
}
const statuses={
  DIRECTION_RETAINED:'Same direction on unseen seeds',
  DIRECTION_REVERSED:'Direction reversed on unseen seeds',
  HOLDOUT_TIE:'Held-out mean is tied',
  NO_TRAIN_DIRECTION:'No training direction to test'
};
export default function BioLatticeTimeChallenge({base}){
  const [metric,setMetric]=useState('axialSpreadSites');
  const [baseline,setBaseline]=useState('markov');
  const [trainingSeeds,setTrainingSeeds]=useState(3);
  const [holdoutSeeds,setHoldoutSeeds]=useState(3);
  const [startSeed,setStartSeed]=useState(369);
  const [report,setReport]=useState(()=>runTimeChallenge());
  const [runNumber,setRunNumber]=useState(1);
  const [error,setError]=useState('');
  const execute=()=>{
    try{
      const next=runTimeChallenge({base,metric,baseline,trainingSeeds,
        holdoutSeeds,startSeed});
      setReport(next);setRunNumber(n=>n+1);setError('');
    }catch(e){setError(e.message);}
  };
  return <section className="bio-time" aria-label="R18 synthetic model discrimination and predeclared holdout">
    <div className="bio-time-head">
      <div><span className="micro">RUNG 18 · FALSIFIABLE NUMERICAL COMPARISON</span>
        <h3>Which model disagrees, and when?</h3>
        <p>Compare three toy transport models across seven observation times.
          Select the largest amplitude-versus-baseline difference from training
          seeds, freeze that one time, then challenge it on disjoint holdout seeds.</p>
      </div>
      <aside><b>NO PHYSICAL CALIBRATION</b>
        <span>Model ticks are not experimentally measured time.</span>
        <span>Metrics are dimensionless synthetic outputs.</span>
        <small>Software-fixed protocol, not independently preregistered.</small>
      </aside>
    </div>
    <div className="bio-time-controls">
      <label>Comparison metric<select value={metric} onChange={setMetricOrEvent=>
        setMetric(setMetricOrEvent.target.value)}>
        <option value="axialSpreadSites">Axial spread (sites)</option>
        <option value="effectiveSites">Effective occupied sites</option>
      </select></label>
      <label>Compare amplitude against<select value={baseline} onChange={e=>setBaseline(e.target.value)}>
        <option value="markov">Synchronous Markov</option>
        <option value="hopping">Sequential hopping</option>
      </select></label>
      <label>Training seeds<select value={trainingSeeds} onChange={e=>setTrainingSeeds(Number(e.target.value))}>
        {[3,6,9].map(n=><option key={n} value={n}>{n}</option>)}
      </select></label>
      <label>Holdout seeds<select value={holdoutSeeds} onChange={e=>setHoldoutSeeds(Number(e.target.value))}>
        {[3,6,9].map(n=><option key={n} value={n}>{n}</option>)}
      </select></label>
      <label>Starting seed<input type="number" step="1" min="0" max="2147463627"
        value={startSeed} onChange={e=>setStartSeed(Number(e.target.value))}/></label>
      <button type="button" className="bio-time-go" onClick={execute}>Freeze and challenge</button>
      <button type="button" onClick={()=>exportReport(report)}>Export full JSON</button>
    </div>
    {error&&<p className="bio-time-error" role="alert">{error}</p>}
    <p className="bio-time-note">Snapshot #{runNumber}. The chart shows training seeds
      only. The held-out block is evaluated at just one frozen time and is never
      used to select the observation time. Changing controls does not modify the
      previous snapshot until you run again.</p>
    <div className="bio-time-legend">{modes.map(([key,label])=>
      <span key={key}><i style={{background:colors[key]}}/>{label}</span>)}</div>
    <TimePlot report={report}/>
    <div className="bio-time-stats">
      <div><small>Frozen observation</small><strong>{report.training.selectedTime} ticks</strong>
        <span>Selected by largest absolute training mean difference</span></div>
      <div><small>Training paired difference</small><strong>{fmt(report.training.selectedMeanDifference)}</strong>
        <span>Amplitude minus {report.protocol.baseline}, {report.protocol.metric}</span></div>
      <div><small>Held-out paired difference</small><strong>{fmt(report.holdout.meanDifference)}</strong>
        <span>{statuses[report.holdout.directionalStatus]}</span></div>
      <div><small>Predeclared numerical gap floor</small><strong>{CHALLENGE_THRESHOLD}</strong>
        <span>{report.holdout.thresholdMet?'Magnitude reached':'Magnitude not reached'}.
          Synthetic criterion only</span></div>
    </div>
    <div className="bio-time-grids">
      <div className="bio-time-overflow">
        <h4>Training-only selection table</h4>
        <table><thead><tr><th scope="col">Time</th>
          <th scope="col">Mean amplitude</th><th scope="col">Mean baseline</th>
          <th scope="col">Paired gap</th></tr></thead>
          <tbody>{report.training.series.map((r,i)=><tr key={r.steps}
            className={i===report.training.selectedIndex?'bio-time-selected':''}>
            <th scope="row">{r.steps}</th><td>{fmt(r.meanAmplitude)}</td>
            <td>{fmt(r.meanBaseline)}</td><td>{fmt(r.meanDifference)}</td>
          </tr>)}</tbody></table>
      </div>
      <div className="bio-time-overflow">
        <h4>Unseen seeds at frozen time only</h4>
        <table><thead><tr><th scope="col">Seed</th><th scope="col">Amplitude</th>
          <th scope="col">Baseline</th><th scope="col">Paired gap</th></tr></thead>
          <tbody>{report.holdout.perSeed.map(r=><tr key={r.seed}>
            <th scope="row">{r.seed}</th><td>{fmt(r.amplitude)}</td>
            <td>{fmt(r.baseline)}</td><td>{fmt(r.difference)}</td>
          </tr>)}</tbody></table>
      </div>
    </div>
    <div className="bio-time-checks">
      {report.controls.map(c=><div key={c.id}><b>{c.id.replaceAll('_',' ')}</b>
        <span>{c.passed?'Invariant satisfied':'INVARIANT FAILED'}</span>
        <small>Max paired gap {c.maxAbsoluteGap.toExponential(2)}</small></div>)}
      <div><b>Holdout separation / survival</b>
        <span>{report.diagnostics.seedsDisjoint&&report.diagnostics.maxSurvivalError<1e-9?
          'Checks satisfied':'CHECK FAILED'}</span>
        <small>Mass-budget error {report.diagnostics.maxSurvivalError.toExponential(2)}</small>
      </div>
    </div>
    <p className="bio-time-warning"><strong>Meaning:</strong> even a held-out success
      would only show a reproducible difference between invented mathematical
      update rules on simulated graphs. It is not a laboratory measurement,
      physical detectability threshold, independently preregistered experiment,
      QED result, or evidence of consciousness. Actual model discrimination
      requires independent, calibrated observables and measurement uncertainties.</p>
  </section>;
}
