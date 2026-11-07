import {useMemo,useState} from 'react';
import {
  POLYHEDRA,graphEdges,totalState,nextState,exactKeyholeStudy,runPolyhedralStudy,
} from './polyhedralKeyhole.js';
import './polyhedralKeyhole.css';

function downloadStudy(record){
  const blob=new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='altermath-r24-polyhedral-keyhole.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function GraphView({graph,mask,angle,onToggle,compact=false}){
  const points=useMemo(()=>{
    const theta=angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
    const tilt=.38,ct=Math.cos(tilt),st=Math.sin(tilt);
    const radius=Math.max(...graph.coordinates.map(v=>Math.hypot(...v)));
    const scale=(compact?72:116)/radius;
    return graph.coordinates.map(([x,y,z])=>{
      const xr=x*c+z*s,zr=-x*s+z*c;
      return {x:240+xr*scale,y:160+(y*ct-zr*st)*scale,depth:y*st+zr*ct};
    });
  },[graph,angle,compact]);
  const n=graph.neighbors.length;
  const edges=graphEdges(graph).sort((a,b)=>(points[a[0]].depth+points[a[1]].depth)-(points[b[0]].depth+points[b[1]].depth));
  const verts=points.map((p,i)=>({...p,i})).sort((a,b)=>a.depth-b.depth);
  return <svg className="r24-graph" viewBox="0 0 480 320" role="group"
    aria-label={'Projected dual graph of '+n+' polyhedral face-pockets. Click or focus a node to toggle its binary state.'}>
    <rect x="0" y="0" width="480" height="320" rx="18" fill="#08131e"/>
    <circle cx="240" cy="160" r="135" fill="none" stroke="#537784" strokeOpacity=".17" strokeDasharray="3 8"/>
    <circle cx="240" cy="160" r="84" fill="none" stroke="#537784" strokeOpacity=".1"/>
    {edges.map(([a,b])=><line key={a+'-'+b} x1={points[a].x} y1={points[a].y}
      x2={points[b].x} y2={points[b].y} stroke="#a9d4cb"
      strokeWidth="2" strokeOpacity=".37"/>)}
    {verts.map(({x,y,i,depth})=>{
      const on=Boolean(mask&(1<<i));
      const toggle=()=>onToggle?.(i);
      return <g key={i} className={onToggle?'r24-node r24-interactive':'r24-node'}
        role={onToggle?'button':'img'} tabIndex={onToggle?0:undefined}
        aria-label={'Face '+(i+1)+' '+(on?'positive':'negative')}
        onClick={onToggle?toggle:undefined}
        onKeyDown={onToggle?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}}:undefined}>
        <circle cx={x} cy={y} r={compact?14:19} fill={on?'#75c9b9':'#e0ad75'}
          stroke={depth>0?'#e7f8f6':'#86a4a9'} strokeWidth="1.8"/>
        <text x={x} y={y+4} fontSize={compact?10:11} textAnchor="middle" fontWeight="700" fill="#0a1b22">{i+1}</text>
      </g>;
    })}
    <text x="18" y="295" fontSize="11" fill="#8ba5b0">DUAL GRAPH · FACE ADJACENCY</text>
    <text x="458" y="295" fontSize="11" fill="#8ba5b0" textAnchor="end">{n} POCKETS</text>
  </svg>;
}
function StateBar({label,value,detail}){
  return <div className="r24-measure"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
}
function bitString(mask,n){return Array.from({length:n},(_,i)=>(mask&(1<<i))?'＋':'−').join(' ');}
export default function PolyhedralKeyholeLab(){
  const [id,setId]=useState('octahedron');
  const [seed,setSeed]=useState(369);
  const [variant,setVariant]=useState('original');
  const [mask,setMask]=useState(15);
  const [angle,setAngle]=useState(22);
  const study=useMemo(()=>runPolyhedralStudy(id,seed,8),[id,seed]);
  const graph=variant==='control'?study.controls[0].graph:study.graph;
  const census=useMemo(()=>variant==='control'?exactKeyholeStudy(graph):study.baseline,[variant,graph,study]);
  const next=nextState(graph,mask);
  const aggregate=totalState(mask,graph.neighbors.length);
  const after=totalState(next,graph.neighbors.length);
  const changeSolid=value=>{
    setId(value);setVariant('original');
    const count=POLYHEDRA.find(p=>p.id===value).faces;
    setMask((1<<(count/2))-1);
  };
  const collision=census.collision;
  const exportRecord=()=>downloadStudy({
    ...study,inspection:{variant,mask,nextMask:next,observed:aggregate,nextObserved:after,
      angleDegrees:angle,selectedCensus:census},
  });
  return <section className="r24-lab" id="polyhedral-keyholes" aria-labelledby="r24-title">
    <div className="r24-heading">
      <div><div className="micro">RUNG 24 · NBG POLY-01 / SYNTHETIC GRAPH RESEARCH</div>
        <h2 id="r24-title">Polyhedral <em>Keyhole Laboratory</em></h2>
        <p>What does an aggregate-only observer miss when face-pockets update through different
          connection geometries? Rotate the dual graph, flip pocket states, and compare exact
          exhaustive outcomes against degree-preserving rewired controls.</p></div>
      <span className="r24-tag">EXACT FINITE ENUMERATION · NOT PHYSICS</span>
    </div>
    <div className="r24-grid">
      <div className="r24-view">
        <GraphView graph={graph} mask={mask} angle={angle}
          onToggle={i=>setMask(old=>old^(1<<i))}/>
        <div className="r24-legend"><span><i className="positive"/>+1 pocket</span><span><i className="negative"/>−1 pocket</span><span>Click or keyboard-toggle a face</span></div>
        <label className="r24-rotation">Rotate projected dual graph <output>{angle}°</output>
          <input type="range" min="-180" max="180" step="5" value={angle}
            onChange={e=>setAngle(Number(e.target.value))}/>
        </label>
        <div className="r24-actions">
          <button type="button" className="r24-primary" onClick={()=>setMask(next)}>Step all pockets</button>
          <button type="button" onClick={()=>setMask((1<<(graph.neighbors.length/2))-1)}>Reset state</button>
          <button type="button" onClick={exportRecord}>Export full JSON</button>
        </div>
        <div className="r24-state" aria-live="polite">
          <div><span>Visible aggregate now</span><strong>{aggregate>0?'+':''}{aggregate}</strong></div>
          <span aria-hidden="true">→</span>
          <div><span>After neighbor-majority step</span><strong>{after>0?'+':''}{after}</strong></div>
        </div>
        <p className="r24-note">The projected nodes are centers of original faces, connected through their shared
          edges. Their positions form the <strong>dual</strong> solid, not a nested cosmological model.</p>
      </div>
      <div className="r24-controls">
        <h3>Face-pocket geometry</h3>
        <div className="r24-choices" role="group" aria-label="Choose solid">
          {POLYHEDRA.map(p=><button key={p.id} type="button" aria-pressed={id===p.id}
            className={id===p.id?'active':''} onClick={()=>changeSolid(p.id)}>
            <strong>{p.faces}</strong><span>{p.label}</span></button>)}
        </div>
        <label className="r24-select-label">Graph under inspection
          <select value={variant} onChange={e=>setVariant(e.target.value)}>
            <option value="original">Canonical face adjacency</option>
            <option value="control">Degree-preserving rewired control #1</option>
          </select>
        </label>
        <label className="r24-select-label">Deterministic control seed
          <select value={seed} onChange={e=>setSeed(Number(e.target.value))}>
            <option value="369">369</option><option value="636">636</option><option value="963">963</option>
          </select>
        </label>
        <div className="r24-stats">
          <StateBar label="Face-pockets" value={census.pockets} detail={census.degree+' neighbors per pocket'}/>
          <StateBar label="Shared-face links" value={census.edges} detail="Undirected graph edges"/>
          <StateBar label="Exhaustive states" value={census.samples.toLocaleString()} detail="Uniform binary configurations"/>
          <StateBar label="Hidden predictive entropy" value={census.conditionalEntropyBits.toFixed(4)+' bits'}
            detail="H(next aggregate | current aggregate)"/>
        </div>
        <h3>Size- and degree-matched controls</h3>
        <div className="r24-barlabel"><span>Canonical</span><strong>{study.baseline.conditionalEntropyBits.toFixed(4)} bits</strong></div>
        <div className="r24-track"><div style={{width:(study.baseline.conditionalEntropyBits/2*100)+'%'}}/></div>
        <div className="r24-barlabel"><span>8 rewired controls · mean</span><strong>{study.controlMeanBits.toFixed(4)} bits</strong></div>
        <div className="r24-track"><div className="r24-controlbar" style={{width:(study.controlMeanBits/2*100)+'%'}}/></div>
        <p className="r24-note">
          Control range: {study.controlRangeBits[0].toFixed(4)}–{study.controlRangeBits[1].toFixed(4)} bits.
          {id==='tetrahedron'?' K4 is the unique simple connected 3-regular graph on four nodes; independent degree-matched rewiring is impossible.':
          ' Rewiring preserves pocket count, degree and connectivity, not every other topology statistic.'}
        </p>
      </div>
    </div>
    <div className="r24-collision">
      <div><div className="micro">CAUSAL COLLISION / TWO STATES, ONE KEYHOLE</div>
        <h3>Does the same total hide different futures?</h3>
        <p>The observer sees only the sum, not which faces are positive.
          A collision exists when two different internal arrangements have the same visible total
          but different next totals.</p></div>
      {collision?<div className="r24-cases">
        {[collision.a,collision.b].map((example,i)=><div className="r24-case" key={i}>
          <span>Configuration {i===0?'A':'B'} · observed {collision.observed>0?'+':''}{collision.observed}</span>
          <code>{bitString(example.mask,census.pockets)}</code>
          <strong>Next total: {example.next>0?'+':''}{example.next}</strong>
          <button type="button" onClick={()=>setMask(example.mask)}>Load {i===0?'A':'B'} into viewer</button>
        </div>)}
      </div>:<p className="r24-no-collision">No collision exists for this rule and this graph: the
        aggregate is a sufficient predictor of the next aggregate.</p>}
    </div>
    <div className="r24-footer">
      <p><strong>Claim boundary:</strong> All data are deterministic synthetic computations under a
        uniform input prior and one synchronous neighbor-majority rule. Differences across 4/8/12
        pockets confound graph size and structure. They do not establish extra dimensions,
        energy fields, quantum communication, cosmic geography, or any physical effect.
        PocketMesh routing is not invoked; cross-repo integration requires independent tests.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/polyhedral-keyhole-r24.md"
        target="_blank" rel="noreferrer">Read POLY-01 protocol ↗</a>
    </div>
  </section>;
}
