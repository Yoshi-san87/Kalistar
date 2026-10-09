'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),snapshot=path.join(root,'paquets-transfert/qa-v4.6.6-staged');
function git(args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout;}
const changed=new Set(git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean));
const excluded=f=>/\/releases\/2026-10-09-v4\.6\.6\//.test(f)||/\/(?:browser-proof|public-browser-proof)\//.test(f)||/\.(?:md|log)$/i.test(f);
const required=f=>f==='.github/workflows/pages.yml'||/^V4\/(?:site|deploy|atelier)\/[^/]+\.(?:cjs|js|html|css)$/.test(f)||/^V4\/(?:donnees|atelier\/data)\/.+\.json$/.test(f)||changed.has(f);
const hash=(algorithm,bytes)=>crypto.createHash(algorithm).update(bytes).digest('hex');
let files=0,hydrated=0;
for(const entry of git(['ls-files','--stage','-z']).split('\0').filter(Boolean)){
 const match=/^\d+ ([a-f0-9]+) 0\t([\s\S]+)$/.exec(entry);assert(match,'No unresolved index entries');
 const [,oid,file]=match;if(excluded(file)||!required(file))continue;
 const target=path.join(snapshot,file);assert(fs.existsSync(target),'Snapshot missing '+file);
 const bytes=fs.readFileSync(target),blob=hash('sha1',Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]));
 if(blob!==oid){
  const pointer=git(['cat-file','blob',oid]),lfs=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/.exec(pointer);
  assert(lfs,'Tested file differs from index: '+file);assert.equal(bytes.length,Number(lfs[2]),file);assert.equal(hash('sha256',bytes),lfs[1],file);hydrated++;
 }
 files++;
}
const result={passed:true,files,hydrated,tree:git(['write-tree']).trim(),head:git(['rev-parse','HEAD']).trim(),excluded:'Release reports, Markdown, logs and browser screenshots; runtime and staged card sources compared byte-for-byte.'};
fs.writeFileSync(path.join(__dirname,'qa/snapshot-check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
