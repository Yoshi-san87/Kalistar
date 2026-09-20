const {spawn}=require('node:child_process');
const L=require('./lib.cjs');
const D=require('./designer-core.cjs');
const {fs,path,ROOT,DATA,read,write,sharp,assert}=L;
const ASSETS=path.join(__dirname,'designer-assets');
const W=897,H=1497,ART={left:80,top:156,width:737,height:921};
const Y={6:150,5:371.5,4:475.5,3:576.5,2:676.5,1:773.5};
const cache=new Map();
let fontsReady;
function loadFonts(){
  if(!fontsReady)fontsReady=(async()=>{
    const fonts=[['Myriad Pro','C:/Program Files/Adobe/Adobe Photoshop 2025/Required/PDFL/Resource/Fonts/MyriadPro-Regular.otf'],['Augustus',path.join(process.env.LOCALAPPDATA,'Microsoft/Windows/Fonts/AUGUSTUS.TTF')]];
    for(const [font,fontfile]of fonts)if(fs.existsSync(fontfile))await sharp({text:{text:'Kalistar',font,fontfile,rgba:true}}).png().toBuffer();
  })();return fontsReady;
}
function command(exe,args,log,onStart){return new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{cwd:__dirname,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';
  if(onStart&&child.pid)onStart(child.pid);
  child.stdout.on('data',b=>{output+=b;if(log)fs.appendFileSync(log,b);});child.stderr.on('data',b=>{output+=b;if(log)fs.appendFileSync(log,b);});
  child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(output.slice(-2500)||'Photoshop a interrompu la composition.')));
});}
function asset(spec,name){
  if(!spec?.file)throw Error('Composant du template absent : '+name);
  const file=L.inside(ASSETS,spec.file);
  return {input:file,left:spec.left,top:spec.top,width:spec.width,height:spec.height,name};
}
async function art(profile){
  if(!profile.upload){
    const logo=await sharp(path.join(ROOT,'V3/site/assets/logo.png')).resize(410,300,{fit:'inside'}).png().toBuffer();
    const meta=await sharp(logo).metadata();
    return sharp({create:{width:ART.width,height:ART.height,channels:4,background:'#000000'}}).composite([{input:logo,left:Math.round((ART.width-meta.width)/2),top:Math.round((ART.height-meta.height)/2)}]).png().toBuffer();
  }
  const file=path.join(DATA,'uploads',profile.upload+'.png'),meta=await sharp(file).metadata();
  const scale=Math.max(ART.width/meta.width,ART.height/meta.height)*profile.crop.zoom;
  const width=Math.max(1,Math.min(meta.width,Math.round(ART.width/scale))),height=Math.max(1,Math.min(meta.height,Math.round(ART.height/scale)));
  const left=Math.round((meta.width-width)*(1-profile.crop.x)/2),top=Math.round((meta.height-height)*(1-profile.crop.y)/2);
  // Crop before resizing so even a very wide photograph has bounded memory cost.
  return sharp(file).extract({left,top,width,height}).resize(ART.width,ART.height,{fit:'fill'}).png().toBuffer();
}
async function barcode(id){
  if(cache.has('barcode:'+id))return cache.get('barcode:'+id);
  const svg=await command(L.PYTHON,[path.join(__dirname,'designer-barcode.py'),id]);
  const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const stops=[[0,[160,230,237]],[.28,[173,185,234]],[.55,[217,164,218]],[.78,[240,182,198]],[1,[234,213,120]]];
  for(let y=0;y<info.height;y++){
    const phase=y/(info.height-1);let i=0;while(i<stops.length-2&&phase>stops[i+1][0])i++;
    const a=stops[i],b=stops[i+1],mix=(phase-a[0])/(b[0]-a[0]);
    for(let x=0;x<info.width;x++)for(let c=0;c<3;c++)data[(y*info.width+x)*4+c]=Math.round(data[(y*info.width+x)*4+c]*(a[1][c]*(1-mix)+b[1][c]*mix)/255);
  }
  const buffer=await sharp(data,{raw:info}).png().toBuffer();if(id==='00000000')cache.set('barcode:'+id,buffer);return buffer;
}
async function components(profile,{id='00000000',positionsText=false}={}){
  const m=read(path.join(ASSETS,'manifest.json')),layers=[];
  const add=(spec,name)=>layers.push(asset(spec,name));
  layers.push({input:await art(profile),...ART,name:'ILLUSTRATION - cadrage'});
  add(profile.element==='ELECTRO'&&m.frame.electro?m.frame.electro:m.frame,'CADRE V4 - structure validee');
  // Native ATK circles stack upward; DEF circles stack downward.
  for(let die=1;die<=6;die++){
    const value=profile.atk[6-die],mode=typeof value==='number'&&profile.magic.includes(die)?'magic':'physical';
    add(m.stats.atk[profile.element][die][mode],'ATK D'+die+' - '+(mode==='magic'?'HALO MAGIQUE':'fond physique'));
    if(typeof value==='string')add(m.effects.atk[value]?.[die],'ATK D'+die+' - effet '+value);
  }
  for(let die=6;die>=1;die--){
    const defense=profile.defense[6-die];
    if(typeof defense==='number'&&profile.barriers.includes(die))add(m.stats.def[die].barrier,'DEF D'+die+' - BARRIERE');
    if(typeof defense==='string'&&m.stats.def[die].effectBackground)add(m.stats.def[die].effectBackground,'DEF D'+die+' - fond effet');
    if(typeof defense==='string')add(m.effects.def[defense]?.[die],'DEF D'+die+' - effet '+defense);
  }
  for(let slot=1;slot<=profile.positions.length;slot++){
    add(m.position.supports[slot],'SUPPORT SLOT '+slot);
    if(positionsText)add(m.position.numerals[slot][profile.positions[slot-1]],'POSITION SLOT '+slot);
  }
  add(m.factions[profile.faction],'FACTION - '+profile.faction);
  add(m.weapons[profile.weapon],'ARME - '+profile.weapon);
  add(m.races[profile.race],'RACE - '+profile.race);
  add(m.elements[profile.element].branch,'BRANCHES '+profile.element+' - couleur du cristal');
  add(m.elements[profile.element].crystal,'CRISTAL '+profile.element);
  layers.push({input:await barcode(id),left:132,top:848,width:22,height:210,name:'ID CODE128 - '+id});
  return layers;
}
async function composite(layers){
  return sharp({create:{width:W,height:H,channels:4,background:'#000000'}}).composite(layers.map(({input,left,top})=>({input,left,top}))).png().toBuffer();
}
function xml(s){return String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));}
async function textImage(value,font,size,color,stroke=0){
  await loadFonts();
  const key=JSON.stringify([value,font,size,color,stroke]);if(cache.has(key))return cache.get(key);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="170"><text x="1100" y="120" text-anchor="middle" font-family="${font}" font-size="${size}" font-stretch="${font==='Bahnschrift'?'semi-condensed':'normal'}" font-weight="${font==='Bahnschrift'?700:400}" fill="${color}" stroke="#06131c" stroke-width="${stroke}" stroke-linejoin="round" paint-order="stroke fill">${xml(value)}</text></svg>`;
  const buffer=await sharp(Buffer.from(svg)).trim({threshold:0}).png().toBuffer();
  if(cache.size>250)cache.clear();cache.set(key,buffer);return buffer;
}
async function previewText(p){
  const layers=[];
  const nativeStyles=read(path.join(ASSETS,'manifest.json')).textStyles.ruby;
  const add=async(value,x,y,max,font,size,color='#f0efec',stroke=0)=>{
    if(!value)return;let buffer=await textImage(value,font,size,color,stroke),meta=await sharp(buffer).metadata();
    if(meta.width>max){buffer=await sharp(buffer).resize({width:max}).png().toBuffer();meta=await sharp(buffer).metadata();}
    layers.push({input:buffer,left:Math.round(x-meta.width/2),top:Math.round(y-meta.height/2)});
  };
  await add(p.name||'KALISTAR',449.5,129.5,470,'Augustus',33.33);
  const bottomScale=.837897;
  await add(p.title,448.5,1100,590,'Times New Roman',32*bottomScale);
  const color=D.options().elements.find(e=>e.value===p.element).color;
  await add(p.job,292,1172.5,170,'Times New Roman',28*bottomScale,color);
  await add(p.race,599,1172.5,170,'Times New Roman',28*bottomScale,color);
  for(const [side,values] of [['atk',p.atk],['def',p.defense]])for(let i=0;i<6;i++)if(typeof values[i]==='number'){
    const die=6-i,style=nativeStyles.find(s=>s.name===side.toUpperCase()+' D'+die+' - valeur');
    await add(String(values[i]),side==='atk'?(die===6?142:155.5):(die===6?756:734),Y[die],die===6?104:66,'Bahnschrift',style.sizePt*300/72,'#'+style.color,side==='atk'?5:3);
  }
  if(p.description){
    const size=29*bottomScale,words=p.description.split(' '),lines=[];let line='';
    const width=async value=>(await sharp(await textImage(value,'Myriad Pro',size,'#edeeeb')).metadata()).width;
    for(const word of words){if(await width(word)>574)throw Error('Un mot du recit depasse le cadre.');const next=line?line+' '+word:word;if(line&&await width(next)>570){lines.push(line);line=word;}else line=next;}
    if(line)lines.push(line);
    if(lines.length>5)throw Error('Le recit depasse cinq lignes. Raccourcis-le pour conserver la police du template.');
    if(lines.length>1){const last=lines.length-1,previous=lines[last-1].split(' ');while(previous.length>2&&await width(lines[last])<230){const candidate=previous[previous.length-1]+' '+lines[last];if(await width(candidate)>574)break;previous.pop();lines[last-1]=previous.join(' ');lines[last]=candidate;}}
    const step=34*bottomScale;for(let i=0;i<lines.length;i++)await add(lines[i],448.5,1318.5+(i-(lines.length-1)/2)*step,574,'Myriad Pro',size,'#edeeeb');
  }
  return layers;
}
async function preview(profile){
  const background=await composite(await components(profile,{positionsText:true}));
  const full=await sharp(background).composite(await previewText(profile)).png().toBuffer();
  return sharp(full).resize(598,998).png().toBuffer();
}
async function verifyAssets(){
  const m=read(path.join(ASSETS,'manifest.json'));
  assert.ok(['ready','complete'].includes(m.status),'La banque de composants est encore incomplete.');
  assert.equal(m.referenceId,L.baseline().id,'Composants extraits depuis une autre reference.');
  if(m.hashes)for(const [file,sha]of Object.entries(m.hashes))assert.equal(await L.hash(L.inside(ASSETS,file)),sha,'Composant modifie : '+file);
  return m;
}
async function verifyComponentRender(dir,layers){
  const a=await sharp(path.join(dir,'expected-components.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const b=await sharp(path.join(dir,'without-text.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(a.info,b.info);
  const frame=await sharp(layers[1].input).ensureAlpha().raw().toBuffer();
  const fixed=new Uint8Array(W*H);for(let i=0;i<fixed.length;i++)fixed[i]=frame[i*4+3]===255?1:0;
  for(const layer of layers.slice(2)){
    const s=await sharp(layer.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<s.info.height;y++)for(let x=0;x<s.info.width;x++)if(s.data[(y*s.info.width+x)*4+3]>0)fixed[(y+layer.top)*W+x+layer.left]=0;
  }
  const result={changed:0,maxChannelDelta:0,severePixels:0,fixedDifferences:0};
  for(let i=0;i<W*H;i++){
    let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(a.data[i*4+c]-b.data[i*4+c]));
    if(delta){result.changed++;result.maxChannelDelta=Math.max(result.maxChannelDelta,delta);if(delta>2)result.severePixels++;if(fixed[i])result.fixedDifferences++;}
  }
  assert.equal(result.fixedDifferences,0,'Le cadre fixe a change pendant la composition native.');
  assert.equal(result.severePixels,0,'Les composants natifs ne correspondent pas a leur geometrie validee.');
  return result;
}
async function execute(id,{publish=true}={}){
  const dir=D.folder(id),request=read(path.join(dir,'request.json')),lock=path.join(DATA,'render.lock');let fd;
  try{
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,id,kind:'designer'}));
    const requestHash=await L.hash(path.join(dir,'request.json'));
    D.setStatus(id,'rendering',{message:'Verification du template et composition de la carte.'});
    await L.protectedCheck();await verifyAssets();
    const profile=D.validate(request.profile,{final:true});assert.equal(request.referenceId,L.baseline().id);
    await previewText(profile);
    const layers=await components(profile,{id:request.card.id});
    await sharp(await composite(layers)).png().toFile(path.join(dir,'expected-components.png'));
    const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
    for(let i=0;i<layers.length;i++){
      const layer=layers[i],file='component-'+String(i).padStart(2,'0')+'.png';
      await sharp(layer.input).png().toFile(path.join(dir,file));
      plan.layers.push({file,name:layer.name,left:layer.left,top:layer.top,width:layer.width,height:layer.height});
    }
    if(profile.upload)fs.copyFileSync(path.join(DATA,'uploads',profile.upload+'.png'),path.join(dir,'illustration.png'));
    write(path.join(dir,'composition.json'),plan);write(path.join(D.HOME,'active.json'),{id});
    await command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(__dirname,'designer-bridge.ps1')],path.join(dir,'photoshop.log'),workerPid=>fs.writeFileSync(lock,JSON.stringify({pid:process.pid,workerPid,id,kind:'designer'})));
    D.setStatus(id,'rendering',{message:'Controle du PSD, des chiffres et du code-barres.'});
    const native=read(path.join(dir,'native.json'));assert.equal(native.width,W);assert.equal(native.height,H);assert.equal(native.resolution,300);
    for(const e of native.expected){const l=native.layers.find(l=>l.name===e.name);assert.equal(l?.kind,'LayerKind.TEXT');assert.equal(l?.text,e.value);assert.ok(l.visible);assert.ok(Math.abs((l.ink[0]+l.ink[2])/2-e.center[0])<=1&&Math.abs((l.ink[1]+l.ink[3])/2-e.center[1])<=1,'Texte decentre : '+e.name);}
    const description=native.layers.find(l=>l.name==='DESCRIPTION');if(profile.description){assert.equal(description.text.replace(/\r/g,' '),profile.description);assert.ok(description.ink[1]>=1251&&description.ink[3]<=1387);}
    for(const layer of plan.layers){const l=native.layers.find(l=>l.name===layer.name);assert.ok(l?.visible&&l.kind==='LayerKind.SMARTOBJECT','Composant non editable : '+layer.name);}
    const componentRender=await verifyComponentRender(dir,layers);
    const roundtrip=await L.diff(path.join(dir,'card.png'),path.join(dir,'reopened.png'));assert.equal(roundtrip.changed,0,'Le PSD et le PNG different.');
    const renderedBarcode=JSON.parse(await command(L.PYTHON,[path.join(__dirname,'barcode.py'),path.join(dir,'card.png'),request.card.id]));assert.equal(renderedBarcode.passed,true);
    await L.protectedCheck();await verifyAssets();
    assert.equal(await L.hash(path.join(dir,'request.json')),requestHash,'La fiche a change pendant le rendu.');
    const hashes={};for(const file of ['card.png','card.psd'])hashes[file]=await L.hash(path.join(dir,file));
    const report={passed:true,modelId:request.card.id,referenceId:request.referenceId,requestHash,componentRender,roundtrip,barcode:renderedBarcode,nativeTexts:native.expected.length,smartObjects:plan.layers.length,hashes,checkedAt:new Date().toISOString()};
    write(path.join(dir,'verification.json'),report);D.setStatus(id,'verified',{message:'Carte verifiee.'});
    if(publish)await D.publish(id);return D.status(id);
  }catch(e){D.setStatus(id,'failed',{error:e.message,message:'Carte non publiee : '+e.message});throw e;}
  finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
}
module.exports={ASSETS,ART,art,components,composite,preview,previewText,barcode,verifyAssets,execute,command};
