import {useMemo,useState} from 'react';
import {POLYHEDRA} from './polyhedralKeyhole.js';
import {RULES,PRIORS,runPoly02,poly02Sweep} from './polyhedralRobustness.js';
import './polyhedralRobustness.css';

function exportRecord(value){
  const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='altermath-r25-poly02-factorial.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function EntropyMeter({label,value,variant='canonical'}){
  const bounded=Math.max(0,Math.min(100,value/3*100));
  return <div className="r25-meter">
    <div className="r25-meter-label"><span>{label}</span><strong>{value.toFixed(5)} bits</strong></div>
    <div className="r25-meter-track"><div className={variant==='control'?'r25-control-bar':''}
      style={{width:bounded+'%'}}/></div>
  </div>;
}
function Stat({label,value,detail}){
  return <div className="r25-stat"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>;
}
function RuleGlyph({rule}){
  const choices={majority:'Σ',parity:'Π',inertia:'≋',identity:'='};
  return <span className="r25-glyph" aria-hidden="true">{choices[rule]}</span>;
}

export default function PolyhedralRobustnessLab(){
  const [id,setId]=useState('octahedron');
  const [rule,setRule]=useState('majority');
  const [prior,setPrior]=useState(0.5);
  const [seed,setSeed]=useState(369);
  const result=useMemo(()=>runPoly02({id,rule,prior,seed,controls:8}),[id,rule,prior,seed]);
  const factorial=useMemo(()=>poly02Sweep({id,seed,controls:8}),[id,seed]);
  const {baseline,controlStats,deltaBits}=result;
  const exportAll=()=>exportRecord({
    ...result,factorial,provenance:{
      methodology:'Exact exhaustive state enumeration with independent Bernoulli prior',
      experiment:'POLY-02',source:'Altermath R25',
      disclaimer:'Synthetic graph-model results; not evidence for physical realms, anomalous effects, or intelligence',
    },
  });
  return <section className="r25-lab" id="polyhedral-robustness" aria-labelledby="r25-title">
    <div className="r25-head">
      <div>
        <div className="micro">RUNG 25 · NBG POLY-02 / ADVERSARIAL ROBUSTNESS</div>
        <h2 id="r25-title">Geometry <em>versus Dynamics</em></h2>
        <p>How much apparent hidden prediction survives when the update rule, state prior, and
          same-sized graph wiring change? All experiments enumerate every binary pocket state.
          None of the values are observations of nature.</p>
      </div>
      <span className="r25-status">EXACT ENUMERATION · AUTHORITY NONE</span>
    </div>
    <div className="r25-layout">
      <div className="r25-parameters">
        <h3>Experimental controls</h3>
        <div className="r25-shape-grid" role="group" aria-label="Select source solid">
          {POLYHEDRA.map(spec=><button key={spec.id} type="button"
            aria-pressed={id===spec.id} className={id===spec.id?'selected':''}
            onClick={()=>setId(spec.id)}>
            <strong>{spec.faces}</strong><span>{spec.label}</span>
          </button>)}
        </div>
        <span className="r25-label">Update rule</span>
        <div className="r25-rules">
          {RULES.map(entry=><button key={entry.id} type="button"
            aria-pressed={rule===entry.id} className={rule===entry.id?'chosen':''}
            onClick={()=>setRule(entry.id)}>
            <RuleGlyph rule={entry.id}/><span><strong>{entry.label}</strong>
              <small>{entry.description}</small></span>
          </button>)}
        </div>
        <div className="r25-pickers">
          <div><span className="r25-label">Initial P(+1) per pocket</span>
            <div className="r25-priors" role="group" aria-label="Bernoulli prior">
              {PRIORS.map(p=><button key={p} className={prior===p?'selected':''}
                aria-pressed={prior===p} onClick={()=>setPrior(p)}>{Math.round(p*100)}%</button>)}
            </div>
          </div>
          <label className="r25-seed">Control seed
            <select value={seed} onChange={e=>setSeed(Number(e.target.value))}>
              <option value="369">369</option><option value="636">636</option><option value="963">963</option>
            </select>
          </label>
        </div>
        <button type="button" className="r25-export" onClick={exportAll}>Export experiment + factorial JSON</button>
        <p className="r25-small">Prior probabilities are independent by pocket. Control rewiring
          preserves pocket count, graph degree, and connectivity; it does not preserve every
          motif or guarantee a distinct unlabeled graph.</p>
      </div>
      <div className="r25-outcomes">
        <div className="r25-results-top">
          <span className="micro">EXACT KEYHOLE METRIC</span>
          <h3>H(next aggregate | current aggregate)</h3>
          <div className="r25-large-number">{baseline.conditionalEntropyBits.toFixed(5)} <span>bits</span></div>
          <p>Conditional uncertainty left after an observer sees only the current sum
            of pocket signs. Larger values mean more hidden future uncertainty, not
            better intelligence or useful performance.</p>
        </div>
        <div className="r25-meters">
          <EntropyMeter label="Original face-adjacency dual graph" value={baseline.conditionalEntropyBits}/>
          <EntropyMeter label="Eight degree-preserving controls · mean"
            value={controlStats.mean} variant="control"/>
        </div>
        <div className="r25-stat-grid">
          <Stat label="Original − control mean" value={(deltaBits>0?'+':'')+deltaBits.toFixed(5)+' bits'}
            detail="Descriptive difference, not statistical significance"/>
          <Stat label="Control span" value={controlStats.min.toFixed(4)+'–'+controlStats.max.toFixed(4)}
            detail="Bits among eight deterministic rewires"/>
          <Stat label="Enumerated states" value={baseline.samples.toLocaleString()}
            detail="Every binary state, no sampling error over masks"/>
          <Stat label="Unique labeled controls" value={result.distinctLabelledControls+'/8'}
            detail="Different edge sets, not necessarily different graph isomorphism classes"/>
        </div>
        {id==='tetrahedron'?<p className="r25-alert">
          The 4-pocket K4 graph cannot be rewired into a different simple, connected, degree-3
          graph. Its eight controls are identical to the original; this comparison cannot
          establish a geometry effect.
        </p>:<p className="r25-caption">
          {result.unchangedControls} of 8 controls retained the exact original labeled
          edge set. Different graph structures may still be isomorphic.
        </p>}
        {rule==='identity'&&<p className="r25-alert">
          Expected null: every state stays fixed, so the visible current total predicts
          the next total exactly. Hidden predictive entropy must equal zero.
        </p>}
      </div>
    </div>
    <div className="r25-sweep">
      <div className="r25-sweep-head">
        <div>
          <div className="micro">PREDECLARED FACTORIAL</div>
          <h3>Four rules × three priors</h3>
          <p>Every cell uses the selected polyhedron and identical control seed schedule.
            Select a row to inspect its complete census and control graphs above.</p>
        </div>
        <span>12 exact scenarios</span>
      </div>
      <div className="r25-table-scroll">
        <table>
          <thead><tr><th>Update rule</th><th>P(+1)</th><th>Original (bits)</th>
            <th>Control mean (bits)</th><th>Delta (bits)</th><th>Inspect</th></tr></thead>
          <tbody>{factorial.rows.map((row,i)=><tr key={i}
            className={row.rule===rule&&row.prior===prior?'r25-highlight':''}>
            <td>{RULES.find(x=>x.id===row.rule).label}</td>
            <td>{Math.round(row.prior*100)}%</td>
            <td>{row.canonicalBits.toFixed(5)}</td>
            <td>{row.matchedControlMeanBits.toFixed(5)}</td>
            <td>{row.deltaBits>0?'+':''}{row.deltaBits.toFixed(5)}</td>
            <td><button type="button" aria-label={'Inspect '+row.rule+' '+Math.round(row.prior*100)+' percent'}
              onClick={()=>{setRule(row.rule);setPrior(row.prior);}}>Inspect</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="r25-boundary">
      <p><strong>Research boundary:</strong> The different solids change face count, graph
        size, and often node degree. Matched rewires are only local controls; they are not
        a representative sample of all possible graphs. Identity, parity, and inertia
        checks probe model assumptions rather than establishing new physics.
        No claim about E8, dimensional realms, quantum communications, consciousness,
        or a working PocketMesh improvement follows from these simulations.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/polyhedral-robustness-r25.md"
        target="_blank" rel="noreferrer">POLY-02 protocol ↗</a>
    </div>
  </section>;
}
