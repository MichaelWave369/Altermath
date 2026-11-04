import {useEffect, useMemo, useState} from 'react';
import {GROUPS,activeLinks,createWorld,disturb,metrics,setGain,setGate,stepWorld} from './model.js';
import ExperimentLab from './ExperimentLab.jsx';
import AblationLab from './AblationLab.jsx';

const BASE=import.meta.env.BASE_URL || '/Altermath/';
const labs=[
  {number:'01',name:'Nested Bubble Lab',type:'Foundations',file:'lab.html',description:'Five outward functions and the sixth relational point.'},
  {number:'02',name:'Pleroma Network',type:'History + graph',file:'pleroma.html',description:'Thirty Aeons, syzygies, Horos and fault recovery.'},
  {number:'03',name:'Hypercube Phase',type:'Topology + waves',file:'phase.html',description:'Tesseract graph, phase coupling and junction gates.'},
  {number:'04',name:'Junction Bridge',type:'Boundary engineering',file:'junction.html',description:'Permission, queues, revocation and delivery.'},
  {number:'05',name:'Verified Interop',type:'Source-backed tests',file:null,description:'NBGPocketMesh routing and PhiKernel hard admissibility.'},
];
const copy={
  3:{eyebrow:'I · HERME-NOETIC',title:'Remembrance',principle:'Mind · knowing',
    quote:'A system establishes what it knows, what it remembers, and how it interprets.',
    parts:['Nous · intelligence','Logos · expression','Gnosis · insight'],
    action:'Identify state, memory, and the origin of a signal.'},
  6:{eyebrow:'II · THEO-SOPHIA',title:'Alignment',principle:'Body · coordination',
    quote:'An embodied system negotiates its boundaries and establishes consequential connections.',
    parts:['Sophia · wisdom','Soma · embodiment','Temperance · regulation'],
    action:'Authorize junctions, reconcile signals, and regulate exchange.'},
  9:{eyebrow:'III · TESTI-AMENTI',title:'Return',principle:'Witness · trace',
    quote:'A system records what happened, evaluates its outcome, and carries a trace forward.',
    parts:['Testimony · evidence','Witness · observation','Return · integration'],
    action:'Observe the result, preserve its provenance, and learn from it.'},
};

function RingDiagram({world,focus,onFocus}){
  const links=activeLinks(world);
  const m=metrics(world);
  return <svg className="network-svg" viewBox="0 0 760 640" aria-label="Interactive model of three, six and nine oscillator nodes connected through boundary-gated junctions" role="img">
    <defs>
      <radialGradient id="centerGlow"><stop offset="0%" stopColor="#e4bc84" stopOpacity=".28"/><stop offset="100%" stopColor="#e4bc84" stopOpacity="0"/></radialGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <circle cx="380" cy="320" r="303" fill="url(#centerGlow)" />
    {[258,176,92].map((r,i)=><circle key={r} cx="380" cy="320" r={r} fill="none" stroke="currentColor" strokeWidth="1" opacity={i===2?.18:.11} strokeDasharray={i===0?'3 10':'none'}/>)}
    {[0,45,90,135].map(angle=><line key={angle} x1="80" y1="320" x2="680" y2="320" stroke="currentColor" opacity=".045" transform={`rotate(${angle} 380 320)`}/>)}
    {links.map(({id,a,b,cross})=>{
      const A=world.nodes[a], B=world.nodes[b];
      const phaseDiff=Math.abs(Math.sin(world.phases[b]-world.phases[a]));
      return <line key={id} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
        stroke={cross?'#dfb875':'#92b7c5'} strokeWidth={cross?1.6:1}
        opacity={cross ? (.18 + phaseDiff*.53) : (.10 + phaseDiff*.18)} strokeDasharray={cross?'5 7':undefined}/>;
    })}
    {world.nodes.map(n=>{
      const g=GROUPS.find(g=>g.id===n.group), selected=focus===n.group;
      const wave=(Math.sin(world.phases[n.id])+1)/2;
      return <g key={n.id} className="diagram-node" onClick={()=>onFocus(n.group)} tabIndex={0} role="button"
         aria-label={`Inspect ${n.name}, ${n.group}-point ring`}
         onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onFocus(n.group);}}}>
        <title>{`${n.name}: ${Math.round(wave*100)}% phase wave`}</title>
        {selected&&<circle cx={n.x} cy={n.y} r={16+wave*8} fill="none" stroke={g.color} strokeWidth="1" opacity=".32"/>}
        <circle cx={n.x} cy={n.y} r={selected?9:7} fill="#08111d" stroke={g.color} strokeWidth="2"/>
        <circle cx={n.x} cy={n.y} r={2.5+wave*3} fill={g.color}/>
        {selected&&<text x={n.x} y={n.y+(n.group===9?27:25)} textAnchor="middle" fontSize={n.group===9?9:10} fill="#c5d5e2" letterSpacing=".2">{n.name.toUpperCase()}</text>}
      </g>;
    })}
    <circle cx="380" cy="320" r="48" fill="#0b1723" stroke="#e4bc84" strokeWidth="1.5" />
    <circle cx="380" cy="320" r="56" fill="none" stroke="#e4bc84" opacity=".2" strokeDasharray="3 7" />
    <text x="380" y="312" textAnchor="middle" fontSize="11" fill="#d7b485" letterSpacing="2">THE SIXTH</text>
    <text x="380" y="335" textAnchor="middle" fontSize="20" fill="#fff2d7" fontWeight="700">POINT</text>
    <text x="380" y="390" textAnchor="middle" fontSize="10" fill="#93a6b9" letterSpacing="1">{world.gate?`${m.junctions} CROSS-LAYER JUNCTIONS`:'HOROS BOUNDARY CLOSED'}</text>
    <g fontSize="10" letterSpacing="2" fill="currentColor" opacity=".65">
      <text x="64" y="28">NESTED INTERFACE FIELD</text>
      <text x="695" y="608" textAnchor="end">TICK {String(world.tick).padStart(4,'0')}</text>
    </g>
  </svg>;
}

