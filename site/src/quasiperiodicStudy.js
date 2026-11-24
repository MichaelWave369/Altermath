import {trial} from './quasiperiodic.js';
export const FAMILIES=['periodic','fibonacci','thue-morse','369','nested'];
export const LENGTHS=[34,55,89];
export const MODES=['none','static','jitter','combined'];
export const SEEDS={exploratory:[369,636,963],holdout:[1369,1636,1963,2369,2636,2963]};
const KEYS=['quantum','classical','edge','edgeClean','edgePenalty','bulk'];
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
export function rawWord(family,n){
 if(!FAMILIES.includes(family)||!Number.isInteger(n)||n<1||n>1000)throw Error('Invalid grammar request');
 if(family==='fibonacci'){let a='A',b='AB';while(b.length<n)[a,b]=[b,b+a];return b.slice(0,n);}
 if(family==='nested'){let a='A',b='B';while(a.length<n)[a,b]=[a+b+a+b+a,b+a+b+a+b];return a.slice(0,n);}
 if(family==='thue-morse')return Array.from({length:n},(_,i)=>i.toString(2).split('1').length%2?'A':'B').join('');
 const unit=family==='periodic'?'AABAABAB':'AAABBBAAAAAABBBBBBAAAAAAAAABBBBBBBBB';
 return unit.repeat(Math.ceil(n/unit.length)).slice(0,n);
}
export function shuffleWord(word,seed){
 const a=[...word],random=rng(seed);
 for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 return a.join('');
}
function summarize(trace){
 const out=Object.fromEntries(KEYS.filter(k=>k!=='edgePenalty').map(k=>[k,mean(trace.map(t=>t[k]))]));
 out.edgePenalty=out.edge-out.edgeClean;
 out.maxNormError=Math.max(...trace.map(t=>t.normError));return out;
}
export function bootstrap(values,seed){
 const random=rng(seed),samples=Array.from({length:512},()=>mean(values.map(()=>values[Math.floor(random()*values.length)]))).sort((a,b)=>a-b);
 return {mean:mean(values),low:samples[12],high:samples[499],wins:values.filter(x=>x>1e-10).length,losses:values.filter(x=>x< -1e-10).length,ties:values.filter(x=>Math.abs(x)<=1e-10).length};
}
export function study({qubits=3,noise=.04,lengths=LENGTHS,modes=MODES,families=FAMILIES}={}){
 if(!Number.isInteger(qubits)||qubits<2||qubits>6||!Number.isFinite(noise)||noise<0||noise>.25||!lengths.length||lengths.some(n=>!LENGTHS.includes(n))||!modes.length||modes.some(m=>!MODES.includes(m))||!families.length||families.some(f=>!FAMILIES.includes(f)))throw Error('Invalid study configuration');
 const rows=[];
 for(const family of families)for(const length of lengths)for(const mode of modes){
   const word=rawWord(family,length),counts={A:[...word].filter(c=>c==='A').length,B:[...word].filter(c=>c==='B').length};
   for(const [split,seeds] of Object.entries(SEEDS)){
    const pairs=seeds.map(seed=>{
      const raw=summarize(trial(word,qubits,noise,seed,mode));
      const controls=Array.from({length:3},(_,i)=>{
        const shuffleSeed=(seed^Math.imul(i+1,2654435761)^Math.imul(length,1597334677)^Math.imul(FAMILIES.indexOf(family)+1,2246822519))>>>0;
        const shuffled=shuffleWord(word,shuffleSeed);
        return {shuffleSeed,word:shuffled,metrics:summarize(trial(shuffled,qubits,noise,seed,mode))};
      });
      const controlMean=Object.fromEntries(KEYS.map(k=>[k,mean(controls.map(c=>c.metrics[k]))]));
      const delta=Object.fromEntries(KEYS.map(k=>[k,raw[k]-controlMean[k]]));
      return {seed,raw,controls,controlMean,delta};
    });
    const stats=Object.fromEntries(KEYS.map((k,i)=>[k,bootstrap(pairs.map(p=>p.delta[k]),(length*1009+FAMILIES.indexOf(family)*197+MODES.indexOf(mode)*31+i+(split==='holdout'?99991:0))>>>0)]));
    rows.push({family,length,mode,split,word,counts,pairs,stats});
   }
 }
 return {schema:'aqd-e1-v1',model:'synthetic E0 Hamiltonian, raw words versus count-matched shuffled controls',qubits,noise,lengths,modes,families,seeds:SEEDS,controlsPerSeed:3,bootstrapReplicates:512,rows};
}
