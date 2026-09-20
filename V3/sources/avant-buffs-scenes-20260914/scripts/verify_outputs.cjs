const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
const elements=JSON.parse(fs.readFileSync(path.join(root,'donnees/elements.json'),'utf8'));
const normalize=s=>s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
async function main(){
 const checked=[],bounds=[];
 assert.equal(cards.length,41);assert.equal(new Set(cards.map(c=>c.characterId)).size,40);
 const locks=JSON.parse(fs.readFileSync(path.join(root,'donnees/illustrations_verrouillees.json'),'utf8'));
 for(const lock of locks.cards){
  const hash=crypto.createHash('sha256').update(fs.readFileSync(lock.destination)).digest('hex').toUpperCase();
  assert.equal(hash,lock.sha256,'Locked V2 illustration changed: '+lock.slug);
 }
 for(const c of cards){
  const raw=fs.readFileSync(path.join(root,'verification',c.slug+'_layers.txt'),'utf8').replace(/\r\n|\r|\n/g,'\\n');
  const layers=vm.runInNewContext(raw,{}, {timeout:1000});
  assert.equal(layers.NOM,c.name,c.slug);
  assert.equal(normalize(layers['TITRE DE VERSION']),normalize(c.title),c.slug);
  assert.equal(normalize(layers['DESCRIPTION NARRATIVE']),normalize(c.text),c.slug);
  const element=elements[c.element];
  const advantage=c.element==='NONE'?'SANS POUVOIR':c.element==='RAINBOW'?'+40 CLASSIQUES':'+'+c.advantage+' '+elements[element.strong_against].label;
  const weakness=c.element==='NONE'?'VULNERABLE AUX CRISTAUX':c.element==='RAINBOW'?'+30 SANS CRISTAL':'-'+c.disadvantage+' '+elements[element.weak_against].label;
  assert.equal(layers['AVANTAGE ELEMENTAIRE'],advantage,c.slug+' element advantage');
  assert.equal(layers['FAIBLESSE ELEMENTAIRE'],weakness,c.slug+' element weakness');
  for(const side of ['ATK','DEF'])for(let j=0;j<6;j++){
   const value=(side==='ATK'?c.atk:c.defense)[j];
   if(typeof value==='number')assert.equal(layers[side+' D'+(6-j)+' - valeur'],String(value),c.slug);
  }
  for(const p of c.positions)assert.equal(layers['P'+p],String(p));
  const png=path.join(root,'cartes',c.slug+'.png');
  const m=await sharp(png).metadata();assert.deepEqual([m.width,m.height,m.density],[897,1497,300]);
  const t=await sharp(path.join(root,'impression',c.slug+'.tif')).metadata();
  assert.deepEqual([t.width,t.height,t.density,t.space],[897,1497,300,'cmyk']);assert(t.hasProfile);
  const header=Buffer.alloc(26),handle=fs.openSync(path.join(root,'templates',c.slug+'.psd'),'r');
  fs.readSync(handle,header,0,26,0);fs.closeSync(handle);
  assert.equal(header.toString('ascii',0,4),'8BPS');assert.equal(header.readUInt32BE(14),1497);assert.equal(header.readUInt32BE(18),897);
  const game=await sharp(path.join(root,'site/assets/cards',c.slug+'-full.png')).metadata();
  assert.deepEqual([game.width,game.height],[797,1388]);
  const decoded=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(locks.cards.some(lock=>lock.slug===c.slug)){
   const box={left:240,top:200,width:400,height:850};
   const oldArt=await sharp(path.join(root,'../V2/cartes',c.slug+'.png')).extract(box).raw().toBuffer();
   const newArt=await sharp(png).extract(box).raw().toBuffer();
   assert(oldArt.equals(newArt),'Protected illustration framing changed: '+c.slug);
  }
  let x0=897,y0=1497,x1=0,y1=0,outside=0;
  for(let y=0;y<1497;y++)for(let x=0;x<897;x++){
   const i=(y*897+x)*3;
   if(Math.max(decoded.data[i],decoded.data[i+1],decoded.data[i+2])<48)continue;
   x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   if(x<50||x>=847||y<50||y>=1438)outside++;
  }
  assert.equal(outside,0,'Visible artwork outside game crop: '+c.slug);
  bounds.push({slug:c.slug,visible:[x0,y0,x1,y1],brightPixelsOutsideGameCrop:outside});
  checked.push({id:c.id,editableTexts:true,stats:true,positions:true,print300dpiCMYK:true,gameCropped:true});
 }
 const alpha=[];
 for(let i=0;i<20;i++){
  const a=await sharp(path.join(root,'assets/armes',String(i).padStart(2,'0')+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:n}=a.info;
  const cornerAlpha=[0,w-1,w*(h-1),w*h-1].map(p=>a.data[p*n+n-1]);
  for(const value of cornerAlpha)assert(value<=1,'weapon '+i+' corner must be transparent within one alpha quantization step');
  alpha.push({index:i,cornerAlpha});
 }
 fs.writeFileSync(path.join(root,'verification/outputs-41.json'),JSON.stringify({cards:checked,protectedIllustrations:locks.cards.map(c=>c.slug),protectedIllustrationFramesIdentical:true,transparentWeapons:alpha,cropAudit:bounds},null,2));
 console.log('41 print/game/PSD profiles verified; 20 weapon alpha corners verified.');
 console.log('Crop outliers:',bounds.filter(x=>x.brightPixelsOutsideGameCrop>100));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
