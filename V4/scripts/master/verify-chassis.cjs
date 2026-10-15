const {fs,path,root,output,W,H,raw,sharp,hash,layout}=require('./common.cjs');
async function main(){
  const current=path.join(output,'exports/TAULIO-chassis-02.png');
  const a=await raw(current),old=await raw(path.join(output,'exports/TAULIO-recompose.png'));
  const re=await raw(path.join(output,'verification/TAULIO-chassis-02-reexport.png'));
  const staged=await raw(path.join(output,'staging/barcode.png'));
  const checks={},metrics={};
  const unchanged=(box)=>{
    let changed=0;
    for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
      const i=(y*W+x)*4;if([0,1,2,3].some(c=>a[i+c]!==old[i+c]))changed++;
    }
    return changed;
  };
  metrics.bottomChangedPixels=unchanged([0,1210,W,H]);
  metrics.artCoreChangedPixels=unchanged([250,220,730,900]);
  checks.bottomAndTextUnchanged=metrics.bottomChangedPixels===0;
  checks.illustrationCoreUnchanged=metrics.artCoreChangedPixels===0;
  checks.psdReexportIdentical=a.equals(re);
  checks.approvedMomoUnchanged=hash(path.join(root,layout.reference))===layout.referenceSha256;
  const b=layout.barcode.box;let dirtyRows=0,assetMismatch=0,dirtyGutter=0;
  for(let y=b[1];y<b[3];y++){
    for(let x=b[0];x<b[2];x++){
      const i=(y*W+x)*4,j=(y*W+b[0])*4;
      if([0,1,2,3].some(c=>a[i+c]!==a[j+c]))dirtyRows++;
      if([0,1,2,3].some(c=>a[i+c]!==staged[i+c]))assetMismatch++;
    }
    for(const x of [95,96,97,126,127,128]){
      const i=(y*W+x)*4;if(a[i]!==1||a[i+1]!==5||a[i+2]!==9)dirtyGutter++;
    }
  }
  metrics.barcode={inconsistentRowPixels:dirtyRows,assetMismatch,dirtyGutter};
  checks.barcodeStraightAcrossEntireWidth=dirtyRows===0;
  checks.noOldBarcodeAlongEdges=dirtyGutter===0&&assetMismatch===0;
  const psd=JSON.parse(fs.readFileSync(path.join(output,'verification/TAULIO-chassis-02-psd.json'),'utf8').replace(/^\uFEFF/,''));
  const before=JSON.parse(fs.readFileSync(path.join(output,'verification/TAULIO-recompose-psd.json'),'utf8').replace(/^\uFEFF/,''));
  checks.statContentsUnchanged=JSON.stringify(psd.slots)===JSON.stringify(before.slots);
  checks.textsUnchanged=JSON.stringify(psd.texts)===JSON.stringify(before.texts);
  checks.geometryLocked=psd.width===W&&psd.height===H&&psd.fixedFrameLocked&&psd.objects.every(o=>JSON.stringify(o.transform)===JSON.stringify([0,0,W,0,W,H,0,H]));
  const decoded=JSON.parse(fs.readFileSync(path.join(output,'verification/chassis-barcode.json'),'utf8'));
  checks.barcodeNativeAndEnlarged=Object.values(decoded.decoded).every(v=>v.includes('30000013'));
  await sharp(current).resize(760).png().toFile(path.join(output,'exports/TAULIO-chassis-02-apercu.png'));
  await sharp(current).resize(280).png().toFile(path.join(output,'verification/TAULIO-chassis-02-280.png'));
  const left=await sharp(current).extract({left:57,top:190,width:162,height:750}).resize({height:1000}).png().toBuffer();
  const right=await sharp(current).extract({left:732,top:190,width:162,height:750}).resize({height:1000}).png().toBuffer();
  const bar=await sharp(current).extract({left:88,top:939,width:49,height:263}).resize({height:700}).png().toBuffer();
  await sharp({create:{width:610,height:1030,channels:4,background:'#121619'}}).composite([
    {input:left,left:12,top:15},{input:right,left:236,top:15},{input:bar,left:464,top:165}
  ]).png().toFile(path.join(output,'verification/TAULIO-chassis-02-details.png'));
  const report={checks,metrics,status:'visual-proof-awaiting-user-review',note:'These tests establish data, registration and barcode integrity, not aesthetic approval. The previous Taulio was rejected despite passing technical tests.'};
  fs.writeFileSync(path.join(output,'verification/chassis-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(Object.values(checks).some(v=>!v))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
