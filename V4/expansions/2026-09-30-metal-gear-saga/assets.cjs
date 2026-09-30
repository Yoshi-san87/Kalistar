'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L;
const file=n=>path.join(__dirname,n),bank=path.join(ROOT,'V4/atelier/designer-assets');
async function prepare(){
  await L.protectedCheck();await R.verifyAssets();
  const races={};
  for(const name of ['BUZZY','SERPES'])races[name]=await A.race(file('components/source-'+name+'.png'),file('components/race-'+name+'.png'));
  write(file('race-components.json'),{schemaVersion:1,races});
  const geometry=read(path.join(bank,'manifest.json')).factions.Chroma;
  const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
  const packedOutline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  const alpha=p=>sharp(p).ensureAlpha().extractChannel(3).raw().toBuffer(),factions=[];
  for(const id of ['MGS3','MGS5']){
    const source=file('components/source-'+id+'.png');
    const texture=await sharp(source).flatten({background:'#f5f4f1'}).resize(geometry.width,geometry.height,{fit:'fill'}).png().toBuffer();
    const flag=await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
    const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
    assert.deepEqual(await alpha(flag),await alpha(outline));assert.deepEqual(await alpha(packed),await alpha(packedOutline));
    fs.writeFileSync(file('components/flag-'+id+'.png'),flag);fs.writeFileSync(file('components/flag-'+id+'-packed.png'),packed);
    factions.push({id,label:id==='MGS3'?'Metal Gear Solid 3':'Metal Gear Solid V',flag:'flag-'+id+'.png',packedFlag:'flag-'+id+'-packed.png',packedGeometry:A.FLAG,sourceHash:await hash(source),flagHash:await hash(file('components/flag-'+id+'.png')),packedHash:await hash(file('components/flag-'+id+'-packed.png'))});
  }
  write(file('components/factions.json'),{schemaVersion:1,officialCollaboration:false,factions});
  return {races:Object.fromEntries(Object.entries(races).map(([k,v])=>[k,v.metrics])),flags:factions.map(f=>f.id)};
}
async function install(){
  await L.protectedCheck();await R.verifyAssets();
  const registry=path.join(bank,'race-extensions.json'),old=read(registry),next=structuredClone(old),prepared=read(file('race-components.json'));
  if(!fs.existsSync(file('race-extensions-before.json')))fs.copyFileSync(registry,file('race-extensions-before.json'),fs.constants.COPYFILE_EXCL);
  const original=read(file('race-extensions-before.json'));
  for(const [name,spec] of Object.entries(original.races))assert.deepEqual(old.races[name],spec);
  const copy=(source,dest)=>{fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest))assert(fs.readFileSync(dest).equals(fs.readFileSync(source)));else fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);};
  for(const name of ['BUZZY','SERPES']){
    const spec=prepared.races[name],source=file('components/race-'+name+'.png');assert.equal(await hash(source),spec.sha256);
    const relative='extensions/race-'+name+'.png';copy(source,path.join(bank,relative));
    const entry={file:relative,...A.GEOMETRY,sha256:spec.sha256};if(next.races[name])assert.deepEqual(next.races[name],entry);next.races[name]=entry;
    const site=path.join(ROOT,'V4/site/assets/races',name+'.png');fs.mkdirSync(path.dirname(site),{recursive:true});
    const icon=await sharp(file('components/source-'+name+'.png')).resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
    if(fs.existsSync(site))assert(fs.readFileSync(site).equals(icon));else fs.writeFileSync(site,icon,{flag:'wx'});
  }
  write(registry,next);
  for(const id of ['MGS3','MGS5'])copy(file('components/flag-'+id+'.png'),path.join(ROOT,'V4/site/assets/factions',id+'.png'));
  for(const [name,spec] of Object.entries(original.races))assert.equal(await hash(path.join(bank,spec.file)),spec.sha256);
  await L.protectedCheck();await R.verifyAssets();return {addedRaces:['BUZZY','SERPES'],addedFactions:['MGS3','MGS5'],existingRaceComponentsUnchanged:true};
}
module.exports={prepare,install};
if(require.main===module)({prepare,install}[process.argv[2]])().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
