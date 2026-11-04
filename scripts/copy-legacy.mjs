/** Preserve pre-React static laboratories in the same GitHub Pages artifact. */
import {copyFileSync,cpSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const dist=resolve(root,'dist');
if(!existsSync(resolve(dist,'index.html')))throw new Error('Vite index missing; aborting archival copy');
for(const file of ['junction.html','phase.html','pleroma.html'])copyFileSync(resolve(root,file),resolve(dist,file));
copyFileSync(resolve(root,'index.html'),resolve(dist,'lab.html'));
for(const dir of ['src','web','docs'])cpSync(resolve(root,dir),resolve(dist,dir),{recursive:true});
writeFileSync(resolve(dist,'.nojekyll'),'');
console.log('Legacy labs copied into React deployment artifact.');
