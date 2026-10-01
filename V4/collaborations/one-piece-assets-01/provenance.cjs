'use strict';
const L=require('../../atelier/lib.cjs');
const {fs,path,read,write,hash,sharp,ROOT}=L;
const file=name=>path.join(__dirname,name),absolute=name=>path.join(ROOT,name);
async function main(){
  const requests=read(file('requests.json')),generated=read(file('generated-paths.json')),entries=[];
  for(const request of [...requests.assets,...requests.revisions]){
    const original=request.id==='robin',retained=original?'V4/collaborations/one-piece-assets-01/OP_robin_01.initial.png':request.output;
    const meta=await sharp(absolute(retained)).metadata();
    const references=[];
    for(const input of request.references)references.push({file:input,sha256:await hash(absolute(input))});
    entries.push({id:request.id,kind:request.kind,tool:'built-in image_gen',callsForThisVersion:1,
      promptFile:'requests.json',promptKey:(requests.assets.includes(request)?'assets':'revisions')+'.'+request.id,
      promptSha256:L.crypto.createHash('sha256').update(request.prompt).digest('hex'),references,
      generatedPath:generated[request.id],retainedOriginal:retained,sha256:await hash(absolute(retained)),
      width:meta.width,height:meta.height,transparentBackgroundRequested:request.transparent,selected:!original,
      supersededBy:original?'robin-face-v2':null,
      visualReview:{parentApproved:['ONEPIECE','SHARKAN','franky','brook','jinbe'].includes(request.id),
        humanApprovalNotInferred:true,status:original?'superseded-anime-face':request.id==='robin-face-v2'?'corrected-natural-face-awaiting-parent-view':'parent-visual-qa-approved',
        finding:({ONEPIECE:'Recognizable straw-hat Jolly Roger and ONE PIECE wordmark; full and packed FF8 alpha identical.',
          SHARKAN:'Human-shark head/shoulder emblem matching existing painted race bank; all nonzero motif alpha radius 37.845px and optical error .472px.',
          robin:'First scene retained for provenance; anime facial proportions replaced in v2.',
          'robin-face-v2':'Adult human eye size, nose/lip/cheek volumes corrected using RE Leon and Kaylis; crossed arms, outfit and Sunny scene retained.',
          franky:'Joyful shipwright; integrated cannon replaces one hand, two arms/two legs; painted canonical exaggerated cyborg anatomy.',
          brook:'Soulful violin at night; skull, afro, two skeletal arms/two legs, violin and bow contacts visible.',
          jinbe:'Massive blue fishman, orange patterned kimono, protective karate palm in storm, two arms/two planted legs.'})[request.id]}
    });
  }
  const components=read(file('race-components.json')),factions=read(file('factions.json'));
  write(file('provenance.json'),{schemaVersion:1,date:'2026-10-01',officialCollaboration:false,
    requestFile:'requests.json',requestHash:await hash(file('requests.json')),
    officialReferences:requests.officialReferences,referenceAccess:requests.referenceAccess,
    assets:entries.filter(entry=>entry.kind==='art'&&entry.selected).map(entry=>({
      id:entry.id==='robin-face-v2'?'robin':entry.id,output:entry.retainedOriginal,sha256:entry.sha256,
      promptFile:entry.promptFile,promptKey:entry.promptKey,promptSha256:entry.promptSha256,
      references:entry.references,retainedOriginal:entry.retainedOriginal,entryId:entry.id
    })),
    entries,prepared:{factions:factions.factions,races:components.races},
    processing:'Original built-in outputs retained byte-identically. Banner RGB resized and masked with exact approved FF8 alpha. SHARKAN uses existing nier-pilot-01 optical fitter and native enamel. No generated full card, Photoshop, catalogue write or Git operation.',
    pending:'Final native card crop/frame/barcode QA belongs to parent and profile/native agent. Robin revised face awaits parent view.'
  });
  const thumbs=[];
  for(const [i,name]of ['robin','franky','brook','jinbe'].entries()){
    const input=await sharp(absolute('V4/Illustrations/OP_'+name+'_01.png')).resize(295,369,{fit:'cover',position:'centre'}).png().toBuffer();
    thumbs.push({input,left:i*295,top:0});
  }
  await sharp({create:{width:1180,height:369,channels:4,background:'#151b18'}}).composite(thumbs).png().toFile(file('qa/art-contact.png'));
  const flags=await sharp(file('flag-ONEPIECE.png')).resize(218,460).png().toBuffer();
  const race=await sharp(file('race-SHARKAN.png')).resize(384,380,{kernel:'nearest'}).png().toBuffer();
  await sharp({create:{width:720,height:480,channels:4,background:'#242424'}}).composite([{input:flags,left:20,top:10},{input:race,left:300,top:50}]).png().toFile(file('qa/components.png'));
  console.log(JSON.stringify(entries.filter(e=>e.selected).map(e=>({id:e.id,file:e.retainedOriginal,sha256:e.sha256})),null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
