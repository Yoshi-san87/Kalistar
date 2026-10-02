'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./collaborations.js'),Binder=require('./collection-binder.js');
const cards=Array.from({length:25},(_,i)=>({id:String(49997000+i),characterId:'re-fixture-'+i,name:'FIXTURE',title:'Resident Evil',faction:'RE'+(i%9+1),collaboration:'RE'+(i%9+1),element:'NONE',race:'HUMAIN',weapon:'Pistolet',positions:[2]}));
test('all nine RE factions retain their identities and local asset routes',()=>{
  for(let i=1;i<=9;i++){
    const id='RE'+i,c={faction:id};
    assert.equal(C.universe(c),id);
    assert.equal(C.asset('factions',id),'assets/factions/'+id+'.png');
    assert(Binder.matchesScope(c,'resident-evil'));
    assert(!Binder.matchesScope(c,'metal-gear'));
    assert(!Binder.matchesScope(c,'kalistar'));
    assert(C.choices(cards).some(([key])=>key===id));
  }
  assert(!C.choices([]).some(([id])=>/^RE/.test(id)));
  for(const faction of ['RE0','RE10','Replicant','MGS1','FF7','Chroma'])assert(!Binder.matchesScope({faction},'resident-evil'));
  assert.equal(C.universe({faction:'RE2',collaboration:'RE4'}),'RE2');
});
test('one Resident Evil collection choice counts fixture versions dynamically',t=>{
  const previous=globalThis.KalistarCardMedia;
  globalThis.KalistarCardMedia={image:c=>'/fixture/'+c.id+'.png'};
  t.after(()=>{globalThis.KalistarCardMedia=previous;});
  for(const subset of [cards,cards.slice(0,3)]){
    const html=Binder.create({data:{cards:subset,elements:{}},getOwned:id=>subset.filter(c=>!id||c.id===id).map(c=>({id:'copy-'+c.id,cardId:c.id}))}).render();
    const header=html.match(/<div class="cb-scopes"[^>]*>([\s\S]*?)<\/div>/)[1];
    assert.equal((header.match(/value="resident-evil"/g)||[]).length,1);
    assert(header.includes('Resident Evil · '+subset.length));
    assert(!header.includes('value="re1"'));
  }
});
