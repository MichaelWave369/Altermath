import {useMemo,useState} from 'react';
import {simulateBioLattice} from './bioLattice.js';
import './bioLattice.css';

const FIELDS=[
  {key:'coupling',name:'Nearest-neighbor coupling',min:0,max:1,step:0.02},
  {key:'disorder',name:'Static lattice disorder',min:0,max:1,step:0.02},
  {key:'loss',name:'Loss per step',min:0,max:0.06,step:0.002},
  {key:'steps',name:'Simulation steps',min:0,max:100,step:1},
];
const INITIAL={coupling:.38,disorder:.15,loss:.008,steps:32,seed:369,rings:18,protofilaments:13};
const fmt=(n,d=2)=>Number(n).toFixed(d);
function Lattice({run,title,tag}){
  const {rings,protofilaments}=run.parameters;
  const w=548,h=312,padX=16,padY=13,cellW=(w-2*padX)/rings,cellH=(h-2*padY)/protofilaments;
  const mx=Math.max(...run.probabilities,1e-8);
  return <div className="bio-visual">
    <div className="bio-visual-head"><h4>{title}</h4><span>{tag}</span></div>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${title}: unwrapped 13-row microtubule-inspired lattice, colors indicate probability by node`}>
      {run.probabilities.map((p,i)=>{
        const ring=Math.floor(i/protofilaments),proto=i%protofilaments;
        const intensity=Math.sqrt(Math.max(0,p/mx));
        return <rect key={i} x={padX+ring*cellW+1.2} y={padY+proto*cellH+1.2}
          width={cellW-2.4} height={cellH-2.4} rx="2"
          fill={run.mode==='hopping'?'#58c9d1':'#e8b575'}
          fillOpacity={0.055+intensity*.93}/>;
      })}
      <path d={`M ${padX+2.5*cellW} 8 V ${h-8}`} stroke="#fff" strokeOpacity=".5" strokeDasharray="3 4"/>
      <text x={padX+3*cellW} y="9" fill="#d5e0e9" fontSize="9">pulse</text>
      <text x={w-5} y={h-3} textAnchor="end" fill="#98aaba" fontSize="9">axial sites →</text>
    </svg>
    <div className="bio-numbers">
      <div><small>Axial spread</small><b>{fmt(run.metrics.axialSpreadSites)} sites</b></div>
      <div><small>Remaining population</small><b>{fmt(100*run.metrics.survival,1)}%</b></div>
      <div><small>Effective occupied sites</small><b>{fmt(run.metrics.effectiveSites,1)}</b></div>
    </div>
  </div>;
}
function saveRun(data){
  const url=URL.createObjectURL(new Blob([JSON.stringify({
    schema:'altermath.bio-lattice.comparison.v1',generatedAt:new Date().toISOString(),...data
  },null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='bio-lattice-comparison.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function BioLatticeLab(){
  const [params,setParams]=useState(INITIAL);
  const compared=useMemo(()=>({
    hopping:simulateBioLattice({...params,mode:'hopping'}),
    amplitude:simulateBioLattice({...params,mode:'amplitude'})
  }),[params]);
  const change=(key,value)=>setParams(p=>({...p,[key]:value}));
  return <section className="bio-lab" id="bio-lattice" aria-label="Microtubule-inspired optical lattice lab">
    <div className="bio-head">
      <div><span className="micro">NEW LAB · OPTICAL LATTICE / R13</span>
        <h2>Biological geometry.<br/><em>Testable transport.</em></h2>
        <p>A microtubule-inspired cylindrical grid, shown unwrapped. Compare a classical population-hopping process with an idealized, phase-sensitive amplitude process under the same seeded topology and controls.</p>
      </div>
      <div className="bio-reference"><strong>Research anchor</strong><span>2023: energy migration in microtubules, ~6.6 nm experimental diffusion length.</span><span>2024: theoretical ultraviolet superradiance with fluorescence observations in tryptophan networks.</span><small>Those papers do NOT calibrate this simulator. It is neither a quantum-electrodynamics solver nor evidence of consciousness.</small></div>
    </div>
    <div className="bio-controls">
      {FIELDS.map(f=><label key={f.key} className="bio-slider">
        <span>{f.name}<b>{params[f.key]}{f.key==='loss'?' / step':''}</b></span>
        <input aria-label={f.name} type="range" min={f.min} max={f.max} step={f.step} value={params[f.key]}
          onChange={e=>change(f.key,Number(e.target.value))}/>
      </label>)}
      <label className="bio-seed">Deterministic seed
        <input type="number" min="0" max="2147483647" value={params.seed} onChange={e=>{const n=Number(e.target.value);if(Number.isSafeInteger(n)&&n>=0&&n<=2147483647)change('seed',n);}}/>
      </label>
      <div className="bio-buttons"><button type="button" onClick={()=>setParams(INITIAL)}>Reset</button>
        <button type="button" onClick={()=>saveRun({parameters:params,...compared})}>Export both runs · JSON</button></div>
    </div>
    <div className="bio-side-by-side">
      <Lattice run={compared.hopping} title="Classical transport" tag="Population exchange gates"/>
      <Lattice run={compared.amplitude} title="Coherent toy model" tag="Unitary pair gates + static phases"/>
    </div>
    <div className="bio-footnote">
      <strong>How to read this:</strong> Brighter cells mean higher excitation probability. Axial spread is dimensionless lattice sites, not nanometers. Unitary gates preserve total probability before the selected loss term; no claim is made that microtubules perform these exact gates, carry classical data, or produce awareness. Disorder is a simplified site-phase model, not a measured molecular parameter.
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/bio-lattice-research.md" target="_blank" rel="noreferrer">Research method and sources ↗</a>
    </div>
  </section>;
}
