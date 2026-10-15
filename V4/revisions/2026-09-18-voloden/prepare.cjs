const L=require('../../atelier/lib.cjs');
const {fs,path,ROOT,read,write,hash,assert}=L;
(async()=>{
  const ref=L.baseline();await L.protectedCheck(ref);
  const work=__dirname,card=read(path.join(ROOT,'V4/template-stable/voloden/card.json'));
  assert.ok(!ref.cards.some(c=>c.card.id===card.id||c.key==='voloden'));
  assert.ok(!fs.existsSync(path.join(work,'references-before.json')));
  fs.mkdirSync(path.join(work,'staged'),{recursive:true});fs.mkdirSync(path.join(work,'inspection'),{recursive:true});
  write(path.join(work,'references-before.json'),ref);
  write(path.join(work,'pack-before.json'),read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')));
  write(path.join(work,'pack-raw-before.json'),read(path.join(ROOT,'V4/atelier/designer-assets/manifest.raw.json')));
  const sourceHashes={};for(const file of [card.sourcePSD,card.artworkSource,'V3/donnees/cartes.json'])sourceHashes[file]=await hash(path.join(ROOT,file));
  write(path.join(work,'plan.json'),{revision:'voloden-2026-09-18',referenceId:ref.id,key:'voloden',profile:card.profile,
    psd:'V4/templates/'+card.output+'.psd',png:'V4/cartes/'+card.output+'.png',report:'V4/template-stable/voloden/render.json',
    destination:'V4/revisions/2026-09-18-voloden/staged',sourceHashes,install:[],protect:[]});
  console.log({prepared:card.name,sourceArtPreserved:true,referenceId:ref.id});
})().catch(e=>{console.error(e);process.exitCode=1;});
