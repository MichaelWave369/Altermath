export const NAMES=["periodic","random","fibonacci","thue-morse","369","nested"];
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}

function fibonacci(n){let a="A",b="AB";while(b.length<n){[a,b]=[b,b+a];}return b.slice(0,n);}

function nested(n){let a="A",b="B";while(a.length<n){[a,b]=[a+b+a+b+a,b+a+b+a+b];}return a.slice(0,n);}

function fit(s,target){let a=[...s],k=a.filter(c=>c==="A").length,from=k>target?"A":"B",diff=Math.abs(k-target),ix=a.map((c,i)=>c===from?i:-1).filter(i=>i>=0);for(let j=0;j<diff;j++)a[ix[Math.floor((j+.5)*ix.length/diff)]]=from==="A"?"B":"A";return {word:a.join(""),edits:diff};}

export function schedules(seed){const n=120,target=75,raw={periodic:"AABAABAB".repeat(15),fibonacci:fibonacci(n),"thue-morse":Array.from({length:n},(_,i)=>i.toString(2).split("1").length%2?"A":"B").join(""),"369":"AAABBBAAAAAABBBBBBAAAAAAAAABBBBBBBBB".repeat(4).slice(0,n),nested:nested(n)};const random=rng(seed^0x93);let a=[..."A".repeat(target)+"B".repeat(n-target)];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}raw.random=a.join("");return NAMES.map(name=>({name,raw:raw[name],...fit(raw[name],target)}));}

function rotate(v,axis,t){const [x,y,z]=v,c=Math.cos(t),s=Math.sin(t);return axis==="X"?[x,c*y-s*z,s*y+c*z]:[c*x-s*y,s*x+c*y,z];}

function spin(n,flip=false){const s={r:new Float64Array(2**n),i:new Float64Array(2**n)};s.r[flip?1:0]=1;return s;}

function rx(s,q,t){const c=Math.cos(t/2),h=Math.sin(t/2),m=1<<q;for(let a=0;a<s.r.length;a++){if(a&m)continue;let b=a|m,ar=s.r[a],ai=s.i[a],br=s.r[b],bi=s.i[b];s.r[a]=c*ar+h*bi;s.i[a]=c*ai-h*br;s.r[b]=c*br+h*ai;s.i[b]=c*bi-h*ar;}}

function phase(s,t,sign){for(let j=0;j<s.r.length;j++){let p=-t*sign(j)/2,c=Math.cos(p),h=Math.sin(p),r=s.r[j],i=s.i[j];s.r[j]=c*r-h*i;s.i[j]=h*r+c*i;}}

function rz(s,q,t){phase(s,t,j=>j&(1<<q)?-1:1);}

function zz(s,q,t){phase(s,t,j=>((j>>q)^(j>>(q+1)))&1?-1:1);}

function overlap(a,b){let r=0,i=0;for(let j=0;j<a.r.length;j++){r+=a.r[j]*b.r[j]+a.i[j]*b.i[j];i+=a.r[j]*b.i[j]-a.i[j]*b.r[j];}return Math.min(1,r*r+i*i);}

function norm(s){return s.r.reduce((a,v,i)=>a+v*v+s.i[i]*s.i[i],0);}

function bloch(s,q){let x=0,y=0,z=0,m=1<<q;for(let a=0;a<s.r.length;a++){if(a&m)continue;let b=a|m;x+=2*(s.r[a]*s.r[b]+s.i[a]*s.i[b]);y+=2*(s.r[a]*s.i[b]-s.i[a]*s.r[b]);z+=s.r[a]**2+s.i[a]**2-s.r[b]**2-s.i[b]**2;}return [x,y,z];}

function edgeDistance(a,b,q){let x=bloch(a,q),y=bloch(b,q);return Math.min(1,Math.hypot(...x.map((v,i)=>v-y[i]))/2);}

function quantumStep(s,n,op,err,jitter){for(let q=0;q<n;q++){(op==="A"?rx:rz)(s,q,Math.PI+err+jitter[q]);rx(s,q,.11+err*.5);rz(s,q,.17+err*(q+1)/n);}for(let q=0;q<n-1;q++)zz(s,q,.21);}

function classicalStep(v,op,err,jitter){return rotate(rotate(rotate(v,op==="A"?"X":"Z",Math.PI+err+jitter),"X",.11+err*.5),"Z",.17+err);}

export function trial(word,n,noise,seed,mode="combined"){if(!["none","static","jitter","combined"].includes(mode))throw Error("Unknown noise mode");const rand=rng(seed),bias=2*rand()-1,zeros=Array(n).fill(0),ideal=spin(n),noisy=spin(n),opposite=spin(n,true),idealOpposite=spin(n,true);let c=[0,0,1],d=[0,0,1],trace=[];for(let t=0;t<word.length;t++){let op=word[t],e=(mode==="static"||mode==="combined")?noise*bias:0,j=Array.from({length:n},()=>{const sample=noise*(2*rand()-1);return mode==="jitter"||mode==="combined"?sample:0;});quantumStep(ideal,n,op,0,zeros);quantumStep(idealOpposite,n,op,0,zeros);quantumStep(noisy,n,op,e,j);quantumStep(opposite,n,op,e,j);c=classicalStep(c,op,0,0);d=classicalStep(d,op,e,j[0]);trace.push({step:t+1,quantum:overlap(ideal,noisy),classical:Math.max(0,Math.min(1,(1+c.reduce((a,x,i)=>a+x*d[i],0))/2)),edge:edgeDistance(noisy,opposite,0),edgeClean:edgeDistance(ideal,idealOpposite,0),bulk:edgeDistance(noisy,opposite,Math.floor(n/2)),normError:Math.max(...[ideal,noisy,opposite,idealOpposite].map(s=>Math.abs(norm(s)-1)))});}return trace;}

export function run({seed=369,qubits=4,noise=.04,trials=3}={}){if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(qubits)||qubits<2||qubits>10||!Number.isFinite(noise)||noise<0||noise>.25||!Number.isInteger(trials)||trials<1||trials>9)throw Error("Invalid experiment parameters");let rows=schedules(seed).map(s=>{let repeats=Array.from({length:trials},(_,i)=>trial(s.word,qubits,noise,(seed+Math.imul(i+1,2654435761))>>>0));let mean=key=>repeats.reduce((a,r)=>a+r.reduce((b,p)=>b+p[key],0)/r.length,0)/trials;return {...s,quantum:mean("quantum"),classical:mean("classical"),edge:mean("edge"),edgeClean:mean("edgeClean"),bulk:mean("bulk"),repeats};});let ref=rows[0];for(let row of rows){row.deltaQuantum=row.quantum-ref.quantum;row.deltaClassical=row.classical-ref.classical;}return {model:"AQD-E0 toy driven chain; not Nature replication",seed,qubits,noise,trials,steps:120,counts:{A:75,B:45},rows};}
