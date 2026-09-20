const {fs,path,root,output,W,H,raw,hash,layout}=require('./common.cjs');
async function main(){
  const built=await raw(path.join(output,'exports/MOMO-recompose.png'));
  const filledPath=fs.existsSync(path.join(output,'exports/MOMO-fiche.png'))?path.join(output,'exports/MOMO-fiche.png'):path.join(output,'verification/pipeline-render.png');
  const filled=await raw(filledPath);
  const approved=await raw(path.join(root,layout.reference));
  let changed=0,artChanged=0;
  for(let i=0;i<built.length;i++)if(built[i]!==filled[i])changed++;
  for(let y=230;y<1100;y++)for(let x=215;x<735;x++){
    const i=(y*W+x)*4;
    if(built[i]!==approved[i]||built[i+1]!==approved[i+1]||built[i+2]!==approved[i+2])artChanged++;
  }
  const profile=JSON.parse(fs.readFileSync(path.join(output,'profiles/momo.json'),'utf8'));
  const original=JSON.parse(fs.readFileSync(path.join(root,'donnees/momo.json'),'utf8'));
  const unchangedFields=['id','name','title','job','race','faction','element','weapon','weapon_index','positions','atk','defense','magic','barriers','text'];
  const dataPreserved=unchangedFields.every(k=>JSON.stringify(profile[k])===JSON.stringify(original[k]));
  const report={
    dimensions:[W,H],pipelineIdentical:changed===0,changedChannels:changed,
    illustrationProtectedArea:[215,230,735,1100],illustrationChangedPixels:artChanged,
    dataPreserved,masterSha256:hash(path.join(root,'templates/KALISTAR_MASTER_V4.psd')),
    profile:'master/profiles/momo.json',method:'Existing PSD duplicated and filled by populate.jsx, without rebuilding the fixed frame.'
  };
  fs.writeFileSync(path.join(output,'verification/pipeline.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(changed||artChanged||!dataPreserved)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
