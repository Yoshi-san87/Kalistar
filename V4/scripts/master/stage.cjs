const {fs,path,sharp,root,layout,W,H,output,raw,save,clamp,inside,disk}=require('./common.cjs');
const {spawnSync}=require('node:child_process');
const stages=path.join(output,'staging');
const cardPath=path.resolve(process.argv[2]||path.join(output,'profiles/momo.json'));
const label=process.argv[3]||'MOMO-recompose';
const card=JSON.parse(fs.readFileSync(cardPath,'utf8').replace(/^\uFEFF/,''));
if(!/^[A-Za-z0-9_-]+$/.test(label))throw Error('Invalid output name');
const scalar=(a)=>typeof a==='number'&&Number.isInteger(a)&&a>=0&&a<=999;
const effects=['retry','mana','revive','guard','buff_atk','dodge','death'];
for(const field of ['atk','defense'])if(!Array.isArray(card[field])||card[field].length!==6||card[field].some(v=>!scalar(v)&&!effects.includes(v)))throw Error('Invalid '+field);
if(!Array.isArray(card.positions)||card.positions.length<1||new Set(card.positions).size!==card.positions.length||card.positions.some(v=>!Number.isInteger(v)||v<1||v>5))throw Error('Invalid positions');
for(const field of ['magic','barriers'])if(!Array.isArray(card[field])||card[field].some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('Invalid '+field);
for(const field of ['name','title','job','race','text'])if(typeof card[field]!=='string'||!card[field].trim())throw Error('Missing '+field);
if(!/^\d{8}$/.test(card.id))throw Error('Invalid card reference');
if(card.element!=='ELECTRO')throw Error('Only the approved ELECTRO master is calibrated; other elements need their own approved assets.');
if(card.id!=='30000001'&&!card.masterArtwork)throw Error('Specify masterArtwork explicitly for a different card. Momo artwork must not be used by accident.');
if(card.textLines&&card.textLines.join(' ')!==card.text)throw Error('textLines must reproduce text exactly; remove textLines to use automatic wrapping.');
if(card.frameColor&&!/^[0-9a-f]{6}$/i.test(card.frameColor))throw Error('frameColor must be six hexadecimal digits or null.');
if(card.dynamicSource&&!['V3','V4'].includes(card.dynamicSource))throw Error('Invalid dynamicSource');
if(card.attackNumberColor&&!/^[0-9a-f]{6}$/i.test(card.attackNumberColor))throw Error('Invalid attackNumberColor');
const blank=()=>Buffer.alloc(W*H*4);
async function moveAsset(file,cx,cy,tx,ty,scale=1){
  if(scale!==1){
    const width=Math.round(W*scale),height=Math.round(H*scale);
    const resized=await sharp(file).resize(width,height).ensureAlpha().raw().toBuffer();
    const out=blank(),left=Math.round(tx-cx*scale),top=Math.round(ty-cy*scale);
    for(let y=Math.max(0,top);y<Math.min(H,top+height);y++){
      const start=Math.max(0,left),end=Math.min(W,left+width);
      if(end>start)resized.copy(out,(y*W+start)*4,((y-top)*width+start-left)*4,((y-top)*width+end-left)*4);
    }
    return out;
  }
  const source=await raw(file),result=blank();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const sx=Math.round(cx+(x-tx)/scale),sy=Math.round(cy+(y-ty)/scale);
    if(sx<0||sy<0||sx>=W||sy>=H)continue;
    const i=(y*W+x)*4,j=(sy*W+sx)*4;source.copy(result,i,j,j+4);
  }
  return result;
}
async function contain(file,cx,cy,size,maxRadius=null){
  const image=await sharp(file).trim().resize({width:size,height:size,fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let mass=0,mx=0,my=0;
  for(let y=0;y<image.info.height;y++)for(let x=0;x<image.info.width;x++){
    const a=image.data[(y*image.info.width+x)*4+3];mass+=a;mx+=x*a;my+=y*a;
  }
  if(!mass)throw Error('Empty icon: '+file);
  if(maxRadius){
    let radius=0;
    for(let y=0;y<image.info.height;y++)for(let x=0;x<image.info.width;x++)
      if(image.data[(y*image.info.width+x)*4+3]>5)radius=Math.max(radius,Math.hypot(x-mx/mass,y-my/mass));
    if(radius>maxRadius)return contain(file,cx,cy,Math.max(1,Math.floor(size*maxRadius/radius)-1),maxRadius);
  }
  const left=Math.round(cx-mx/mass),top=Math.round(cy-my/mass);
  return sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:await sharp(image.data,{raw:image.info}).png().toBuffer(),left,top}]).raw().toBuffer();
}
async function main(){
  fs.mkdirSync(stages,{recursive:true});
  const job={label,card,layout,assets:{},slots:[],outputPsd:'master/exports/'+label+'.psd',outputPng:'master/exports/'+label+'.png',sourcePath:cardPath};
  if(card.masterArtwork){
    const file=path.resolve(root,card.masterArtwork);
    const image=await sharp(file).resize(785,1064,{fit:'cover',position:'centre'}).png().toBuffer();
    const composite=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:image,left:82,top:139}]).raw().toBuffer();
    const mask=await raw(path.join(output,'masks/art.png'));
    for(let i=0;i<W*H;i++)composite[i*4+3]=mask[i*4+3];
    await save('staging/art.png',composite);job.assets.art='master/staging/art.png';
  }else job.assets.art='master/assets/art-momo.png';
  job.assets.frame='master/components/frame.png';
  const tint=await raw(path.join(output,'masks/metal.png')),hex=card.frameColor||'C0C0C0';
  for(let i=0;i<W*H;i++)for(let c=0;c<3;c++)tint[i*4+c]=parseInt(hex.slice(c*2,c*2+2),16);
  await save('staging/frame-tint.png',tint);job.assets.tint='master/staging/frame-tint.png';
  for(const key of ['weapon','race','crystal','branches','flag'])job.assets[key]='master/assets/identity/'+key+'.png';
  if(card.weapon!=='Instrument'){
    const p=path.join(root,'../V3/assets/armes',String(card.weapon_index).padStart(2,'0')+'.png');
    if(!fs.existsSync(p))throw Error('Missing weapon '+p);
    await save('staging/weapon.png',await contain(p,103,1316,96,52));job.assets.weapon='master/staging/weapon.png';
  }
  if(card.race!=='ROBOT'){
    const p=path.join(root,'../V3/assets/races',card.race+'.png');
    if(!fs.existsSync(p))throw Error('Missing race '+p);
    await save('staging/race.png',await contain(p,846,1316,100,50));job.assets.race='master/staging/race.png';
  }
  if(card.dynamicSource==='V3'){
    await save('staging/race.png',await contain(path.join(root,'../V3/assets/races',card.race+'.png'),846,1316,100,50));
    job.assets.race='master/staging/race.png';
    // The V3 crystal's calibrated display ratio is 118:133, matching this 153:173 socket.
    const crystal=await sharp(path.join(root,'../V3/assets/cristaux',card.element+'.png')).trim().resize(153,173,{fit:'fill'}).png().toBuffer();
    await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:crystal,left:398,top:1267}]).png().toFile(path.join(stages,'crystal.png'));
    job.assets.crystal='master/staging/crystal.png';
    const flag=await sharp(path.join(root,'../V3/assets/factions',card.faction+'.png')).trim().resize({width:100,height:248,fit:'inside'}).png().toBuffer({resolveWithObject:true});
    await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:flag.data,left:Math.round(816-flag.info.width/2),top:924}]).png().toFile(path.join(stages,'flag.png'));
    job.assets.flag='master/staging/flag.png';
  }
  if(card.faction!=='Chroma')throw Error('Only the Chroma flag envelope has been calibrated. Register another flag explicitly.');
  const python='C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
  const svg=path.join(stages,'barcode.svg');
  const b=layout.barcode.box;
  const barcode=spawnSync(python,[path.join(__dirname,'barcode.py'),'--value',card.id,'--output',svg,'--width',String(b[2]-b[0]),'--height',String(b[3]-b[1])],{encoding:'utf8'});
  if(barcode.status!==0)throw Error(String(barcode.error||barcode.stderr));
  await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp(svg).png().toBuffer(),left:b[0],top:b[1]}]).png().toFile(path.join(stages,'barcode.png'));
  job.assets.barcode='master/staging/barcode.png';
  const basePhysical=path.join(output,'assets/capsules/physical-clean.png');
  const sourceEffect=await raw(path.join(output,'assets/capsules/effect-clean.png'));
  const gold=Buffer.from(sourceEffect);
  for(let y=458;y<552;y++)for(let x=79;x<173;x++){
    const d=Math.hypot(x-126,y-505),i=(y*W+x)*4;
    if(d<43){const f=d/43;gold[i]=Math.round(242-36*f);gold[i+1]=Math.round(204-39*f);gold[i+2]=Math.round(98-30*f);}
  }
  await save('staging/effect-base.png',gold);
  for(const s of layout.slots){
    const id=s.side+'-D'+s.die,value=card[s.side][6-s.die];
    const state=typeof value==='string'?'effect':s.side==='atk'&&card.magic.includes(s.die)?'electric':s.side==='defense'&&card.barriers.includes(s.die)?'barrier':'physical';
    const paths={};
    for(const mode of ['physical','electric','barrier','effect']){
      const p='staging/'+id+'-'+mode+'.png';
      let pixels;
      if(card.dynamicSource==='V3'){
        const size=s.die===6?158:106;
        const base=mode==='barrier'||(mode==='physical'&&s.side==='defense')?'def-small':'atk-small';
        pixels=await contain(path.join(output,'components/v3',base+'.png'),s.cx,s.cy,size);
        let overlay=null;
        if(mode==='effect'&&typeof value==='string')overlay=await contain(path.join(root,'../V3/assets/effets',value+'.png'),s.cx,s.cy,s.die===6?100:69,s.die===6?64:43);
        if(mode==='barrier')overlay=await contain(path.join(root,'../V3/assets/effets/barrier.png'),s.cx,s.cy,Math.round(size*1.27));
        if(mode==='electric')overlay=await contain(path.join(root,'../V3/assets/effets',card.element+'.png'),s.cx,s.cy,Math.round(size*1.5));
        if(overlay)pixels=await sharp(pixels,{raw:{width:W,height:H,channels:4}}).composite([{input:await sharp(overlay,{raw:{width:W,height:H,channels:4}}).png().toBuffer()}]).raw().toBuffer();
      }
      else if(mode==='physical')pixels=await moveAsset(basePhysical,817,623,s.cx,s.cy,s.die===6?1.52:1);
      else if(mode==='barrier'){
        const core=await moveAsset(basePhysical,817,623,s.cx,s.cy,s.die===6?1.52:1);
        const light=await moveAsset(path.join(output,'components/barrier-light.png'),817,744,s.cx,s.cy,s.die===6?1.52:1);
        pixels=await sharp(core,{raw:{width:W,height:H,channels:4}}).composite([{input:await sharp(light,{raw:{width:W,height:H,channels:4}}).png().toBuffer()}]).raw().toBuffer();
      }
      else if(mode===s.state && (mode!=='effect'||value===s.value)){
        pixels=await raw(path.join(output,'assets/capsules/'+id+'.png'));
        if(mode==='effect')for(let y=0;y<H;y++)for(let x=0;x<W;x++)pixels[(y*W+x)*4+3]=Math.round(pixels[(y*W+x)*4+3]*disk(x,y,s.cx,s.cy,s.r));
      }
      else if(mode==='electric')pixels=await moveAsset(path.join(output,'assets/capsules/'+(s.die===6?'atk-D6':'atk-D5')+'.png'),s.die===6?106:122,s.die===6?117:382,s.cx,s.cy);
      else{
        pixels=await moveAsset(path.join(stages,'effect-base.png'),126,505,s.cx,s.cy,s.die===6?1.52:1);
        if(typeof value==='string'){
          const icon=await contain(path.join(root,'../V3/assets/effets',value+'.png'),s.cx,s.cy,s.die===6?110:72);
          pixels=await sharp(pixels,{raw:{width:W,height:H,channels:4}}).composite([{input:await sharp(icon,{raw:{width:W,height:H,channels:4}}).png().toBuffer()}]).raw().toBuffer();
        }
      }
      await save(p,pixels);paths[mode]='master/'+p;
    }
    job.slots.push({...s,value,state,assets:paths});
  }
  job.positions=[];
  for(let i=0;i<5;i++){
    const p=layout.positions;
    await save('staging/position-'+i+'.png',await moveAsset(path.join(output,'assets/identity/position.png'),p.cx,p.cy,p.cx+i*p.step,p.cy));
    job.positions.push({path:'master/staging/position-'+i+'.png',value:card.positions.slice().sort((a,b)=>a-b)[i]||null,x:p.cx+i*p.step,y:p.cy});
  }
  fs.writeFileSync(path.join(stages,'job.json'),JSON.stringify(job,null,2));
  console.log(JSON.stringify({card:card.name,output:job.outputPng,slots:job.slots.map(s=>s.side+s.die+':'+s.state)}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
