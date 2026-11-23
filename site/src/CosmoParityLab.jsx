import {useMemo,useState} from 'react';
import {
  COSMO03_POLICIES,COSMO03_BUDGETS,COSMO03_SEEDS,COSMO03_RESERVED_PAIRS,
  cosmo03Score,cosmo03Report,cosmo03Example
} from '../../src/cosmo03.js';
import './cosmoParity.css';

function num(n,d=4){return Number(n).toFixed(d);}
function pct(n){return num(n*100,1)+'%';}
function download(report){
  const body=JSON.stringify(report,null,2)+'\n';
  const blob=new Blob([body],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;
  link.download='altermath-r31-cosmo03-equal-observation.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const policyLabels={fixed:'Fixed A3/B0',random:'Seeded random',targeted:'Donor-aware oracle'};
function Metric({label,value,caption}){
  return <div className="cosmo03-metric">
    <small>{label}</small><strong>{value}</strong><span>{caption}</span>
  </div>;
}
function DomainDiagram({a,b,sensors}){
  const bits=Array.from({length:8},(_,i)=>i);
  return <div className="cosmo03-diagram" aria-label="Two parent domains with one donor each, and a synthetic child made from their original signals">
    {['A','B'].map((name,g)=><div className="cosmo03-parent" key={name}>
      <div className="cosmo03-parent-title"><strong>Parent {name}</strong><small>4 original bits</small></div>
      <div className="cosmo03-bitrow">{bits.slice(4*g,4*g+4).map(i=>{
        const isDonor=i===(g===0?a:4+b);
        const seen=sensors.includes(i);
        return <div className={'cosmo03-bit '+(isDonor?'donor ':'')+(seen?'seen':'')} key={i}
          title={(isDonor?'Inherited by child; ':'')+(seen?'observed sensor':'not directly sensed')}>
          {name}{i%4}<span>{seen?'sense':' '}</span>
        </div>;
      })}</div>
    </div>)}
    <div className="cosmo03-child">
      <span>↙</span><div><strong>Child C</strong><small>References A{a} and B{b}</small></div><span>↘</span>
    </div>
  </div>;
}
export default function CosmoParityLab(){
  const [a,setA]=useState(3);
  const [b,setB]=useState(0);
  const [budget,setBudget]=useState(2);
  const [policy,setPolicy]=useState('fixed');
  const [seed,setSeed]=useState(369);
  const selected=useMemo(()=>cosmo03Score({a,b,budget,policy,seed}),[a,b,budget,policy,seed]);
  const study=useMemo(()=>cosmo03Report({seed}),[seed]);
  const peer=useMemo(()=>cosmo03Score({a,b,budget,policy:'targeted',seed}),[a,b,budget,seed]);
  const serialized=useMemo(()=>cosmo03Example(165,a,b),[a,b]);
  const rows=study.results.filter(r=>r.policy===policy&&r.budget===budget);
  const split=COSMO03_RESERVED_PAIRS.includes(a+':'+b)?'Reserved-geometry challenge':'Development geometry';
  return <section className="cosmo03-lab" id="cosmo03" aria-labelledby="cosmo03-title">
    <div className="cosmo03-heading">
      <div>
        <div className="micro">RUNG 31 · COSMO-03 / EQUALLY OBSERVED REPRESENTATIONS</div>
        <h2 id="cosmo03-title">Is nesting smarter? <em>Make it prove it.</em></h2>
        <p>Two different ways to encode exactly the same eight signal bits. The flat model
          stores a bit mask and two donor indices. The nested model adds parent and child
          metadata. Both receive the identical observation budget and exact analytic rules.</p>
      </div>
      <span className="cosmo03-status">SYNTHETIC · NO PHYSICAL CLAIMS</span>
    </div>
    <div className="cosmo03-controls">
      <label>Donor from parent A
        <select value={a} onChange={e=>setA(Number(e.target.value))}>
          {[0,1,2,3].map(i=><option key={i} value={i}>A{i}</option>)}
        </select>
      </label>
      <label>Donor from parent B
        <select value={b} onChange={e=>setB(Number(e.target.value))}>
          {[0,1,2,3].map(i=><option key={i} value={i}>B{i}</option>)}
        </select>
      </label>
      <label>Extra sensor budget
        <select value={budget} onChange={e=>setBudget(Number(e.target.value))}>
          {COSMO03_BUDGETS.map(k=><option value={k} key={k}>{k} raw bit{k===1?'':'s'}</option>)}
        </select>
      </label>
      <label>Sensor policy
        <select value={policy} onChange={e=>setPolicy(e.target.value)}>
          {COSMO03_POLICIES.map(x=><option value={x} key={x}>{policyLabels[x]}</option>)}
        </select>
      </label>
      <label>Deterministic random seed
        <select value={seed} onChange={e=>setSeed(Number(e.target.value))}>
          {COSMO03_SEEDS.map(k=><option key={k} value={k}>{k}</option>)}
        </select>
      </label>
    </div>
    <div className="cosmo03-panels">
      <div className="cosmo03-panel">
        <div className="cosmo03-panelhead"><h3>One state, two equivalent encodings</h3><span>{split}</span></div>
        <DomainDiagram a={a} b={b} sensors={selected.sensors}/>
        <p className="cosmo03-footnote">Highlighted donors affect the child's starting signal count.
          Only pockets tagged "sense" cost direct observational bits. The child node is a
          logical container, not an extra token or spacetime region.</p>
      </div>
      <div className="cosmo03-panel">
        <div className="cosmo03-panelhead"><h3>Exact predictive comparison</h3><span>{selected.states} complete states</span></div>
        <div className="cosmo03-compare">
          <div><small>Flat forecast</small><strong>{pct(selected.flat.accuracy)}</strong>
            <div className="cosmo03-bar"><div style={{width:pct(selected.flat.accuracy)}}/></div>
            <span>H = {num(selected.flat.entropyBits)} bits</span></div>
          <div><small>Nested forecast</small><strong>{pct(selected.nested.accuracy)}</strong>
            <div className="cosmo03-bar"><div style={{width:pct(selected.nested.accuracy)}}/></div>
            <span>H = {num(selected.nested.entropyBits)} bits</span></div>
        </div>
        <div className="cosmo03-metrics">
          <Metric label="Prediction mismatches" value={selected.mismatchCount}
            caption="Flat vs nested, all 256 starting masks"/>
          <Metric label="Sensor positions" value={selected.sensors.map(i=>(i<4?'A':'B')+(i%4)).join(' + ')||'None'}
            caption={'Exactly '+budget+' extra raw observations'}/>
          <Metric label="Donor-aware oracle accuracy" value={pct(peer.flat.accuracy)}
            caption="Metadata-informed sensor placement, not nesting benefit"/>
          <Metric label="Analytic log loss" value={num(selected.flat.logLossBits)+' bits'}
            caption="Exact uniform-prior conditional predictor"/>
        </div>
      </div>
    </div>
    <div className="cosmo03-bottom">
      <div className="cosmo03-panel">
        <div className="cosmo03-panelhead"><h3>All 16 donor configurations</h3><span>Four prespecified reserved geometries</span></div>
        <div className="cosmo03-table-wrap"><table>
          <thead><tr><th>Donors</th><th>Group</th><th>Flat</th><th>Nested</th><th>Mismatch</th></tr></thead>
          <tbody>{rows.map(r=><tr key={r.donorPair.join(':')}
            className={a===r.donorPair[0]&&b===r.donorPair[1]?'selected':''}>
            <td><button type="button" onClick={()=>{setA(r.donorPair[0]);setB(r.donorPair[1]);}}>
              A{r.donorPair[0]} + B{r.donorPair[1]}</button></td>
            <td>{r.split==='reserved'?'Reserved':'Development'}</td>
            <td>{pct(r.flat.accuracy)}</td><td>{pct(r.nested.accuracy)}</td>
            <td>{r.mismatchCount}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
      <div className="cosmo03-panel">
        <div className="cosmo03-panelhead"><h3>Data and architecture costs</h3><span>JSON snapshot only</span></div>
        <div className="cosmo03-metrics">
          <Metric label="Total study conditions" value={study.conditions} caption="16 pairs × 3 budgets × 3 policies"/>
          <Metric label="State evaluations / model" value={study.stateEvaluationsPerRepresentation.toLocaleString()}
            caption="Exact, not randomly sampled"/>
          <Metric label="Flat JSON bytes" value={serialized.flatJsonBytes} caption="Mask and donor index fields"/>
          <Metric label="Nested JSON bytes" value={serialized.nestedJsonBytes} caption="Parent and child metadata included"/>
        </div>
        <p className="cosmo03-footnote">Serialization length is not a RAM, latency or energy benchmark.
          There is no training step; these are analytic Bayes-optimal predictions for a
          known toy-model rule. The reserved donor geometries weren't used to tune
          a learner, but this is not real-world out-of-distribution validation.</p>
        <button type="button" className="cosmo03-export" onClick={()=>download({
          authority:study.authority,selected,donorAwareOracle:peer,fullStudy:study,
          exampleJsonStorage:serialized
        })}>Export exact census JSON</button>
      </div>
    </div>
    <div className="cosmo03-boundary">
      <p><strong>Interpretation:</strong> If flat and nested predictions tie under equal
        information, the hierarchy alone has not demonstrated an advantage. If a
        donor-aware sensor policy wins over fixed/random sensors, that is a benefit
        of knowing which bits matter, not proof that child containers create
        intelligence or new physical information. No gravity equations, bulk
        dimensions, black-hole filaments or universe origins are modeled.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/cosmo03.md"
        target="_blank" rel="noreferrer">Read COSMO-03 protocol ↗</a>
    </div>
  </section>;
}
