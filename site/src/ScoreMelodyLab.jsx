import {useMemo,useState} from 'react';
import {runMelodyStudy} from './scoreMelody.js';
import './scoreMelody.css';

function downloadRecord(record){
  const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='altermath-r23-score-melody.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Original eight-note motif, synthesized only on a direct user gesture. */
async function playMotif(notes,waveform){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)throw new Error('This browser does not support Web Audio');
  const ctx=new Audio();
  try{
    await ctx.resume();
    let start=ctx.currentTime+0.06;
    for(const note of notes){
      const length=note.beats*0.22;
      const oscillator=ctx.createOscillator();
      const envelope=ctx.createGain();
      oscillator.type=waveform;
      oscillator.frequency.value=261.625565*Math.pow(2,note.semitone/12);
      envelope.gain.setValueAtTime(0.0001,start);
      envelope.gain.exponentialRampToValueAtTime(0.13,start+0.015);
      envelope.gain.exponentialRampToValueAtTime(0.0001,start+Math.max(0.025,length-0.01));
      oscillator.connect(envelope);envelope.connect(ctx.destination);
      oscillator.start(start);oscillator.stop(start+length);
      start+=length;
    }
    // Allow all scheduled notes to finish before releasing the audio device.
    setTimeout(()=>{ctx.close().catch(()=>{});},Math.ceil((start-ctx.currentTime)*1000)+250);
  }catch(error){
    await ctx.close().catch(()=>{});
    throw error;
  }
}

function PianoRoll({events,color,label}){
  const total=events.reduce((sum,n)=>sum+n.beats,0);
  let beat=0;
  const bars=events.map(n=>{
    const start=beat;beat+=n.beats;
    return {...n,start};
  });
  const minPitch=Math.min(...events.map(n=>n.semitone));
  const maxPitch=Math.max(...events.map(n=>n.semitone));
  return <svg className="r23-roll" viewBox="0 0 560 170" role="img" aria-label={label}>
    <rect width="560" height="170" rx="12" fill="#07141d"/>
    {[28,63,98,133].map(y=><line key={y} x1="24" y1={y} x2="540" y2={y} stroke="#698497" strokeOpacity=".2"/>)}
    {Array.from({length:9},(_,i)=><line key={i} x1={24+i*64.5} y1="18" x2={24+i*64.5} y2="147" stroke="#698497" strokeOpacity=".12"/>)}
    {bars.map(n=>{
      const x=26+n.start/total*510;
      const width=Math.max(5,n.beats/total*510-4);
      const y=125-(n.semitone-minPitch)/Math.max(1,maxPitch-minPitch)*92;
      return <g key={n.index}>
        <rect x={x} y={y} width={width} height="14" rx="4" fill={color} fillOpacity=".8" stroke="#d8e8ee" strokeOpacity=".26"/>
        <text x={x+width/2} y={y-5} fill="#e1ebef" fontSize="10" textAnchor="middle">{n.semitone}</text>
      </g>;
    })}
    <text x="27" y="160" fill="#91a8b5" fontSize="10">relative time →</text>
    <text x="535" y="160" fill="#91a8b5" fontSize="10" textAnchor="end">{total.toFixed(2)} beat units</text>
  </svg>;
}

function Metric({label,value,detail}){
  return <div className="r23-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function Range({label,id,value,min,max,step=1,onChange,display}){
  return <label className="r23-range" htmlFor={id}>
    <span>{label}<output htmlFor={id}>{display??value}</output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
  </label>;
}

