'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const S=require('./statistics.js'),T=require('./trophies.js');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const cards=freeze([
  {id:'30000001',characterId:'momo',name:'MOMO',title:'Original',element:'ELECTRO',faction:'Chroma'},
  {id:'30000002',characterId:'momo',name:'MOMO',title:'Variante',element:'ELECTRO',faction:'Chroma'},
  {id:'30000003',characterId:'taulio',name:'TAULIO',title:'Protecteur',element:'ELECTRO',faction:'Chroma'}
]);
const histories=freeze([
  {cardId:cards[0].id,uid:'a',side:0,winner:0,matchId:'old',finishedAt:'2026-10-11T00:00:00Z',participated:true,ratingVersion:1,rating:18,kills:2,holds:1,attack:300,defense:200,support:1,physical:1,trophies:['killer']},
  {cardId:cards[0].id,uid:'b',side:0,winner:1,matchId:'previous',finishedAt:'2026-10-11T00:00:00Z',participated:true,ratingVersion:2,rating:22,kills:1,holds:2,attack:400,defense:300,support:2,physical:2,guards:1,assists:2,cloversConsumedByRecipients:1,reraisesConsumedByRecipients:1,trophies:['blocker']},
  {cardId:cards[1].id,uid:'c',side:0,winner:0,matchId:'current',finishedAt:'2026-10-11T00:00:00Z',participated:true,ratingVersion:3,rating:26,kills:2,holds:2,attack:600,defense:500,valuedAttack:210,valuedDefense:120,support:3,physical:1,guards:2,assists:3,defensiveAssists:1,cloversConsumedByRecipients:2,reraisesConsumedByRecipients:1,trophies:['crystal','heart']}
]);
const matches=freeze(histories.map(row=>({id:row.matchId,updatedAt:row.finishedAt,finalized:true,state:{winner:row.winner},summary:{complete:true,partial:false,ratingVersion:row.ratingVersion,units:[row]}})));
const db=Object.freeze({instances:()=>[{}],matches:()=>matches,career:id=>({history:histories.filter(row=>row.cardId===id)})});
const col=(group,key)=>S.groups[group].find(c=>c.key===key);
test('accordion indicators reuse exact weighted career totals and historical tracking denominators',()=>{
  const row=S.rows({cards},db,S.defaults)[0];
  assert.equal(row.games,3);assert.equal(row.rating,66);assert.deepEqual(row.ratingVersions,{1:1,2:1,3:1});
  assert.equal(S.value(row,col('performance','rating'),'average'),22);
  assert.equal(S.value(row,col('performance','attack'),'total'),1300);
  assert.equal(S.value(row,col('performance','attack'),'average'),1300/3);
  assert.equal(S.value(row,col('performance','valuedAttack'),'average'),210);
  assert.equal(S.value(row,col('performance','assists'),'average'),2.5);
  assert.equal(S.value(row,col('support','defensiveAssists'),'average'),1);
  assert.equal(S.value(row,col('support','physical'),'total'),240);
  assert.equal(S.value(row,col('support','guards'),'total'),180);
  assert.equal(S.value(row,col('support','reraisesConsumedByRecipients'),'average'),1);
  assert.deepEqual(row.trophies,{crystal:1,killer:1,blocker:1,clover:0,heart:1});
  assert.match(S.metricTitle(row,col('performance','rating'),'average'),/1 indice 3, 1 indice 2, 1 indice 1/);
});
test('unknown historical and empty-career metrics remain unavailable, never fabricated zero contributions',()=>{
  const legacy=T.empty();T.add(legacy,histories[0],histories[0].trophies);
  for(const [group,key] of [['performance','valuedAttack'],['performance','valuedDefense'],['performance','assists'],['support','defensiveAssists'],['support','cloversConsumedByRecipients'],['support','reraisesConsumedByRecipients']]){
    assert.equal(S.value(legacy,col(group,key),'average'),null);assert.equal(S.value(legacy,col(group,key),'total'),null);
  }
  const empty=S.rows({cards},db,S.defaults)[1];
  assert.equal(S.value(empty,col('performance','kills'),'average'),null);
  assert.equal(S.value(empty,col('performance','kills'),'total'),0);
  assert.equal(S.value(empty,col('performance','winRate'),'total'),null);
  assert.deepEqual(empty.trophies,{crystal:0,killer:0,blocker:0,clover:0,heart:0});
});
test('all filters, table sorts and CSV modes preserve the frozen source histories and definitions',()=>{
  const before=JSON.stringify({cards,histories,matches,groups:S.groups});
  for(const grouping of ['character','version'])for(const scope of ['owned','all'])for(const mode of ['average','total'])for(const group of ['performance','support','trophies']){
    const state={...S.defaults,grouping,scope,mode,group};
    const rows=S.rows({cards},db,state),order=rows.map(r=>r.id);
    for(const sort of ['name',...S.groups[group].map(c=>c.key)])for(const direction of ['asc','desc']){
      const sorted=S.sorted(rows,{...state,sort,direction});
      assert.deepEqual(rows.map(r=>r.id),order);
      const csv=S.csv(sorted,state);assert(csv.startsWith('\uFEFF'));assert(csv.includes('Matchs indice 3'));assert(csv.includes('Matchs historiques'));
    }
  }
  assert.equal(S.rows({cards},db,{...S.defaults,query:'MOMO'}).length,1);
  assert.equal(S.rows({cards},db,{...S.defaults,minimum:5}).length,0);
  assert.equal(S.rows({cards},db,{...S.defaults,grouping:'version'}).length,3);
  assert.equal(JSON.stringify({cards,histories,matches,groups:S.groups}),before);
});
test('accordion stays presentation-only with native button, region, identity and teardown contracts',()=>{
  const source=fs.readFileSync(path.join(__dirname,'statistics.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'statistics-skin.css'),'utf8');
  for(const contract of ['aria-expanded=','aria-controls=','aria-labelledby=','role="region"','sheet-detail-row','rowKey(r)===expanded','state.grouping+\':\'+row.id','onDetail(id)','controller?.abort()','toggleAccordion(expanded,true)'])assert(source.includes(contract),contract);
  assert(!/\.saveGame\(|\.importBackup\(|localStorage\.setItem|indexedDB\.open/.test(source));
  assert(css.includes('width:100cqw'));assert(css.includes('.sheet-detail-row[hidden]'));
  assert(!/animation:|@keyframes/.test(css),'no continuous animation');
});
