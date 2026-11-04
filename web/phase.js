import {createPhaseWorld,phaseMetrics,stepPhase,setGate,benchmark} from '../src/phase-network.js';
import {inDifferentBubble} from '../src/phase-geometry.js';
const $ = id => document.getElementById(id);
const SVG='http://www.w3.org/2000/svg';
const make=(tag,attrs={},label)=>{const e=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(label!==undefined)e.textContent=String(label);return e;};
const color=theta=>`hsl(${Math.round(theta*180/Math.PI)},85%,67%)`;
let world=createPhaseWorld(),playing=false,interval=null;
let history=[phaseMetrics(world).order];
function project4d(id,angle){
  let [x,y,z,w]=[0,1,2,3].map(bit=>((id>>bit)&1)?1:-1);
  const ca=Math.cos(angle),sa=Math.sin(angle);
  [x,w]=[x*ca-w*sa,x*sa+w*ca];
  const a=.43;[y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
  const b=.25;[x,y]=[x*Math.cos(b)-y*Math.sin(b),x*Math.sin(b)+y*Math.cos(b)];
  const perspective=3.5/(3.5-w);
  return {x:450+132*(x+0.34*z)*perspective,y:270+132*(y+0.20*z)*perspective,z};
}
function draw(){
  const svg=$('hypercube');svg.replaceChildren();
  const angle=Number($('rotation').value);
  const points=Array.from({length:16},(_,i)=>project4d(i,angle));
  const grid=make('g',{stroke:'#7d9bbd','stroke-opacity':'.10','stroke-width':'.7'});
  for(let x=0;x<=900;x+=45)grid.append(make('path',{d:`M${x} 0V540`}));
  for(let y=0;y<=540;y+=45)grid.append(make('path',{d:`M0 ${y}H900`}));
  svg.append(grid);
  for(const [a,b] of world.network.edges){
    const cross=inDifferentBubble(a,b),available=!cross||world.gate;
    svg.append(make('line',{
      x1:points[a].x,y1:points[a].y,x2:points[b].x,y2:points[b].y,
      stroke:cross?'#e8bf77':'#83a2d1','stroke-width':cross?3:1.5,
      'stroke-opacity':available?(cross?'.8':'.46'):'.13',
      'stroke-dasharray':cross?'8 5':'none'
    }));
  }
  for(let i=0;i<16;i++){
    const p=points[i],theta=world.phases[i];
    svg.append(make('circle',{cx:p.x,cy:p.y,r:16,fill:i<8?'#6bcce3':'#bc9ffa','fill-opacity':'.14',stroke:i<8?'#6bcce3':'#bc9ffa','stroke-width':1.3}));
    svg.append(make('line',{x1:p.x,y1:p.y,x2:p.x+12*Math.cos(theta),y2:p.y+12*Math.sin(theta),stroke:color(theta),'stroke-width':3,'stroke-linecap':'round'}));
    svg.append(make('circle',{cx:p.x,cy:p.y,r:3.5,fill:color(theta)}));
    svg.append(make('text',{x:p.x+15,y:p.y-13,'font-size':11,fill:'#d5e2fa'},i.toString(16).toUpperCase()));
  }
  svg.append(make('text',{x:20,y:28,fill:'#9cb6d3','font-size':14},world.network.name.toUpperCase()+' • 16 nodes / 32 modeled edges'));
  svg.append(make('text',{x:20,y:50,fill:'#9cb6d3','font-size':12},world.gate?'ALTERMATH JUNCTIONS AUTHORIZED':'HOROS: CROSS-BOUNDARY JUNCTIONS BLOCKED'));
  const m=phaseMetrics(world);
  $('order').textContent=m.order.toFixed(3);$('tick').textContent=String(m.tick);
  $('left-order').textContent=m.leftOrder.toFixed(3);$('right-order').textContent=m.rightOrder.toFixed(3);
  $('links').textContent=`${m.interEdges} / ${m.possibleInterEdges}`;
  $('transfer').textContent=m.transfer.toFixed(3);
  $('status').textContent=playing?'RUNNING':'PAUSED';$('play').textContent=playing?'Pause':'Start';
  $('gate-note').textContent=world.gate?`Boundary open: ${m.interEdges} authorized cross-bubble links. A link can carry phase influence when oscillators disagree.`:'Boundary closed: Horos blocks all cross-bubble links, but local coupling continues.';
  drawHistory();
}
function drawHistory(){
  const svg=$('history');svg.replaceChildren();
  for(const value of [0,0.5,1]){
    const y=103-95*value;
    svg.append(make('line',{x1:12,y1:y,x2:330,y2:y,stroke:'#57708c','stroke-opacity':'.35'}));
    svg.append(make('text',{x:12,y:y-3,'font-size':9,fill:'#93accd'},value.toFixed(1)));
  }
  if(history.length<2)return;
  const path=history.map((v,i)=>`${i?'L':'M'}${12+i/(history.length-1)*318},${103-v*95}`).join(' ');
  svg.append(make('path',{d:path,stroke:'#f5c573','stroke-width':2.2,fill:'none'}));
}
function tick(){world=stepPhase(world);history.push(phaseMetrics(world).order);if(history.length>240)history.shift();draw();}
function pause(){playing=false;if(interval!==null)clearInterval(interval);interval=null;}
function reset(){pause();world=createPhaseWorld({topology:$('topology').value,coupling:Number($('coupling').value),spread:Number($('spread').value),gate:false});history=[phaseMetrics(world).order];draw();}
$('play').addEventListener('click',()=>{if(playing){pause();draw();return;}playing=true;interval=setInterval(tick,55);draw();});
$('step').addEventListener('click',()=>{pause();tick();});
$('reset').addEventListener('click',reset);
$('topology').addEventListener('change',reset);
for(const [id,label] of [['coupling','coupling-label'],['spread','spread-label']]){$(id).addEventListener('input',()=>{$(label).textContent=Number($(id).value).toFixed(id==='coupling'?1:2);reset();});}
$('rotation').addEventListener('input',()=>{$('rotation-label').textContent=Number($('rotation').value).toFixed(2);draw();});
$('close-gate').addEventListener('click',()=>{world=setGate(world,false);draw();});
$('open-gate').addEventListener('click',()=>{world=setGate(world,true);draw();});
$('benchmark').addEventListener('click',()=>{
  const rows=benchmark({coupling:Number($('coupling').value),spread:Number($('spread').value)});
  $('benchmark-rows').replaceChildren(...rows.map(r=>{
    const tr=document.createElement('tr');
    for(const val of [r.topology,r.possibleCrossEdges,r.meanOrder.toFixed(4),r.finalOrder.toFixed(4),r.cumulativeCrossTransfer.toFixed(4)]){
      const td=document.createElement('td');td.textContent=String(val);tr.append(td);
    }return tr;
  }));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();draw();}});
draw();
