'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L;
const races=['MICE','BATRA','RATZ','MACAKO'];
const file=n=>path.join(__dirname,n),bank=path.join(ROOT,'V4/atelier/designer-assets');
async function prepare(){
 await L.protectedCheck();await R.verifyAssets();
 const entries={};
 for(const race of races)entries[race]=await A.race(file('components/source-'+race+'.png'),file('components/race-'+race+'.png'));
 const geometry=read(path.join(bank,'manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const texture=await sharp(file('components/source-FF9.png')).trim().resize(geometry.width,geometry.height,{fit:'fill'}).flatten({background:'#061a38'}).png().toBuffer();
 const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
 fs.writeFileSync(file('components/flag-FF9.png'),flag);
 fs.writeFileSync(file('components/flag-FF9-packed.png'),packed);
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(flag),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 write(file('components/components.json'),{races:entries,faction:{id:'FF9',geometry:A.FLAG,sourceHash:await hash(file('components/source-FF9.png')),packedHash:await hash(file('components/flag-FF9-packed.png')),fullHash:await hash(file('components/flag-FF9.png'))}});
 return {races:Object.fromEntries(Object.entries(entries).map(([key,value])=>[key,value.metrics])),flag:A.FLAG};
}
async function install(){
 const spec=read(file('components/components.json'));
 const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});if(fs.existsSync(to))assert(fs.readFileSync(from).equals(fs.readFileSync(to)));else fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);};
 const registry=path.join(bank,'race-extensions.json'),before=file('race-extensions-before.json');
 if(!fs.existsSync(before))fs.copyFileSync(registry,before,fs.constants.COPYFILE_EXCL);
 const original=read(before),next=read(registry);
 for(const [name,value]of Object.entries(original.races))assert.deepEqual(next.races[name],value);
 for(const race of races){
  assert.equal(await hash(file('components/race-'+race+'.png')),spec.races[race].sha256);
  copy(file('components/race-'+race+'.png'),path.join(bank,'extensions/race-'+race+'.png'));
  const entry={file:'extensions/race-'+race+'.png',...A.GEOMETRY,sha256:spec.races[race].sha256};
  if(next.races[race])assert.deepEqual(next.races[race],entry);
  next.races[race]=entry;
  const icon=await sharp(file('components/source-'+race+'.png')).trim().resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
  const site=path.join(ROOT,'V4/site/assets/races/'+race+'.png');
  if(fs.existsSync(site))assert(fs.readFileSync(site).equals(icon));else fs.writeFileSync(site,icon,{flag:'wx'});
 }
 write(registry,next);
 copy(file('components/flag-FF9.png'),path.join(ROOT,'V4/site/assets/factions/FF9.png'));
 await L.protectedCheck();await R.verifyAssets();
 return {races,faction:'FF9',previousComponentsPreserved:true};
}
async function replace(layers,c){
 assert.equal(c.faction,'FF9');
 const spec=read(file('components/components.json')),input=file('components/flag-FF9-packed.png');
 assert.equal(await hash(input),spec.faction.packedHash);
 const index=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(index>=0);
 layers[index]={...A.FLAG,name:'FACTION - FF9',input};
 return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1});

