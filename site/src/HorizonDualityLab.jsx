import {useMemo,useState} from 'react';
import {runHorizonStudy} from './horizonDuality.js';
import './horizonDuality.css';

function exportJSON(record){
  const blob=new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='altermath-r22-horizon-duality.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function fmt(value,digits=9){return value.toFixed(digits);}
function Diagram({a,step}){
  const y=t=>180-140*t;
  return <svg viewBox="0 0 480 360" className="r22-svg" role="img"
    aria-label="Kruskal diagram with a future black-hole region above, past white-hole region below, two exteriors left and right, and time-reversed experiment points. Not a physical bounce.">
    <rect width="480" height="360" rx="14" fill="#07141e"/>
    <path d="M240 180L90 30H390Z" fill="#d87566" fillOpacity=".15"/>
    <path d="M240 180L90 330H390Z" fill="#73c8bf" fillOpacity=".15"/>
    <path d="M240 180L90 30V330Z M240 180L390 30V330Z" fill="#bac9db" fillOpacity=".06"/>
    <path d="M90 30L390 330M90 330L390 30" stroke="#d9be82" strokeWidth="1.8"/>
    <path d="M240 22V338 M70 180H410" stroke="#a5b7bd" strokeOpacity=".44" strokeDasharray="4 5"/>
    <path d="M161 24 Q240 63 319 24 M161 336 Q240 297 319 336" fill="none" stroke="#e58d7e" strokeWidth="3" strokeDasharray="5 4"/>
    <g fill="#e9f4f4" fontSize="11" textAnchor="middle">
      <text x="240" y="84">II · BLACK</text>
      <text x="240" y="281">IV · WHITE</text>
      <text x="123" y="174">III</text>
      <text x="357" y="174">I</text>
    </g>
    <g fill="#c0cfdb" fontSize="10"><text x="250" y="23">T ↑</text><text x="414" y="173">X →</text>
      <text x="17" y="345">HORIZONS: T = ±X</text>
      <text x="365" y="345">r=0 · boundary</text>
    </g>
    <line x1="240" y1={y(a)} x2="240" y2={y(a+step)} stroke="#ed907d" strokeWidth="3" strokeLinecap="round"/>
    <line x1="240" y1={y(-a)} x2="240" y2={y(-a+step)} stroke="#8de2d1" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="240" cy={y(a)} r="7" fill="#f7a292" stroke="#ffffff" strokeWidth="1.4"/>
    <circle cx="240" cy={y(-a)} r="7" fill="#91ead8" stroke="#ffffff" strokeWidth="1.4"/>
    <text x="253" y={y(a)-7} fontSize="11" fill="#ffb9a8">T=+{a.toFixed(2)}</text>
    <text x="253" y={y(-a)+15} fontSize="11" fill="#9cf4dc">T=−{a.toFixed(2)}</text>
  </svg>;
}
function Stat({label,value,detail}){
  return <div className="r22-stat"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
}
export default function HorizonDualityLab(){
  const [mass,setMass]=useState(1);
  const [a,setA]=useState(.2);
  const [step,setStep]=useState(.01);
  const [eta,setEta]=useState(.4);
  const report=useMemo(()=>runHorizonStudy({M:mass,a,step,eta}),[mass,a,step,eta]);
  return <section className="r22-lab" id="horizon-duality" aria-labelledby="r22-title">
    <div className="r22-header">
      <div><div className="micro">RUNG 22 · CLASSICAL GENERAL RELATIVITY</div>
        <h2 id="r22-title">Horizon Duality <em>Laboratory</em></h2>
        <p>Same areal radius. Same scalar curvature. Different future-directed radial change
           on two specified time-reversed interior curves. Test the information discarded by a coarse projection.</p></div>
      <span className="r22-badge">EXACT SCHWARZSCHILD · NO BOUNCE</span>
    </div>
    <div className="r22-layout">
      <div className="r22-chart">
        <Diagram a={a} step={step}/>
        <p className="r22-note">Schematic Kruskal causal sectors. Points are compared, not connected by a trajectory.
          The dashed r=0 boundaries are schematic, not to scale.</p>
      </div>
      <div className="r22-control">
        <h3>Predeclared paired-state test</h3>
        <label>Mass M <output>{mass.toFixed(2)}</output>
          <input type="range" min=".5" max="4" step=".1" value={mass} onChange={e=>setMass(Number(e.target.value))}/>
        </label>
        <label>Mirrored coordinate magnitude a <output>{a.toFixed(2)}</output>
          <input type="range" min=".15" max=".7" step=".01" value={a} onChange={e=>setA(Number(e.target.value))}/>
        </label>
        <label>Same forward coordinate step h <output>{step.toFixed(3)}</output>
          <input type="range" min=".005" max=".04" step=".005" value={step} onChange={e=>setStep(Number(e.target.value))}/>
        </label>
        <label>Coordinate boost rapidity η <output>{eta.toFixed(2)}</output>
          <input type="range" min="-.9" max=".9" step=".1" value={eta} onChange={e=>setEta(Number(e.target.value))}/>
        </label>
        <div className="r22-actions">
          <button type="button" onClick={()=>{setMass(1);setA(.2);setStep(.01);setEta(.4);}}>Reset</button>
          <button className="r22-primary" type="button" onClick={()=>exportJSON(report)}>Export evidence JSON</button>
        </div>
      </div>
    </div>
    <div className="r22-stats">
      <Stat label="SHARED INITIAL RADIUS" value={fmt(report.black.initialRadius)} detail="M-scaled length"/>
      <Stat label="SHARED INITIAL CURVATURE" value={fmt(report.black.initialCurvature)} detail="K = 48 M² / r⁶"/>
      <Stat label="BLACK REGION · Δr" value={fmt(report.black.deltaR)} detail="Future step decreases r"/>
      <Stat label="WHITE REGION · Δr" value={'+'+fmt(report.white.deltaR)} detail="Future step increases r"/>
    </div>
    <div className="r22-finding">
      <div><span className="r22-label">ALTERMATH PROJECTION COUNTEREXAMPLE</span>
      <p>π=(r,K) gives equal initial values for the paired states, but different radial futures
         under the declared fixed-X=0 experiment. Adding Q=sign(T) distinguishes them
         <strong> only for this restricted comparison.</strong></p></div>
      <div><span className="r22-label">NEGATIVE CONTROLS</span>
      <p>Kruskal horizon metric coefficient remains finite at r=2M:
        <strong> {fmt(report.controls.horizonCoefficient,6)}</strong>.
        A coordinate boost preserves r; the +/- sign matrix is singular and is not a Lorentzian metric.</p></div>
    </div>
    <footer className="r22-footer">
      <p><strong>Boundary:</strong> This is classical eternal Schwarzschild spacetime, not stellar collapse,
        not a real black-hole-to-white-hole conversion, not a nonsingular model,
        and not a new physical discovery.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/horizon-duality-r22.md" target="_blank" rel="noreferrer">Method, tests, references ↗</a>
    </footer>
  </section>;
}
