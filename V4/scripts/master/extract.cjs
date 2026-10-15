const {fs,path,sharp,root,layout,W,H,output,raw,save,maskPng,inside,disk,clamp,hash}=require('./common.cjs');

function harmonic(source, mask, iterations=100) {
  const result=new Float32Array(source), indices=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(mask[y*W+x])indices.push((y*W+x)*4);
  // Diffusion is restricted to the missing ink, with the original boundary fixed.
  for(let n=0;n<iterations;n++)for(const i of indices)for(let c=0;c<3;c++)
    result[i+c]=(result[i-4+c]+result[i+4+c]+result[i-W*4+c]+result[i+W*4+c])/4;
  return Buffer.from(result);
}
function masked(source, mask){
  const out=Buffer.from(source);for(let i=0;i<W*H;i++)out[i*4+3]=mask[i];return out;
}
function regionMask(fn){
  const m=Buffer.alloc(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++)m[y*W+x]=Math.round(clamp(fn(x,y))*255);return m;
}
async function main(){
  const source=await raw(path.join(root,layout.reference));
  const textMaskRaw=await raw(path.join(output,'preparation/texte-mask.png'));
  const ink=Buffer.alloc(W*H);for(let i=0;i<ink.length;i++)ink[i]=textMaskRaw[i*4+3];
  const clean=harmonic(source,ink,500);
  // Rebuild continuous label surfaces once; blurred letter-shaped holes are not a master.
  for(const key of ['name','title']){
    const box=layout.texts[key].box, sx=key==='name'?582:680, span=key==='name'?132:56;
    for(let y=box[1]-3;y<box[3]+3;y++)for(let x=box[0]-5;x<box[2]+5;x++){
      const xx=sx+((x-box[0]+span*5)%span),i=(y*W+x)*4,j=(y*W+xx)*4;
      for(let c=0;c<3;c++)clean[i+c]=source[j+c];
    }
  }
  for(const key of ['job','race']){
    const b=layout.texts[key].box;
    for(let y=b[1]-2;y<b[3]+2;y++)for(let x=b[0]-4;x<b[2]+4;x++)for(let c=0;c<3;c++){
      const t=(y-b[1]+2)/(b[3]-b[1]+4);
      clean[(y*W+x)*4+c]=Math.round(source[((b[1]-4)*W+x)*4+c]*(1-t)+source[((b[3]+4)*W+x)*4+c]*t);
    }
  }
  await save('assets/clean-text-background.png',clean);
  const artMask=regionMask((x,y)=>inside(x+.5,y+.5,layout.artPolygon));
  const repaired=await raw(path.join(output,'preparation/sous-identite.png'));
  const art=Buffer.from(source);
  for(let y=1120;y<1199;y++)for(let x=157;x<298;x++)for(let c=0;c<3;c++)art[(y*W+x)*4+c]=repaired[(y*W+x)*4+c];
  for(let y=929;y<1186;y++)for(let x=764;x<862;x++)if(inside(x,y,layout.flagPolygon))for(let c=0;c<3;c++)art[(y*W+x)*4+c]=repaired[(y*W+x)*4+c];
  await save('assets/art-momo.png',masked(art,artMask));
  await maskPng('masks/art.png',artMask);

  const frame=Buffer.from(clean), fixed=Buffer.alloc(W*H,255);
  const fullMasks={};
  function footprint(s,x,y){
    if(Math.abs(x-s.cx)>s.extent+7||Math.abs(y-s.cy)>s.extent+7)return false;
    if((s.state==='physical'||s.state==='effect')&&Math.hypot(x-s.cx,y-s.cy)>s.r+4)return false;
    for(const other of layout.slots)if(other!==s&&Math.hypot(x-other.cx,y-other.cy)<other.r+6)return false;
    return true;
  }
  function railPixel(x,y){
    if(x<18||x>931||y<20)return [0,0,0];
    if(y<48&&x<46&&Math.hypot(x-46,y-48)>28)return [0,0,0];
    if(y<48&&x>903&&Math.hypot(x-903,y-48)>28)return [0,0,0];
    if(y>=44&&y<=139&&x>=80&&x<=869){const sx=580+((x-80+1400)%140),j=(y*W+sx)*4;return [source[j],source[j+1],source[j+2]];}
    if(y<44)return [2,23,37];
    if(x<=81||x>=868||(x>=764&&x<=772)||(x>=173&&x<=181)){const j=((x<475?280:270)*W+x)*4;return [source[j],source[j+1],source[j+2]];}
    const local=x<475?Math.abs(x-126):Math.abs(x-817);
    return [2,Math.round(20+local*.045),Math.round(34+local*.05)];
  }
  for(const s of layout.slots){
    const id=s.side+'-D'+s.die;
    const mask=regionMask((x,y)=>{
      const d=Math.hypot(x-s.cx,y-s.cy),i=(y*W+x)*4;
      if(s.state==='electric'){
        if(d<=s.r)return 1;
        const r=source[i],g=source[i+1],b=source[i+2];
        const energy=r>=g*.9&&g>b*1.4?clamp((Math.min(r,g*1.1)-b*1.4)/100)*clamp((g-50)/60):0;
        return energy*clamp((s.extent-d)/8);
      }
      if(s.state==='barrier'){
        if(d<=s.r+3)return 1;
        const r=source[i],g=source[i+1],b=source[i+2];
        return clamp((Math.min(b,g*1.25)-r*.65-14)/75)*clamp((s.extent+6-d)/6);
      }
      return disk(x,y,s.cx,s.cy,s.r+.5);
    });
    fullMasks[id]=mask;
    await save('assets/capsules/'+id+'.png',masked(clean,mask));
    // Restore the rail beneath every interchangeable capsule. No old rim remains.
    for(let y=Math.max(0,s.cy-s.extent-7);y<Math.min(H,s.cy+s.extent+8);y++)for(let x=Math.max(0,s.cx-s.extent-7);x<Math.min(W,s.cx+s.extent+8);x++){
      const d=Math.hypot(x-s.cx,y-s.cy),i=(y*W+x)*4;
      if((s.state==='physical'||s.state==='effect')&&d>s.r+4)continue;
      fixed[y*W+x]=0;
      if(artMask[y*W+x])continue;
      const rgb=railPixel(x,y);
      for(let c=0;c<3;c++)frame[i+c]=rgb[c];
    }
  }
  // Remove the yellow fringe from the illustration underlay as well as the frame.
  // The visible energy is carried only by its interchangeable capsule layer.
  for(const s of layout.slots.filter(s=>s.state==='electric'||s.state==='barrier')){
    const mask=fullMasks[s.side+'-D'+s.die];
    for(let y=Math.max(0,s.cy-s.extent-7);y<Math.min(H,s.cy+s.extent+8);y++)for(let x=Math.max(0,s.cx-s.extent-7);x<Math.min(W,s.cx+s.extent+8);x++){
      if(!artMask[y*W+x]||!mask[y*W+x])continue;
      const direction=s.side==='atk'?1:-1;
      const xx=Math.round(s.cx+direction*(s.extent+22));
      for(let c=0;c<3;c++)art[(y*W+x)*4+c]=art[(y*W+xx)*4+c];
    }
  }
  await save('assets/art-momo.png',masked(art,artMask));
  // Role emblems are fixed graphics, not part of the top capsule's aura.
  for(const box of [[86,218,174,300],[775,226,862,303]]){
    for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++)for(let c=0;c<3;c++)frame[(y*W+x)*4+c]=source[(y*W+x)*4+c];
  }
  // Recover the foreground from its estimated underlay. This avoids dark,
  // double-multiplied fringes when a luminous sprite is rendered over the art.
  for(const s of layout.slots){
    const id=s.side+'-D'+s.die,mask=fullMasks[id],sprite=Buffer.from(clean);
    for(let i=0;i<W*H;i++){
      const x=i%W,y=Math.floor(i/W);
      if(!footprint(s,x,y)){sprite[i*4+3]=0;continue;}
      let a=mask[i]/255;
      const bg=artMask[i]?art:frame;
      for(let c=0;c<3;c++){
        const b=bg[i*4+c],v=clean[i*4+c];
        a=Math.max(a,v>b?(v-b)/(255-b||1):(b-v)/(b||1));
      }
      a=Math.ceil(a*255)/255;
      if(!a){sprite[i*4+3]=0;continue;}
      for(let c=0;c<3;c++)sprite[i*4+c]=Math.round(clamp((clean[i*4+c]-(1-a)*bg[i*4+c])/a,0,255));
      sprite[i*4+3]=Math.round(a*255);
    }
    await save('assets/capsules/'+id+'.png',sprite);
  }
  // Canonical physical and effect bases never include any exterior halo or rail.
  const purePhysical=masked(clean,regionMask((x,y)=>{
    const d=Math.hypot((x-817)/54,(y-620)/51.5),i=(y*W+x)*4;
    if(d<=.9)return 1;
    if(d>1.03)return 0;
    const copper=clean[i]>clean[i+2]*1.035,white=Math.min(clean[i],clean[i+1],clean[i+2])>165&&clean[i]>=clean[i+2]*.92;
    return copper||white?clamp((clean[i]-clean[i+2]*.65)/65)*clamp((1.03-d)*34):0;
  }));
  await save('assets/capsules/physical-clean.png',purePhysical);
  const pureEffect=masked(clean,regionMask((x,y)=>disk(x,y,126,505,55)));
  await save('assets/capsules/effect-clean.png',pureEffect);
  // The two medallion rings are fixed. Their contents are separate assets.
  for(const [key,m] of Object.entries(layout.medallions)){
    const mask=regionMask((x,y)=>disk(x,y,m.cx,m.cy,m.r));
    await save('assets/identity/'+key+'.png',masked(source,mask));
    for(let y=m.cy-m.r;y<=m.cy+m.r;y++)for(let x=m.cx-m.r;x<=m.cx+m.r;x++)if(mask[y*W+x]){
      const i=(y*W+x)*4,d=Math.hypot(x-m.cx,y-m.cy)/m.r;
      frame[i]=2;frame[i+1]=Math.round(20+5*d);frame[i+2]=Math.round(33+9*d);fixed[y*W+x]=0;
    }
  }
  const crystalMask=regionMask((x,y)=>inside(x+.5,y+.5,layout.crystalPolygon));
  await save('assets/identity/crystal.png',masked(source,crystalMask));
  const branches=regionMask((x,y)=>layout.branchPolygons.some(p=>inside(x+.5,y+.5,p)));
  await save('assets/identity/branches.png',masked(source,branches));
  for(let i=0;i<W*H;i++)if(crystalMask[i]||branches[i]){
    frame[i*4]=3;frame[i*4+1]=24;frame[i*4+2]=38;fixed[i]=0;
  }
  await save('assets/identity/flag.png',masked(source,regionMask((x,y)=>inside(x+.5,y+.5,layout.flagPolygon))));
  const p=layout.positions;
  await save('assets/identity/position.png',masked(clean,regionMask((x,y)=>x>=p.x&&x<p.x+p.width&&y>=p.y&&y<p.y+p.height)));
  // Remove the old barcode pattern, retaining its recess and external rails.
  const b=layout.barcode.box;
  for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
    const i=(y*W+x)*4;frame[i]=frame[i+1]=frame[i+2]=0;fixed[y*W+x]=0;
  }
  for(let i=0;i<W*H;i++){
    frame[i*4+3]=255-artMask[i];
    if(artMask[i]||ink[i])fixed[i]=0;
  }
  // A slot can switch to any calibrated state; its largest footprint is dynamic.
  for(const s of layout.slots){
    const r=s.die===6?120:89;
    for(let y=Math.max(0,s.cy-r);y<Math.min(H,s.cy+r+1);y++)for(let x=Math.max(0,s.cx-r);x<Math.min(W,s.cx+r+1);x++)fixed[y*W+x]=0;
  }
  // Labels may occupy their entire field after a change, not just the old glyphs.
  for(const t of Object.values(layout.texts)){
    const [cx,cy]=t.center,hh=t.leadingPx?75:Math.max(26,t.sizePx);
    for(let y=Math.floor(cy-hh);y<Math.ceil(cy+hh);y++)for(let x=Math.floor(cx-t.width/2);x<Math.ceil(cx+t.width/2);x++)fixed[y*W+x]=0;
  }
  await save('assets/frame.png',frame);
  const metal=regionMask((x,y)=>{
    const i=(y*W+x)*4,r=frame[i],g=frame[i+1],b=frame[i+2];
    return frame[i+3]&&r>g*1.08&&r>b*1.1?clamp((r-g-5)/22):0;
  });
  await maskPng('masks/metal.png',metal);
  await maskPng('masks/fixed-pixels.png',fixed);
  fs.writeFileSync(path.join(output,'assets-manifest.json'),JSON.stringify({referenceHash:hash(path.join(root,layout.reference)),frameHash:hash(path.join(output,'assets/frame.png')),width:W,height:H,fixedPixelCount:[...fixed].filter(Boolean).length,method:'Fixed raster frame extracted from approved Momo; capsule states separate; fonts live in PSD. Text holes reconstructed once by bounded diffusion; identity underlay by Photoshop content-aware fill.'},null,2));
  await sharp(path.join(output,'assets/frame.png')).resize(760).png().toFile(path.join(output,'preparation/frame-preview.png'));
  console.log('Cadre, illustration, capsules et identites separes.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
