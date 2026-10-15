const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const batchIndex=process.argv.indexOf('--batch'),batch=batchIndex<0?'elements-01':process.argv[batchIndex+1];
assert.match(batch,/^elements-\d{2}$/,'Invalid batch');
const work=path.join(root,'V4/template-stable',batch);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
async function hash(p){const h=crypto.createHash('sha256');for await(const c of fs.createReadStream(path.join(root,p)))h.update(c);return h.digest('hex');}
async function pixels(p){return sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
async function diff(a,b){const x=await pixels(a),y=await pixels(b);assert.deepEqual(x.info,y.info);let count=0,max=0;for(let i=0;i<x.data.length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(x.data[i+j]-y.data[i+j]);if(d)changed=true;max=Math.max(max,d);}if(changed)count++;}return{pixels:count,maxDelta:max};}
(async()=>{
 const manifest=read(`V4/template-stable/${batch}/manifest.json`),roster=read('V3/donnees/cartes.json');
 const results=[];
 for(const entry of manifest.cards){
  const c=read(entry.profile);
  const folder=path.join(root,path.dirname(c.profile));
  if(!fs.existsSync(path.join(folder,'render.json'))&&process.argv.includes('--partial'))continue;
  const report=read(path.relative(root,path.join(folder,'render.json'))),source=roster.find(v=>v.id===c.id);
  if(process.argv.includes('--partial')&&report.rendererRevision!=='elements-01b-native-label-transform')continue;
  const layoutRevision=report.textLayoutRevision||report.textRefresh?.layoutRevision;
  if(process.argv.includes('--partial')&&layoutRevision!==2)continue;
  assert.equal(report.rendererRevision,'elements-01b-native-label-transform',`${c.name}: obsolete render`);
  assert.equal(layoutRevision,2,`${c.name}: obsolete text layout`);
  for(const k of ['id','element','race','faction','weapon','positions','atk','defense','magic','barriers'])assert.deepEqual(c[k],source[k],`${c.name}: ${k}`);
  const layers=report.reopened,layer=name=>{const l=layers.find(l=>l.name===name);assert.ok(l,`${c.name}: ${name}`);return l;};
  for(const [side,values] of [['ATK',c.atk],['DEF',c.defense]])for(let i=0;i<6;i++){
   const die=6-i,n=layer(`${side} D${die} - valeur`),v=values[i];
   assert.equal(n.visible,typeof v==='number');if(typeof v==='number')assert.equal(n.text,String(v));
   else assert.equal(layer(`${side} D${die} - effet ${v}`).visible,true);
   const effects=side==='ATK'?c.magic:c.barriers;
   assert.equal(layer(`${side} D${die} - ${side==='ATK'?'HALO MAGIQUE':'BARRIERE'}`).visible,typeof v==='number'&&effects.includes(die));
  }
  for(let i=1;i<=5;i++){const l=layer(`POSITION SLOT ${i}`);assert.equal(l.visible,i<=c.positions.length);if(l.visible)assert.equal(l.text,String([...c.positions].sort()[i-1]));}
  for(const [name,text,maxWidth,cx,cy] of [['NOM',c.name,470,449.5,129.5],['TITLE',c.title,590,448.5,1100],['JOB',c.job,170,292,1172.5],['RACE',c.race,170,599,1172.5]]){
   const l=layer(name);assert.equal(l.text,text);assert.ok(l.ink[2]-l.ink[0]<=maxWidth+1,`${c.name}: ${name} overflow`);
   assert.ok(Math.abs((l.ink[0]+l.ink[2])/2-cx)<=1&&Math.abs((l.ink[1]+l.ink[3])/2-cy)<=1,`${c.name}: ${name} alignment`);
  }
  assert.equal(layer('DESCRIPTION').text.replace(/\r/g,' '),c.description);
  const description=layer('DESCRIPTION').ink;assert.ok(description[0]>=150&&description[2]<=749&&description[1]>=1251&&description[3]<=1387);
  const flag=layer('FACTION - CONTENU').bounds;assert.ok(flag[0]>=665&&flag[2]<=774&&flag[1]>=823&&flag[3]<=1054,`${c.name}: flag ${flag}`);
  const output=path.join(root,'V4/cartes',c.output+'.png');const meta=await sharp(output).metadata();assert.equal(meta.width,897);assert.equal(meta.height,1497);assert.equal(report.resolution,300);
  const reopened=await diff(output,path.join(folder,'reopened.png'));assert.equal(reopened.pixels,0,`${c.name}: reopened differs`);
  const fixed=await diff(manifest.fixedMaster?path.join(root,manifest.fixedMaster):path.join(work,'fixed-master.png'),path.join(folder,'fixed.png'));assert.equal(fixed.pixels,0,`${c.name}: fixed frame differs`);
  if(c.element==='NONE'){
   assert.deepEqual(c.magic,[]);assert.deepEqual(c.barriers,[]);assert.equal(layer('CRISTAL NONE').visible,true);
   const b=layer('CRISTAL NONE').bounds,box=manifest.crystalBoxes.NONE;
   assert.ok(Math.abs(b[2]-b[0]-box.width)<=1&&Math.abs(b[3]-b[1]-box.height)<=1,'Unlit hexagon envelope');
   assert.ok(Math.abs((b[0]+b[2])/2-447.5)<=1&&Math.abs((b[1]+b[3])/2-1195)<=1,'Unlit hexagon centre');
  }
  if(report.textRefresh){
   const before=await pixels(path.join(root,report.textRefresh.before)),after=await pixels(output);assert.deepEqual(before.info,after.info);
   let outside=0;
   for(let y=0;y<after.info.height;y++)for(let x=0;x<after.info.width;x++){
    if((y>=1080&&y<=1123&&x>=150&&x<=748)||(y>=1150&&y<=1190&&x>=200&&x<=380)||(y>=1250&&y<=1388&&x>=149&&x<=750))continue;
    const p=(y*after.info.width+x)*4;for(let k=0;k<4;k++)if(before.data[p+k]!==after.data[p+k]){outside++;break;}
   }
   assert.equal(outside,0,`${c.name}: non-text pixels changed during editorial refresh`);
  }
  await sharp(output).resize({width:240}).png().toFile(path.join(folder,'small-240.png'));
  const checks={card:c.name,id:c.id,reopened,fixed,statsV3Unchanged:true,nativeTexts:true,flagBounds:flag,artworkUnchanged:c.artworkUnchanged,artworkSource:c.artworkSource};
  fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(checks,null,2));results.push(checks);
 }
 for(const [p,sha] of Object.entries(manifest.protectedFiles))assert.equal(await hash(p),sha,`Protected source changed: ${p}`);
 fs.writeFileSync(path.join(work,'verification.json'),JSON.stringify({cards:results.length,complete:results.length===manifest.cards.length,protectedSources:Object.keys(manifest.protectedFiles).length,results},null,2));
 if(results.length){
  const width=360,height=601,cols=results.length<=5?results.length:4,rows=Math.ceil(results.length/cols),items=[];
  for(let i=0;i<results.length;i++){const c=manifest.cards.find(c=>c.name===results[i].card);items.push({input:await sharp(path.join(root,'V4/cartes',c.output+'.png')).resize(width,height).png().toBuffer(),left:(i%cols)*width,top:Math.floor(i/cols)*height});}
  await sharp({create:{width:cols*width,height:rows*height,channels:3,background:'#0b1115'}}).composite(items).jpeg({quality:94}).toFile(path.join(work,'collection.jpg'));
 }
 console.log(JSON.stringify({checked:results.length,expected:manifest.cards.length,protectedSources:Object.keys(manifest.protectedFiles).length,passed:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
