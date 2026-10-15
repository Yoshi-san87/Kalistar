'use strict';
const {fs,path,assert,read,write,hash,sharp,ROOT}=require('../../atelier/lib.cjs');
const sourceRoot=path.join(process.env.USERPROFILE,'.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2');
const images=[
  ['mgs1-shadow-moses','exec-cd7b4aa6-918f-4cd7-b39c-bc70dc79cb18.png'],
  ['mgs2-big-shell','exec-990a4f8b-d5b2-4fcb-9bd6-6396e6d9cb82.png'],
  ['mgs4-middle-east','exec-79bcf48d-6d07-4896-a72c-63e1e44a38ee.png']
];
async function main(){
  const proof=path.join(__dirname,'installation.json');assert(!fs.existsSync(proof),'Already installed');
  const arenas=path.join(ROOT,'V4/donnees/arenes-collaborations.json');
  const protectedFiles=['V4/donnees/catalogue.json','V4/atelier/data/references.json','V4/atelier/designer-assets/manifest.json'];
  const before={};for(const f of protectedFiles)before[f]=await hash(path.join(ROOT,f));
  const old=read(arenas);assert(!old.some(a=>/^mgs[124]-/.test(a.id)));
  fs.copyFileSync(arenas,path.join(__dirname,'arenas.before.json'),fs.constants.COPYFILE_EXCL);
  const outputs=[];
  for(const [id,name] of images){
    const source=path.join(sourceRoot,name),relative='V4/site/assets/arenes/'+id+'.png',target=path.join(ROOT,relative);
    assert(!fs.existsSync(target),'Existing asset '+relative);
    const m=await sharp(source).metadata();assert(m.width/m.height>1.7&&m.width/m.height<1.85);
    fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
    assert.equal(await hash(source),await hash(target));
    outputs.push({id,source,target:relative,sha256:await hash(target),width:m.width,height:m.height});
  }
  write(proof,{tool:'image_gen built-in',prompts:'prompts.json',styleReferenceInspectedOnly:true,before,arenaCountBefore:old.length,arenasBeforeHash:await hash(arenas),outputs});
  console.log(JSON.stringify({saved:outputs.length,previousArenas:old.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
