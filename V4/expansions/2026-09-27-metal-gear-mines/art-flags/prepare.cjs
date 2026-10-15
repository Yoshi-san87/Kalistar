'use strict';
const L = require('../../../atelier/lib.cjs');
const {fs, path, sharp, assert, write} = L;
const file = name => path.join(__dirname, name);
const generated = {
  MGS1: 'exec-ea8eba96-0f1f-4a5f-8b67-a0e345a7e042.png',
  MGS2: 'exec-83319189-f57f-4965-bc96-a3487380e42c.png',
  MGS4: 'exec-79da2764-0d77-4367-a054-89d003dc3c90.png'
};
async function main() {
  const f = L.read(path.join(L.ROOT, 'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
  const outline = path.join(L.ROOT, 'V4/collaborations/ff8-set-01/flag-FF8.png');
  const packedOutline = path.join(L.ROOT, 'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  const alpha = input => sharp(input).ensureAlpha().extractChannel(3).raw().toBuffer();
  const entries = [];
  for (const id of Object.keys(generated)) {
    const source = file('source-' + id + '.png');
    const texture = await sharp(source).flatten({background:'#000000'}).resize(f.width,f.height,{fit:'fill'}).png().toBuffer();
    const clipped = await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
    const packedGeometry = {left:672,top:829,width:98,height:223};
    const packed = await sharp(clipped).extract({left:packedGeometry.left-f.left,top:packedGeometry.top-f.top,width:98,height:223}).png().toBuffer();
    assert.deepEqual(await alpha(packed),await alpha(packedOutline));
    fs.writeFileSync(file('flag-'+id+'.png'),clipped);
    fs.writeFileSync(file('flag-'+id+'-packed.png'),packed);
    entries.push({id,label:'Metal Gear Solid '+id.slice(3),flag:'flag-'+id+'.png',packedFlag:'flag-'+id+'-packed.png',packedGeometry,sourceHash:await L.hash(source),flagHash:await L.hash(file('flag-'+id+'.png')),bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only',isolatedFrom:Object.keys(generated).filter(x=>x!==id)});
    write(file(id+'.provenance.json'),{...L.read(file(id+'.request.json')),status:'selected',generatedFile:generated[id],sourceHash:await L.hash(source),originalPreserved:true});
  }
  write(file('factions.json'),{schemaVersion:1,officialCollaboration:false,factions:entries});
  await sharp({create:{width:327,height:230,channels:4,background:'#242424'}}).composite(entries.map((e,i)=>({input:file(e.flag),left:109*i,top:0}))).png().toFile(file('preview.png'));
  console.log(JSON.stringify(entries));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
