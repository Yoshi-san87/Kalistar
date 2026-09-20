const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
async function metric(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 const w=right-left,h=bottom-top,cx=(left+right)/2,cy=(top+bottom)/2;
 let radius=0;
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>24)radius=Math.max(radius,Math.hypot(x+.5-cx,y+.5-cy));
 if(!radius||!w||!h)throw new Error('Empty icon: '+file);
 return {r:radius/w,aspect:h/w,alphaBounds:[left,top,right,bottom]};
}
async function main(){
 const file=path.join(root,'donnees/asset_geometry.json'),geometry=JSON.parse(fs.readFileSync(file,'utf8'));
 geometry.icons={weapons:{},races:{}};
 for(let i=0;i<20;i++){const key=String(i).padStart(2,'0');geometry.icons.weapons[key]=await metric(path.join(root,'assets/armes',key+'.png'));}
 const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
 for(const race of new Set(cards.map(c=>c.race)))geometry.icons.races[race]=await metric(path.join(root,'assets/races',race+'.png'));
 fs.writeFileSync(file,JSON.stringify(geometry,null,2));
 console.log('Circular fitting measured: 20 weapons, '+Object.keys(geometry.icons.races).length+' races.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
