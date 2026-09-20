const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
const cards=read('V3/donnees/cartes.json');
const old=read('V2/donnees/cartes.json');
const registry=read('V3/donnees/registre_personnages.json');
const elements=read('V3/donnees/elements.json');
const arenas=read('V3/donnees/arenes.json');
const decks=read('V3/donnees/decks_demo.json');
const rules=read('V3/donnees/regles_demo.json');
const weapons=read('V2/donnees/armes.json');
const sources=read('V3/sources/sources-extraites.json');
const normalized=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const cardById=new Map(cards.map(c=>[c.id,c]));

test('41 consecutive V3 IDs, 40 identities, 15 V2 identities preserved, Momo alone twice',()=>{
  assert.equal(cards.length,41);
  assert.equal(registry.characters.length,40);
  assert.deepEqual(cards.map(c=>c.id),Array.from({length:41},(_,i)=>String(30000001+i)));
  for(const key of ['id','slug','art']) assert.equal(new Set(cards.map(c=>c[key])).size,41,key);
  const groups=Map.groupBy(cards,c=>c.characterId);
  assert.equal(groups.size,40);
  assert.deepEqual([...groups].filter(([,v])=>v.length>1).map(([id,v])=>[id,v.length]),[['momo',2]]);
  const originals=new Set(old.map(c=>normalized(c.name)));
  assert.equal(originals.size,15);
  for(const name of originals) assert.ok(groups.has(name),name);
  assert.equal(cards.filter(c=>c.previous_id!==null).length,16);
  assert.equal(cards.filter(c=>c.previous_id===null).length,25);
  assert.equal(cards.filter(c=>c.replaces_v2_id!==null).length,4);
  assert.deepEqual(cards.filter(c=>c.replaces_v2_id).map(c=>c.replaces_v2_id),['00000015','00000016','00000017','00000020']);
  assert.ok(!cards.some(c=>/chaos/i.test(c.name+' '+c.characterId+' '+c.element)));
});