export default function ScoreMelodyLab(){
  const [transpose,setTranspose]=useState(7);
  const [tempo,setTempo]=useState(1.25);
  const [phaseOffset,setPhaseOffset]=useState(0);
  const [phaseJitter,setPhaseJitter]=useState(0);
  const [mutation,setMutation]=useState(0);
  const [gate,setGate]=useState(true);
  const [seed,setSeed]=useState(369);
  const [audioStatus,setAudioStatus]=useState('');
  const result=useMemo(()=>runMelodyStudy({
    transpose,tempo,phaseOffset,phaseJitter,mutation,gate,seed,
  }),[transpose,tempo,phaseOffset,phaseJitter,mutation,gate,seed]);
  const reset=()=>{setTranspose(7);setTempo(1.25);setPhaseOffset(0);setPhaseJitter(0);
    setMutation(0);setGate(true);setSeed(369);setAudioStatus('');};
  const play=async(type)=>{
    setAudioStatus('');
    try{
      await playMotif(type==='source'?result.score.source:result.score.candidate,type==='source'?'sine':'triangle');
      setAudioStatus(type==='source'?'Playing source motif (sine).':'Playing candidate motif (triangle).');
    }catch(error){setAudioStatus('Audio unavailable: '+error.message);}
  };
  const k=result.keyhole;
  return <section className="r23-lab" id="score-melody" aria-labelledby="r23-title">
    <div className="r23-heading">
      <div><span className="micro">RUNG 23 · MUSICAL INFORMATION CONTINUITY</span>
        <h2 id="r23-title">The Spark Is <em>the Melody</em></h2>
        <p>Score → Gears → Bubbles → Melody. Different instruments can play the same relational pattern.
          Test when the pattern remains intact, when timing misses the keyhole, and when transfer is refused.</p></div>
      <span className="r23-tag">EXPLICIT TOY MODEL · NOT PHYSICAL EVIDENCE</span>
    </div>
    <div className="r23-schema" aria-label="Conceptual pipeline">
      <div><strong>01 · SCORE</strong><small>Original eight-note motif</small></div>
      <span aria-hidden="true">→</span>
      <div><strong>02 · GEARS</strong><small>Six timing teeth</small></div>
      <span aria-hidden="true">→</span>
      <div><strong>03 · BUBBLES</strong><small>Two instrumental encodings</small></div>
      <span aria-hidden="true">→</span>
      <div><strong>04 · MELODY</strong><small>Normalized interval + rhythm signature</small></div>
    </div>
    <div className="r23-layout">
      <div className="r23-stage">
        <div className="r23-roll-head"><div><span className="micro">BUBBLE A · SOURCE PERFORMANCE</span><h3>Reference score</h3></div>
          <button type="button" onClick={()=>play('source')}>♫ Play source</button></div>
        <PianoRoll events={result.score.source} color="#80d8ce" label="Source piano roll, eight notes with their relative pitch and duration"/>
        <div className="r23-roll-head"><div><span className="micro">BUBBLE B · RE-ENCODED PERFORMANCE</span><h3>Candidate score</h3></div>
          <button type="button" onClick={()=>play('candidate')}>♫ Play candidate</button></div>
        <PianoRoll events={result.score.candidate} color="#e5b977" label="Transposed, tempo-modified and optionally mutated candidate piano roll"/>
        <p className="r23-note" role="status">{audioStatus||'Listen to an original synthesized motif in two timbres. Playback is optional and gesture-activated.'}</p>
        <div className={k.transferred?'r23-keyhole passed':'r23-keyhole blocked'} aria-live="polite">
          <span className="r23-key-icon" aria-hidden="true">{k.transferred?'◇':'✕'}</span>
          <div><span className="micro">KEYHOLE / INTERFACE CHECK</span>
            <h3>{k.transferred?'Pattern compatible · gate open':'Transfer refused'}</h3>
            <p>{k.transferred?'The declared musical invariant survives; timing and policy conditions pass.':k.reasons.join(' · ')}</p></div>
        </div>
      </div>
      <aside className="r23-controls" aria-label="Rung 23 experimental controls">
        <h3>Compose the transition</h3>
        <p>Alter the second instrument without editing the source. Separate valid transformations from genuine score corruption.</p>
        <Range id="r23-transpose" label="Key shift" value={transpose} min={-12} max={12} onChange={setTranspose} display={(transpose>0?'+':'')+transpose+' semitones'}/>
        <Range id="r23-tempo" label="Duration scale" value={tempo} min={0.5} max={2} step={0.05} onChange={setTempo} display={tempo.toFixed(2)+'×'}/>
        <Range id="r23-phase" label="Gear phase offset" value={phaseOffset} min={0} max={180} step={5} onChange={setPhaseOffset} display={phaseOffset+'°'}/>
        <Range id="r23-jitter" label="Gear phase jitter" value={phaseJitter} min={0} max={60} step={5} onChange={setPhaseJitter} display={phaseJitter+'°'}/>
        <Range id="r23-mutation" label="Corrupt one note" value={mutation} min={0} max={3} onChange={setMutation} display={mutation===0?'None':'+'+mutation+' semitones'}/>
        <label className="r23-switch"><input type="checkbox" checked={gate} onChange={e=>setGate(e.target.checked)}/><span>Boundary permission open</span></label>
        <div className="r23-buttons">
          <button type="button" onClick={()=>setSeed(s=>s===369?963:369)}>Seed {seed} · switch</button>
          <button type="button" onClick={reset}>Reset</button>
          <button type="button" className="r23-export" onClick={()=>downloadRecord(result)}>Export JSON ↗</button>
        </div>
      </aside>
    </div>
    <div className="r23-metrics">
      <Metric label="MELODIC SIGNATURE ERROR" value={k.signatureError.toFixed(3)} detail="0 = preserved normalized note intervals and beat ratios"/>
      <Metric label="GEAR ALIGNMENT" value={(result.gears.alignment*100).toFixed(1)+'%' } detail="Compared with the source phase, not merely internal coherence"/>
      <Metric label="GEAR COHERENCE" value={(result.gears.coherence*100).toFixed(1)+'%'} detail="Concentration of six relative phase offsets"/>
      <Metric label="INTERFACE RESULT" value={k.transferred?'PASS':'REFUSED'} detail={k.policyAllowed?'Boundary permitted':'Boundary closed'}/>
    </div>
    <div className="r23-foot">
      <p><strong>Interpretation boundary:</strong> Here, “Spark” means a recognizable musical-information pattern, not a soul.
        A copied or re-rendered melody is not proof that subjective experience continues through death or rebirth.
        Alignment is a synthetic timing check; permission is a software policy.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/score-gears-melody-r23.md" target="_blank" rel="noreferrer">Method, controls, and limitations ↗</a>
    </div>
  </section>;
}
