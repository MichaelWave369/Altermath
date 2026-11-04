import {useState} from 'react';
import {runBioLatticeStudy,SWEEP_GRID,STUDY_MODES} from './bioLatticeStudy.js';
import './bioLatticeStudy.css';

const FORMAT={
  coupling: v=>Number(v).toFixed(2),
  disorder: v=>Number(v).toFixed(2),
  loss: v=>(100*v).toFixed(1)+'%'
};
const MODE_LABELS={hopping:'Sequential hopping',amplitude:'Phase-amplitude toy',markov:'Synchronous Markov'};
const MODE_COLORS={hopping:'#72cad8',amplitude:'#ecbd80',markov:'#c2b2fb'};

function exportStudy(result){
  const payload={...result,exportedAt:new Date().toISOString(),
    provenance:'Altermath R14: deterministic synthetic paired model sweep'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='altermath-r14-biolattice-study.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function SweepPlot({report}){
  const rows=report.rows;
  const width=810,height=282,left=56,right=22,top=22,bottom=52;
  const plotW=width-left-right,plotH=height-top-bottom;
  const max=Math.max(0.25,...rows.flatMap(r=>STUDY_MODES.map(m=>r.means[m].spread)))*1.08;
  const x=i=>left+i*plotW/(rows.length-1),y=v=>top+plotH-v/max*plotH;
  return <div className="bio-study-plot">
    <svg role="img" viewBox={`0 0 ${width} ${height}`} aria-label="Comparison chart showing mean axial spread against synthetic sweep value for three transport models">
      {[0,0.25,0.5,0.75,1].map(t=><g key={t}>
        <line x1={left} x2={width-right} y1={y(max*t)} y2={y(max*t)}
          stroke="#4e6271" strokeOpacity=".4" strokeDasharray="4 7"/>
        <text x={left-12} y={y(max*t)+4} textAnchor="end" fill="#a6b7c2" fontSize="12">{(max*t).toFixed(2)}</text>
      </g>)}
      {STUDY_MODES.map(mode=><g key={mode}>
        <polyline fill="none" stroke={MODE_COLORS[mode]} strokeWidth="3"
          points={rows.map((r,i)=>`${x(i)},${y(r.means[mode].spread)}`).join(' ')}/>
        {rows.map((r,i)=><circle key={i} cx={x(i)} cy={y(r.means[mode].spread)} r="4" fill={MODE_COLORS[mode]}/>)}
      </g>)}
      {rows.map((r,i)=><text key={i} x={x(i)} y={height-22} textAnchor="middle"
        fill="#b6c6d0" fontSize="12">{FORMAT[report.parameters.sweepKey](r.sweepValue)}</text>)}
      <text x={left} y="14" fill="#c4d4dc" fontSize="12">Mean axial spread · synthetic lattice sites</text>
      <text x={width/2} y={height-4} fill="#a6bac4" fontSize="12" textAnchor="middle">{report.parameters.sweepKey} (dimensionless setting)</text>
    </svg>
  </div>;
}
export default function BioLatticeStudy({base}){
  const [sweepKey,setSweepKey]=useState('disorder');
  const [seedCount,setSeedCount]=useState(3);
  const [startSeed,setStartSeed]=useState(369);
  const [report,setReport]=useState(()=>runBioLatticeStudy());
  const [runNumber,setRunNumber]=useState(1);
  const [error,setError]=useState('');
  const run=()=>{
    try{
      const next=runBioLatticeStudy({base,sweepKey,startSeed,seedCount});
      setReport(next);setError('');setRunNumber(n=>n+1);
    }catch(e){setError(e.message);}
  };
  const label=report.parameters.sweepKey;
  return <div className="bio-study" aria-label="Deterministic multi-seed transport model comparison">
    <div className="bio-study-heading">
      <div><span className="micro">RUNG 14 · INDEPENDENT NUMERICAL BASELINE</span>
        <h3>Try to break the result.</h3>
        <p>Repeat three different transport update rules across the same seeded disorder fields. The Markov walk uses synchronous probability flow, independent of the sequential hopping and phase-amplitude gates.</p></div>
      <div className="bio-study-meta"><b>3 models × 5 conditions × N seeds</b><small>No calibrated molecular inputs · no significance claim</small></div>
    </div>
    <div className="bio-study-tools">
      <label>Sweep dimension<select value={sweepKey} onChange={e=>setSweepKey(e.target.value)}>
        {Object.keys(SWEEP_GRID).map(key=><option key={key} value={key}>{key}</option>)}
      </select></label>
      <label>Paired synthetic seeds<select value={seedCount} onChange={e=>setSeedCount(Number(e.target.value))}>
        {[3,6,9].map(n=><option key={n} value={n}>{n} seeds</option>)}
      </select></label>
      <label>Seed start<input type="number" min="0" max="2147483638" step="1" value={startSeed}
        onChange={e=>setStartSeed(Number(e.target.value))}/></label>
      <button className="bio-study-run" type="button" onClick={run}>Run paired sweep</button>
      <button type="button" onClick={()=>exportStudy(report)}>Export full JSON</button>
    </div>
    {error&&<p className="bio-study-error" role="alert">{error}</p>}
    <div className="bio-study-note">Study #{runNumber} · Locked settings: {report.parameters.seedCount} seeds starting at {report.parameters.startSeed}; {report.parameters.base.steps} steps; coupling {report.parameters.base.coupling}; disorder {report.parameters.base.disorder}; loss {report.parameters.base.loss}. Changing a control does not alter the previous result until you run the sweep again.</div>
    <div className="bio-study-legend">{STUDY_MODES.map(m=><span key={m}><i style={{background:MODE_COLORS[m]}}/>{MODE_LABELS[m]}</span>)}</div>
    <SweepPlot report={report}/>
    <div className="bio-study-table-scroll"><table className="bio-study-table">
      <thead><tr><th scope="col">{label}</th>{STUDY_MODES.map(m=><th key={m} scope="col">{MODE_LABELS[m]}</th>)}<th scope="col">Amplitude − Markov</th><th scope="col">Signed seed outcomes (+/−/=)</th></tr></thead>
      <tbody>{report.rows.map(r=><tr key={r.sweepValue}>
        <th scope="row">{FORMAT[label](r.sweepValue)}</th>
        {STUDY_MODES.map(mode=><td key={mode}>{r.means[mode].spread.toFixed(3)}</td>)}
        <td className={r.amplitudeMinusMarkovMean>=0?'bio-study-pos':'bio-study-neg'}>{r.amplitudeMinusMarkovMean.toFixed(3)}</td>
        <td>{r.pairedSeedSigns.positive}/{r.pairedSeedSigns.negative}/{r.pairedSeedSigns.ties}</td>
      </tr>)}</tbody>
    </table></div>
    <div className="bio-study-verification">
      <span><strong>{report.diagnostics.comparisons}</strong> matched seed/condition cases</span>
      <span><strong>{report.diagnostics.maxSurvivalError.toExponential(2)}</strong> max synthetic mass-budget error</span>
      <span><strong>{report.diagnostics.uniqueSeeds}</strong> distinct seeds reused across all conditions</span>
    </div>
    <p className="bio-study-warning"><strong>Interpretation boundary:</strong> the model comparison tests numerical assumptions, not cells. Shared seeds are paired synthetic controls, not independent experiments. A divergence does not prove superradiance, quantum coherence in biology, or awareness. Negative and tied results are retained in the export.</p>
  </div>;
}