test('V2-shaped profiles, required narrative metadata and local V3 destinations',()=>{
  for(const c of cards) {
    for(const k of ['name','race','faction','job','title','source','story_scene','prompt']) assert.ok(typeof c[k]==='string'&&c[k].length>0,`${c.id} ${k}`);
    assert.match(c.characterId,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(c.characterId,normalized(c.name));
    assert.ok(Number.isInteger(c.role)&&c.role>=1&&c.role<=5);
    for(const key of ['sentry','canGuard','canHeal']) assert.equal(typeof c[key],'boolean');
    assert.ok(c.positions.includes(c.role));
    assert.equal(new Set(c.positions).size,c.positions.length);
    for(const p of c.positions) assert.ok(Number.isInteger(p)&&p>=1&&p<=5);
    assert.equal(c.art,`V3/assets/illustrations/${c.slug}.png`);
    assert.equal(c.weapon,Object.keys(weapons)[c.weapon_index]);
    assert.equal(c.color,elements[c.element].color);
    assert.equal(c.hue,elements[c.element].hue);
    assert.match(c.prompt,/deux bras/i);
    if(c.characterId==='ruby')assert.match(c.prompt,/queue de sirene/);
    else assert.match(c.prompt,/deux jambes/i);
  }
  assert.equal(new Set(cards.map(c=>c.weapon_index)).size,20,'all original weapon categories represented');
});

test('Every numeric face lies in the corrected Capacite base role interval',()=>{
  const rows=sources.workbooks[0].sheets['Capacit\u00e9 base'];
  const cells=new Map(rows.flat().map(c=>[c.cell,c.value]));
  const cols={atk:{min:['R','S','T','U','V','W'],max:['D','E','F','G','H','I']},defense:{min:['Y','Z','AA','AB','AC','AD'],max:['K','L','M','N','O','P']}};
  const effects={atk:new Set(['guard','revive','retry','mana','buff_atk','death']),defense:new Set(['retry','dodge'])};
  assert.equal(cells.get('L4'),50);
  assert.equal(cells.get('L6'),50);
  for(const c of cards) for(const stat of ['atk','defense']) {
    assert.equal(c[stat].length,6,`${c.id} ${stat}`);
    c[stat].forEach((value,i)=>{
      if(typeof value==='number') {
        const row=c.role+2;
        const lo=cells.get(cols[stat].min[i]+row);
        let hi=cells.get(cols[stat].max[i]+row);
        if(stat==='defense'&&i===1&&[2,4].includes(c.role)) hi=150;
        assert.ok(Number.isInteger(value)&&value>=lo&&value<=hi,`${c.name} P${c.role} ${stat} die ${6-i}: ${value} outside ${lo}..${hi}`);
      } else assert.ok(effects[stat].has(value),`${c.id} invalid ${stat} ${value}`);
    });
    assert.ok(c[stat].filter(Number.isFinite).length>=3);
  }
  assert.deepEqual(cards.reduce((o,c)=>(o[c.role]=(o[c.role]||0)+1,o),{}),{1:8,2:8,3:8,4:9,5:8});
});

test('Guard only ATK P1/some P5, Reraise only canHeal P5, no DEF shield',()=>{
  for(const c of cards) {
    assert.equal(c.atk.includes('guard'),c.canGuard,c.name);
    assert.equal(c.atk.includes('revive'),c.canHeal,c.name);
    if(c.canGuard) assert.ok([1,5].includes(c.role));
    if(c.role===1) assert.ok(c.canGuard);
    if(c.canHeal) assert.equal(c.role,5);
    assert.ok(!c.defense.some(v=>['guard','shield_physical','shield_magic','revive'].includes(v)));
  }
  assert.ok(cards.some(c=>c.role===5&&c.canGuard));
  assert.ok(cards.some(c=>c.role===5&&!c.canGuard));
  assert.equal(rules.guard.trait,'ward');
  assert.equal(rules.guard.value,60);
  assert.equal(rules.guard.persistAcrossDuelRerolls,true);
  assert.equal(rules.guard.deathBypasses,true);
  assert.deepEqual(rules.guard.nonConsumingResults,['magic','dodge','death']);
  assert.equal(rules.reraise.returnFromGraveyard,false);
});

test('NONE is entirely physical, canonical scene constraints and explicit V2 elemental exception',()=>{
  for(const c of cards) {
    assert.equal(c.sentry,c.element!=='NONE');
    for(const [flag,stat] of [['magic','atk'],['barriers','defense']]) {
      assert.equal(new Set(c[flag]).size,c[flag].length);
      for(const die of c[flag]) {
        assert.ok(Number.isInteger(die)&&die>=1&&die<=6);
        assert.equal(typeof c[stat][6-die],'number');
      }
    }
    if(c.element==='NONE') {
      assert.deepEqual(c.magic,[]); assert.deepEqual(c.barriers,[]);
      assert.equal(c.advantage,0); assert.equal(c.disadvantage,0);
      assert.ok(!c.atk.some(v=>['mana','revive'].includes(v)));
    }
  }
  for(const name of ['LANIO','MALABA','GEN']) assert.equal(cards.find(c=>c.name===name).element,'NONE');
  const kaylis=cards.find(c=>c.name==='KAYLIS');
  assert.equal(kaylis.element,'RAINBOW');
  assert.match(kaylis.story_scene,/Rainbow incandescents/);
  assert.match(kaylis.prompt,/indienne et antillaise/);
  assert.match(kaylis.prompt,/tenue|Tenue/);
  const gen=cards.find(c=>c.name==='GEN');
  assert.match(gen.prompt,/gauche/i); assert.match(gen.prompt,/meche verte/);
  const lanio=cards.find(c=>c.name==='LANIO');
  assert.equal(lanio.race,'HUMAIN'); assert.match(lanio.prompt,/BLONDS/);
  const taulio=cards.find(c=>c.name==='TAULIO');
  assert.equal(taulio.advantage,40); assert.equal(taulio.disadvantage,20);
});

test('13 element definitions retain V2 cycles; NONE and matchup metadata are explicit',()=>{
  const e2=read('V2/donnees/elements.json');
  assert.equal(Object.keys(elements).length,13);
  for(const [id,e] of Object.entries(e2)) assert.deepEqual(elements[id],e,id);
  assert.deepEqual(elements.NONE,{id:'NONE',label:'SANS CRISTAL',strong_against:null,weak_against:null,color:'93AAA5',hue:160});
  const m=rules.crystalMatchups;
  assert.deepEqual([m.classicAgainstNone,m.rainbowAgainstNone,m.noneAgainstCrystal,m.rainbowAgainstClassic,m.classicAgainstRainbow],[20,30,0,40,-40]);
});

test('Both extracted red/green weapon sheets exactly match the unchanged 20x20 V2 matrix',()=>{
  const names=Object.keys(weapons);
  const col=i=>i<26?String.fromCharCode(65+i):String.fromCharCode(64+Math.floor(i/26))+String.fromCharCode(65+i%26);
  for(const workbook of sources.workbooks) for(const sheet of ['Armes','Armes V2']) {
    const map=new Map(workbook.sheets[sheet].flat().map(c=>[c.cell,c]));
    names.forEach((name,r)=>names.forEach((opponent,c)=>{
      const cell=map.get(col(c+13)+(r+3));
      assert.ok(cell,`${sheet} ${r} ${c}`);
      const fill=cell.fill.match(/rgb='([A-F0-9]+)'/)?.[1];
      const value=cell.value==='X'?0:Number(cell.value);
      assert.ok([0,50].includes(value));
      if(value===50) assert.ok(['FFE6B8AF','FFB6D7A8'].includes(fill),cell.cell);
      const expected=value===0?0:fill==='FFE6B8AF'?-50:50;
      assert.equal(weapons[name][opponent],expected,`${sheet} ${cell.cell} ${name}/${opponent}`);
    }));
  }
  assert.deepEqual(read('V3/donnees/armes.json'),weapons);
});

test('Five ten-card decks obey limits, permit a full formation and cover all 41 cards',()=>{
  const all=[decks.player,decks.enemy,...decks.presets.map(p=>p.cards)];
  for(const ids of all) {
    assert.equal(ids.length,10);
    assert.ok(ids.every(id=>cardById.has(id)));
    for(const value of new Set(ids)) assert.ok(ids.filter(id=>id===value).length<=2);
    assert.ok(ids.filter(id=>cardById.get(id).element==='RAINBOW').length<=1);
    const place=(slot,used)=>{
      if(slot===6)return true;
      return ids.some((id,i)=>!used.has(i)&&cardById.get(id).positions.includes(slot)&&place(slot+1,new Set([...used,i])));
    };
    assert.ok(place(1,new Set()),ids.join(','));
  }
  assert.equal(new Set(all.flat()).size,41);
  assert.equal(rules.storage.namespace,'kalistar.v3.');
  assert.equal(rules.storage.database,'kalistar-v3-cards');
  assert.equal(rules.schema,6);
});

test('16 arenas, one per crystal, neutral NONE, capped bonuses and real character IDs',()=>{
  assert.equal(arenas.length,16);
  assert.equal(new Set(arenas.map(a=>a.id)).size,16);
  assert.deepEqual(arenas.filter(a=>a.element).map(a=>a.element).sort(),Object.keys(elements).filter(e=>e!=='NONE').sort());
  const characterIds=new Set(cards.map(c=>c.characterId));
  for(const a of arenas) {
    for(const key of ['id','name','subtitle','image','source','prompt','story_scene']) assert.ok(typeof a[key]==='string'&&a[key].length>0);
    assert.equal(a.image,`assets/arenas/${a.id}.webp`);
    assert.ok(a.element===null || (elements[a.element]&&a.element!=='NONE'));
    assert.equal(a.elementBonus,a.element?15:0);
    assert.ok(a.homeCharacters.every(id=>characterIds.has(id)));
    assert.equal(new Set(a.homeCharacters).size,a.homeCharacters.length);
    for(const c of cards) {
      const local=a.homeCharacters.includes(c.characterId);
      const attack=(a.element&&a.element===c.element?a.elementBonus:0)+(local?a.homeAttack:0);
      const defense=local?a.homeDefense:0;
      assert.ok(attack<=25&&defense<=10);
    }
  }
  const neutral=arenas.find(a=>a.id==='ruins');
  assert.deepEqual(neutral.homeCharacters,[]);
  assert.equal(neutral.elementBonus+neutral.homeAttack+neutral.homeDefense,0);
  for(const id of ['z13','trone-fer','astraball']) assert.equal(arenas.find(a=>a.id===id).element,null);
  assert.ok(arenas.find(a=>a.id==='electro').homeCharacters.includes('momo'));
});

test('Every arena production prompt has an exact targeted history source or explicit invention',()=>{
  const history=fs.readFileSync(path.join(root,'V3/sources/histoire.txt'),'utf8').split(/\r?\n/);
  for(const a of arenas) {
    assert.match(a.prompt,/16:9/);
    assert.match(a.prompt,/sans personnage/);
    const ref=a.source_history;
    assert.ok(ref.section.length>15);
    if(a.id==='ruins') {
      assert.equal(a.narrative_status,'invention'); assert.equal(ref.file,null);
    } else {
      assert.equal(ref.file,'V3/sources/histoire.txt');
      assert.ok(ref.lineStart>0&&ref.lineEnd>=ref.lineStart);
      assert.ok(history[ref.lineStart-1].includes(ref.anchor));
      assert.ok(sources.stories.some(s=>s.file===ref.docx),ref.docx);
    }
  }
});

test('Production manifest tracks 13 original copies, 12 targeted redraws and 16 new images',()=>{
  const assignments=registry.imageAssignments;
  assert.equal(assignments.length,41);
  assert.deepEqual(assignments.reduce((a,x)=>(a[x.action]=(a[x.action]||0)+1,a),{}),{copy:13,redraw:12,generate:16});
  for(const assignment of assignments) {
    const c=cardById.get(assignment.id);
    assert.equal(c.art,assignment.art); assert.equal(c.prompt,assignment.prompt);
    assert.equal(c.slug,assignment.slug); assert.equal(c.source_art,assignment.source_art);
    if(assignment.action==='copy') {
      assert.ok(fs.existsSync(assignment.source_art),assignment.source_art);
      assert.ok(assignment.source_art.replace(/\\/g,'/').includes('/V2/assets/illustrations/'));
    } else assert.equal(assignment.source_art,null);
  }
  assert.deepEqual(cards.filter(c=>c.art_action==='redraw').map(c=>c.name),['JULIENNE','BALMHYR','KAYLIS','NERIS','GEN','KOGNUS','REEVUS','XIAOMI','JELLY-JOE','CAPITAINE SKULLY','ELENION','RUBY']);
  for(const character of registry.characters) {
    assert.deepEqual(character.cardIds,cards.filter(c=>c.characterId===character.characterId).map(c=>c.id));
    assert.deepEqual(character.homeArenas,arenas.filter(a=>a.homeCharacters.includes(character.characterId)).map(a=>a.id));
  }
});

test('Generation is deterministic and --check has no write side effects',()=>{
  const script=fs.readFileSync(path.join(__dirname,'build_repertoire.cjs'),'utf8');
  const readonlyFs={...fs,writeFileSync:()=>assert.fail('check attempted a write')};
  vm.runInNewContext(script,{require:name=>name==='node:fs'?readonlyFs:require(name),__dirname,process:{argv:['node','build_repertoire.cjs','--check']},structuredClone,console:{log(){}}});
});
