'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json'),D=require('../../atelier/designer-core.cjs');
test('Drebin is a legal physical Support with guard and no healing',()=>{M.validateSet(set);const c=set.cards[0],p=M.profile(c,D);M.validateProfile(p,c);assert(p.canGuard);assert(!p.canHeal);assert.equal(p.role,5);assert.deepEqual(p.magic,[]);});
for(const [name,edit] of [
['ATK over Support maximum',c=>c.atk[0]=181],['ATK below Support minimum',c=>c.atk[0]=149],
['DEF over Support maximum',c=>c.defense[0]=211],['DEF below Support minimum',c=>c.defense[0]=174],
['too few numeric attacks',c=>{c.atk[0]='retry';c.atk[1]='retry';}],['instant death',c=>c.atk[3]='death'],
['unrequested healing',c=>c.atk[3]='revive'],['magic on a special',c=>c.magic=[3]],
['duplicate barriers',c=>c.barriers=[4,4]],['invalid barrier die',c=>c.barriers=[7]],
['wrong position',c=>c.positions=[4]],['wrong banner',c=>c.faction='MGS1']
])test('reject '+name,()=>{const s=structuredClone(set);edit(s.cards[0]);assert.throws(()=>M.validateSet(s));});
test('Drebin fits a playable deck',async()=>{await require('./build.cjs').game();});
test('existing publications and native sources are preserved',()=>{require('./build.cjs').guard.assertExisting();});
