const fs = require('fs'), path = require('path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
async function pixels(file) {
  const {data, info} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width, top=info.height, right=0, bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
  }
  return {data,...info,left,top,right,bottom,w:right-left,h:bottom-top};
}
async function main(){
  const elements=JSON.parse(fs.readFileSync(path.join(root,'donnees/elements.json')));
  const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json')));
  const result={halos:{},flags:{}};
  for(const id of Object.keys(elements)){
    const m=await pixels(path.join(root,'assets/effets',id+'.png'));
    let best={score:-1};
    for(let cy=m.height*.42;cy<m.height*.59;cy+=3)for(let cx=m.width*.42;cx<m.width*.59;cx+=3){
      for(let r=m.width*.26;r<m.width*.4;r+=2){
        let score=0;
        for(let a=0;a<72;a++){
          const angle=a*Math.PI/36,x=Math.round(cx+Math.cos(angle)*r),y=Math.round(cy+Math.sin(angle)*r);
          const p=(y*m.width+x)*4;
          score+=m.data[p+3]/255*(Math.max(m.data[p],m.data[p+1],m.data[p+2])/255);
        }
        if(score>best.score)best={score,cx,cy,r};
      }
    }
    result.halos[id]={cx:(best.cx-m.left)/m.w,cy:(best.cy-m.top)/m.h,r:best.r/m.w,aspect:m.h/m.w};
  }
  for(const c of cards){
    const m=await pixels(path.join(root,'assets/factions',c.faction+'.png'));
    let best={n:0,y:m.top};
    for(let y=Math.round(m.top+m.h*.04);y<m.top+m.h*.29;y++){
      let n=0;for(let x=m.left;x<m.right;x++)if(m.data[(y*m.width+x)*4+3]>100)n++;
      if(n>best.n)best={n,y};
    }
    result.flags[c.faction]={bar:(best.y-m.top)/m.h,aspect:m.h/m.w};
  }
  fs.writeFileSync(path.join(root,'donnees/asset_geometry.json'),JSON.stringify(result,null,2));
  console.log(result);
}
main().catch(e=>{console.error(e);process.exit(1)});
