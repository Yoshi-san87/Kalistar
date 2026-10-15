'use strict';
const L=require('../../atelier/lib.cjs'),S=require('./specs.cjs');
const {path,sharp,assert,write}=L;
async function main(){
 const checks=[];
 for(const c of S.revised){
  const original=path.join(__dirname,'before/V4/creations',c.id,'card.png'),current=path.join(__dirname,'cards',c.key,'card.png');
  const a=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(current).ensureAlpha().raw().toBuffer();
  const regions=[];if(c.key!=='serya')regions.push([80,156,817,1077]);
  if(['orven','serya','tilko'].includes(c.key))regions.push([130,1250,765,1382]);
  if(c.race==='CRUSTOS')regions.push([711,1116,807,1211]);
  let changed=0,outside=0;
  for(let y=0;y<a.info.height;y++)for(let x=0;x<a.info.width;x++){
   const i=(y*a.info.width+x)*4;if(a.data[i]===b[i]&&a.data[i+1]===b[i+1]&&a.data[i+2]===b[i+2]&&a.data[i+3]===b[i+3])continue;
   changed++;if(!regions.some(([l,t,r,d])=>x>=l&&x<r&&y>=t&&y<d))outside++;
  }
  checks.push({key:c.key,changed,outside,allowed:regions});assert.equal(outside,0,c.key+' modified outside requested artwork/text/race');
 }
 write(path.join(__dirname,'revision-pixels.json'),checks);console.log(JSON.stringify(checks,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
