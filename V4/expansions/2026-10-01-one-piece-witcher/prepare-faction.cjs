'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,ROOT,sharp,assert,read,write,hash}=L;
const file=n=>path.join(__dirname,n),alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
function save(file,buffer){if(fs.existsSync(file))assert(fs.readFileSync(file).equals(buffer),'Never replace a selected asset');else fs.writeFileSync(file,buffer,{flag:'wx'});}
async function main(){
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png'),packedOutline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
 const texture=await sharp(file('source-WITCHER.png')).flatten({background:'#111111'}).resize(109,230,{fit:'fill'}).png().toBuffer();
 const flag=await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:5,top:0,width:98,height:223}).png().toBuffer();
 save(file('flag-WITCHER.png'),flag);save(file('flag-WITCHER-packed.png'),packed);
 assert((await alpha(file('flag-WITCHER.png'))).equals(await alpha(outline)));
 assert((await alpha(file('flag-WITCHER-packed.png'))).equals(await alpha(packedOutline)));
 save(path.join(ROOT,'V4/site/assets/factions/WITCHER.png'),flag);
 write(file('faction.json'),{id:'WITCHER',label:'The Witcher',officialCollaboration:false,packedGeometry:{left:672,top:829,width:98,height:223},sourceHash:await hash(file('source-WITCHER.png')),flagHash:await hash(file('flag-WITCHER.png')),packedHash:await hash(file('flag-WITCHER-packed.png')),outlineHash:await hash(outline),packedOutlineHash:await hash(packedOutline),bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only'});
 const request=path.join(ROOT,'V4/releases/2026-10-01-one-piece-witcher/art-prompts/witcher-banner.json'),q=read(request);
 q.method='built-in image_gen';q.selected={path:'V4/expansions/2026-10-01-one-piece-witcher/source-WITCHER.png',sha256:await hash(file('source-WITCHER.png'))};q.referenceHashes={[q.references[0]]:await hash(outline)};q.review='Codex visual review: silver wolf, restrained cloth, correct small wordmark; exact approved alpha retained. Not human approval.';write(request,q);
 return read(file('faction.json'));
}
main().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
