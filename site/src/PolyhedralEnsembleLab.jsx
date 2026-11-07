import {useMemo,useState} from 'react';
import {RULES,PRIORS} from './polyhedralRobustness.js';
import {runPoly03} from './polyhedralEnsemble.js';
import './polyhedralEnsemble.css';

function exportJson(data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download='altermath-r26-poly03-eight-cubic-census.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function EdgeDiagram({graph,highlight}){
  const pts=graph.coordinates.map(([x,y])=>({x:240+x*122,y:167-y*122}));
  const edges=graph.neighbors.flatMap((row,i)=>row.filter(j=>j>i).map(j=>[i,j]));
  return <svg className="r26-graph" viewBox="0 0 480 335" role="img"
    aria-label={'Schematic eight-node, twelve-edge degree-three network: '+highlight}>
    <rect width="480" height="335" rx="16" fill="#07131f"/>
    <circle cx="240" cy="167" r="138" fill="none" stroke="#375767" strokeDasharray="4 7" strokeOpacity=".45"/>
    {edges.map(([i,j])=><line key={i+'-'+j}
      x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y}
      stroke="#a6d8d1" strokeWidth="2" strokeOpacity=".62"/>)}
    {pts.map((p,i)=><g key={i}>
      <circle cx={p.x} cy={p.y} r="17" fill="#dfbd87" stroke="#f6e9cf" strokeWidth="1.8"/>
      <text x={p.x} y={p.y+4} fontSize="11" fontWeight="750" textAnchor="middle" fill="#15252b">{i+1}</text>
    </g>)}
    <text x="22" y="314" fill="#89a4ae" fontSize="11">SCHEMATIC CONNECTIVITY · NOT 3D GEOMETRY</text>
  </svg>;
}
function Metric({name,value,description}){
  return <div className="r26-metric"><small>{name}</small><strong>{value}</strong><span>{description}</span></div>;
}
export default function PolyhedralEnsembleLab(){
  const [rule,setRule]=useState('majority');
  const [prior,setPrior]=useState(.5);
  const [selected,setSelected]=useState('cube');
  const study=useMemo(()=>runPoly03({rule,prior}),[rule,prior]);
  const selectedFamily=study.families.find(f=>f.id===selected);
  const chosenRule=RULES.find(r=>r.id===rule);
  const exportData=()=>exportJson({...study,selection:selected,
    methodology:'Five registered representatives. Counts and majority-rule entropy invariance across all 19,320 connected labeled cubic graphs checked by exhaustive test; other rule/prior entropies evaluated per representative.',
    authority:'NONE'});
  return <section className="r26-lab" id="polyhedral-ensemble" aria-labelledby="r26-title">
    <div className="r26-header">
      <div>
        <div className="micro">RUNG 26 · NBG POLY-03 / FINITE GRAPH ENSEMBLES</div>
        <h2 id="r26-title">Same Pockets. <em>Different Futures.</em></h2>
        <p>Eight nodes, three neighbors per node, twelve links. No change in network
          size or degree. Explore all five observed triangle-and-square signature groups
          from an exhaustive census of connected, labeled eight-node cubic graphs.</p>
      </div>
      <span className="r26-status">EXHAUSTIVE FINITE CENSUS · SYNTHETIC</span>
    </div>
    <div className="r26-metric-grid">
      <Metric name="Labeled 3-regular graphs" value="19,355" description="Exhaustive generation, including disconnected graphs"/>
      <Metric name="Connected graphs" value="19,320" description="35 excluded: disjoint K4 + K4"/>
      <Metric name="Distinct motif signatures" value="5" description="Triangle count + four-cycle count"/>
      <Metric name="Current entropy span" value={study.spanBits.toFixed(5)+' bits'}
        description="Maximum minus minimum, at fixed eight nodes and degree three"/>
    </div>
    <div className="r26-setup">
      <div><label htmlFor="r26-rule">Synchronous update rule</label>
        <select id="r26-rule" value={rule} onChange={e=>setRule(e.target.value)}>
          {RULES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <p>{chosenRule.description}</p>
      </div>
      <div><span className="r26-label">Initial chance of a positive pocket</span>
        <div className="r26-prior" role="group" aria-label="Starting-state prior">
          {PRIORS.map(p=><button type="button" key={p} aria-pressed={prior===p}
            className={prior===p?'selected':''} onClick={()=>setPrior(p)}>{Math.round(100*p)}%</button>)}
        </div>
        <p>Independent Bernoulli prior; every one of 256 states is evaluated exactly.</p>
      </div>
      <button type="button" className="r26-export" onClick={exportData}>Export full study JSON</button>
    </div>
    <div className="r26-body">
      <div className="r26-chart">
        <div className="micro">EXACT H(NEXT SUM | CURRENT SUM) / REPRESENTATIVE GRAPHS</div>
        <h3>Hidden future uncertainty</h3>
        <div className="r26-bars">
          {study.families.map(f=><button key={f.id} type="button"
            className={selected===f.id?'r26-barrow selected':'r26-barrow'}
            aria-pressed={selected===f.id} onClick={()=>setSelected(f.id)}>
            <span className="r26-rowhead"><strong>{f.name}</strong><small>{f.triangles} triangles · {f.squares} squares</small></span>
            <span className="r26-track"><span style={{width:Math.min(100,f.entropyBits/2*100)+'%'}}/></span>
            <span className="r26-value">{f.entropyBits.toFixed(5)} bits</span>
          </button>)}
        </div>
        <p className="r26-chartnote">All five rows use graphs with the same number of vertices,
          edges and neighbor count. The bar indicates uncertainty hidden from an
          aggregate-only observer, not a performance score.</p>
      </div>
      <div className="r26-visual">
        <div className="micro">STRUCTURAL INSPECTOR</div>
        <h3>{selectedFamily.name}</h3>
        <EdgeDiagram graph={selectedFamily.graph} highlight={selectedFamily.name}/>
        <div className="r26-selected-stats">
          <span>{selectedFamily.triangles} triangles</span>
          <span>{selectedFamily.squares} four-cycles</span>
          <span>{selectedFamily.labeledCount.toLocaleString()} labeled graphs</span>
        </div>
        <p>The highlighted network is a <strong>representative</strong> of one
          triangle-and-square-count group. Its positions are diagrammatic. The cube
          group is the octahedron's face-adjacency dual from POLY-01.</p>
      </div>
    </div>
    <div className="r26-table">
      <h3>Exhaustive majority-rule census</h3>
      <div className="r26-scroll">
        <table>
          <thead><tr><th>Signature</th><th>Triangles</th><th>Four-cycles</th>
            <th>Labeled connected graphs</th><th>Uniform-majority entropy</th></tr></thead>
          <tbody>{study.families.map(f=><tr key={f.id}>
            <td>{f.name}</td><td>{f.triangles}</td><td>{f.squares}</td>
            <td>{f.labeledCount.toLocaleString()}</td>
            <td>{runMajorityValue(f.id).toFixed(5)} bits</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p>For this table, the uniform-prior, neighbor-majority entropy is identical
        across every labeled connected graph within each displayed signature,
        as verified by the exhaustive test. Other rule/prior results above are
        calculated from one representative per group and are <strong>not</strong> claimed
        to be exhaustively invariant within each group.</p>
    </div>
    <div className="r26-disclaimer">
      <p><strong>Claim boundary:</strong> This is exact finite simulation under a specified
        update law and state prior. It establishes topology-sensitive outcomes within
        a toy model while holding node count and degree fixed, not higher-dimensional
        physical geometry, E8 structure, quantum communication, consciousness, or
        any practical routing benefit. Triangle/four-cycle signatures are descriptors,
        not a general graph-isomorphism test.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/polyhedral-ensemble-r26.md"
        target="_blank" rel="noreferrer">POLY-03 protocol ↗</a>
    </div>
  </section>;
}
// Frozen exact uniform-majority results are verified against every connected
// labeled graph by site/tests/polyhedralEnsemble.test.js.
const MAJORITY_BITS={
  'cube':.47437549538726076,
  'four-triangles':.9574523144989763,
  'two-triangles':1.324181611171151,
  'one-triangle':1.5164507163647825,
  'four-squares':1.2489297378455433,
};
function runMajorityValue(id){return MAJORITY_BITS[id];}
