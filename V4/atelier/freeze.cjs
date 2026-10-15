const L = require('./lib.cjs');
const {fs,path,ROOT,DATA,read,write,hash,assert} = L;
(async()=>{
  const target=path.join(DATA,'references.json');
  if(fs.existsSync(target)) throw Error('References deja verrouillees. Aucun remplacement automatique.');
  const electro=read(path.join(ROOT,'V4/template-stable/current.json'));
  const others=read(path.join(ROOT,'V4/template-stable/current-elements.json'));
  const protectedFiles={},cards=[];
  const sources=new Set(['V4/template-stable/current.json','V4/template-stable/current-elements.json',electro.template,others.template,
    'V4/template-stable/registry-electro-03.json','V4/template-stable/registry-electro-03f.json',
    'V4/template-stable/registry-elements-04.json','V4/template-stable/registry-elements-05.json',
    'V4/scripts/stable/common.jsx','V4/scripts/stable/registered.jsx','V4/scripts/stable/elements-common.jsx']);
  for(const batch of ['elements-01','elements-02']) {
    const file=`V4/template-stable/${batch}/manifest.json`;sources.add(file);
    Object.keys(read(path.join(ROOT,file)).protectedFiles).forEach(p=>sources.add(p));
  }
  for(const item of [...electro.cards,...others.cards]) {
    const card=read(path.join(ROOT,item.profile)),reportPath=item.profile.replace(/card\.json$/,'render.json');
    const report=read(path.join(ROOT,reportPath));
    const layers=report.reopened;
    assert.ok(Array.isArray(layers),item.key+' native state');
    const names=new Set(layers.map(l=>l.name));
    const registry=structuredClone(report.registry||read(path.join(ROOT,'V4/template-stable/registry-electro-03.json')));
    registry.elements=[card.element];
    registry.banks=registry.banks.map(bank=>({field:bank.field,variants:Object.fromEntries(Object.entries(bank.variants).filter(([,a])=>a.every(n=>names.has(n))))}));
    registry.effectLayouts=(registry.effectLayouts||[]).filter(l=>names.has(l.layer));
    registry.effectSupports=(registry.effectSupports||[]).filter(s=>s.layers.every(n=>names.has(n)));
    for(const bank of registry.banks) assert.ok(bank.variants[card[bank.field]],item.key+' bank '+bank.field);
    const options={atk:[],defense:[]};
    for(const [side,prefix] of [['atk','ATK'],['defense','DEF']]) for(let i=0;i<6;i++) {
      const start=`${prefix} D${6-i} - effet `;
      options[side].push([...names].filter(n=>n.startsWith(start)).map(n=>n.slice(start.length)));
    }
    const png=`V4/cartes/${item.output}.png`,psd=`V4/templates/${item.output}.psd`;
    [item.profile,reportPath,png,psd].forEach(p=>sources.add(p));
    const artworkLayer=registry.banks.find(b=>b.field==='artwork').variants[card.artwork][0];
    cards.push({key:item.key,card,profile:item.profile,png,psd,registry,options,artworkLayer,
      fonts:[...new Set(layers.filter(l=>l.kind==='LayerKind.TEXT').map(l=>l.font))]});
  }
  for(const file of sources) protectedFiles[file]=await hash(path.join(ROOT,file));
  assert.equal(cards.length,26);
  const id=L.crypto.createHash('sha256').update(JSON.stringify(protectedFiles)).digest('hex');
  write(target,{schemaVersion:1,id,createdAt:new Date().toISOString(),mode:'approved-PSD-derivatives',cards,protectedFiles});
  console.log({lockedCards:cards.length,protectedFiles:sources.size,id});
})().catch(e=>{console.error(e);process.exitCode=1;});
