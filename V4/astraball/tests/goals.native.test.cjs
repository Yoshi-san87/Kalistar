const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=require(path.join(modules,'sharp')),root=path.resolve(__dirname,'..');
const proof=require('../sources/goals-v1/provenance.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('all seven native goal originals and transparent web exports match their hashes',async()=>{
  assert.equal(proof.jobs.length,7);
  for(const item of proof.jobs){
    const original=fs.readFileSync(path.join(root,'sources/goals-v1/originals',item.id+'.png'));
    const bytes=fs.readFileSync(path.join(root,item.url));
    assert.equal(hash(original),item.originalSha256);
    assert.equal(hash(bytes),item.sha256);assert.equal(bytes.length,item.bytes);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,512);assert.equal(info.height,768);
    let clear=0,solid=0;
    for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>230)solid++;}
    assert.ok(clear>512*768*.65);assert.ok(solid>512*768*.04);
  }
});
