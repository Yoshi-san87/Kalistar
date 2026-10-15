'use strict';
const {fs,path,hash,write,ROOT,assert}=require('../../atelier/lib.cjs');
const set=require('./set.json'),proposal=path.join(ROOT,'V4/propositions/2026-10-06-vingt-visages');
const selected=require('../../propositions/2026-10-06-vingt-visages/selection.json').characters;
async function main(){
 const records=[];
 for(const card of set.cards){
  const spec=selected.find(s=>s.key===card.key);assert(spec);
  const basename=spec.number+'-'+spec.key;
  const source=path.join(proposal,basename+'.png');
  const original='V4/Illustrations/Faces_'+card.key[0].toUpperCase()+card.key.slice(1)+'_01.png';
  const originalFile=path.join(ROOT,original);
  if(fs.existsSync(originalFile))assert.equal(await hash(originalFile),await hash(source));
  else fs.copyFileSync(source,originalFile,fs.constants.COPYFILE_EXCL);
  const target=path.join(__dirname,'prompts','original',card.key+'.txt');fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(proposal,'prompts',basename+'.txt'),target);
  const generated=JSON.parse(fs.readFileSync(path.join(proposal,'provenance',spec.number+'.json'),'utf8'));
  records.push({key:card.key,id:card.id,approvedOriginal:original,originalHash:await hash(source),source:generated.source,
   generationReferences:generated.references.map(f=>path.relative(ROOT,f).replace(/\\/g,'/')),prompt:'prompts/original/'+card.key+'.txt',
   selected:'V4/Illustrations/'+card.art,selectedHash:await hash(path.join(ROOT,'V4/Illustrations',card.art)),
   edit:['bex','pelag','vaume'].includes(card.key)?card.key+'-edit.json':null});
 }
 write(path.join(__dirname,'art-selection.json'),{date:'2026-10-06',userSelection:true,sareth:'Confirmed painterly DA against Momo and Valazar; no regeneration.',vaume:'User split horizontal interpreted as horizontal mirror; no split panel.',rejected:['kharza','talune','ivor','rozh','delys'],cards:records});
 console.log(JSON.stringify({selected:records.length,edits:records.filter(r=>r.edit).map(r=>r.key)}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

