const {execFileSync}=require('node:child_process');
const L=require('../../atelier/lib.cjs');
const {fs,path,ROOT,read,write,hash,assert,sharp}=L;
const work=__dirname,dir=path.join(work,'staged');
const precision=v=>JSON.parse(JSON.stringify(v),(k,x)=>typeof x==='number'?Math.round(x*1e8)/1e8:x);
async function optical(file,layout,method=true){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let radius=0,x0=info.width,y0=info.height,x1=0,y1=0,weight=0,sx=0,sy=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const i=(y*info.width+x)*4,a=data[i+3]/255;if(!a)continue;
    radius=Math.max(radius,Math.hypot(x+.5-layout.center[0],y+.5-layout.center[1]));
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);
    const w=a*(.35+.65*(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255);weight+=w;sx+=(x+.5)*w;sy+=(y+.5)*w;
  }
  assert.ok(weight>0);assert.ok(radius<=layout.safeRadius+.5,file+': contour hors medaillon '+radius);
  const center=[(x0+x1)/2*.35+sx/weight*.65,(y0+y1)/2*.35+sy/weight*.65],error=center.map((v,i)=>Math.abs(v-layout.center[i]));
  if(method)assert.ok(error.every(v=>v<=.8),file+': centre optique '+error.join(','));
  return{maxRadius:radius,safeRadius:layout.safeRadius,center,opticalError:error,opticalMethodChecked:method};
}
(async()=>{
  const plan=read(path.join(work,'plan.json')),ref=read(path.join(work,'references-before.json')),card=read(path.join(ROOT,plan.profile));
  await L.protectedCheck(ref);
  const native=read(path.join(dir,'native.json')),v3=read(path.join(ROOT,'V3/donnees/cartes.json')).find(c=>c.id===card.id);
  for(const field of ['id','race','element','faction','weapon','positions','atk','defense','magic','barriers','weapon_index'])assert.deepEqual(card[field],v3[field],field+' modifie');
  assert.deepEqual(native.card,card);assert.equal(native.width,897);assert.equal(native.height,1497);assert.equal(native.resolution,300);
  const layer=name=>{const l=native.reopened.find(l=>l.name===name);assert.ok(l,name+' absent');return l;};
  for(const [side,values]of [['ATK',card.atk],['DEF',card.defense]])for(let i=0;i<6;i++){
    const die=6-i,l=layer(side+' D'+die+' - valeur'),value=values[i],numeric=typeof value==='number';
    assert.equal(l.visible,numeric);assert.equal(l.kind,'LayerKind.TEXT');if(numeric)assert.equal(l.text,String(value));else assert.equal(layer(side+' D'+die+' - effet '+value).visible,true);
    assert.equal(layer(side+' D'+die+' - '+(side==='ATK'?'HALO MAGIQUE':'BARRIERE')).visible,numeric&&(side==='ATK'?card.magic:card.barriers).includes(die));
  }
  for(const [name,text,x,y,max]of [['NOM',card.name,449.5,129.5,470],['TITLE',card.title,448.5,1100,590],['JOB',card.job,292,1172.5,170],['RACE',card.race,599,1172.5,170]]){
    const l=layer(name);assert.equal(l.text,text);assert.equal(l.kind,'LayerKind.TEXT');assert.ok(l.ink[2]-l.ink[0]<=max+1);assert.ok(Math.abs((l.ink[0]+l.ink[2])/2-x)<=1&&Math.abs((l.ink[1]+l.ink[3])/2-y)<=1,name+' decentre');
  }
  const desc=layer('DESCRIPTION');assert.equal(desc.text.replace(/\r/g,' '),card.description);assert.ok(desc.ink[0]>=149&&desc.ink[2]<=750&&desc.ink[1]>=1251&&desc.ink[3]<=1387);
  for(let p=1;p<=5;p++){const l=layer('POSITION SLOT '+p);assert.equal(l.visible,p===1);if(p===1)assert.equal(l.text,'2');}
  for(const name of ['ART - CONTENU','ARME - CONTENU','RACE - CONTENU','CRISTAL NECRO'])assert.equal(layer(name).kind,'LayerKind.SMARTOBJECT');
  const fixed=await L.diff(path.join(dir,'fixed-master.png'),path.join(dir,'fixed-card.png'));assert.equal(fixed.changed,0,'Cadre fixe modifie');
  const roundtrip=await L.diff(path.join(dir,'card.png'),path.join(dir,'reopened.png'));assert.equal(roundtrip.changed,0,'PSD instable');
  const repeat=await L.diff(path.join(dir,'card.png'),path.join(dir,'repeat.png'));assert.equal(repeat.changed,0,'Rendu non reproductible');
  const illustration=await L.diff(path.join(dir,'art-before.png'),path.join(dir,'art-after.png'));assert.equal(illustration.changed,0,'Illustration V3 modifiee');
  const layouts=read(path.join(dir,'icon-layouts.json'));assert.deepEqual(precision(native.iconLayouts),precision(layouts));
  const icons={weapon:await optical(path.join(dir,'weapon.png'),layouts.weapon.Faucille),race:await optical(path.join(dir,'race.png'),layouts.race.CARDEMORTIS),death:await optical(path.join(dir,'death.png'),{center:[142,147],safeRadius:49},false)};
  const barcode=JSON.parse(execFileSync(L.PYTHON,[path.join(ROOT,'V4/atelier/barcode.py'),path.join(dir,'card.png'),card.id],{windowsHide:true,encoding:'utf8'}));assert.equal(barcode.passed,true);
  for(const [file,sha]of Object.entries(plan.sourceHashes))assert.equal(await hash(path.join(ROOT,file)),sha);
  const installHashes={};for(const item of plan.install||[])installHashes[item.to]=await hash(path.join(ROOT,item.from));
  await sharp(path.join(dir,'card.png')).resize({width:300}).png().toFile(path.join(dir,'small.png'));
  await sharp(path.join(dir,'card.png')).extract({left:65,top:1092,width:763,height:140}).resize({width:1145}).png().toFile(path.join(dir,'icons-zoom.png'));
  const result={passed:true,revision:plan.revision,originalReferenceId:ref.id,modelId:card.id,fixed,roundtrip,repeat,illustration,icons,barcode,installHashes,
    psdHash:await hash(path.join(dir,'card.psd')),pngHash:await hash(path.join(dir,'card.png')),nativeHash:await hash(path.join(dir,'native.json')),
    profileHash:await hash(path.join(ROOT,plan.profile)),layoutHash:await hash(path.join(dir,'icon-layouts.json')),sourcesUnchanged:true,checkedAt:new Date().toISOString()};
  write(path.join(work,'verification.json'),result);console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1;});
