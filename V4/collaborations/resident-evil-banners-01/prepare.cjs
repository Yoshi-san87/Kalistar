'use strict';
const L=require('../../atelier/lib.cjs');
const {fs,path,sharp,assert,read,write,hash,ROOT}=L;
const file=n=>path.join(__dirname,n);
const FLAG=Object.freeze({left:672,top:829,width:98,height:223});
const alpha=p=>sharp(p).ensureAlpha().extractChannel(3).raw().toBuffer();
async function prepare(){
  const requests=read(file('requests.json'));
  const geometry=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
  const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
  const packedOutline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  const factions=[];
  const previous=fs.existsSync(file('factions.json'))?read(file('factions.json')).factions:[];
  for(const spec of requests.assets){
    const revision=spec.id==='RE7'?read(file('RE7-revision.json')):null;
    const source=file('source-'+spec.id+(revision?'-v2':'')+'.png');
    if(!fs.existsSync(source))fs.copyFileSync(revision?.generatedPath||spec.generatedPath,source,fs.constants.COPYFILE_EXCL);
    const texture=await sharp(source).flatten({background:'#000000'}).resize(geometry.width,geometry.height,{fit:'fill'}).png().toBuffer();
    const flag=await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
    const packed=await sharp(flag).extract({left:FLAG.left-geometry.left,top:FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
    assert.deepEqual(await alpha(flag),await alpha(outline));
    assert.deepEqual(await alpha(packed),await alpha(packedOutline));
    fs.writeFileSync(file('flag-'+spec.id+'.png'),flag);
    fs.writeFileSync(file('flag-'+spec.id+'-packed.png'),packed);
    const site=path.join(ROOT,'V4/site/assets/factions',spec.id+'.png');
    if(fs.existsSync(site)&&!fs.readFileSync(site).equals(flag)){
      assert.equal(await hash(site),previous.find(f=>f.id===spec.id)?.flagHash,'Refusing to replace an unrelated site banner');
      fs.writeFileSync(site,flag);
    }else if(!fs.existsSync(site))fs.writeFileSync(site,flag,{flag:'wx'});
    const entry={id:spec.id,label:spec.label,source:path.basename(source),flag:'flag-'+spec.id+'.png',packedFlag:'flag-'+spec.id+'-packed.png',packedGeometry:FLAG,sourceHash:await hash(source),flagHash:await hash(file('flag-'+spec.id+'.png')),packedHash:await hash(file('flag-'+spec.id+'-packed.png')),bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only'};
    factions.push(entry);
    write(file(spec.id+'.provenance.json'),{...spec,...(revision?{revision}:{}),status:'codex-visual-qa-human-approval-pending',visualReview:{date:'2026-10-01',reviewer:'Codex/parent visual QA',finding:'Recognizable per-game covers and numerals',humanApproval:false},tool:'built-in imagegen',reference:requests.reference,officialReferences:requests.officialReferences,referenceAccess:requests.referenceAccess,...entry});
  }
  write(file('factions.json'),{schemaVersion:1,officialCollaboration:false,expectedExpansionCards:25,factions});
  await sharp({create:{width:9*109,height:230,channels:4,background:'#242424'}}).composite(factions.map((f,i)=>({input:file(f.flag),left:109*i,top:0}))).png().toFile(file('preview.png'));
  console.log('Prepared RE1..RE9; alpha verified; site copies installed.');
}
if(require.main===module)prepare().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={prepare,FLAG};
