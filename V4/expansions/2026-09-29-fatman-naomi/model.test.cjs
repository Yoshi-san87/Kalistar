'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json'),D=require('../../atelier/designer-core.cjs');
test('requested identities, positions, weapons and crystals',()=>{M.validateSet(set);for(const c of set.cards)M.validateProfile(M.profile(c,D),c);});
test('Fatman guard and Naomi support are correctly enabled',()=>{const [f,n]=set.cards.map(c=>M.profile(c,D));assert(f.canGuard);assert(!f.canHeal);assert(n.canHeal);assert(!n.canGuard);assert(n.atk.includes('mana'));assert(n.atk.includes('retry'));});
for(const [name,edit] of [
  ['attack maximum',s=>s.cards[0].atk[0]=211],['defense minimum',s=>s.cards[0].defense[0]=249],
  ['support attack maximum',s=>s.cards[1].atk[0]=181],['support attack minimum',s=>s.cards[1].atk[0]=149],
  ['Reraise outside support',s=>s.cards[0].atk[0]='revive'],['magic on special',s=>s.cards[1].magic=[5]],
  ['barrier outside dice',s=>s.cards[0].barriers=[7]],['duplicate mode',s=>s.cards[1].magic=[6,6]],
  ['less than three numeric attacks',s=>s.cards[1].atk[5]='mana'],['wrong crystal',s=>s.cards[0].element='GEO'],
  ['wrong faction',s=>s.cards[1].faction='MGS2'],['wrong position',s=>s.cards[0].positions=[1,2]]
])test('reject '+name,()=>{const s=structuredClone(set);edit(s);assert.throws(()=>M.validateSet(s));});
test('two cards fit a legal mixed ten-card deck',async()=>{await require('./build.cjs').game();});
test('previously published cards and reference files remain intact',()=>{require('./build.cjs').guard.assertExisting();});
