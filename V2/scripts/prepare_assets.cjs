const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const cards = JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json')));
const elements = Object.values(JSON.parse(fs.readFileSync(path.join(root,'donnees/elements.json'))));
const svg = (body,w=100,h=100) => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+body+'</svg>');
const glyphs = {
ROBOT:'<rect x="24" y="26" width="52" height="48" rx="5"/><path d="M50 13v13M15 39h9m-9 20h9m52-20h9M76 59h9" fill="none" stroke="white" stroke-width="7"/><path d="M36 43h8v8h-8zm20 0h8v8h-8zM37 60h26v5H37z" fill="#102030"/>',
HUMAIN:'<circle cx="50" cy="29" r="14"/><path d="M25 83V65c0-15 10-22 25-22s25 7 25 22v18z"/>',
FALCO:'<path d="M16 69C14 42 34 23 79 17L60 38l19-6-20 20 14-2-22 18-5 18-9-17z"/>',
SIRENA:'<path d="M47 17h6v52h-6zM21 18h7v23q22 16 44 0V18h7v28Q50 70 21 46zM50 10l10 17H40zM23 84q13-15 27-1 13-14 27 0" stroke="white" stroke-width="5" fill="none"/>',
DRAX:'<path d="M17 66l18-23-3-26 22 16 24-11-8 24 14 13-22 4-10 22-5-22z"/><circle cx="60" cy="45" r="4" fill="#102030"/>',
AURELION:'<circle cx="50" cy="50" r="18"/><path d="M50 9v15m0 52v15M9 50h15m52 0h15M21 21l11 11m36 36 11 11M21 79l11-11m36-36 11-11" stroke="white" stroke-width="6"/>',
NAIN:'<path d="M21 25h49v23H21zM40 48h15v39H40zM70 21l13 8v16l-13 8z"/>',
CARNIVERT:'<path d="M20 81C2 38 37 20 81 14 82 62 60 84 27 74L19 88z"/><path d="M27 75l39-42M42 59l-4-19m5 19 19-1" stroke="#102030" stroke-width="5" fill="none"/>',
VAMP:'<path d="M17 31q33-15 66 0l-9 39-15-29H41L27 70zM37 81q13-12 26 0z"/>',
SKULLZ:'<path d="M19 44C19 6 81 6 81 44v15l-13 9v15H33V68L19 59z"/><circle cx="36" cy="45" r="9" fill="#102030"/><circle cx="64" cy="45" r="9" fill="#102030"/><path d="M50 55l7 10H43zM42 73v10m15-10v10" stroke="#102030" stroke-width="4"/>',
RHINOZ:'<path d="M16 65l11-23 27-9 10-17 3 27 17 16-9 14H30z"/><circle cx="56" cy="51" r="4" fill="#102030"/>',
retry:'<path d="M50 45C18 5 0 56 42 52 1 80 51 103 50 61 54 102 104 80 62 53 104 59 85 6 54 45z"/><path d="M50 55l-8 32" stroke="white" stroke-width="6"/>',
mana:'<path d="M38 15h24v10h-4v22C98 82 73 90 50 90S2 82 42 47V25h-4z"/><path d="M35 62h30" stroke="#102030" stroke-width="8"/><path d="M78 14v19m-9-9h18" stroke="white" stroke-width="4"/>',
revive:'<path d="M50 82C-5 42 20 6 50 34 80 6 105 42 50 82z"/><path d="M50 42v25M38 54h24" stroke="#102030" stroke-width="7"/>',
death:'<path d="M19 44C19 6 81 6 81 44v15l-13 9v15H33V68L19 59z"/><circle cx="36" cy="45" r="9" fill="#102030"/><circle cx="64" cy="45" r="9" fill="#102030"/><path d="M50 55l7 10H43z" fill="#102030"/>',
dodge:'<circle cx="57" cy="20" r="9"/><path d="M52 35L38 57l20 8 2 24M51 38l24 10 8-13M41 55L20 69 14 85M26 32H8M21 44H3" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/>'
};
async function main() {
 for (const c of cards) await sharp(path.join(root,'assets/barcodes',c.id+'.svg')).png().toFile(path.join(root,'assets/barcodes',c.id+'.png'));
 for (const [folder,name] of [['cristaux','crystal_atlas'],['effets','aura_atlas']]) {
  const file=path.join(root,'assets',folder,name+'.png'), m=await sharp(file).metadata();
  console.log(name,m.width,m.height,m.channels,m.hasAlpha);
  for(let i=0;i<elements.length;i++){
   const x=Math.round(i%4*m.width/4), y=Math.round(Math.floor(i/4)*m.height/3);
   const w=Math.round((i%4+1)*m.width/4)-x,h=Math.round((Math.floor(i/4)+1)*m.height/3)-y;
   let pipe=sharp(await sharp(file).extract({left:x,top:y,width:w,height:h}).png().toBuffer());
   if(folder==='cristaux')pipe=pipe.trim({threshold:12});
   await pipe.png().toFile(path.join(root,'assets',folder,elements[i].id+'.png'));
  }
 }
 for(const [key,body] of Object.entries(glyphs)) {
  const folder=['retry','mana','revive','death','dodge'].includes(key)?'effets':'races';
  const raw=svg('<g fill="white">'+body+'</g>');
  fs.writeFileSync(path.join(root,'assets',folder,key+'.svg'),raw);
  await sharp(raw).png().toFile(path.join(root,'assets',folder,key+'.png'));
 }
 const shield=svg('<defs><radialGradient id="g"><stop offset=".55" stop-color="#42bafc" stop-opacity="0"/><stop offset=".81" stop-color="#3b80ff" stop-opacity=".32"/><stop offset=".9" stop-color="#95eaff" stop-opacity=".9"/><stop offset="1" stop-color="#3285ff" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(#g)"/><g fill="none" stroke="#9ce4ff"><circle cx="50" cy="50" r="42" stroke-width="1.2"/><circle cx="50" cy="50" r="37" stroke-width=".65"/><circle cx="50" cy="50" r="44" stroke-width="1" stroke-dasharray="2 3"/><path d="M50 10l35 20v40L50 90 15 70V30z" stroke-width=".6"/></g>',100,100);
 await sharp(shield,{density:288}).png().toFile(path.join(root,'assets/effets/barrier.png'));
 const factionRace={Nestown:'FALCO',Thalassea:'SIRENA',Niveria:'HUMAIN',Solaria:'AURELION',Durane:'NAIN',Draevenheim:'VAMP',Zarok:'RHINOZ',Z13:'HUMAIN'};
 for(const c of cards) {
  const dest=path.join(root,'assets/factions',c.faction+'.png');
  if(fs.existsSync(dest))continue;
  const raw=svg('<defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M16 0L32 16 16 32 0 16z" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="1"/></pattern></defs><path d="M5 5h204v365L107 474 5 370z" fill="#152537" stroke="#'+c.color+'" stroke-width="10"/><path d="M15 15h184v350l-92 94-92-94z" fill="url(#p)"/><path d="M107 30v90" stroke="#'+c.color+'" stroke-width="6"/><g fill="white" transform="translate(22 130) scale(1.7)">'+glyphs[factionRace[c.faction]]+'</g><path d="M40 340h134" stroke="#'+c.color+'" stroke-width="4"/>',214,480);
  fs.writeFileSync(dest.replace('.png','.svg'),raw);
  await sharp(raw).png().toFile(dest);
 }
 const dragon = await sharp(path.join(root,'assets/factions/Vulkar.png')).extract({left:24,top:120,width:168,height:185}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const pixels=Buffer.alloc(dragon.info.width*dragon.info.height*4);
 for(let i=0;i<dragon.info.width*dragon.info.height;i++){pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=255;pixels[i*4+3]=Math.min(dragon.data[i*3],dragon.data[i*3+1],dragon.data[i*3+2])>185?255:0;}
 await sharp(pixels,{raw:{width:dragon.info.width,height:dragon.info.height,channels:4}}).trim().resize(100,100,{fit:'contain',background:'#00000000'}).png().toFile(path.join(root,'assets/races/DRAX.png'));
 console.log('Assets ready');
}
main().catch(e=>{console.error(e);process.exit(1)});
