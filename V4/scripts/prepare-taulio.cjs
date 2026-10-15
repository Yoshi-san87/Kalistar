const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const workspace = path.dirname(root);
const sourceFile = path.join(workspace,'V3/donnees/cartes.json');
const cards = JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const card = cards.find(c=>c.slug==='13_ELECTRO_TAULIO');
if(!card) throw new Error('Taulio profile missing');
const illustration = path.join(workspace,card.art);
const master = path.join(root,'cartes/MOMO_ELECTRO_V4_04-typographie.png');
const hash = p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.mkdirSync(path.join(root,'assets/illustrations'),{recursive:true});
fs.copyFileSync(illustration,path.join(root,'assets/illustrations/13_ELECTRO_TAULIO.png'));
fs.copyFileSync(path.join(workspace,'V3/site/assets/cards/13_ELECTRO_TAULIO-full.png'),path.join(root,'references/taulio-v3.png'));
const descriptionLines = [
  'Con\u00e7u pour prot\u00e9ger les puissants, Taulio fut jet\u00e9 \u00e0 la',
  "d\u00e9charge lorsqu'il apprit \u00e0 ressentir. Sous sa cuirasse",
  "caboss\u00e9e, rien n'a \u00e9teint sa loyaut\u00e9. D\u00e9sormais, il garde",
  'le passage pour ceux que le monde a abandonn\u00e9s.',
];
const profile = {
  ...card,
  title:'GARDE DU CORPS LOYAL',
  text:descriptionLines.join(' '),
  art:'V4/assets/illustrations/13_ELECTRO_TAULIO.png',
  visual_revision:'V4-taulio-test-01',
  visualReference:'V4/cartes/MOMO_ELECTRO_V4_04-typographie.png',
  descriptionLines,
  originalTitle:card.title,
  originalDescription:card.text,
  changes:'Orthographe du titre et adaptation narrative; aucune modification du gameplay.',
};
const mechanicKeys=['id','element','race','faction','job','positions','weapon','atk','defense','magic','barriers','advantage','disadvantage','role','sentry','canGuard','canHeal'];
for(const key of mechanicKeys) if(JSON.stringify(card[key])!==JSON.stringify(profile[key])) throw new Error('Unexpected mechanics change: '+key);
fs.writeFileSync(path.join(root,'donnees/taulio.json'),JSON.stringify(profile,null,2));
fs.writeFileSync(path.join(root,'verification/taulio-sources.json'),JSON.stringify({
  protectedFiles:[{path:sourceFile,sha256:hash(sourceFile)},{path:illustration,sha256:hash(illustration)},{path:master,sha256:hash(master)}],
  mechanicKeys,
  sourcePreview:'V3/site/assets/cards/13_ELECTRO_TAULIO-full.png',
  sourcePrintPngNotUsed:'The preview tool could not decode V3/cartes/13_ELECTRO_TAULIO.png; the valid game export was used as reference.',
},null,2));
console.log(JSON.stringify({name:profile.name,id:profile.id,positions:profile.positions,atk:profile.atk,defense:profile.defense,magic:profile.magic,barriers:profile.barriers}));
