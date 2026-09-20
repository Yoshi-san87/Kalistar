const {fs,path,root,output,W,H,raw,save,sharp,clamp}=require('./common.cjs');
const R=path.join(output,'components');
async function main(){
  const reference=await raw(path.join(root,'cartes/MOMO_ELECTRO_V4_04-typographie.png'));
  const base=await raw(path.join(output,'assets/frame.png'));
  // A side assembly owns its whole silhouette, including the old aura underlays.
  const areas=[[81,139,181,944],[765,139,868,940],[178,207,208,309],[738,207,769,309]];
  for(const b of areas)for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
    const i=(y*W+x)*4;base[i]=base[i+1]=base[i+2]=0;base[i+3]=0;
  }
  // Remove the complete old barcode ink footprint, including its generated bevels.
  for(let y=941;y<1201;y++)for(let x=95;x<129;x++){
    const i=(y*W+x)*4;base[i]=1;base[i+1]=5;base[i+2]=9;base[i+3]=255;
  }
  const roles=Buffer.alloc(W*H*4);
  for(const b of [[86,213,173,305],[775,219,864,311]])for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
    const i=(y*W+x)*4,r=reference[i],g=reference[i+1],blue=reference[i+2];
    const signal=Math.max(blue,g*.95)-r*.7-15;
    const edge=clamp(Math.min(x-b[0],b[2]-1-x,y-b[1],b[3]-1-y)/4);
    roles[i]=r;roles[i+1]=g;roles[i+2]=blue;roles[i+3]=Math.round(255*clamp(signal/105)*edge);
  }
  await save('components/role-emblems.png',roles);
  const frame=await sharp(base,{raw:{width:W,height:H,channels:4}}).composite([
    {input:await sharp(path.join(R,'rails.svg')).png().toBuffer()},
    {input:await sharp(roles,{raw:{width:W,height:H,channels:4}}).png().toBuffer()}
  ]).raw().toBuffer();
  for(let y=941;y<1201;y++)for(let x=95;x<129;x++){
    const i=(y*W+x)*4;frame[i]=1;frame[i+1]=5;frame[i+2]=9;frame[i+3]=255;
  }
  await save('components/frame.png',frame);
  // Extract emitted cyan only, never estimated illustration or copper background pixels.
  const glow=Buffer.alloc(W*H*4),cx=817,cy=744;
  for(let y=cy-81;y<=cy+81;y++)for(let x=cx-81;x<=cx+81;x++){
    const i=(y*W+x)*4,d=Math.hypot(x-cx,y-cy),r=reference[i],g=reference[i+1],b=reference[i+2];
    const a=clamp((Math.min(b,g*1.4)-r*.8-14)/82)*clamp((d-48)/5)*clamp((78-d)/9);
    glow[i]=r;glow[i+1]=g;glow[i+2]=b;glow[i+3]=Math.round(255*a);
  }
  await save('components/barrier-light.png',glow);
  await sharp(path.join(R,'frame.png')).resize(760).png().toFile(path.join(R,'frame-preview.png'));
  console.log('Chassis complets et lumiere de barriere prepares.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
