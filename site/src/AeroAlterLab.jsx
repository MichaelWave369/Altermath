import {useMemo,useState} from 'react';
import {AERO_SCHEMA,wingForces,drivenResonance,momentumThrust,fluidBuoyancy} from './aeroPhysics.js';
import './aeroAlter.css';

const STATIONS=[
 {id:'shakuna',name:'Shakuna',kind:'Aerodynamics',descriptor:'Bird-shaped concept · wing forces',
  intro:'A birdlike silhouette becomes a test of aerodynamic lift. Change speed, wing area, and lift coefficient to see what would be required to balance weight.',
  warning:'Balancing weight is necessary, not sufficient, for safe flight. This simplified model omits stall, wing geometry, structural loading, control and stability.'},
 {id:'rukma',name:'Rukma',kind:'Resonance',descriptor:'Bell concept · driven oscillator',
  intro:'A bell-like body inspires a textbook driven-oscillator experiment. Sweep the driving frequency through its natural frequency and measure the amplitude response.',
  warning:'Resonance can amplify vibration, not generate antigravity. The model assigns no levitation force; structural resonance can actually be destructive.'},
 {id:'sundara',name:'Sundara',kind:'Momentum',descriptor:'Rocket concept · exhaust momentum',
  intro:'The pointed vehicle inspires a rocket equation demonstration. Move propellant through an exhaust stream and compare the resulting thrust to loaded weight.',
  warning:'This is ideal momentum thrust only (pressure thrust omitted). Continuous thrust consumes reaction mass, and performance says nothing about stability or thermal feasibility.'},
 {id:'tripura',name:'Tripura',kind:'Buoyancy',descriptor:'Multi-medium concept · displacement',
  intro:'The fourth named vimana motivates a change of environment: the same vessel displaces air, fresh water or seawater. Archimedes gives a dramatically different result.',
  warning:'Assumes complete fluid displacement and a watertight hull. Floating, balance, submerged pressure, water propulsion and land travel require additional models.'}
];
const INITIAL={
 shakuna:{massKg:1240,speedMs:55,areaM2:24,liftCoefficient:0.9},
 rukma:{driveHz:38,naturalHz:40,dampingRatio:0.08},
 sundara:{massKg:2450,massFlowKgS:5,exhaustSpeedMs:3000},
 tripura:{massKg:2450,displacementM3:3,medium:'freshwater'}
};
const INPUTS={
 shakuna:[
  {key:'massKg',label:'Loaded mass',min:500,max:3000,step:20,unit:'kg'},
  {key:'speedMs',label:'Airspeed',min:0,max:100,step:1,unit:'m/s'},
  {key:'areaM2',label:'Wing area',min:5,max:50,step:1,unit:'m²'},
  {key:'liftCoefficient',label:'Lift coefficient',min:0.1,max:2,step:0.05,unit:'CL'}
 ],
 rukma:[
  {key:'driveHz',label:'Driving frequency',min:0,max:90,step:1,unit:'Hz'},
  {key:'naturalHz',label:'Natural frequency',min:20,max:70,step:1,unit:'Hz'},
  {key:'dampingRatio',label:'Damping ratio',min:0.02,max:0.35,step:0.01,unit:'ζ'}
 ],
 sundara:[
  {key:'massKg',label:'Loaded mass',min:1000,max:4000,step:50,unit:'kg'},
  {key:'massFlowKgS',label:'Propellant flow',min:0,max:12,step:0.25,unit:'kg/s'},
  {key:'exhaustSpeedMs',label:'Exhaust speed',min:500,max:4000,step:100,unit:'m/s'}
 ],
 tripura:[
  {key:'massKg',label:'Vessel mass',min:1000,max:4000,step:50,unit:'kg'},
  {key:'displacementM3',label:'Displaced volume',min:0.5,max:6,step:0.1,unit:'m³'}
 ]
};
const pretty=(n,digits=1)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:digits});
function compute(id,args){
 switch(id){
  case 'shakuna':return wingForces(args);
  case 'rukma':return drivenResonance(args);
  case 'sundara':return momentumThrust(args);
  case 'tripura':return fluidBuoyancy(args);
  default:throw new RangeError('Unknown station');
 }
}
function readings(id,result){
 if(id==='shakuna')return {
  title:'Lift / loaded weight',main:pretty(result.liftToWeight,2)+' ×',
  status:result.balancesWeight?'Lift meets or exceeds weight':'Lift below weight',
  values:[['Ideal lift',pretty(result.liftN,0)+' N'],['Vehicle weight',pretty(result.weightN,0)+' N'],['Ideal drag',pretty(result.dragN,0)+' N']],
  caution:!result.balancesWeight
 };
 if(id==='rukma')return {
  title:'Vibration amplification',main:pretty(result.amplification,2)+' ×',
  status:'No upward force predicted',
  values:[['Oscillation amplitude',pretty(result.displacementMm,4)+' mm'],['Modeled levitation thrust',pretty(result.netLiftN)+' N'],['Forcing / modal mass','10 N / 1 kg']],
  caution:true
 };
 if(id==='sundara')return {
  title:'Thrust / loaded weight',main:pretty(result.thrustToWeight,2)+' ×',
  status:result.balancesWeight?'Ideal thrust meets weight':'Insufficient ideal thrust',
  values:[['Momentum thrust',pretty(result.thrustN,0)+' N'],['Vehicle weight',pretty(result.weightN,0)+' N'],['Propellant in 60 sec',pretty(result.propellantPerMinuteKg,0)+' kg']],
  caution:!result.balancesWeight
 };
 return {
  title:'Buoyancy / loaded weight',main:pretty(result.buoyancyToWeight,2)+' ×',
  status:result.balancesWeight?'Buoyant force meets weight':'Buoyant force below weight',
  values:[['Buoyant force',pretty(result.buoyancyN,0)+' N'],['Vehicle weight',pretty(result.weightN,0)+' N'],['Fluid density',pretty(result.densityKgM3,3)+' kg/m³']],
  caution:!result.balancesWeight
 };
}
function Blueprint({id}){
 return <svg className="aero-drawing" viewBox="0 0 600 320" role="img" aria-label={'Conceptual line diagram of the '+id+' vimana, not an engineering blueprint'}>
  <defs><pattern id="aeroGrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#7eacb8" strokeWidth=".6" opacity=".25"/></pattern></defs>
  <rect width="600" height="320" fill="url(#aeroGrid)"/>
  <g fill="none" stroke="#c4dce0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
    {id==='shakuna'&&<>
      <path d="M300 39 L323 129 L334 161 L323 270 L300 292 L277 270 L266 161 L277 129 Z"/>
      <path d="M272 129 L75 208 L54 228 L268 185 M328 129 L525 208 L546 228 L332 185"/>
      <path d="M287 235 L205 280 L214 288 L300 269 L386 288 L395 280 L313 235"/>
      <path d="M300 42L300 292 M284 144Q300 116 316 144L320 173Q300 190 280 173Z"/>
      {Array.from({length:6},(_,i)=><g key={i}><path d={'M'+(245-i*26)+' '+(143+i*10)+' L'+(238-i*27)+' '+(189+i*6)} opacity=".45"/><path d={'M'+(355+i*26)+' '+(143+i*10)+' L'+(362+i*27)+' '+(189+i*6)} opacity=".45"/></g>)}
    </>}
    {id==='rukma'&&<>
      <path d="M300 31 Q265 92 239 158 Q206 226 133 261 L133 282 Q300 298 467 282 L467 261 Q394 226 361 158 Q335 92 300 31Z"/>
      <path d="M300 47 L300 276 M227 242H373 M249 182H351 M263 134H337"/>
      <rect x="266" y="145" width="68" height="72" rx="6"/><path d="M300 157l23 24-23 25-23-25z"/>
      <path d="M273 117Q252 100 271 83Q290 65 309 83Q328 101 309 117Q290 133 273 117Z"/>
      <path d="M282 74Q300 61 318 74 M280 225Q300 245 320 225"/>
      <ellipse cx="300" cy="273" rx="152" ry="10"/>
    </>}
    {id==='sundara'&&<>
      <path d="M300 27Q259 79 258 128V264H342V128Q341 79 300 27Z"/>
      <path d="M258 232L207 292L258 276 M342 232L393 292L342 276"/>
      <rect x="275" y="124" width="50" height="85" rx="24"/>
      <path d="M286 211L286 263M314 211L314 263M277 263L285 293L315 293L323 263"/>
      <path d="M270 111H330M267 235H333"/>
      <circle cx="300" cy="85" r="13"/><circle cx="300" cy="168" r="16"/>
      <path d="M288 299L300 313L312 299" stroke="#ecbe86" strokeDasharray="4 6"/>
    </>}
    {id==='tripura'&&<>
      <path d="M300 32L370 107L352 118H248L230 107Z M210 130H390L426 181H174Z M152 202H448L471 265Q300 295 129 265Z"/>
      <path d="M300 32V280 M235 130L235 181 M365 130V181 M190 230H410"/>
      <path d="M156 263Q300 283 444 263 M232 108Q300 117 368 108"/>
      <circle cx="300" cy="153" r="15"/><circle cx="300" cy="244" r="18"/>
      <path d="M77 276H523" stroke="#78b5c6" strokeDasharray="8 8"/>
    </>}
  </g>
  <g fontSize="11" fontFamily="monospace" letterSpacing="2" fill="#b2cfd5">
   <text x="18" y="23">ALTER / AERO · {id.toUpperCase()}</text>
   <text x="582" y="303" textAnchor="end">CONCEPT · NOT TO SCALE</text>
  </g>
 </svg>;
}
function exportExperiment(id,input,output){
 const record={schema:AERO_SCHEMA,station:id,generatedAt:new Date().toISOString(),
  kind:'calculated textbook-model output, not measured flight data',
  parameters:input,results:output,
  assumptions:'Simple SI force/amplitude relations. No verified vimana technology, aether, or anti-gravity.'};
 const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='altermath-aero-'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function AeroAlterLab(){
 const [active,setActive]=useState('shakuna');
 const [settings,setSettings]=useState(INITIAL);
 const selected=STATIONS.find(s=>s.id===active);
 const inputs=settings[active];
 const result=useMemo(()=>compute(active,inputs),[active,inputs]);
 const output=readings(active,result);
 const change=(key,value)=>setSettings(prev=>({...prev,[active]:{...prev[active],[key]:value}}));
 return <section className="aero-section" id="aero-alter" aria-labelledby="aero-heading">
  <div className="section-head"><div><span className="micro">AERO-ALTER PHYSICS DEPARTMENT · PHYSICS 01</span>
    <h2 id="aero-heading">Four old names. Four testable questions.</h2></div>
    <p>Historical vimana names meet modern, bounded mathematical demonstrations. Fiction inspires the question; physics determines the result.</p>
  </div>
  <div className="aero-shell">
   <div className="aero-station-nav" aria-label="Choose Aero-Alter research station">
    {STATIONS.map(s=><button key={s.id} type="button" className={active===s.id?'aero-station current':'aero-station'} onClick={()=>setActive(s.id)} aria-pressed={active===s.id}>
      <small>{s.kind}</small><strong>{s.name}</strong><span>{s.descriptor}</span>
    </button>)}
   </div>
   <div className="aero-workspace">
    <div className="aero-left">
     <div className="aero-caption"><span>SCHEMATIC / SYMBOLIC RECONSTRUCTION</span><span>SI UNITS · LOCAL MODEL</span></div>
     <Blueprint id={active}/>
     <div className="aero-context"><h3>{selected.name} · {selected.kind}</h3><p>{selected.intro}</p>
      <div className="aero-evidence"><span>HISTORICAL NAME</span><span>MODERN MODEL</span><span>SPECULATIVE ARTWORK</span></div>
     </div>
    </div>
    <div className="aero-right">
     <div className="micro">PARAMETERS · INTERACTIVE RESEARCH</div>
     {INPUTS[active].map(c=><label className="aero-input" htmlFor={'aero-'+active+'-'+c.key} key={c.key}>
      <span><b>{c.label}</b><output>{pretty(inputs[c.key],2)} {c.unit}</output></span>
      <input id={'aero-'+active+'-'+c.key} type="range" min={c.min} max={c.max} step={c.step}
       value={inputs[c.key]} onChange={e=>change(c.key,Number(e.target.value))}/>
     </label>)}
     {active==='tripura'&&<label className="aero-medium" htmlFor="aero-medium">Environment
       <select id="aero-medium" value={inputs.medium} onChange={e=>change('medium',e.target.value)}>
        <option value="air">Standard sea-level air</option><option value="freshwater">Fresh water</option><option value="seawater">Sea water</option>
       </select></label>}
     <div className="aero-results" aria-live="polite">
      <small>{output.title}</small><strong>{output.main}</strong>
      <div className={output.caution?'aero-status caution':'aero-status'}>{output.status}</div>
      <dl>{output.values.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
     </div>
     <button type="button" className="aero-export" onClick={()=>exportExperiment(active,inputs,result)}>Export experiment JSON ↗</button>
    </div>
   </div>
   <div className="aero-method"><strong>Interpretation boundary</strong><p>{selected.warning} These calculations do not validate the nineteenth-century dates, imaginary aether machinery, or flight claims in the shared modern illustrations.</p>
     <a href="https://www.rarebooksocietyofindia.org/book_archive/196174216674_10152962830606675.pdf" target="_blank" rel="noreferrer">IISc 1974 critical study ↗</a>
     <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/aero-alter-physics.md" target="_blank" rel="noreferrer">Methods and sources ↗</a>
   </div>
  </div>
 </section>;
}
