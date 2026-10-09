'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
module.exports=function check(asset,bytes,manifest,localBuild){
  const published=manifest.assets.find(a=>a.path===asset.path);assert(published,asset.path);
  assert.equal(hash(bytes),published.sha256,asset.path+' matches the published manifest');
  if(asset.path==='jeu/index.html'){
    assert.match(manifest.version,/^[a-f0-9]{12}$/);assert.match(localBuild,/^[a-f0-9]{12}$/);
    bytes=Buffer.from(bytes.toString('utf8').replace(/((?:href|src)="[^"]+\.(?:css|js|webmanifest))\?v=([a-f0-9]{12})(?=")/g,(_,attribute,version)=>{
      assert.equal(version,manifest.version,'consistent public cache version');return attribute+'?v='+localBuild;
    }));
  }
  assert.equal(hash(bytes),asset.sha256,asset.path+' matches the verified local build');
};
