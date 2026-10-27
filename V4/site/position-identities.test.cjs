'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('./statistics.js'),Binder=require('./collection-binder.js');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cards=freeze([
  {id:'49999001',characterId:'shared',name:'SHARED',title:'Support',element:'ELECTRO',faction:'Chroma',race:'HUMAIN',weapon:'Baton',positions:[3,5]},
  {id:'49999002',characterId:'shared',name:'SHARED',title:'Physical',element:'NONE',faction:'FF7',race:'HUMAIN',weapon:'Baton',positions:[1,2]},
  {id:'49999003',characterId:'empty',name:'EMPTY',title:'No games',element:'NONE',faction:'Chroma',race:'HUMAIN',weapon:'Baton',positions:[4]},
  {id:'49999004',characterId:'other',name:'OTHER',title:'Hybrid',element:'ELECTRO',faction:'FF7',race:'HUMAIN',weapon:'Baton',positions:[2,3]}
]);
const result=(card,values={})=>({cardId:card.id,uid:'unit-'+card.id,instanceId:'copy-'+card.id,side:0,winner:0,matchId:'match-'+card.id,finishedAt:'2026-10-11T00:00:00Z',participated:true,partial:false,ratingVersion:1,rating:10,kills:1,trophies:['killer'],...values});
const histories=freeze([
  result(cards[0],{matchId:'legacy',rating:18,kills:2}),
  result(cards[0],{matchId:'previous',ratingVersion:2,rating:24,kills:3,assists:2}),
  result(cards[1],{matchId:'current',ratingVersion:3,rating:30,kills:4,assists:3,defensiveAssists:1,valuedAttack:210,valuedDefense:120}),
  result(cards[3],{matchId:'other',ratingVersion:3,rating:16,kills:1}),
  result(cards[0],{matchId:'partial',partial:true,kills:999}),
  result(cards[0],{matchId:'reserve',participated:false,kills:999})
]);
const matches=freeze(histories.map(h=>({id:h.matchId,updatedAt:h.finishedAt,finalized:true,state:{winner:h.winner},summary:{complete:!h.partial,partial:h.partial,units:[h]}})));
const db={instances:id=>[{id:'copy-'+id}],matches:()=>matches,career:id=>({history:histories.filter(h=>h.cardId===id)})};
const data={cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFDD00'},NONE:{id:'NONE',label:'Sans cristal',color:'93AAA5'}}};
const col=key=>S.groups.performance.find(c=>c.key===key);

test('position compatibility filters versions before character grouping without counting hybrids twice',()=>{
  const all=S.rows(data,db,S.defaults),support=S.rows(data,db,{...S.defaults,position:'5'});
  assert.equal(all[0].games,3);assert.equal(all[0].kills,9);
  assert.deepEqual(support[0].versions.map(c=>c.id),[cards[0].id]);
  assert.equal(support[0].id,'shared');assert.equal(support[0].games,2);assert.equal(support[0].kills,5);
  assert.deepEqual(S.rows(data,db,{...S.defaults,position:'3'}).map(r=>r.id),['shared','other']);
  assert.deepEqual(S.rows(data,db,{...S.defaults,position:'2',grouping:'version'}).map(r=>r.id),[cards[1].id,cards[3].id]);
  assert.deepEqual(S.rows(data,db,{...S.defaults,position:'9'}),[]);
});

test('position combines with ownership, search, element, collaboration, period and minimum filters',()=>{
  assert.equal(S.rows(data,db,{...S.defaults,position:'2',collab:'FF7',query:'shared'})[0].kills,4);
  assert.equal(S.rows(data,db,{...S.defaults,position:'2',element:'ELECTRO'})[0].id,'other');
  assert.equal(S.rows(data,db,{...S.defaults,position:'5',collab:'FF7'}).length,0);
  assert.equal(S.rows(data,db,{...S.defaults,position:'4',minimum:1}).length,0);
  assert.equal(S.rows(data,db,{...S.defaults,position:'5',period:'30'},Date.parse('2027-01-01'))[0].games,0);
  const owned={...db,instances:id=>id===cards[1].id?[{}]:[]};
  assert.equal(S.rows(data,owned,{...S.defaults,position:'5'}).length,0);
  assert.equal(S.rows(data,owned,{...S.defaults,position:'5',scope:'all'})[0].games,2);
});

test('position filtering retains weighted historical ratings and unknown tracking denominators',()=>{
  const support=S.rows(data,db,{...S.defaults,position:'5'})[0],physical=S.rows(data,db,{...S.defaults,position:'1'})[0];
  assert.deepEqual(support.ratingVersions,{1:1,2:1,3:0});
  assert.equal(S.value(support,col('rating'),'average'),21);
  assert.equal(S.value(support,col('assists'),'average'),2);
  assert.equal(S.value(support,col('valuedAttack'),'total'),null);
  assert.equal(S.value(physical,col('valuedAttack'),'average'),210);
  assert.equal(S.value(physical,col('assists'),'average'),3);
});

test('filtered CSV, sort order and reset leave cards and all historical sources byte-equivalent',()=>{
  const before=JSON.stringify({data,histories,matches}),state={...S.defaults,position:'3',sort:'kills',mode:'total'};
  const rows=S.rows(data,db,state),sorted=S.sorted(rows,state);
  assert.deepEqual(sorted.map(r=>r.id),['shared','other']);
  const csv=S.csv(sorted,state);assert(csv.includes('"Support"'));assert(!csv.includes('"Physical"'));assert(!csv.includes('"No games"'));
  assert.equal(S.rows(data,db,{...S.defaults}).length,3);
  assert.equal(JSON.stringify({data,histories,matches}),before);
});

test('Collection and Stats restrict landscape phone layouts to coarse pointers, retaining narrow screens',()=>{
  for(const name of ['collection-binder.js','collection-binder.css','statistics.js','statistics.css','statistics-skin.css']){
    const source=fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\s/g,'');
    assert(source.includes('(max-width:699px)'),'narrow screens: '+name);
    assert(source.includes('(pointer:coarse)and(max-width:1100px)and(max-height:500px)'),'touch landscape: '+name);
    assert(!source.includes('(max-width:950px)and(max-height:500px)'),'no unqualified landscape: '+name);
    if(name==='collection-binder.css'){
      const css=fs.readFileSync(path.join(__dirname,name),'utf8');
      const gallery=css.match(/@media \(min-width:700px\) and \(max-height:500px\) \{([\s\S]*?)\n\}/)?.[1];
      assert(gallery?.includes('.cb-page[data-mode=book]'),'short viewport fits the gallery');
      assert(!/\.cb-page\s*\{|\.cb-reader|\.cb-mobile-panes/.test(gallery),'short desktop gallery does not opt the reader into a phone skin');
    }else assert(!source.includes('@media(min-width:700px)and(max-height:500px)'),'no short-only phone skin: '+name);
  }
});

test('collection uses the shared native position picker with stable string values',t=>{
  const P=require('./position-identities.fixture.cjs')(t),previous=globalThis.KalistarCardMedia,calls=[];
  globalThis.KalistarCardMedia={image:c=>'/fixture/'+c.id+'.png'};
  t.after(()=>{globalThis.KalistarCardMedia=previous;});
  globalThis.KalistarPositions={...P,picker:options=>{calls.push(options);return P.picker(options);}};
  const binder=Binder.create({data,getOwned:id=>cards.filter(c=>!id||id===c.id).map(c=>({id:'copy-'+c.id,cardId:c.id}))}),html=binder.render();
  assert.deepEqual(calls,[{name:'position',value:'',attributes:'data-binder-filter="position"'}]);
  assert.equal((html.match(/data-binder-filter="position"/g)||[]).length,6);
  assert.match(html,/class="position-picker/);assert.match(html,/type="radio"/);
  assert.equal(binder.inspect().filters.position,'');
  assert.equal((html.match(/>P[1-5]</g)||[]).length,0);
});

test('catalogue detail and career show only the current version compatibility, not archive indices',t=>{
  const P=require('./position-identities.fixture.cjs')(t),context={KalistarPositions:P,KalistarCardMedia:{image:c=>'/fixture/'+c.id+'.png'},window:{KALISTAR_DATA:data,KalistarPerformanceIndex:require('./performance-index.js')}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'catalogue.js'),'utf8'),context);
  const catalogue=context.window.KalistarCatalogue,strip=catalogue.versionStrip(cards[0].id);
  assert.equal((strip.match(/data-position-icon="3"/g)||[]).length,1);
  assert.equal((strip.match(/data-position-icon="5"/g)||[]).length,1);
  assert.equal((strip.match(/data-position-icon="1"/g)||[]).length,1);
  assert.equal((strip.match(/data-position-icon="2"/g)||[]).length,1);
  const career=catalogue.career(cards[0].id,{instances:()=>[],career:()=>({games:1,wins:1,history:[{...histories[0],seed:'fixture',kills:1,holds:1,position:2,round:5}]})});
  assert.match(career,/data-position-icon="3"/);assert.match(career,/data-position-icon="5"/);
  assert(!career.includes('data-position-icon="2"'),'a historical round or reserve index never becomes compatibility metadata');
  assert(!/>P[1-5]</.test(strip+career));
});
