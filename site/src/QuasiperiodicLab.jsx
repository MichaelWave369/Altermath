import {useState} from 'react';
import {run} from './quasiperiodic.js';
const colors=['#a5b8ca','#8b9fdb','#e4bc84','#b9a0e1','#72c7ac','#e9958a'];
const pct=x=>(100*x).toFixed(2)+'%';
const signed=x=>(x>=0?'+':'')+(100*x).toFixed(2)+' pp';
function download(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='aqd-e0-'+data.seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function QuasiperiodicLab(){
 const [seed,setSeed]=useState(369),[qubits,setQubits]=useState(4),[noise,setNoise]=useState(.04),[trials,setTrials]=useState(3);
 const [result,setResult]=useState(null),[metric,setMetric]=useState('quantum'),[error,setError]=useState('');
 function execute(){try{setResult(run({seed,qubits,noise,trials}));setError('');}catch(e){setError(e.message);}}
 return <section id="quasiperiodic-dynamics" className="labs"><div className="section-head"><div><span className="micro">AQD-E0 · CONTROL SEQUENCE RESEARCH</span><h2>Quasiperiodic Dynamics Lab</h2></div><p>Same operations. Same budget. Different rhythm. Compare synthetic retention without assuming a Fibonacci advantage.</p></div>
 <div className="control-panel"><p>Exploratory classical and quantum toy models, not a replication of the Nature phase or a measurement of time. All six schedules use 75 A and 45 B operations over 120 dimensionless ticks.</p>
 <div className="actions"><label>Seed <input type="number" min="0" max="4294967295" value={seed} onChange={e=>setSeed(Number(e.target.value))}/></label>
 <label>Qubits <select value={qubits} onChange={e=>setQubits(Number(e.target.value))}>{[2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label>
 <label>Noise {noise.toFixed(2)} <input type="range" min="0" max=".25" step=".01" value={noise} onChange={e=>setNoise(Number(e.target.value))}/></label>
 <label>Paired trials <select value={trials} onChange={e=>setTrials(Number(e.target.value))}>{[1,3,6,9].map(n=><option key={n}>{n}</option>)}</select></label>
 <button className="primary" onClick={execute}>Run experiment</button>{result&&<button onClick={()=>download(result)}>Export evidence JSON</button>}</div>
 {error&&<p role="alert">{error}</p>}
 {result&&<><p>Recorded run: seed {result.seed} · {result.qubits} qubits · noise {result.noise} · {result.trials} trials. Results update only when rerun.</p>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',fontVariantNumeric:'tabular-nums'}}><thead><tr>{['Schedule','Edits','Quantum fidelity','vs periodic','Classical alignment','vs periodic','Noisy edge','Clean edge','Noisy interior'].map(x=><th key={x} scope="col">{x}</th>)}</tr></thead><tbody>{result.rows.map((r,i)=><tr key={r.name}><th scope="row" style={{color:colors[i]}}>{r.name}</th><td>{r.edits}</td><td>{pct(r.quantum)}</td><td>{signed(r.deltaQuantum)}</td><td>{pct(r.classical)}</td><td>{signed(r.deltaClassical)}</td><td>{pct(r.edge)}</td><td>{pct(r.edgeClean)}</td><td>{pct(r.bulk)}</td></tr>)}</tbody></table></div>
 <label>Trace metric <select value={metric} onChange={e=>setMetric(e.target.value)}>{['quantum','classical','edge','edgeClean','bulk'].map(k=><option key={k}>{k}</option>)}</select></label>
 <svg viewBox="0 0 700 245" role="img" aria-label={'Mean paired trial trace for '+metric} style={{width:'100%',maxHeight:350}}>{[0,.25,.5,.75,1].map(y=><g key={y}><line x1="45" x2="680" y1={210-180*y} y2={210-180*y} stroke="currentColor" opacity=".18"/><text x="5" y={214-180*y} fontSize="11" fill="currentColor">{y}</text></g>)}{result.rows.map((r,i)=><polyline key={r.name} fill="none" stroke={colors[i]} strokeWidth="1.7" points={r.repeats[0].map((_,t)=>(45+t*635/119)+','+(210-180*r.repeats.reduce((s,a)=>s+a[t][metric],0)/result.trials)).join(' ')}/>)}<text x="45" y="230" fill="currentColor" fontSize="11">1</text><text x="655" y="230" fill="currentColor" fontSize="11">120 ticks</text></svg>
 {result.rows.map((r,i)=><div key={r.name} style={{margin:'12px 0'}}><strong style={{color:colors[i]}}>{r.name}</strong> <small>({r.edits} count-matching edits)</small><div aria-label={r.name+' pulse sequence'} style={{display:'flex',flexWrap:'wrap',gap:1,marginTop:4}}>{[...r.word].map((c,j)=><span key={j} title={c+' at tick '+(j+1)} style={{width:5,height:13,background:c==='A'?'#72c7ac':'#e4bc84'}}/>)}</div></div>)}
 <p>A = green / X-axis pulse; B = gold / Z-axis pulse. Edits change the original grammar. Edge trace distance is an information proxy, not a topological invariant. Signed losses are retained.</p></>}
 <p><a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/quasiperiodic-dynamics-e0.md">Methods and limits ↗</a> · <a href="https://doi.org/10.1038/s41586-022-04853-4">Source paper ↗</a></p></div></section>;
}
