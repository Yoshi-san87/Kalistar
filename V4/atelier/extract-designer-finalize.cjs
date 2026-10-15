const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'designer-assets');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));
const partial = process.argv.includes('--partial');
const raw = path.join(out, partial ? 'manifest.partial.json' : 'manifest.raw.json');
const m = read(raw);
const refs = read(path.join(__dirname, 'data/references.json'));
const rgba = async file => sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
async function matte(frame) {
  if (!frame?.black || !fs.existsSync(path.join(out, frame.black))) return;
  const b = await rgba(path.join(out, frame.black));
  const w = await rgba(path.join(out, frame.white));
  const data = Buffer.alloc(b.data.length);
  let translucent = 0, transparent = 0, channelSpread = 0;
  for (let i = 0; i < data.length; i += 4) {
    const diff = [w.data[i]-b.data[i],w.data[i+1]-b.data[i+1],w.data[i+2]-b.data[i+2]].sort((a,b)=>a-b);
    const alpha = Math.max(0,Math.min(255,255-diff[1]));
    data[i+3] = Math.min(alpha, b.data[i+3]);
    if (!alpha) transparent++;
    else if (alpha < 255) translucent++;
    channelSpread = Math.max(channelSpread, diff[2]-diff[0]);
    for (let c = 0; c < 3; c++) data[i+c] = alpha ? Math.min(255,Math.round(b.data[i+c]*255/alpha)) : 0;
  }
  await sharp(data,{raw:{width:m.width,height:m.height,channels:4}}).png().toFile(path.join(out,frame.file));
  frame.matte = {method:'black-white Photoshop artwork substitution; median channel transmission',transparentPixels:transparent,translucentPixels:translucent,maxChannelTransmissionSpread:channelSpread};
  if (transparent < 200000) throw Error('Artwork transparency extraction failed.');
}
async function cropDescriptor(d) {
  if (!d?.file || !fs.existsSync(path.join(out,d.file)) || d.left===undefined) return;
  const {data,info} = await rgba(path.join(out,d.file));
  let x0=info.width,y0=info.height,x1=0,y1=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
  if(x1<=x0)throw Error('Empty PNG '+d.file);
  if(x0||y0||x1!==info.width||y1!==info.height){
    const buffer=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:x0,top:y0,width:x1-x0,height:y1-y0}).png().toBuffer();
    fs.writeFileSync(path.join(out,d.file),buffer);d.left+=x0;d.top+=y0;d.width=x1-x0;d.height=y1-y0;
  }
}
async function packCrops(){
  for(const d of descriptors(m)){
    if(d.black||d.nativeOnly)continue;
    const {data,info}=await rgba(path.join(out,d.file));
    let x0=info.width,y0=info.height,x1=0,y1=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
    assert.ok(x1>x0&&y1>y0,'Empty component '+d.file);
    const file='packed/'+d.file;fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});
    await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:x0,top:y0,width:x1-x0,height:y1-y0}).png().toFile(path.join(out,file));
    if(d.anchor)d.anchor=[(d.anchor[0]*d.width-x0)/(x1-x0),(d.anchor[1]*d.height-y0)/(y1-y0)];
    d.nativeExportFile=d.file;d.file=file;d.left+=x0;d.top+=y0;d.width=x1-x0;d.height=y1-y0;
  }
}
function descriptors(value,list=[]) {
  if (!value || typeof value!=='object') return list;
  if (value.file && value.left!==undefined) list.push(value);
  for (const [key,child] of Object.entries(value)) if(key!=='textStyles')descriptors(child,list);
  return list;
}
async function buildEffects() {
  const nativeFile=path.join(out,'native-effects.json');
  if(!fs.existsSync(nativeFile))return false;
  const natives=read(nativeFile);
  const sourceIds={atk:['retry','mana','guard','revive','buff_atk','death'],def:['retry','dodge','shield_physical','shield_magic']};
  const anchors={retry:[0.4964996706822184,0.5063070632386723],dodge:[0.5050505050505051,0.46464646464646464],death:[0.49708225310359,0.39916863583191]};
  const ys={1:773,2:676,3:577,4:476,5:372,6:147};
  for(const n of Object.values(natives))n.nativeOnly=true;
  m.nativeEffects=natives;m.effectCalibration={anchors,source:'Rikka 03F retry/dodge, Valazar death',alphaContourThreshold:32};
  for(const [side,ids]of Object.entries(sourceIds))for(const id of ids){
    let n=(id==='retry'?natives['def-retry']:null)||natives[side+'-'+id]||natives['atk-'+id]||natives['def-'+id];
    if(!n){
      const basename=id==='shield_magic'?'barrier':id;
      const file='effects/native-'+id+'.png';
      fs.copyFileSync(path.join(root,'V3/assets/effets',basename+'.png'),path.join(out,file));
      const info=await sharp(path.join(out,file)).metadata();
      n={file,left:0,top:0,width:info.width,height:info.height,sourceAsset:'V3/assets/effets/'+basename+'.png',nativeOnly:true};
      await cropDescriptor(n);natives[side+'-'+id]=n;
    }
    const {data,info}=await rgba(path.join(out,n.file));
    const anchor=anchors[id]||[0.5,0.5];
    let radius=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=32)radius=Math.max(radius,Math.hypot(x+.5-info.width*anchor[0],y+.5-info.height*anchor[1]));
    m.effects[side][id]={};
    for(let die=1;die<=6;die++){
      const safe=die===6?49:32;
      const limit=die===6?(id==='dodge'?72:id==='death'?78:88):58;
      const scale=Math.min(safe/radius,limit/info.width,limit/info.height);
      const cx=side==='atk'?(die===6?142:157):(die===6?754:737);
      const cy=side==='def'&&die===6?151:ys[die];
      const file='effects/'+side+'-'+id+'-'+die+'.png';
      let width,height,left,top,maxRadius;
      for(let attempt=0;attempt<6;attempt++){
        const fitted=scale*Math.pow(.985,attempt);width=Math.max(1,Math.round(info.width*fitted));height=Math.max(1,Math.round(info.height*fitted));
        left=Math.round(cx-width*anchor[0]);top=Math.round(cy-height*anchor[1]);
        await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).resize(width,height,{kernel:'lanczos3'}).png().toFile(path.join(out,file));
        const contour=await rgba(path.join(out,file));maxRadius=0;
        for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(contour.data[(y*width+x)*4+3]>=32)maxRadius=Math.max(maxRadius,Math.hypot(left+x+.5-cx,top+y+.5-cy));
        if(maxRadius<=safe+1)break;
      }
      m.effects[side][id][die]={file,left,top,width,height,anchor,center:[cx,cy],safeRadius:safe,maxVisibleRadius:maxRadius,source:n.file,calibratedDerivative:true};
      if(maxRadius>safe+1)throw Error('Effect exceeds optical envelope '+file);
    }
  }
  return true;
}
async function applyFactionMask(){
  const file=path.join(out,'frame/faction-mask.png');if(!fs.existsSync(file))return;
  const mask=(await rgba(file)).data;
  for(const d of Object.values(m.factions)){
    if(d.nativeGroupMaskApplied)continue;
    const {data,info}=await rgba(path.join(out,d.file));
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4+3;data[i]=Math.round(data[i]*mask[((y+d.top)*897+x+d.left)*4+3]/255);}
    await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(path.join(out,d.file+'.tmp'));
    fs.renameSync(path.join(out,d.file+'.tmp'),path.join(out,d.file));d.nativeGroupMaskApplied='frame/faction-mask.png';
  }
}
async function applyDefenseOcclusion(){
  for(let die=1;die<=6;die++){
    const d=m.stats.def[die]?.barrier;if(!d)continue;
    const backup=d.file.replace(/\.png$/,'-native.png');
    if(!fs.existsSync(path.join(out,backup)))fs.copyFileSync(path.join(out,d.file),path.join(out,backup));
    const {data,info}=await rgba(path.join(out,backup));
    for(let front=1;front<die;front++){
      const p=m.stats.def[front].plain;if(!p)continue;
      const x0=Math.max(d.left,p.left),y0=Math.max(d.top,p.top),x1=Math.min(d.left+d.width,p.left+p.width),y1=Math.min(d.top+d.height,p.top+p.height);
      if(x1<=x0||y1<=y0)continue;
      const ink=await rgba(path.join(out,p.file));
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const i=((y-d.top)*info.width+x-d.left)*4,j=((y-p.top)*ink.info.width+x-p.left)*4,alpha=ink.data[j+3]/255;
        // F over (H over B) equals an H-alpha overlay whose RGB is F over H,
        // on top of the already-composited opaque F over B frame.
        for(let c=0;c<3;c++)data[i+c]=Math.round(ink.data[j+c]*alpha+data[i+c]*(1-alpha));
      }
    }
    const buffer=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();fs.writeFileSync(path.join(out,d.file),buffer);
    d.nativeFrontCircleOcclusion=true;d.unoccludedNativeFile=backup;
  }
}
async function applyAttackOcclusion(){
  if(!m.nativeEffects)return;
  for(const stats of Object.values(m.stats.atk))for(let die=1;die<=5;die++)for(const mode of ['halo','magic']){
    const d=stats[die][mode];if(!d)continue;
    const backup=d.file.replace(/\.png$/,'-native.png');if(!fs.existsSync(path.join(out,backup)))fs.copyFileSync(path.join(out,d.file),path.join(out,backup));
    const {data,info}=await rgba(path.join(out,backup));
    for(let front=die+1;front<=6;front++){
      const p=m.nativeEffects['atk-circle-'+front];assert.ok(p,'Missing native ATK circle '+front);
      const x0=Math.max(d.left,p.left),y0=Math.max(d.top,p.top),x1=Math.min(d.left+d.width,p.left+p.width),y1=Math.min(d.top+d.height,p.top+p.height);
      if(x1<=x0||y1<=y0)continue;const ink=await rgba(path.join(out,p.file));
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const i=((y-d.top)*info.width+x-d.left)*4,j=((y-p.top)*ink.info.width+x-p.left)*4,alpha=ink.data[j+3]/255;
        for(let c=0;c<3;c++)data[i+c]=Math.round(ink.data[j+c]*alpha+data[i+c]*(1-alpha));
      }
    }
    fs.writeFileSync(path.join(out,d.file),await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer());
    d.nativeFrontCircleOcclusion=true;d.unoccludedNativeFile=backup;
  }
}
async function proof(key) {
  const ref=refs.cards.find(c=>c.key===key);if(!ref)return;
  const card=ref.card,frame=card.element==='ELECTRO'?m.frame.electro:m.frame;
  const art=m.elements[card.element]?.proofArt;
  if(!frame?.file||!art)return;
  const layers=[art,frame];
  for(let die=1;die<=6;die++){
    const value=card.atk[6-die];layers.push(m.stats.atk[card.element][die][typeof value==='number'&&card.magic.includes(die)?'magic':'physical']);
    if(typeof value!=='number')layers.push(m.effects.atk[value]?.[die]);
  }
  for(let die=6;die>=1;die--){
    const def=card.defense[6-die];
    if(typeof def==='number'&&card.barriers.includes(die))layers.push(m.stats.def[die].barrier);
    if(typeof def!=='number')layers.push(m.stats.def[die].effectBackground,m.effects.def[def]?.[die]);
  }
  card.positions.forEach((_,i)=>layers.push(m.position.supports[i+1]));
  layers.push(m.factions[card.faction],m.weapons[card.weapon],m.races[card.race],m.elements[card.element].branch,m.elements[card.element].crystal);
  const composite=await sharp({create:{width:897,height:1497,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers.filter(Boolean).map(d=>({input:path.join(out,d.file),left:d.left,top:d.top}))).png().toBuffer();
  fs.writeFileSync(path.join(out,'proof',key+'-recomposed.png'),composite);
  const actual=await sharp(composite).ensureAlpha().raw().toBuffer(),expected=(await rgba(path.join(out,'proof',key+'-no-text.png'))).data;
  const framePixels=(await rgba(path.join(out,frame.file))).data,coverage=new Uint8Array(897*1497),regionNames=['static frame','artwork matte'],regions={};
  for(const d of layers.slice(2).filter(Boolean)){
    const match=/\/(atk|def)-.*-([1-6])\.png$/.exec(d.file)||/\/(?:[A-Z]+-)?(atk|def)-([1-6])-/.exec(d.file);
    const name=match?match[1].toUpperCase()+' D'+match[2]:d.file.includes('/position/')?'positions':d.file.includes('/faction-')?'faction':d.file.includes('/weapon-')?'weapon':d.file.includes('/race-')?'race':d.file.includes('-branch')?'branches':d.file.includes('-crystal')?'crystal':'other dynamic';
    if(!regionNames.includes(name))regionNames.push(name);const code=regionNames.indexOf(name),ink=await rgba(path.join(out,d.file));
    for(let y=0;y<ink.info.height;y++)for(let x=0;x<ink.info.width;x++)if(ink.data[(y*ink.info.width+x)*4+3])coverage[(y+d.top)*897+x+d.left]=code;
  }
  let changed=0,max=0,delta=0,fixedOpaqueChanged=0,fixedOpaqueMax=0;const diff=Buffer.alloc(actual.length);
  for(let y=0;y<1497;y++)for(let x=0;x<897;x++){
    if(x>=129&&x<=158&&y>=845&&y<=1062)continue;
    const index=y*897+x,i=index*4;let pixel=false,pixelMax=0;
    for(let c=0;c<4;c++){const d=Math.abs(actual[i+c]-expected[i+c]);max=Math.max(max,d);pixelMax=Math.max(pixelMax,d);delta+=d;pixel||=d>1;diff[i+c]=c===3?255:Math.min(255,d*5);}
    if(pixel)changed++;
    const fixedOpaque=framePixels[i+3]===255&&!coverage[index];
    if(fixedOpaque){fixedOpaqueMax=Math.max(fixedOpaqueMax,pixelMax);if(pixelMax)fixedOpaqueChanged++;}
    if(pixelMax){const name=coverage[index]?regionNames[coverage[index]]:framePixels[i+3]<255?'artwork matte':'static frame';const r=regions[name]||(regions[name]={pixels:0,above1:0,above2:0,above8:0,max:0,bounds:[897,1497,0,0]});r.pixels++;r.above1+=pixelMax>1;r.above2+=pixelMax>2;r.above8+=pixelMax>8;r.max=Math.max(r.max,pixelMax);r.bounds=[Math.min(r.bounds[0],x),Math.min(r.bounds[1],y),Math.max(r.bounds[2],x+1),Math.max(r.bounds[3],y+1)];}
  }
  await sharp(diff,{raw:{width:897,height:1497,channels:4}}).png().toFile(path.join(out,'proof',key+'-diff.png'));
  return {key,excluded:'native identity/numeric text; barcode region',pixelsDifferentAbove1:changed,maxChannelDifference:max,meanAbsoluteChannelDifference:delta/(897*1497*4),fixedOpaqueChanged,fixedOpaqueMax,regions};
}
async function main(){
  await matte(m.frame);await matte(m.frame.electro);
  if(process.argv.includes('--frames-only')){console.log(JSON.stringify({default:m.frame.matte,electro:m.frame.electro.matte}));return;}
  const effects=await buildEffects();
  if(!partial||process.argv.includes('--refine-proof')){await applyFactionMask();await applyDefenseOcclusion();await applyAttackOcclusion();}
  for(const [die,slot]of Object.entries(m.stats.def))slot.effectBackgroundMode=slot.effectBackground?'native overlay':'native physical background already in frame';
  m.effectAliases={shield_magic:{source:'V3/assets/effets/barrier.png',reason:'The engine has shield_magic; the validated asset repository names its magical shield motif barrier.png.'}};
  m.zOrder=['artwork','frame','ATK D1 -> D6: selected background then effect','DEF D6 -> D1: selected barrier/effect background then effect','position.supports','position.numerals (preview only)','factions','weapons','races','elements.branch','elements.crystal','native text','barcode'];
  // Tight consumer crops are separate from native exports, so interrupted
  // finalization never invalidates the raw Photoshop coordinate manifest.
  if(!partial)await packCrops();
  m.status=partial?'partial':effects?(process.argv.includes('--publish')?'ready':'qa-pending'):'components-ready-effects-pending';
  m.generatedAt=new Date().toISOString();
  if(partial&&process.argv.includes('--proof')){const proofs=[];for(const key of ['ruby','rikka']){const p=await proof(key);if(p)proofs.push(p);}write(path.join(out,'proof/draft-verification.json'),proofs);}
  if(!partial){
    assert.equal(m.referenceId,refs.id,'The approved reference lock changed during extraction.');
    assert.ok(fs.existsSync(path.join(out,'state/ruby-frame.json'))&&fs.existsSync(path.join(out,'state/rikka-frame.json')),'Fresh frame clipping verification is required.');
    assert.ok(fs.existsSync(path.join(out,'frame/faction-mask.png')),'The native faction protection mask is required.');
    for(const element of new Set(refs.cards.map(r=>r.card.element))){
      assert.ok(m.elements[element]?.branch&&m.elements[element]?.crystal,'Missing element '+element);
      for(let die=1;die<=6;die++){assert.ok(m.stats.atk[element][die].physical);if(element!=='NONE')assert.ok(m.stats.atk[element][die].magic);}
    }
    for(const [field,collection]of [['weapon','weapons'],['race','races'],['faction','factions']])for(const r of refs.cards)assert.ok(m[collection][r.card[field]],'Missing '+field+' '+r.card[field]);
    for(const [side,ids]of Object.entries({atk:['retry','mana','guard','revive','buff_atk','death'],def:['retry','dodge','shield_physical','shield_magic']}))for(const id of ids)for(let die=1;die<=6;die++)assert.ok(m.effects[side][id]?.[die],'Missing effect '+side+' '+id+' '+die);
    for(const d of descriptors(m)){const info=await sharp(path.join(out,d.file)).metadata();assert.equal(info.width,d.width,d.file+' width');assert.equal(info.height,d.height,d.file+' height');if(!d.nativeOnly)assert.ok(d.left>=0&&d.top>=0&&d.left+d.width<=897&&d.top+d.height<=1497,d.file+' canvas bounds');}
    const checked=[];
    for(const s of m.sources){const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,s.psd))).digest('hex');if(digest!==refs.protectedFiles[s.psd])throw Error('Protected PSD changed: '+s.psd);checked.push({file:s.psd,sha256:digest});}
    const proofs=[];for(const key of ['ruby','rikka']){const p=await proof(key);if(p)proofs.push(p);}
    write(path.join(out,'proof/native-comparison.json'),proofs);
    for(const p of proofs){
      assert.ok(p.meanAbsoluteChannelDifference<0.06,p.key+' recomposition differs materially');
      assert.ok(p.pixelsDifferentAbove1<2000,p.key+' has a structural recomposition mismatch');
      assert.ok(p.fixedOpaqueMax<=1&&p.fixedOpaqueChanged<=5,p.key+' fixed frame changed');
      assert.ok(p.maxChannelDifference<=8,p.key+' has a localized raster mismatch');
      // These bounds classify the visually reviewed alpha/Photoshop shadow
      // residuals instead of letting a global average conceal a misplaced icon.
      for(const [region,metrics]of Object.entries(p.regions)){
        const limit=region==='faction'?8:region==='positions'||region==='artwork matte'?4:2;
        assert.ok(metrics.max<=limit,p.key+' '+region+' exceeds its reviewed raster tolerance');
      }
    }
    m.hashes={};for(const file of new Set(descriptors(m).map(d=>d.file)))m.hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex');
    write(path.join(out,'verification.json'),{protectedPSDsUnchanged:checked.length,sources:checked,proofs,assets:descriptors(m).length});
  }
  write(path.join(out,'manifest.json'),m);
  console.log(JSON.stringify({status:m.status,elements:Object.keys(m.elements),assets:descriptors(m).length,effects}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
