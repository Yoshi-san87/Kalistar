'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L;
const file=n=>path.join(__dirname,n),bank=path.join(ROOT,'V4/atelier/designer-assets');
async function prepare(){
 await L.protectedCheck();await R.verifyAssets();
 const race=await A.race(file('components/source-OKAMI.png'),file('components/race-OKAMI.png'));
 const geometry=read(path.join(bank,'manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const texture=await sharp(file('components/source-Grivka.png')).resize(geometry.width,geometry.height,{fit:'fill'}).png().toBuffer();
 const flag=await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
 fs.writeFileSync(file('components/flag-Grivka.png'),flag);
 fs.writeFileSync(file('components/flag-Grivka-packed.png'),packed);
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(flag),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 write(file('components/components.json'),{race,faction:{id:'Grivka',geometry:A.FLAG,sourceHash:await hash(file('components/source-Grivka.png')),packedHash:await hash(file('components/flag-Grivka-packed.png')),fullHash:await hash(file('components/flag-Grivka.png'))}});
 return {race:race.metrics,flag:A.FLAG};
}
async function install(){
 const spec=read(file('components/components.json'));
 const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});if(fs.existsSync(to))assert.equal(fs.readFileSync(from).equals(fs.readFileSync(to)),true);else fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);};
 const registry=path.join(bank,'race-extensions.json'),before=file('race-extensions-before.json');
 if(!fs.existsSync(before))fs.copyFileSync(registry,before,fs.constants.COPYFILE_EXCL);
 const original=read(before),next=read(registry);
 for(const [name,value] of Object.entries(original.races))assert.deepEqual(next.races[name],value);
 assert.equal(await hash(file('components/race-OKAMI.png')),spec.race.sha256);
 copy(file('components/race-OKAMI.png'),path.join(bank,'extensions/race-OKAMI.png'));
 const entry={file:'extensions/race-OKAMI.png',...A.GEOMETRY,sha256:spec.race.sha256};
 if(next.races.OKAMI)assert.deepEqual(next.races.OKAMI,entry);
 next.races.OKAMI=entry;write(registry,next);
 const raceIcon=await sharp(file('components/source-OKAMI.png')).trim().resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
 const site=path.join(ROOT,'V4/site/assets/races/OKAMI.png');
 if(fs.existsSync(site))assert(fs.readFileSync(site).equals(raceIcon));else fs.writeFileSync(site,raceIcon,{flag:'wx'});
 copy(file('components/flag-Grivka.png'),path.join(ROOT,'V4/site/assets/factions/Grivka.png'));
 await L.protectedCheck();await R.verifyAssets();
 return {race:'OKAMI',faction:'Grivka',previousComponentsPreserved:true};
}
async function replace(layers,c){
 if(c.faction==='Ysilis'){const flag=layers.find(l=>l.name==='FACTION - Niveria');assert(flag);flag.name='FACTION - Ysilis';}
 if(c.faction==='Grivka'){
  const spec=read(file('components/components.json')),input=file('components/flag-Grivka-packed.png');
  assert.equal(await hash(input),spec.faction.packedHash);
  const index=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(index>=0);
  layers[index]={...A.FLAG,name:'FACTION - Grivka',input};
 }
 return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1});

