'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
test('statistics skin loads after shared materials and stays scoped to the career ledger',()=>{
  const html=read('index.html'),css=read('statistics-skin.css');
  assert(html.indexOf('statistics-skin.css')>html.indexOf('ui-system.css'));
  assert.equal((html.match(/statistics-skin\.css/g)||[]).length,1);
  assert(!css.includes('#match-dialog'));assert(!css.includes('.slot-card'));assert(!css.includes('@keyframes'));
  for(const token of ['--kui-copper','--kui-energy','--kalistar-display','prefers-reduced-motion','focus-visible'])assert(css.includes(token),token);
  assert(css.includes('assets/ui/collection-reader-grimoire-v1.webp'));
});
test('career controls preserve native filtering, accessible sorting, CSV and listener cleanup',()=>{
  const js=read('statistics.js');
  for(const contract of ['data-sheet-field="sort"','aria-sort=','data-sheet-row=','data-metric=','closeFilters(true)','controller?.abort()','reload:false','KalistarCardMedia.image(r.card,\'art\')'])assert(js.includes(contract),contract);
  assert(!/localStorage\.setItem|\.saveGame\(|\.importBackup\(/.test(js),'presentation does not write game or collection data');
});
