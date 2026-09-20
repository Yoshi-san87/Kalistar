const {fs,path,sharp,root,layout,W,H,output,hash,raw}=require('./common.cjs');

async function main(){
  const render=path.join(output,'exports/TAULIO-recompose.png');
  const profile=JSON.parse(fs.readFileSync(path.join(output,'profiles/taulio.json'),'utf8'));
  const v3=JSON.parse(fs.readFileSync(path.join(root,'../V3/donnees/cartes.json'),'utf8'));
  const original=v3.find(c=>c.id===profile.id);
  const checks={},metrics={};
  const expected={
    'templates/KALISTAR_MASTER_V4.psd':'071e1eb93b3af99c6a031072548a2b54d065e369b0e16a323164dbdcb2a160cb',
    'cartes/MOMO_ELECTRO_V4_04-typographie.png':'b2b0211565dacdcdb902866ee94dfdc41648d5ee7d51c7a652ad72ae0740ba11',
    'master/exports/MOMO-recompose.png':'322f7c7186f8f61d7bc588224a875117a12dc935f89db9e76df26835e6097922',
    'assets/illustrations/13_ELECTRO_TAULIO.png':'2c1039f3a9ffa67aaafdc160b34f1256383f7cd5e06d7384f01fd32c795be5c7',
    '../V3/donnees/cartes.json':'bb6de0d7b2b7eec0f1a9348dc892faa002fe542c169bbe202e11aca7e3788761'
  };
  checks.sourcesUnchanged=Object.entries(expected).every(([p,h])=>hash(path.join(root,p))===h);
  const fields=['id','name','job','race','faction','element','weapon','weapon_index','positions','atk','defense','magic','barriers'];
  checks.mechanicsPreserved=!!original&&fields.every(k=>JSON.stringify(original[k])===JSON.stringify(profile[k]));
  const meta=await sharp(render).metadata();checks.dimensions=meta.width===W&&meta.height===H;
  const image=await raw(render),base=await raw(path.join(output,'verification/MOMO-supports.png'));
  const fixed=await raw(path.join(output,'masks/fixed-pixels.png'));
  let compared=0,changed=0;
  for(let i=0;i<W*H;i++)if(fixed[i*4+3]){
    compared++;if([0,1,2].some(c=>image[i*4+c]!==base[i*4+c]))changed++;
  }
  metrics.fixedFrame={comparedPixels:compared,changedPixels:changed};checks.sharedFrameIdentical=changed===0;
  const stagedArt=await raw(path.join(output,'staging/art.png'));let artChanged=0;
  for(let y=240;y<900;y++)for(let x=250;x<735;x++){
    const i=(y*W+x)*4;if([0,1,2].some(c=>image[i+c]!==stagedArt[i+c]))artChanged++;
  }
  metrics.artCoreChangedPixels=artChanged;checks.artCorePreserved=artChanged===0;
  const reexport=await raw(path.join(output,'verification/TAULIO-recompose-reexport.png'));
  checks.psdReexportIdentical=image.equals(reexport);
  const psd=JSON.parse(fs.readFileSync(path.join(output,'verification/TAULIO-recompose-psd.json'),'utf8').replace(/^\uFEFF/,''));
  checks.psdGeometry=psd.width===W&&psd.height===H&&psd.ppi===300&&psd.rootGroups===8&&psd.fixedFrameLocked&&psd.referenceHidden;
  const transform=[0,0,W,0,W,H,0,H];
  checks.allSmartObjectsRegistered=psd.objects.every(o=>o.transform.length===8&&o.transform.every((v,i)=>Math.abs(v-transform[i])<.001));
  checks.slotContents=psd.slots.length===12&&psd.slots.every(s=>{
    const value=profile[s.side][6-s.die];
    const state=typeof value==='string'?'effect':s.side==='defense'&&profile.barriers.includes(s.die)?'barrier':'physical';
    return s.states.length===1&&s.states[0]===state&&s.valueVisible===(typeof value==='number')&&(typeof value!=='number'||s.value===String(value));
  });
  checks.positionP1Only=psd.positions.filter(p=>p.visible).length===1&&psd.positions[0].visible&&psd.positions[0].value==='1';
  const centered=t=>Math.abs((t.bounds[0]+t.bounds[2])/2-t.center[0])<=.51&&Math.abs((t.bounds[1]+t.bounds[3])/2-t.center[1])<=.51;
  checks.opticalTextBoundsCentered=psd.texts.every(centered)&&psd.slots.filter(s=>s.valueVisible).every(centered);
  checks.textFits=psd.texts.every(t=>t.bounds[2]-t.bounds[0]<=t.width+1);
  checks.psdIdentity=psd.title===profile.name+' - '+profile.title&&psd.objects.some(o=>o.name==='ARME Poing')&&psd.objects.some(o=>o.name==='CODE128 '+profile.id);
  const barcode=JSON.parse(fs.readFileSync(path.join(output,'verification/taulio-barcode.json'),'utf8'));
  checks.barcodeColorAndGray=barcode.expected===profile.id&&Object.values(barcode.decoded).every(a=>a.includes(profile.id));
  await sharp(render).resize(760).png().toFile(path.join(output,'exports/TAULIO-apercu.png'));
  await sharp(render).resize(280).png().toFile(path.join(output,'verification/TAULIO-lecture-280.png'));
  await sharp(render).extract({left:20,top:1200,width:910,height:432}).png().toFile(path.join(output,'verification/TAULIO-detail-bas.png'));
  await sharp({create:{width:1160,height:1050,channels:4,background:'#111619'}}).composite([
    {input:await sharp(path.join(output,'verification/MOMO-supports.png')).resize({height:1000}).png().toBuffer(),left:0,top:25},
    {input:await sharp(render).resize({height:1000}).png().toBuffer(),left:585,top:25}
  ]).png().toFile(path.join(output,'verification/MOMO-TAULIO-maitre.png'));
  const report={checks,metrics,profile:'master/profiles/taulio.json',master:layout.masterPsd,masterSha256:hash(path.join(root,layout.masterPsd)),renderSha256:hash(render),note:'Shared-frame pixel identity uses the fixed-frame mask and the same revised master. Comparison does not imply a whole-card match to the approved flattened Momo or print approval.'};
  fs.writeFileSync(path.join(output,'verification/taulio-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(Object.values(checks).some(v=>!v))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
