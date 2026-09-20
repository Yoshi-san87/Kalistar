const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),file=path.join(root,'donnees/asset_geometry.json');
async function main(){
 const geometry=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const name of ['Crabazar','Woodland']){
  const input=path.join(root,'assets/factions',name+'.png');if(!fs.existsSync(input))continue;
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  const w=right-left,h=bottom-top;let best={n:0,y:top};
  for(let y=top;y<top+h*.2;y++){
   let n=0;for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>100)n++;
   if(n>best.n)best={n,y};
  }
  geometry.flags[name]={bar:(best.y-top)/h,aspect:h/w};
  console.log(name,geometry.flags[name]);
 }
 fs.writeFileSync(file,JSON.stringify(geometry,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
