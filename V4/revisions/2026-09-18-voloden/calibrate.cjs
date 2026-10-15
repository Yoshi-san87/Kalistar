const L=require('../../atelier/lib.cjs');
const {path,ROOT,read,write,sharp}=L;
(async()=>{
  const layouts=read(path.join(ROOT,'V4/template-stable/icon-layouts.json'));
  for(const [kind,name,file,center]of [['weapon','Faucille','weapon',[137,1163.5]],['race','CARDEMORTIS','race',[759,1163.5]]]){
    const {data,info}=await sharp(path.join(__dirname,'inspection',file+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let x0=info.width,y0=info.height,x1=0,y1=0,weight=0,sx=0,sy=0;const points=[];
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      const i=(y*info.width+x)*4,a=data[i+3]/255;if(!a)continue;
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);
      const w=a*(.35+.65*(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255);
      weight+=w;sx+=(x+.5)*w;sy+=(y+.5)*w;points.push([x+.5,y+.5]);
    }
    const optical=[(x0+x1)/2*.35+sx/weight*.65,(y0+y1)/2*.35+sy/weight*.65];
    const radius=Math.max(...points.map(([x,y])=>Math.hypot(x-optical[0],y-optical[1]))),scale=Math.min(1,43/radius);
    layouts[kind][name]={width:(x1-x0)*scale,height:(y1-y0)*scale,center,anchor:[(optical[0]-x0)/(x1-x0),(optical[1]-y0)/(y1-y0)],safeRadius:44,innerRadius:47.5,
      sourceBounds:[x0,y0,x1,y1],opticalCentroid:[sx/weight,sy/weight],method:'65% visible luminance-alpha centroid / 35% visible bounds centre; full alpha contour contained',revision:'voloden-2026-09-18'};
    if(name==='CARDEMORTIS'){
      // Height controls the uniform scale; Photoshop's resampled alpha adds one pixel on either side.
      // Match that measured 79 px envelope so a second application does not resize the same object again.
      layouts[kind][name].theoreticalWidth=layouts[kind][name].width;
      layouts[kind][name].width=79;
      layouts[kind][name].nativeEnvelopeSource='Voloden first native render: 79 x 80 px at height-controlled scale';
    }
    await sharp(path.join(__dirname,'inspection',file+'.png')).extract({left:x0-4,top:y0-4,width:x1-x0+8,height:y1-y0+8}).resize({width:320}).png().toFile(path.join(__dirname,'inspection',file+'-zoom.png'));
    console.log(name,layouts[kind][name]);
  }
  write(path.join(__dirname,'staged/icon-layouts.json'),layouts);
})().catch(e=>{console.error(e);process.exitCode=1;});
