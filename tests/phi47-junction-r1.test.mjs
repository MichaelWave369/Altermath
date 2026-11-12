import test from 'node:test';
import assert from 'node:assert/strict';
import {permitted,initial,links,exchange,metrics,simulate} from '../src/phi47-junction-r1.mjs';
const allow={outbound:true,inbound:true,channelA:'scalar.v1',channelB:'scalar.v1',privacy:'synthetic-public'};
test('deny by default; incompatible schemas and privacy cannot open the boundary',()=>{
  assert.equal(permitted({}),false);
  for(const bad of [{...allow,outbound:false},{...allow,inbound:false},{...allow,channelB:'text.v2'},{...allow,privacy:'private'}]){
    assert.equal(links({policy:bad}).length,0);
    assert.equal(simulate({policy:bad}).activeSteps,0);
  }
  assert.equal(links({mode:'isolated',policy:allow}).length,0);
});
test('nine stable candidate teeth; adaptive shift has deterministic topology',()=>{
  assert.deepEqual(links({mode:'fixed',policy:allow,tick:20}),links({mode:'fixed',policy:allow,tick:0}));
  assert.notDeepEqual(links({mode:'adaptive',policy:allow,tick:20}),links({mode:'fixed',policy:allow,tick:20}));
  assert.equal(links({mode:'adaptive',policy:allow,tick:20}).length,9);
  assert.throws(()=>links({mode:'invalid',policy:allow}),/Invalid/);
});
test('state transfer is simultaneous, bounded, conservative and leaves inputs unchanged',()=>{
  const start=initial(),copy=JSON.stringify(start);
  const before=metrics(start);
  const r=exchange(start,{policy:allow});
  assert.equal(JSON.stringify(start),copy);
  assert.equal(r.active,9);
  assert.ok(r.transfer>0);
  assert.ok(Math.abs(metrics(r.next).total-before.total)<1e-10);
});
test('controlled modes yield reproducible records and all retain conservation',()=>{
  for(const mode of ['isolated','fixed','adaptive']){
    const r=simulate({mode,policy:allow});
    assert.deepEqual(r,simulate({mode,policy:allow}));
    assert.equal(r.authority,'NONE');
    assert.ok(r.conservationError<1e-9);
    assert.ok(Number.isFinite(r.finalMeanGap));
  }
  assert.equal(simulate({mode:'isolated',policy:allow}).activeSteps,0);
  assert.equal(simulate({mode:'fixed',policy:allow}).activeSteps,40);
  assert.equal(simulate({mode:'adaptive',policy:allow}).activeSteps,40);
});
