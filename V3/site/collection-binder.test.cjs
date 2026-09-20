'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const Binder=require('./collection-binder.js'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('./data.js'),'utf8'),sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA));
const owned=data.cards.map(c=>({id:'TEST-'+c.id,cardId:c.id,createdAt:'2026-09-15T00:00:00Z'}));
const getOwned=id=>owned.filter(c=>!id||c.cardId===id);
test('Character groups retain all 41 versions and both Momo artworks without mutation',()=>{
  const before=structuredClone(data.cards),groups=Binder.groupCards(data.cards);
  assert.equal(groups.length,40);assert.equal(groups.flat().length,41);
  assert.equal(groups.filter(g=>g.length>1).length,1);assert.equal(groups.find(g=>g.length>1)[0].characterId,'momo');
  assert.deepEqual(data.cards,before);
});
test('Story pagination preserves words and respects bounds without rewriting the story',()=>{
  for(const card of data.cards){const pages=Binder.textPages(card.text,210);assert.ok(pages.every(p=>p.length<=210));assert.equal(pages.join(' ').replace(/\s+/g,' '),card.text.trim().replace(/\s+/g,' '));}
  assert.deepEqual(Binder.textPages('',100),['']);assert.deepEqual(Binder.textPages('indivisible',3),['indivisible']);
});
test('Reading a full binder renders eight characters and leaves ownership, favourites and callbacks unchanged',()=>{
  const favorites=new Set([data.cards[0].id]),before=JSON.stringify(owned);let calls=0;
  const binder=Binder.create({data,getOwned,getFavorites:()=>favorites,onFavorite:()=>calls++});
  const html=binder.render();assert.equal((html.match(/data-character=/g)||[]).length,8);
  assert.equal((html.match(/class="cb-sheet"/g)||[]).length,2);assert.match(html,/cb-behind/);
  assert.match(html,/value="41" aria-label="Versions possédées"/);assert.match(html,/-full\.png/);
  assert.doesNotMatch(html,/data-action="(?:add|remove)"/);assert.equal(calls,0);assert.equal(JSON.stringify(owned),before);assert.equal(favorites.size,1);
});
test('Owned scope never includes another profile card; empty owners get activation and catalogue access',()=>{
  const empty=Binder.create({data,profile:'Tokyo'});assert.doesNotMatch(empty.render(),/data-character=/);assert.match(empty.render(),/première carte/);
  assert.match(empty.render(),/data-binder-action="registry"/);assert.match(empty.render(),/value="0" aria-label="Versions possédées"/);
  const single=Binder.create({data,getOwned:id=>!id||id===data.cards[0].id?[owned[0]]:[]});
  assert.equal((single.render().match(/data-character=/g)||[]).length,1);assert.doesNotMatch(single.render(),/cb-behind/);
});
test('A favourite second version becomes its character cover without hiding the first version',()=>{
  const momo=data.cards.filter(c=>c.characterId==='momo'),favorite=momo[1];
  const binder=Binder.create({data,getOwned,getFavorites:()=>new Set([favorite.id])});
  const html=binder.render(),pocket=html.slice(html.indexOf('data-character="momo"'),html.indexOf('</article>',html.indexOf('data-character="momo"')));
  assert.match(pocket,new RegExp('data-binder-action="open" data-id="'+favorite.id+'"'));assert.match(pocket,/cb-behind/);assert.match(pocket,/aria-pressed="true"/);
});
test('Labels are escaped and inspect returns detached filter state',()=>{
  const custom=structuredClone(data);custom.cards[0].name='<img src=x onerror=alert(1)>';
  const binder=Binder.create({data:custom,getOwned,profile:'"<Paris>'});const html=binder.render();assert.match(html,/&lt;img/);assert.match(html,/&quot;&lt;Paris&gt;/);assert.doesNotMatch(html,/<img src=x/);
  const state=binder.inspect();state.filters.search='changed';assert.equal(binder.inspect().filters.search,'');
});
