#!/usr/bin/env node
import {runStudy} from '../site/src/invariantDiscovery.js';

const [seed='369',trainSeeds='3',holdoutSeeds='6']=process.argv.slice(2);
try{
  const result=runStudy({seed:Number(seed),trainSeeds:Number(trainSeeds),holdoutSeeds:Number(holdoutSeeds)});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch(error){
  process.stderr.write('R20: '+(error instanceof Error?error.message:String(error))+'\n');
  process.exitCode=1;
}
