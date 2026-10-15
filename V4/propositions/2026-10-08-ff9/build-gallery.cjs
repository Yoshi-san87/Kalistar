const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { sharp } = require('../../atelier/lib.cjs');

const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups = {Heritiers:'Compagnons', Cour:'Cour et adversaires', Tantalas:'Tantalas'};

async function main() {
  const plan = read('prompts.json');
  const provenance = read('provenance.json');
  assert.equal(plan.items.length, 20);
  assert.equal(provenance.items.length, 20);
  assert.equal(new Set(plan.items.map(item => item.slug)).size, 20);
  assert.equal(new Set(plan.items.map(item => item.file)).size, 20);
  const selected = [];
  for (const item of plan.items) {
    const original = provenance.items.find(entry => entry.number === item.number);
    assert(original && original.file === item.file);
    const full = path.join(__dirname, item.file);
    const metadata = await sharp(full).metadata();
    assert(metadata.width > 700 && metadata.height > 900);
    assert(metadata.height > metadata.width);
    const hash = digest(full);
    if (original.sha256) assert.equal(hash, original.sha256);
    if (fs.existsSync(original.originalSource)) assert.equal(hash, digest(original.originalSource));
    else assert(original.sha256, 'Missing source and hash for ' + item.name);
    original.sha256 = hash;
    selected.push({...item, sha256:hash, width:metadata.width, height:metadata.height});
  }
  assert.equal(new Set(selected.map(item => item.sha256)).size, 20);
  const updates = {'04-dagga-01.png':'04-dagga-02.png','18-cina-01.png':'18-cina-02.png'};
  for (const item of selected) if (updates[item.file]) item.file = updates[item.file];
  const revision = require('../../revisions/2026-10-08-ff9-art-direction/plan.json');
  for (const [index, row] of revision.cards.filter(c=>c.artworkSource).entries()) {
    selected.push({...selected[1], number:21+index, name:index?'Vivi - Foudre':'Vivi - Glace', title:row.title, file:path.basename(row.artworkSource)});
  }
  for (const item of selected) {
    const full=path.join(__dirname,item.file),metadata=await sharp(full).metadata();
    item.sha256=digest(full);item.width=metadata.width;item.height=metadata.height;
  }

  const figures = selected.map(item => '<figure data-group="' + item.group + '">' +
    '<a class="art" href="' + item.file + '" target="_blank" rel="noopener" aria-label="' + escape(item.name + ', illustration originale') + '">' +
    '<img src="' + item.file + '" width="' + item.width + '" height="' + item.height + '" alt="' + escape(item.name + ' : ' + item.title) + '" loading="lazy"></a>' +
    '<figcaption><h2><span>' + String(item.number).padStart(2,'0') + '</span>' + escape(item.name) + '</h2>' +
    '<p>' + escape(item.title) + '</p></figcaption></figure>').join('\n');
  const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Kalistar | Final Fantasy IX</title><style>' +
    '*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:#111413;color:#f0ece4;font:15px/1.5 system-ui,sans-serif;letter-spacing:0}' +
    'header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:23px 28px;border-bottom:1px solid #45534b}' +
    'h1{margin:0;font:600 27px Georgia,serif}header p{margin:6px 0 0;color:#bbc9c1;font-size:13px}' +
    '.controls{display:flex;gap:12px;align-items:center}label{font-size:13px;color:#c8d3cc}' +
    'select{min-height:44px;max-width:100%;padding:8px 32px 8px 12px;color:#f0ece4;background:#202b25;border:1px solid #637669;border-radius:4px;font:inherit}' +
    'main{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:28px 18px;padding:26px 28px 40px}' +
    'figure{margin:0;min-width:0}figure[hidden]{display:none}.art{display:block;aspect-ratio:3/4;background:#080b09}' +
    'img{display:block;width:100%;height:100%;object-fit:contain}figcaption{padding-top:10px}' +
    'h2{margin:0;font:600 19px Georgia,serif;overflow-wrap:anywhere}h2 span{display:inline-block;margin-right:8px;color:#cba275;font:12px system-ui,sans-serif}' +
    'figcaption p{margin:5px 0 0;color:#bfc8c1;font:italic 13px/1.5 Georgia,serif;overflow-wrap:anywhere}' +
    'a:focus-visible,select:focus-visible{outline:2px solid #eac893;outline-offset:4px}' +
    'footer{padding:18px 28px;border-top:1px solid #45534b;font-size:13px}footer a{color:#b7daca;display:inline-flex;align-items:center;min-height:44px}' +
    '@media(max-width:1200px){main{grid-template-columns:repeat(4,minmax(0,1fr))}}' +
    '@media(max-width:850px){main{grid-template-columns:repeat(3,minmax(0,1fr));padding:20px 16px}}' +
    '@media(max-width:600px){header{align-items:flex-start;padding:18px 14px;flex-wrap:wrap;gap:16px}h1{font-size:23px}.controls{width:100%}select{flex:1;min-width:0}' +
    'main{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 12px;padding:18px 12px}h2{font-size:17px}footer{padding:16px 14px}}' +
    '@media(max-width:350px){main{grid-template-columns:minmax(0,1fr)}}' +
    '</style></head><body><header><div><h1>Kalistar / Final Fantasy IX</h1><p><span id="count" aria-live="polite">22 illustrations</span> &middot; Selection et nouvelles scenes</p></div>' +
    '<div class="controls"><label for="group">Personnages</label><select id="group"><option value="">Tous</option>' +
    Object.entries(groups).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('') +
    '</select></div></header><main>'+figures+'</main><footer><a href="ensemble-selection.jpg" target="_blank" rel="noopener">Vue d\'ensemble</a></footer><script>' +
    'document.getElementById("group").addEventListener("change",function(){let count=0;document.querySelectorAll("figure").forEach(figure=>{figure.hidden=!!this.value&&figure.dataset.group!==this.value;if(!figure.hidden)count++});document.getElementById("count").textContent=count+" illustrations"});' +
    '</script></body></html>';
  fs.writeFileSync(path.join(__dirname,'index.html'),html);
  assert.equal((html.match(/<figure /g)||[]).length,22);

  // These are derived contact sheets only; the generated originals are never rewritten.
  async function sheet(items, name) {
    const columns=5, cellW=304, artH=396, labelH=62, gap=14;
    const width=columns*(cellW+gap)+gap;
    const height=Math.ceil(items.length/columns)*(artH+labelH+gap)+gap;
    const layers=[];
    for(let i=0;i<items.length;i++) {
      const item=items[i], left=gap+(i%columns)*(cellW+gap), top=gap+Math.floor(i/columns)*(artH+labelH+gap);
      layers.push({input:await sharp(path.join(__dirname,item.file)).resize(cellW,artH,{fit:'contain',background:'#111413'}).png().toBuffer(),left,top});
      const label='<svg xmlns="http://www.w3.org/2000/svg" width="'+cellW+'" height="'+labelH+'"><text x="0" y="24" fill="#f0ece4" font-size="18" font-family="Georgia">'+escape(String(item.number).padStart(2,'0')+' '+item.name)+'</text><text x="0" y="46" fill="#bfc8c1" font-size="12" font-family="Arial">'+escape(item.title)+'</text></svg>';
      layers.push({input:Buffer.from(label),left,top:top+artH});
    }
    await sharp({create:{width,height,channels:3,background:'#111413'}}).composite(layers).jpeg({quality:92}).toFile(path.join(__dirname,name));
  }
  await sheet(selected,'ensemble-selection.jpg');
  const readme='# Kalistar x Final Fantasy IX\n\n' +
    '22 illustrations selectionnees pour les cartes FF9 : les vingt personnages proposes et deux scenes entierement nouvelles pour Vivi Glace et Foudre. Cina utilise la seconde illustration validee ; Dagga utilise la correction du sceptre accroche au sac.\n\n' +
    '- [Galerie locale](index.html)\n- [Planche actuelle](ensemble-selection.jpg)\n- [Cartes natives](../../expansions/2026-10-08-final-fantasy-ix/galerie.html)\n\n' +
    '## Direction artistique\n\n' +
    'Peinture narrative de la famille Momo / Valazar : touches visibles, matieres patinees, visage et geste lisibles, decors secondaires. Les personnages restent reconnaissables comme ceux de FFIX. Scenes, poses et palettes variees ; pas de conversion du style en photo, manga ou rendu 3D lisse.\n\n' +
    'Grenat et Dagga sont deux moments differents : princesse aux longs cheveux dans le palais, puis voyageuse aux cheveux courts sur la route. Les titres sont des propositions Kalistar, pas des citations du jeu.\n\n' +
    'Le nom demande \"Beast\" a ete interprete comme Beate (Beatrix), hypothese signalee avant generation. Vivi et Franck conservent l\'orthographe demandee ; les identites Bibi/Vivi et Frank/Blank sont documentees dans les prompts. Ruby est ici l\'actrice de FFIX, pas le personnage Kalistar homonyme. Garland est celui de FFIX, pas celui du premier Final Fantasy.\n\n' +
    '## Illustrations\n\n| N | Personnage | Titre propose |\n|---|---|---|\n' +
    selected.map(item=>'| '+item.number+' | ['+item.name+']('+item.file+') | '+item.title+' |').join('\n') +
    '\n\n## Tracabilite\n\n' +
    'Generation avec l\'outil integre image_gen : 20 generations individuelles. Les references Kalistar ont ete inspectees visuellement, puis leur direction artistique decrite dans chaque prompt ; elles n\'ont pas ete fournies comme images jointes a ces generations.\n\n' +
    '- [Prompts exacts et references](prompts.json)\n- [Sources et empreintes SHA-256](provenance.json)\n- [Verification des originaux](verification.json)\n- [Construction de la galerie](build-gallery.cjs)\n\n' +
    'Les PNG sont des copies binaires des sorties du generateur. Les premieres propositions et leurs preuves restent preservees. Les retouches sont documentees dans edits.json ; les nouvelles scenes et les races dans ../../revisions/2026-10-08-ff9-art-direction/. Les planches JPG sont uniquement des apercus derives.\n\n' +
    'Reproduire les apercus : node V4/propositions/2026-10-08-ff9/build-gallery.cjs\n\n' +
    '## References FFIX consultees\n\n' +
    plan.sources.map(source=>'- ['+source.title+']('+source.url+')').join('\n')+'\n';
  fs.writeFileSync(path.join(__dirname,'README.md'),readme);
  save('current-selection.json',{
    date:'2026-10-08',status:'passed',tool:plan.tool,
    checks:['22 selected images','All images decode at original portrait resolution','All gallery links reference present files','Original proposal PNG bytes unchanged','Initial provenance and verification retained'],
    illustrations:selected.map(({number,name,file,sha256,width,height})=>({number,name,file,sha256,width,height}))
  });
  console.log(JSON.stringify({status:'passed',count:selected.length,gallery:path.join(__dirname,'index.html')}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
