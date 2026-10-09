'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const A=require('./weapon-art.js'),C=require('./weapon-cards.js'),{weapons}=require('./weapons.js');
const proof=require('../weapon-cards/media-provenance.json'),root=path.resolve(__dirname,'../..');
const equipmentProof=require('../revisions/2026-10-06-equipment-categories/media-provenance.json');
const defensiveProof=require('../revisions/2026-10-06-protections-relics/media-provenance.json');
const ff9Proof=require('../revisions/2026-10-09-ff9-equipment/media-provenance.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('every weapon has a unique medallion, immutable definition and stable saved art identity',()=>{
  const rims=new Set(['stone-copper-ring-v1.webp','electro-copper-ring-v1.webp']);
  assert.equal(Object.keys(A.entries).length,weapons.filter(w=>w.collectible).length);
  for(const w of weapons.filter(w=>w.collectible)){
    const before=JSON.stringify(w),a=A.get(w);
    assert(a);assert.equal(a.key,w.art);assert.equal(w.collectible.cutout,true);
    assert.equal(C.faces[w.id].illustration,a.scene);assert.equal(C.faces[w.id].cutout,false);
    assert(C.faces[w.id].alt.endsWith("peinture de l'arme en situation."));
    assert(Object.isFrozen(a));assert.equal(JSON.stringify(w),before);
    assert.equal(A.get({...w,art:'unknown-revision'}),null);
    assert(!rims.has(a.rim));rims.add(a.rim);
  }
  assert.equal(rims.size,weapons.length);
  assert.equal(A.get(weapons[0]),null);
});
test('every current scene, ring and corrected body is distributed with its recorded hash',()=>{
  for(const a of Object.values(A.entries))for(const [folder,file]of [['weapon-cards',a.scene],['equipment',a.rim],['equipment',a.body]]){
    const target='V4/site/assets/'+folder+'/'+file,p=[...proof.assets,...equipmentProof.assets,...defensiveProof.assets,...ff9Proof.assets].find(p=>p.file===target);assert(p,target);
    const bytes=fs.readFileSync(path.join(root,target));assert.equal(hash(bytes),p.sha256,target);
    assert(bytes.length>1000);assert(bytes.length<1500000,target+' bounded download');
    if(folder==='equipment')assert.deepEqual(p.placement.center,[244,242]);
  }
  assert.equal(A.entries['lulu-mog'].scene,'lulu-mog-scene-v4.webp','rejected axe-contaminated image is never displayed');
  assert.equal(A.entries['kaine-saw'].body,'kaine-saw-v2.webp');
});
test('boot and Pages contain the presentation manifest without coupling it to the engine',async()=>{
  const boot=fs.readFileSync(path.join(__dirname,'boot.js'),'utf8');
  assert(boot.indexOf("'weapon-art.js'")<boot.indexOf("'equipment-presentation.js'"));
  assert(!fs.readFileSync(path.join(__dirname,'engine.js'),'utf8').includes('KalistarWeaponArt'));
  const plan=await require('../deploy/build.cjs').plan();
  assert(plan.files.some(f=>f.target==='jeu/weapon-art.js'));
});

test('FFIX medallions retain a transparent center and keep each object inside its ring',async()=>{
  const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const sharp=require('node:module').createRequire(path.join(modules,'__ff9_media__.cjs'))('sharp');
  for(const p of ff9Proof.assets.filter(p=>['body','ring'].includes(p.role))){
    const {data,info}=await sharp(path.join(root,p.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,488);assert.equal(info.height,488);
    let visible=0;
    for(let y=0;y<488;y++)for(let x=0;x<488;x++){
      const alpha=data[(y*488+x)*4+3];if(alpha<=8)continue;visible++;
      const radius=Math.hypot(x-244,y-242);
      if(p.role==='body')assert(radius<172,p.file+' object stays inside ring');
      else assert(radius>73,p.file+' hollow center');
    }
    assert(visible>500,p.file+' nonblank');
  }
});
