const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const sharp=require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','sharp'));
const {audit,validate,within,guides}=require('../tools/sprite-template-v2.cjs');
test('native page audit rejects non-native sizes, soft alpha and overflowing art without repairing files',async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-sprite-v2-'));
  try{
    const wrong=path.join(folder,'wrong.png');await sharp({create:{width:1254,height:1254,channels:4,background:'#00000000'}}).png().toFile(wrong);
    const bytes=fs.readFileSync(wrong);assert.match((await audit(wrong)).errors[0],/no resizing/);assert.deepEqual(fs.readFileSync(wrong),bytes);
    const cli=require('node:child_process').spawnSync(process.execPath,[path.resolve(__dirname,'../tools/sprite-template-v2.cjs'),'audit',wrong],{encoding:'utf8'});
    assert.equal(cli.status,1,'a rejected source must not look like a successful CLI audit');
    const rgba=Buffer.alloc(1280*1280*4);
    for(let i=0;i<16;i++)for(let y=180;y<272;y++)for(let x=144;x<176;x++){
      const at=((Math.floor(i/4)*320+y)*1280+i%4*320+x)*4;rgba[at]=100;rgba[at+1]=150;rgba[at+2]=180;rgba[at+3]=255;
    }
    const valid=path.join(folder,'valid.png');await sharp(rgba,{raw:{width:1280,height:1280,channels:4}}).png().toFile(valid);assert.deepEqual((await audit(valid)).errors,[]);
    rgba[3]=128;const bad=path.join(folder,'bad.png');await sharp(rgba,{raw:{width:1280,height:1280,channels:4}}).png().toFile(bad);
    const errors=(await audit(bad)).errors;assert.ok(errors.some(e=>e.includes('Non-binary')));assert.ok(errors.some(e=>e.includes('gutter')));
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test('ready validation rejects a static drawing repeated through all animation frames',async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-static-v2-'));
  try{
    const crypto=require('node:crypto');
    const {createDraft,REVIEWS}=await import('../animation-kit/template-v2.mjs');
    const actor=createDraft({characterId:'kaylis',modelId:'30000012',name:'KAYLIS',heightCm:164,weapon:'Epée courte'});
    const rgba=Buffer.alloc(1280*1280*4);
    for(let frame=0;frame<16;frame++)for(let y=167;y<272;y++)for(let x=150;x<=170;x++){
      const i=((Math.floor(frame/4)*320+y)*1280+frame%4*320+x)*4;rgba[i]=128;rgba[i+3]=255;
    }
    const body=await sharp(rgba,{raw:{width:1280,height:1280,channels:4}}).png().toBuffer();
    const hands=await sharp({create:{width:1280,height:1280,channels:4,background:'#00000000'}}).png().toBuffer();
    fs.writeFileSync(path.join(folder,'body.png'),body);fs.writeFileSync(path.join(folder,'hands.png'),hands);
    const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
    actor.pages=Array.from({length:4},()=>({file:'body.png',sha256:digest(body),handsFile:'hands.png',handsSha256:digest(hands)}));
    const manifest=path.join(folder,'actor.json');
    const review={...actor,status:'review',pages:actor.pages.map(({file,sha256})=>({file,sha256}))};
    fs.writeFileSync(manifest,JSON.stringify(review));
    assert.deepEqual((await validate(manifest)).errors,[],'A review lot may omit unmeasured hand masks');
    assert.equal((await validate(manifest,{ready:true})).ok,false,'A review lot without masks or measured anchors is never ready');
    actor.status='ready';actor.reviews=Object.fromEntries(REVIEWS.map(name=>[name,true]));
    actor.landmarks={crown:{x:160,y:167},sole:{x:160,y:272}};
    for(const frame of actor.frames)for(const name of Object.keys(frame.sockets))frame.sockets[name]={x:160,y:210,angleDeg:0,layer:'front'};
    fs.writeFileSync(manifest,JSON.stringify(actor));
    const result=await validate(manifest,{ready:true});assert.equal(result.ok,false);
    assert.equal(result.errors.filter(e=>e.startsWith('Static repeated')).length,14);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('guides preserve four fixed-root pages and refuse to overwrite a revision',async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-guides-v2-'));
  try{
    const {createDraft}=await import('../animation-kit/template-v2.mjs');
    const actor=createDraft({characterId:'kaylis',modelId:'30000012',name:'KAYLIS',heightCm:164,weapon:'Epée courte'});
    await guides(actor,folder);assert.equal(fs.readdirSync(folder).length,9);
    const meta=await sharp(path.join(folder,'blank-0.png')).metadata();assert.equal(meta.width,1280);assert.equal(meta.height,1280);
    assert.ok((await sharp(path.join(folder,'blank-0.png')).ensureAlpha().raw().toBuffer()).every(n=>n===0));
    await assert.rejects(()=>guides(actor,folder),/Preserve existing/);
    assert.throws(()=>within(folder,'../private.json'),/Outside/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
