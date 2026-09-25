'use strict';
const L = require('../../../atelier/lib.cjs');
const {fs,path,assert} = L;
const references = [
  ['references/tidus-official.jpg','https://cache-na.finalfantasy.com/assets/web/title/finalfantasy10/character01-3e7f5b9bcbfdd1840f16b352cf3ed1204edab865ea56d7f39e4d9bd0ce7abe43.jpg'],
  ['references/auron-official.jpg','https://cache-na.finalfantasy.com/assets/web/title/finalfantasy10/character06-89fb9329614227294f8b79402987063bed3ad4348ffa8581fa91fe928ec0fd9a.jpg'],
  ['references/jecht-official.jpg','https://cache-na.finalfantasy.com/assets/web/title/finalfantasy10/character09-f8b18e821834ae09989636972e5f1c87a55e597ef898bec2eb8b21440ec2ac02.jpg'],
  ['references/tidus-full.png','https://www.vhv.rs/dpng/d/89-891955_ffx-tidus-png-transparent-png.png'],
  ['references/auron-full.jpg','https://static.zerochan.net/Auron.full.9528.jpg'],
  ['references/brotherhood-detail.jpg','https://1.bp.blogspot.com/-JvTl_srLlqs/XU1xFNIpM1I/AAAAAAAAADo/yS1v75eERUIMD6xxiShLZRj_37kQqm9oACPcBGAYYCw/s1600/brotherhood.jpg']
];
async function main() {
  const record = {tool:'Built-in image_gen',date:'2026-09-25',useCase:'illustration-story',
    review:'Parent-selected for native frame review, not a claim of user approval.',
    canonicalIdentity:'https://na.finalfantasy.com/titles/finalfantasy10',
    styleReferences:['V3/assets/illustrations/01_ELECTRO_MOMO.png','V3/assets/illustrations/34_NECRO_VALAZAR.png'],
    references:[],outputs:[],separateProvenance:['provenance-blitz.json','provenance-auron.json']};
  for(const [file,url] of references) record.references.push({file,url,sha256:await L.hash(path.join(__dirname,file))});
  const selected = [
    {key:'tidus-epee',version:'tidus-epee-v4.png',prompt:'tidus-epee-v4.request.json',generated:'exec-f71f792c-ea2f-42e8-b1a8-1423edf0af36.png',
      history:['tidus-epee.request.json','tidus-epee-v2.request.json','tidus-epee-v3.request.json'],
      review:'Brotherhood: blue translucent bubble blade, reverse tip fork, yellow grip, blue/silver/gold guard, red-orange tassel attached to pommel ring. Whole blade within central frame.'},
    {key:'jecht',version:'jecht.png',prompt:'jecht.request.json',generated:'exec-23101225-fb71-43e6-b5b0-2f8bb2b9c24e.png',
      history:[],review:'Full body, authentic broad dark blade/red inlay/chain and pointed end, tattoo, bandana, bare feet. Tip below the stat rails.'}
  ];
  for(const item of selected) {
    const target=path.join(__dirname,item.key+'.png'),source=path.join(__dirname,item.version);
    assert.equal(await L.hash(target),await L.hash(source));
    const meta=await L.sharp(target).metadata();assert.equal(meta.format,'png');
    for(const request of [item.prompt,...item.history]) assert.ok(fs.existsSync(path.join(__dirname,request)));
    record.outputs.push({...item,file:item.key+'.png',sha256:await L.hash(target),width:meta.width,height:meta.height});
  }
  L.write(path.join(__dirname,'provenance-parent.json'),record);
  console.log(JSON.stringify(record.outputs));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
