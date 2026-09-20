const {fs,path,sharp,root,layout,W,H,output,hash,raw,inside}=require('./common.cjs');
async function compare(a,b,mask){
  let changed=0,compared=0,maxDelta=0;
  for(let i=0;i<W*H;i++)if(!mask||mask[i]){
    compared++;let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(a[i*4+c]-b[i*4+c]));
    if(delta)changed++;maxDelta=Math.max(maxDelta,delta);
  }
  return {compared,changed,maxDelta};
}
async function main(){
  const reference=path.join(root,layout.reference),render=path.join(output,'exports/MOMO-recompose.png');
  const ref=await raw(reference),base=await raw(render),fixedRgba=await raw(path.join(output,'masks/fixed-pixels.png'));
  const fixed=Buffer.alloc(W*H),all=Buffer.alloc(W*H,255),number=Buffer.alloc(W*H,255),artOutside=Buffer.alloc(W*H,255),positions=Buffer.alloc(W*H,255);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;fixed[i]=fixedRgba[i*4+3];
    if(x>=34&&x<=178&&y>=75&&y<=158)number[i]=0;
    if(inside(x+.5,y+.5,layout.artPolygon))artOutside[i]=0;
    if(x>=159&&x<=511&&y>=1121&&y<=1196)positions[i]=0;
  }
  const tests={sourceUnchanged:hash(reference)===layout.referenceSha256,taulioRemoved:!fs.existsSync(path.join(root,'cartes/TAULIO_ELECTRO_V4_01.png'))};
  const meta=await sharp(render).metadata();tests.dimensions=meta.width===W&&meta.height===H;
  const reports={fixedVsApproved:await compare(ref,base,fixed)};
  tests.fixedFramePixelIdentity=reports.fixedVsApproved.changed===0;
  for(const [name,mask] of [['test-identique',all],['test-valeur-203',number],['test-illustration',artOutside],['test-cinq-positions',positions],['test-tout-physique',fixed]]){
    const other=await raw(path.join(output,'verification',name+'.png'));
    reports[name]=await compare(base,other,mask);tests[name]=reports[name].changed===0;
    if(name!=='test-identique'){
      reports[name].totalChanged=(await compare(base,other)).changed;
      tests[name+'-active']=reports[name].totalChanged>0;
    }
  }
  const typography=JSON.parse(fs.readFileSync(path.join(output,'verification/typography.json'),'utf8'));
  tests.textCenters=typography.every(t=>Math.abs((t.bounds[0]+t.bounds[2])/2-t.center[0])<=.51&&Math.abs((t.bounds[1]+t.bounds[3])/2-t.center[1])<=.51);
  await sharp(render).resize(760).png().toFile(path.join(output,'exports/MOMO-apercu.png'));
  await sharp(render).extract({left:20,top:1200,width:910,height:432}).png().toFile(path.join(output,'verification/detail-bas.png'));
  await sharp(render).resize(280).png().toFile(path.join(output,'verification/lecture-280.png'));
  const comparisons=await sharp({create:{width:1160,height:1050,channels:4,background:'#111619'}}).composite([
    {input:await sharp(reference).resize({height:1000}).png().toBuffer(),left:0,top:25},
    {input:await sharp(render).resize({height:1000}).png().toBuffer(),left:585,top:25}
  ]).png().toFile(path.join(output,'verification/comparaison-reference-maitre.png'));
  fs.writeFileSync(path.join(output,'verification/report.json'),JSON.stringify({tests,reports,reference:layout.reference,referenceHash:hash(reference),renderHash:hash(render),note:'Pixel identity applies to the fixed-frame mask, not to reconstructed backgrounds, newly typeset text, the valid barcode or decomposited glow edges. No print approval implied.'},null,2));
  console.log(JSON.stringify({tests,reports},null,2));
  if(Object.values(tests).some(v=>!v))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
