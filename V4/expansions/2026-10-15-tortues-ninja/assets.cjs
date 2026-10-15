'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L;
const races=['FACOCHE','TORTUGA'],file=n=>path.join(__dirname,n),bank=path.join(ROOT,'V4/atelier/designer-assets');
async function prepare(){
 assert(!fs.existsSync(file('components/components.json')),'Preserve frozen components');
 await L.protectedCheck();await R.verifyAssets();
 const entries={};
 for(const race of races)entries[race]=await A.race(file('components/source-'+(race==='TORTUGA'?'turtle':race)+'.png'),file('components/race-'+race+'.png'));
 const geometry=read(path.join(bank,'manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const texture=await sharp(file('components/source-TMNT.png')).resize(geometry.width,geometry.height,{fit:'fill'}).flatten({background:'#10251a'}).png().toBuffer();
 const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(flag),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 fs.writeFileSync(file('components/flag-TMNT.png'),flag,{flag:'wx'});
 fs.writeFileSync(file('components/flag-TMNT-packed.png'),packed,{flag:'wx'});
 write(file('components/components.json'),{races:entries,faction:{id:'TMNT',geometry:A.FLAG,sourceHash:await hash(file('components/source-TMNT.png')),packedHash:await hash(file('components/flag-TMNT-packed.png')),fullHash:await hash(file('components/flag-TMNT.png'))}});
 return {races:Object.fromEntries(Object.entries(entries).map(([k,v])=>[k,v.metrics])),flag:A.FLAG};
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
  const icon=await sharp(file('components/source-'+(race==='TORTUGA'?'turtle':race)+'.png')).trim().resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
  const site=path.join(ROOT,'V4/site/assets/races/'+race+'.png');
  if(fs.existsSync(site))assert(fs.readFileSync(site).equals(icon));else fs.writeFileSync(site,icon,{flag:'wx'});
 }
 write(registry,next);copy(file('components/flag-TMNT.png'),path.join(ROOT,'V4/site/assets/factions/TMNT.png'));
 await L.protectedCheck();await R.verifyAssets();return {races,faction:'TMNT',previousComponentsPreserved:true};
}
async function replace(layers){
 const spec=read(file('components/components.json')),input=file('components/flag-TMNT-packed.png');
 assert.equal(await hash(input),spec.faction.packedHash);
 const i=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(i>=0);
 layers[i]={...A.FLAG,name:'FACTION - TMNT',input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
