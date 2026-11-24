// Figure 1(a), Dumitrescu et al., arXiv:2107.09676v1. Closed-system circuit model.
export const TIMES=[1,2,3,5,8,13,21,34,55];
export function fibWord(n){if(!Number.isInteger(n)||n<1||n>1000)throw Error('Invalid length');let a='X',b='XZ';while(b.length<n)[a,b]=[b,b+a];return b.slice(0,n);}
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
export function disorder(n,seed,field=1,law='published'){const r=rng(seed);return Object.fromEntries(['X','Z'].map(axis=>[axis,{K:Array.from({length:n/2-1},()=>4*Math.PI*r()),B:Array.from({length:n},()=>{if(law==='published')return Array.from({length:3},()=>Math.PI/Math.sqrt(3)*r()*field);const m=4*Math.PI*r()*field,z=2*r()-1,p=2*Math.PI*r(),s=Math.sqrt(1-z*z);return [m*s*Math.cos(p),m*s*Math.sin(p),m*z];})}]));}
export function gates(n,axis,J,d,variant='full'){
 const g=[];for(let q=0;q<n;q+=2)g.push({kind:axis+axis,q,t:J});
 if(variant!=='noAKLT')for(let q=1;q<n-1;q+=2)g.push({kind:axis+axis,q,t:d[axis].K[(q-1)/2]});
 for(let q=0;q<n;q++)g.push({kind:'B',q,v:d[axis].B[q]});return g;
}
export function product(n,axis,bits){const r=new Float64Array(2**n),i=new Float64Array(2**n);if(axis==='Z')r[bits]=1;else for(let k=0;k<r.length;k++){let p=k&bits,sign=1;while(p){sign=-sign;p&=p-1;}r[k]=sign/Math.sqrt(r.length);}return {r,i};}
export function apply(s,g){
 const {r,i}=s,q=g.q,m=1<<q;
 if(g.kind==='ZZ'){const c=Math.cos(g.t/2),h=Math.sin(g.t/2);for(let a=0;a<r.length;a++){const z=((a>>q)^(a>>(q+1)))&1?-1:1,ar=r[a],ai=i[a];r[a]=c*ar+z*h*ai;i[a]=c*ai-z*h*ar;}return;}
 if(g.kind==='XX'){const c=Math.cos(g.t/2),h=Math.sin(g.t/2),mask=m|(m<<1);for(let a=0;a<r.length;a++){const b=a^mask;if(a>b)continue;const ar=r[a],ai=i[a],br=r[b],bi=i[b];r[a]=c*ar+h*bi;i[a]=c*ai-h*br;r[b]=c*br+h*ai;i[b]=c*bi-h*ar;}return;}
 if(g.kind!=='B')throw Error('Unknown gate');
 const t=Math.hypot(...g.v);if(t===0)return;
 const c=Math.cos(t/2),h=Math.sin(t/2),[x,y,z]=g.v.map(v=>v/t*h);
 for(let a=0;a<r.length;a++){if(a&m)continue;const b=a|m,ar=r[a],ai=i[a],br=r[b],bi=i[b];
 r[a]=c*ar+z*ai-y*br+x*bi;i[a]=c*ai-z*ar-y*bi-x*br;
 r[b]=c*br-z*bi+y*ar+x*ai;i[b]=c*bi+z*br+y*ai-x*ar;}
}
export function expectation(s,q,axis){let out=0,m=1<<q;for(let a=0;a<s.r.length;a++){if(a&m)continue;const b=a|m;out+=axis==='X'?2*(s.r[a]*s.r[b]+s.i[a]*s.i[b]):s.r[a]**2+s.i[a]**2-s.r[b]**2-s.i[b]**2;}return out;}
export function norm(s){return s.r.reduce((a,v,j)=>a+v*v+s.i[j]*s.i[j],0);}
export function paritySign(word,axis){return [...word].filter(c=>c!==axis).length%2?-1:1;}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
export function compare({n=6,seed=369,J=.95,field=1,samples=8,depth=9,law='published'}={}){
 if(!['published','preprint'].includes(law)||![4,6,8,10].includes(n)||!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isFinite(J)||J<0||J>1.2||!Number.isFinite(field)||field<0||field>1||!Number.isInteger(samples)||samples<1||samples>32||!Number.isInteger(depth)||depth<1||depth>9)throw Error('Invalid E2 settings');
 const times=TIMES.slice(0,depth),length=times.at(-1),word=fibWord(length),r=rng(seed^0x9e3779b9),d=disorder(n,seed,field,law);
 const bits=n===4?Array.from({length:16},(_,i)=>i):Array.from({length:samples},()=>Math.floor(r()*2**n));
 const words={fibonacci:word,alternating:'XZ'.repeat(length).slice(0,length),shuffled:(()=>{let a=[...word],r=rng(seed^0x12345678);for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.join('');})(),noAKLT:word};
 const rows=Object.entries(words).map(([name,sequence])=>{
   const byAxis={};let maxNormError=0;
   const layers=Object.fromEntries(['X','Z'].map(a=>[a,gates(n,a,J*Math.PI,d,name==='noAKLT'?'noAKLT':'full')]));
   for(const axis of ['X','Z']){
     const trace=times.map((t,k)=>({t,index:k+1,sign:paritySign(sequence.slice(0,t),axis),sites:Array(n).fill(0)}));
     for(const b of bits){const s=product(n,axis,b);let k=0;for(let t=0;t<length;t++){for(const g of layers[sequence[t]])apply(s,g);if(t+1===times[k]){maxNormError=Math.max(maxNormError,Math.abs(norm(s)-1));for(let q=0;q<n;q++)trace[k].sites[q]+=expectation(s,q,axis)*(b&(1<<q)?-1:1)/bits.length;k++;}}}
     byAxis[axis]=trace.map(p=>({...p,edge:mean([p.sites[0],p.sites[n-1]]),bulk:mean(p.sites.slice(1,-1)),alignedEdge:p.sign*mean([p.sites[0],p.sites[n-1]]),alignedBulk:p.sign*mean(p.sites.slice(1,-1))}));
   }
   return {name,sequence,counts:{X:[...sequence].filter(x=>x==='X').length,Z:[...sequence].filter(x=>x==='Z').length},maxNormError,byAxis};
 });
 return {schema:'aqd-e2-v1',source:'Nature 607, 463–467 (2022), Fig.1; arXiv v1 circuit schematic',law,n,seed,J,field,samples:bits.length,exactBasis:n===4,depth,times,bits,disorder:d,rows};
}
