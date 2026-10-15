const {fs,path,root,layout,W,H,output,hash,raw,maskPng,dilate,inside}=require('./common.cjs');
async function main(){
  const reference=path.join(root,layout.reference);
  if(hash(reference)!==layout.referenceSha256)throw Error('La reference validee a change. Preparation interrompue.');
  fs.mkdirSync(output,{recursive:true});
  const source=await raw(reference), ink=Buffer.alloc(W*H), objects=Buffer.alloc(W*H);
  function textBox(box,gold,limit){
    for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
      if(limit&&Math.hypot(x-limit.cx,y-limit.cy)>limit.r)continue;
      const i=(y*W+x)*4,r=source[i],g=source[i+1],b=source[i+2];
      if(gold ? r>110&&g>95&&b<g*.88 : Math.min(r,g,b)>110&&Math.max(r,g,b)-Math.min(r,g,b)<65)ink[y*W+x]=255;
    }
  }
  for(const t of Object.values(layout.texts))textBox(t.box,t.gold);
  for(const s of layout.slots)if(typeof s.value==='number'){
    const w=s.die===6?67:39,h=s.die===6?37:27;
    textBox([s.cx-w,s.cy-h,s.cx+w,s.cy+h],false,{cx:s.cx,cy:s.cy,r:s.die===6?66:40});
  }
  for(let n=0;n<2;n++)textBox([173+n*73,1136,204+n*73,1179],false);
  // Only concealed regions are reconstructed; the approved source is never edited.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const position=y>=1122&&y<=1196&&x>=158&&x<=293;
    const flag=inside(x,y,layout.flagPolygon);
    if(position||flag)objects[y*W+x]=255;
  }
  await maskPng('preparation/texte-mask.png',dilate(ink,3));
  await maskPng('preparation/sous-identite-mask.png',dilate(objects,3));
  fs.writeFileSync(path.join(output,'reference.json'),JSON.stringify({source:layout.reference,sha256:hash(reference),canvas:layout.canvas,method:'Extraction et recomposition deterministe. Aucune generation de carte complete.'},null,2));
  console.log('Masques de preparation crees, source validee intacte.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
