const {fs,path,root,output,W,H,raw,save,inside,clamp,hash}=require('./common.cjs');

async function main(){
  const reference=await raw(path.join(root,'cartes/MOMO_ELECTRO_V4_04-typographie.png'));
  const frame=await raw(path.join(output,'assets/frame.png'));
  const before=Buffer.from(frame), changed=Buffer.alloc(W*H*4);
  function copy(x,y,sx,sy,alpha=1){
    const i=(y*W+x)*4,j=(sy*W+sx)*4;
    for(let c=0;c<3;c++)frame[i+c]=Math.round(reference[j+c]*alpha+frame[i+c]*(1-alpha));
  }
  // Continuous underlays belong to the shared structure, not to a capsule state.
  for(const lane of [{left:82,right:181,cx:126,rail:173,sampleY:280},{left:764,right:868,cx:817,rail:772,sampleY:270}]){
    for(let y=200;y<933;y++)for(let x=lane.left;x<lane.right;x++){
      const i=(y*W+x)*4;
      if(!frame[i+3])continue;
      const edge=Math.abs(x-lane.cx)/55;
      frame[i]=2;frame[i+1]=Math.round(20+edge*3);frame[i+2]=Math.round(34+edge*5);
      if(lane.cx<475?x>=lane.rail:x<=lane.rail)copy(x,y,x,lane.sampleY);
    }
  }
  for(const box of [[84,213,174,306],[774,218,864,310]]){
    for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
      const feather=clamp(Math.min(x-box[0],box[2]-1-x,y-box[1],box[3]-1-y)/12);
      copy(x,y,x,y,feather);
    }
  }
  // The copper role tabs overlap the art window and must remain foreground pixels.
  const tabs=[[[179,211],[187,217],[194,222],[205,227],[205,289],[185,307],[179,300]],
    [[764,211],[757,218],[742,226],[741,286],[760,305],[766,300],[766,215]]];
  for(const polygon of tabs)for(let y=210;y<309;y++)for(let x=175;x<770;x++){
    if(!inside(x+.5,y+.5,polygon))continue;
    const i=(y*W+x)*4;copy(x,y,x,y);frame[i+3]=255;
  }
  // Restore the lower copper support hidden by Momo's electric corona.
  for(let y=915;y<922;y++)for(let x=81;x<194;x++){
    const i=(y*W+x)*4;
    copy(x,y,949-x,y);
    frame[i+3]=255;
  }
  for(let y=908;y<928;y++)for(let x=191;x<212;x++){
    if(Math.hypot(x-201,y-918)>9.5)continue;
    const i=(y*W+x)*4;copy(x,y,x,y);frame[i+3]=255;
  }
  for(let y=924;y<944;y++)for(let x=82;x<154;x++){
    const i=(y*W+x)*4,r=reference[i],g=reference[i+1],b=reference[i+2];
    if(!(r>150&&g>100&&g>b*1.3&&r>=g*.9))copy(x,y,x,y);
  }
  let count=0;
  for(let i=0;i<W*H;i++)if([0,1,2,3].some(c=>before[i*4+c]!==frame[i*4+c])){
    changed[i*4]=changed[i*4+1]=changed[i*4+2]=changed[i*4+3]=255;count++;
  }
  await save('assets/frame-supports.png',frame);
  await save('verification/supports-change-mask.png',changed);
  fs.writeFileSync(path.join(output,'verification/supports-revision.json'),JSON.stringify({
    sourceMaster:'templates/KALISTAR_MASTER_V4.psd',
    sourceMasterSha256:hash(path.join(root,'templates/KALISTAR_MASTER_V4.psd')),
    revisedMaster:'templates/KALISTAR_MASTER_V4_01-supports.psd',
    changedFramePixels:count,
    reason:'Continuous capsule underlays and restored fixed ATK/DEF tabs. No transform, slot, type or canvas change.'
  },null,2));
  console.log(JSON.stringify({changedFramePixels:count}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
