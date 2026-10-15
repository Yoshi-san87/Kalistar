const {fs,path,root,output,W,H,raw,sharp,hash,layout}=require('./common.cjs');
async function main(){
  const label='TAULIO-hybride-V4-V3',file=path.join(output,'exports',label+'.png');
  const pixels=await raw(file),staged=await raw(path.join(output,'staging/barcode.png'));
  const job=JSON.parse(fs.readFileSync(path.join(output,'staging/job.json'),'utf8'));
  if(job.label!==label)throw Error('Stage the hybrid before checking it');
  const psd=JSON.parse(fs.readFileSync(path.join(output,'verification',label+'-psd.json'),'utf8').replace(/^\uFEFF/,''));
  const v3=JSON.parse(fs.readFileSync(path.join(root,'../V3/donnees/cartes.json'),'utf8')).find(c=>c.id===job.card.id);
  const checks={},metrics={};
  checks.momoUnchanged=hash(path.join(root,layout.reference))===layout.referenceSha256;
  checks.v3PsdUnchanged=hash(path.join(root,'../V3/templates/13_ELECTRO_TAULIO.psd'))==='fbad8a7852fd9b9b592e70e2ba8d5bce1f757d2d4a82ae9458df60b865dce13b';
  checks.v3Mechanics=['id','name','job','race','faction','element','weapon','weapon_index','positions','atk','defense','magic','barriers'].every(k=>JSON.stringify(job.card[k])===JSON.stringify(v3[k]));
  checks.psdAndPngIdentical=pixels.equals(await raw(path.join(output,'verification',label+'-reexport.png')));
  checks.geometry=psd.width===W&&psd.height===H&&psd.ppi===300&&psd.fixedFrameLocked&&psd.objects.every(o=>JSON.stringify(o.transform)===JSON.stringify([0,0,W,0,W,H,0,H]));
  checks.states=psd.slots.every(s=>{
    const v=job.card[s.side][6-s.die],mode=typeof v==='string'?'effect':s.side==='defense'&&job.card.barriers.includes(s.die)?'barrier':'physical';
    return s.states.length===1&&s.states[0]===mode&&s.valueVisible===(typeof v==='number')&&(typeof v!=='number'||s.value===String(v));
  });
  checks.texts=psd.texts.every(t=>t.value.replace(/\r/g,' ')===job.card[t.key]);
  const b=layout.barcode.box;let mismatch=0,rows=0,gutter=0;
  for(let y=b[1];y<b[3];y++){
    for(let x=b[0];x<b[2];x++){
      const i=(y*W+x)*4,j=(y*W+b[0])*4;
      if([0,1,2,3].some(c=>pixels[i+c]!==staged[i+c]))mismatch++;
      if([0,1,2,3].some(c=>pixels[i+c]!==pixels[j+c]))rows++;
    }
    for(const x of [95,96,97,126,127,128]){const i=(y*W+x)*4;if(pixels[i]!==1||pixels[i+1]!==5||pixels[i+2]!==9)gutter++;}
  }
  metrics.barcode={mismatch,rows,gutter};checks.barcodeEntireCellClean=mismatch===0&&rows===0&&gutter===0;
  const barcode=JSON.parse(fs.readFileSync(path.join(output,'verification/hybrid-barcode.json'),'utf8'));
  checks.barcodeNativeAnd4x=Object.values(barcode.decoded).every(v=>v.includes(job.card.id));
  const components={};
  for(const name of ['atk-small','def-small']){
    const p=path.join(output,'components/v3',name+'.png'),stats=await sharp(p).stats();
    components[name]={sha256:hash(p),alphaMax:stats.channels[3].max};
  }
  checks.nativeComponentsNonempty=Object.values(components).every(c=>c.alphaMax===255);
  await sharp(file).resize(760).png().toFile(path.join(output,'exports',label+'-apercu.png'));
  await sharp(file).resize(280).png().toFile(path.join(output,'verification',label+'-280.png'));
  await sharp(file).extract({left:25,top:1200,width:900,height:425}).png().toFile(path.join(output,'verification',label+'-bas.png'));
  const report={status:'epreuve-hybride-a-valider-par-utilisateur',checks,metrics,components,sourcePsd:'V3/templates/13_ELECTRO_TAULIO.psd',dynamicSource:'V3',structure:layout.masterPsd,profile:'master/profiles/taulio.json',renderSha256:hash(file),note:'Successful technical checks do not constitute aesthetic approval or a print proof.'};
  fs.writeFileSync(path.join(output,'verification/hybrid-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(Object.values(checks).some(v=>!v))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
