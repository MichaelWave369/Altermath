import {createJunctionDemo,demoEvidence,proposeJunction,stepJunctionBridge,
  setPeerEnabled,junctionMetrics} from "../src/junction-contract.js";

export function runJunctionBenchmark({messages=30,gateCloseAt=10,gateOpenAt=16}={}) {
  if(!Number.isSafeInteger(messages)||messages<1||messages>1000)throw new RangeError("Invalid message count");
  let w=createJunctionDemo();
  for(let i=0;i<messages;i++){
    if(i===gateCloseAt) w=setPeerEnabled(w,"kernel",false);
    if(i===gateOpenAt) w=setPeerEnabled(w,"kernel",true);
    const proposal={id:"packet"+i,from:"mesh",to:"kernel",
      topic:"signal",value:(i%11)/10,ttl:3};
    w=proposeJunction(w,proposal,demoEvidence(proposal));
    if(i%2===0)w=stepJunctionBridge(w,{limit:1});
  }
  for(let i=0;i<6;i++)w=stepJunctionBridge(w);
  return {scenario:"deterministic-local-bridge",messages,gateCloseAt,gateOpenAt,
    ...junctionMetrics(w),outstanding:w.queue.length};
}
if(process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href) {
  console.log(JSON.stringify(runJunctionBenchmark(),null,2));
}
