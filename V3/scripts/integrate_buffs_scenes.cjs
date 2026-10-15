'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'assets/revisions-buffs-scenes-20260914');
const backup=path.join(root,'sources/avant-buffs-scenes-20260914');
const recordFile=path.join(root,'donnees/revision_buffs_scenes_integration.json');
const targets=[7,12,16,23,25,26,27,32,35,36,39];
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
async function main(){
  const cards=read(path.join(root,'donnees/cartes.json'));
  const record=fs.existsSync(recordFile)?read(recordFile):{revision:'buffs-scenes-20260914',assets:{},protected:{}};
  const protectedCards=cards.filter(c=>!targets.includes(Number(c.id)-30000000));
  for(const c of protectedCards){
    const before=hash(path.join(backup,'assets/illustrations',c.slug+'.png'));
    assert.equal(hash(path.join(root,'assets/illustrations',c.slug+'.png')),before,'Unrequested illustration changed: '+c.slug);
    record.protected[c.slug]=before;
  }
  const files=process.argv.slice(2);
  // Validate the complete requested batch before touching canonical assets.
  const prepared=[];
  for(const rel of files){
    assert.match(rel,/^(illustrations|races|armes|effets)\/[A-Za-z0-9_]+\.png$/);
    if(rel.startsWith('illustrations/'))assert(cards.some(c=>rel==='illustrations/'+c.slug+'.png'&&targets.includes(Number(c.id)-30000000)),rel);
    if(rel.startsWith('races/'))assert(cards.some(c=>rel==='races/'+c.race+'.png'),rel);
    if(rel.startsWith('armes/'))assert.match(rel,/armes\/(0[0-9]|1[0-9])\.png$/);
    if(rel.startsWith('effets/'))assert.equal(rel,'effets/MINERO.png');
    const src=path.join(stage,rel),m=await sharp(src).metadata();
    if(!rel.startsWith('illustrations/')){
      assert(m.hasAlpha,'Missing alpha: '+rel);
      const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const corners=[0,info.width-1,info.width*(info.height-1),info.width*info.height-1].map(i=>data[i*4+3]);
      assert(corners.every(v=>v<=1),'Opaque corner: '+rel);
      if(rel==='effets/MINERO.png')assert(data[(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4+3]>250,'Stone center must be opaque');
    }
    prepared.push({rel,src,sha256:hash(src),width:m.width,height:m.height});
  }
  for(const item of prepared){
    const dest=path.join(root,'assets',item.rel);
    if(!fs.existsSync(dest)||hash(dest)!==item.sha256)fs.copyFileSync(item.src,dest);
    record.assets[item.rel]={sha256:item.sha256,width:item.width,height:item.height,integratedAt:new Date().toISOString()};
  }
  fs.writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');
  console.log('Integrated '+prepared.length+' assets; '+Object.keys(record.assets).length+' total; '+protectedCards.length+' other illustrations unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
