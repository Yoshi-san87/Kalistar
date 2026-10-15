'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,file=n=>path.join(__dirname,n),bank=path.join(ROOT,'V4/atelier/designer-assets');
async function prepare(){
 await L.protectedCheck();await R.verifyAssets();const races={YETI:await A.race(file('components/source-YETI.png'),file('components/race-YETI.png'))},factions={};
 const geometry=read(path.join(bank,'manifest.json')).factions.Chroma,outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 for(const id of ['FF6','FF9','FF13','FF15']){
  const texture=await sharp(file('components/source-'+id+'.png')).trim().resize(geometry.width,geometry.height,{fit:'fill'}).flatten({background:id==='FF15'?'#101a39':id==='FF6'?'#34111a':'#e9deca'}).png().toBuffer();
  const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
  const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
  fs.writeFileSync(file('components/flag-'+id+'.png'),flag);fs.writeFileSync(file('components/flag-'+id+'-packed.png'),packed);
  assert.deepEqual(await alpha(flag),await alpha(outline));assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
  factions[id]={geometry:A.FLAG,sourceHash:await hash(file('components/source-'+id+'.png')),packedHash:await hash(file('components/flag-'+id+'-packed.png')),fullHash:await hash(file('components/flag-'+id+'.png'))};
 }
 write(file('components/components.json'),{races,factions});return {races:Object.keys(races),factions:Object.keys(factions)};
}
async function install(){
 const spec=read(file('components/components.json')),registry=path.join(bank,'race-extensions.json'),next=read(registry);
 const copy=(src,dst)=>{if(fs.existsSync(dst))assert(fs.readFileSync(src).equals(fs.readFileSync(dst)));else fs.copyFileSync(src,dst,fs.constants.COPYFILE_EXCL);};
 if(!fs.existsSync(file('race-extensions-before.json')))fs.copyFileSync(registry,file('race-extensions-before.json'),fs.constants.COPYFILE_EXCL);
 for(const [key,value]of Object.entries(read(file('race-extensions-before.json')).races))assert.deepEqual(next.races[key],value);
 copy(file('components/race-YETI.png'),path.join(bank,'extensions/race-YETI.png'));
 const entry={file:'extensions/race-YETI.png',...A.GEOMETRY,sha256:spec.races.YETI.sha256};if(next.races.YETI)assert.deepEqual(next.races.YETI,entry);next.races.YETI=entry;
 const icon=await sharp(file('components/source-YETI.png')).trim().resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer(),dest=path.join(ROOT,'V4/site/assets/races/YETI.png');
 if(fs.existsSync(dest))assert(fs.readFileSync(dest).equals(icon));else fs.writeFileSync(dest,icon,{flag:'wx'});
 write(registry,next);
 for(const id of ['FF6','FF13','FF15'])copy(file('components/flag-'+id+'.png'),path.join(ROOT,'V4/site/assets/factions/'+id+'.png'));
 await L.protectedCheck();await R.verifyAssets();return {installed:['YETI','FF6','FF13','FF15'],ff9:'Separate preserved native revision'};
}
async function replace(layers,c){
 const spec=read(file('components/components.json')),input=file('components/flag-'+c.faction+'-packed.png');assert.equal(await hash(input),spec.factions[c.faction].packedHash);
 const index=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(index>=0);layers[index]={...A.FLAG,name:'FACTION - '+c.faction,input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1});
