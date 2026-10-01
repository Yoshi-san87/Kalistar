'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json');
test('11 requested One Piece profiles and shared Chopper identity',()=>M.validateSet(set));
test('reject request drift, bad values, illegal effects and overlong descriptions',()=>{
 for(const mutate of [
  s=>s.cards[6].characterId='chopper-heavy-op',s=>s.cards[0].id=s.cards[1].id,
  s=>s.cards[0].atk[0]=301,s=>s.cards[0].magic=[4],s=>s.cards[1].atk[3]=130,
  s=>s.cards[1].defense[3]=80,s=>s.cards[2].role=3,s=>s.cards[5].weapon='Orbe',
  s=>s.cards[5].atk[3]='retry',s=>s.cards[9].atk[3]='revive',s=>s.cards[10].race='HUMAIN',
  s=>s.cards[0].description='x'.repeat(181),s=>s.cards[0].description='x'.repeat(169),
  s=>s.cards[2].magic=[1],s=>s.cards[2].atk[5]='guard'
 ]){const copy=structuredClone(set);mutate(copy);assert.throws(()=>M.validateSet(copy));}
});
test('portable real engine validates pure One Piece deck and duplicate Chopper rejection',()=>{
 const data={version:4,edition:'V4',cards:set.cards.map(c=>({...c,edition:'V4',sentry:c.element!=='NONE',canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive')})),
  elements:require('../../../V3/donnees/elements.json'),weapons:require('../../../V3/donnees/armes.json'),rules:require('../../../V3/donnees/regles.json'),demo:require('../../../V3/donnees/regles_demo.json')};
 assert.deepEqual(M.validateGame(data,set,require('../../site/engine.js').createEngine).coverage,{1:3,2:3,3:4,4:2,5:2});
});
test('French print text retains accents and requested full names',()=>{
 const by=k=>set.cards.find(c=>c.key===k);
 assert.equal(by('luffy').name,'MONKEY D. LUFFY');assert.equal(by('zoro').name,'RORONOA ZORO');
 assert.equal(by('robin').job,'ARCH\u00c9OLOGUE');assert.equal(by('chopper-small').job,'M\u00c9DECIN');
 assert(set.cards.every(c=>/[\u00c0-\u00ff]/.test(c.description)));
});
