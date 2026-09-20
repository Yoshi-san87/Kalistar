const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/elements-01');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const write = (p, value) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(value, null, 2)); };
const names = ['RUBY','CANA','SCROW','SORYN','GILMARR','DARNAKO','MALINIA','AELIS','ILIANE','BELROG','LOK','BALMHYR','MAGNAR','THALIE','BLOOM','VICTORVINE'];
const edits = {RUBY:'eau-feu-glace',DARNAKO:'eau-feu-glace',MALINIA:'eau-feu-glace',CANA:'air',SCROW:'air',SORYN:'air',GILMARR:'air',LOK:'terre-plantes',BALMHYR:'terre-plantes',MAGNAR:'terre-plantes',VICTORVINE:'terre-plantes'};
const changes = {
  RUBY: {description:"Ruby rit dans le silence de l'eau. Les dauphins croisent son sillage, et elle oublie un instant les routes \u00e0 tracer. Ses deux petits harpons restent \u00e0 ses hanches : aujourd'hui, la mer lui offre simplement sa joie."},
  DARNAKO: {title:'AVANT LE PREMIER CHOC',description:"Le souffle court, Darnako tire sa lame. La peur est l\u00e0, mais son regard ne quitte pas l'adversaire. Il plante ses pieds dans la cendre : Vulkar ne le verra pas reculer."},
  LOK: {job:'ROI DE DURANE',title:'LE POIDS DU TR\u00d4NE',description:"Sur le tr\u00f4ne de Durane, Lok serre les accoudoirs. Chaque bruit de pas lui semble une menace. Il porte la couronne comme une arme, mais le silence de la salle lui p\u00e8se plus lourd que le fer."},
  BALMHYR: {title:"LE ROYAUME \u00c0 L'HORIZON",description:"Balmhyr regarde Durane sans courber le dos. Son ours veille derri\u00e8re lui. Le roi d\u00e9chu n'a plus de tr\u00f4ne, mais ceux qui croisent son regard y trouvent encore la force d'un p\u00e8re et la patience d'un guide."},
  VICTORVINE: {description:"Victorvine recueille une jeune pousse au bord des eaux mortes. Autour, la for\u00eat porte encore ses blessures. Dans ce geste fragile demeure une promesse : tout ce qui a \u00e9t\u00e9 bris\u00e9 n'est pas encore perdu."},
  SCROW: {description:"Scrow reconna\u00eet le sceau avant de l\u00e2cher la corde. Il laisse le messager franchir les toits. Une fl\u00e8che retenue peut peser autant qu'une fl\u00e8che tir\u00e9e."},
  SORYN: {description:"Soryn attend que le vent tourne avant de toucher la corde. Une note traverse le brouillard. Sur le pont invisible, les voyageurs savent de nouveau o\u00f9 poser le pied."},
  GILMARR: {description:"Gilmarr d\u00e9cale le plot de la ligne et fait signe d'entrer. Une place vient de s'ouvrir dans l'\u00e9quipe. Son sourire promet un match difficile, pas une faveur."},
  ILIANE: {description:"Iliane \u00e9claire les pages que le conseil voulait oublier. Lettre apr\u00e8s lettre, les noms reviennent. Elle ne baisse plus les yeux quand la porte s'ouvre."},
  MAGNAR: {description:"Magnar avance d'un pas et la galerie semble r\u00e9tr\u00e9cir. Il n'a pas besoin de hausser la voix. La roche de son corps conna\u00eet chaque vibration de la mine."},
  THALIE: {description:"Thalie tourne la page couverte de suie et pose une feuille neuve entre les feuillets. La for\u00eat ne reprend pas tout d'un coup. Elle commence ici."},
  BLOOM: {description:"Bloom tourne la graine sous le verre. La fleur qu'elle promet pourrait sauver la serre ou l'\u00e9touffer. Il prend le temps d'apprendre la diff\u00e9rence."}
};
async function hash(p) { const h=crypto.createHash('sha256'); for await(const c of fs.createReadStream(path.join(root,p))) h.update(c); return h.digest('hex'); }
(async()=>{
  const dest=path.join(work,'manifest.json');
  if(fs.existsSync(dest)) throw Error('Manifest already exists; do not reset profiles or protected hashes.');
  fs.mkdirSync(work,{recursive:true});
  const roster=read('V3/donnees/cartes.json');
  const cards=names.map(name=>{ const v=roster.find(c=>c.name===name); if(!v) throw Error(name); const c={schemaVersion:4};
    for(const k of ['id','name','title','job','race','element','faction','weapon','positions','atk','defense','magic','barriers','slug','hue','color','weapon_index']) c[k]=v[k];
    c.description=v.text; Object.assign(c,changes[name]||{}); c.artwork=name;
    c.artworkSource=edits[name]?`V4/assets/illustrations/elements-01/${edits[name]}/${name}_V4_01.png`:v.art;
    c.artworkUnchanged=!edits[name]; c.sourcePSD=`V3/templates/${v.slug}.psd`;
    c.output=`${name}_V4_01_${v.element}`; c.profile=`V4/template-stable/elements-01/${name.toLowerCase()}/card.json`;
    write(path.join(root,c.profile),c); return c;
  });
  const factions=[...new Set(cards.map(c=>c.faction))]; const flags={};
  for(const faction of factions){
    const file=`V3/assets/factions/${faction}.png`, meta=await sharp(path.join(root,file)).metadata();
    const left=Math.round(meta.width*.08),top=Math.round(meta.height*.145);
    const crop={left,top,width:meta.width-2*left,height:meta.height-top};
    const output=`V4/template-stable/elements-01/resources/flag-${faction}.png`;
    fs.mkdirSync(path.dirname(path.join(root,output)),{recursive:true});
    const cropped=await sharp(path.join(root,file)).extract(crop).png().toBuffer();
    await sharp(cropped).trim().png().toFile(path.join(root,output)); flags[faction]={source:file,output,crop};
  }
  const palette={HYDRO:{hue:192,saturation:65,lightness:-3},AERO:{hue:155,saturation:45,lightness:-3},PYRO:{hue:12,saturation:65,lightness:-5},CRYO:{hue:201,saturation:32,lightness:8},LUXO:{hue:45,saturation:35,lightness:9},MINERO:{hue:210,saturation:12,lightness:-9},HERBO:{hue:100,saturation:50,lightness:-6}};
  const manifest={schemaVersion:4,baseTemplate:'V4/template-stable/KALISTAR_V4_TEMPLATE_03F_ELECTRO_RIKKA.psd',baseRegistry:'V4/template-stable/registry-electro-03f.json',template:'V4/template-stable/KALISTAR_V4_TEMPLATE_04_ELEMENTS.psd',registry:'V4/template-stable/registry-elements-04.json',cards,flags,palette,geometry:read('V3/donnees/asset_geometry.json'),protectedFiles:{}};
  const active=read('V4/template-stable/current.json');
  const protectedPaths=[manifest.baseTemplate,manifest.baseRegistry,'V3/donnees/cartes.json','V3/site/index.html','V4/template-stable/current.json',...cards.flatMap(c=>[c.sourcePSD,roster.find(v=>v.name===c.name).art]),...active.cards.flatMap(c=>[`V4/templates/${c.output}.psd`,`V4/cartes/${c.output}.png`])];
  for(const p of protectedPaths) manifest.protectedFiles[p]=await hash(p);
  write(dest,manifest);
  console.log(JSON.stringify({cards:cards.length,elements:Object.keys(palette),preservedArtwork:cards.filter(c=>c.artworkUnchanged).map(c=>c.name),work}));
})().catch(e=>{console.error(e);process.exitCode=1;});