function Meter({name,value,color}){
  return <div className="meter"><div className="meter-line"><span>{name}</span><strong>{(value*100).toFixed(1)}%</strong></div>
    <div className="meter-track"><div style={{width:`${value*100}%`,background:color}}/></div></div>;
}
function downloadSnapshot(world){
  const record={model:'Altermath Live · 3-6-9',version:'0.6.0',generatedAt:new Date().toISOString(),
    disclaimer:'Deterministic mathematical research simulation, not a physics or consciousness measurement.',
    seed:world.seed,metrics:metrics(world),phases:world.phases,events:world.events};
  const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`altermath-trace-${world.tick}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function App(){
  const [world,setWorld]=useState(()=>createWorld(369));
  const [running,setRunning]=useState(true);
  const [focus,setFocus]=useState(6);
  const m=useMemo(()=>metrics(world),[world]);
  useEffect(()=>{
    if(!running)return;
    const handle=setInterval(()=>setWorld(current=>stepWorld(current)),75);
    return ()=>clearInterval(handle);
  },[running]);
  const selected=copy[focus];
  const reset=()=>{setRunning(false);setWorld(createWorld(369));};
  return <div className="app">
    <header className="topbar"><a className="brand" href={BASE} aria-label="Altermath Live home"><span className="mark">Φ</span><span><b>ALTERMATH</b><small>PHI369 LABS · LIVE RESEARCH</small></span></a>
      <nav aria-label="Main navigation"><a href="#theory">3 · 6 · 9</a><a href="#experiments">Experiments</a><a href="#laboratories">Laboratories</a><a href="https://github.com/MichaelWave369/Altermath" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
    </header>
    <main>
      <section className="hero"><div><div className="eyebrow"><span className="signal-dot"/> RUNG 6 · REACTIVE RESEARCH INTERFACE</div>
        <h1>WHEN WHOLENESS<br/><em>MEETS WHOLENESS.</em></h1>
        <p>Five describe a system. The sixth is the junction where systems touch. Here, three nested layers become a living experiment in connection, boundary, and return.</p>
      </div><div className="hero-side"><span>THE THREEFOLD ARCHITECTURE</span><strong>3 <i>·</i> 6 <i>·</i> 9</strong><small>Remembrance → Alignment → Return</small></div></section>

      <section className="workspace" aria-label="Interactive network simulator">
        <div className="visual-panel"><div className="panel-heading"><div><span className="micro">FIELD / 001</span><h2>Nested relational field</h2></div><span className={running?'active-state':'paused-state'}>{running?'● SIMULATION RUNNING':'Ⅱ PAUSED'}</span></div>
          <RingDiagram world={world} focus={focus} onFocus={setFocus}/>
          <div className="legend">{GROUPS.map(g=><button key={g.id} className={focus===g.id?'legend-item current':'legend-item'} onClick={()=>setFocus(g.id)} aria-pressed={focus===g.id}><span className="legend-dot" style={{background:g.color}}/>{g.id} · {g.name}</button>)}</div>
        </div>
        <aside className="control-panel"><div className="control-top"><div className="micro">LIVE MEASUREMENTS · SYNTHETIC DATA</div><h2>Junction console</h2><p>Watch how authorized cross-layer connections change the coupling of the whole network.</p></div>
          <div className="score"><div><small>Global synchronization</small><strong>{(m.order*100).toFixed(1)}<sup>%</sup></strong></div><span className="score-icon">∿</span></div>
          <div className="metric-chips"><div><b>{m.junctions}</b><span>active junctions</span></div><div><b>{m.tick}</b><span>simulation ticks</span></div><div><b>{m.energy.toFixed(1)}</b><span>exchange index</span></div></div>
          <div className="meters">{GROUPS.map(g=><Meter key={g.id} name={`${g.id} · ${g.name}`} value={m.groups.find(s=>s.group===g.id).order} color={g.color}/>)}</div>
          <div className="switching"><div><strong>Horos boundary</strong><small>{world.gate?'Cross-layer coupling permitted':'Cross-layer coupling blocked'}</small></div><button type="button" className={world.gate?'toggle is-on':'toggle'} onClick={()=>setWorld(w=>setGate(w,!w.gate))} aria-label={world.gate?'Close cross-layer junctions':'Open cross-layer junctions'} aria-pressed={world.gate}><span/></button></div>
          <label className="slider-label" htmlFor="gain">Coupling strength <strong>{world.gain.toFixed(1)}</strong></label>
          <input id="gain" type="range" min="0" max="5" step="0.1" value={world.gain} onChange={e=>setWorld(w=>setGain(w,Number(e.target.value)))}/>
          <div className="actions"><button type="button" className="primary" onClick={()=>setRunning(r=>!r)}>{running?'Pause simulation':'Resume simulation'}</button><button type="button" onClick={()=>{setRunning(false);setWorld(w=>stepWorld(w));}}>Step +1</button><button type="button" onClick={()=>setWorld(w=>disturb(w,focus))}>Disturb {focus}</button><button type="button" onClick={reset}>Reset</button></div>
          <div className="console-tail"><div className="mini-title">Junction events <button type="button" onClick={()=>downloadSnapshot(world)}>Export JSON ↗</button></div><ul>{world.events.slice(0,4).map((e,i)=><li key={`${e.tick}-${e.type}-${i}`}><span>{String(e.tick).padStart(3,'0')}</span>{e.text}</li>)}</ul></div>
        </aside>
      </section>

      <ExperimentLab />
      <AblationLab />
      <section className="threefold" id="theory"><div className="section-head"><div><span className="micro">A MODEL OF THREE ROLES</span><h2>3 · Remembrance &nbsp; 6 · Alignment &nbsp; 9 · Return</h2></div><p>These are creative engineering correspondences inspired by the supplied images, not a historical 3–6–9 doctrine.</p></div>
        <div className="stage-grid">{GROUPS.map(g=>{const c=copy[g.id];return <button key={g.id} className={focus===g.id?'stage-card chosen':'stage-card'} onClick={()=>setFocus(g.id)} aria-pressed={focus===g.id} style={{'--accent':g.color}}><div className="card-top"><span>{c.eyebrow}</span><b>{g.id}</b></div><h3>{c.title}</h3><div className="card-principle">{c.principle}</div><p>{c.quote}</p><small>{c.parts.join(' · ')}</small></button>})}</div>
        <div className="focus-box" style={{'--focus':GROUPS.find(g=>g.id===focus).color}}><div><span className="micro">ACTIVE INTERPRETATION / {focus}</span><h3>{focus} · {selected.title}</h3><p>{selected.action}</p></div><span className="focus-glyph">{focus}</span></div>
      </section>

      <section className="labs" id="laboratories"><div className="section-head"><div><span className="micro">THE EXISTING EXPERIMENTS · PRESERVED</span><h2>Explore the laboratories</h2></div><p>Every previous Rung stays available. The React front door does not replace the research tools.</p></div>
        <div className="lab-list">{labs.map(l=><a key={l.number} className="lab-row" href={l.file?BASE+l.file:'https://github.com/MichaelWave369/Altermath/blob/main/docs/verified-local-interop.md'} target="_blank" rel="noreferrer"><span className="lab-num">{l.number}</span><span className="lab-label"><strong>{l.name}</strong><small>{l.description}</small></span><span className="lab-type">{l.type}</span><span className="lab-arrow">↗</span></a>)}</div>
      </section>
      <section className="method"><div><span className="micro">METHODOLOGICAL BOUNDARY</span><h2>Symbolism starts the question.<br/>Measurement tests the answer.</h2></div><p>Historical Gnostic, Hermetic, and theological concepts are inspiration for this research visualization. The mathematics are ordinary oscillator and graph models. Neither the symbols nor the simulations prove spiritual mechanisms, physical extra dimensions, or computational consciousness.</p></section>
    </main>
    <footer><span><b>Φ</b> ALTER MATH · PHI369 LABS</span><span>Local simulation. Open research. No external data exchange.</span><a href="https://github.com/MichaelWave369/Altermath" target="_blank" rel="noreferrer">View source ↗</a></footer>
  </div>;
}
