'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('./positions.js'),root=path.resolve(__dirname,'../..');
test('reserve heading decoration stays inside its target-owning archive function',()=>{
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  const start=app.indexOf('  function showArchive('),end=app.indexOf("  document.addEventListener('click',event=>{",start);
  const line="if(target!==null)$('#detail-dialog .dialog-head h2').insertAdjacentHTML";
  assert(start>0&&end>start);assert.equal(app.split(line).length,2);
  assert(app.indexOf(line)>start&&app.indexOf(line)<end);
});
test('five stable positions retain role labels without visible P codes',()=>{
  assert.equal(P.roles.length,5);assert(Object.isFrozen(P));
  for(let p=1;p<=5;p++){
    const html=P.markup(p);assert(html.includes('data-position-icon="'+p+'"'));assert(html.includes('role="img"'));assert(html.includes('aria-label="'+P.label(p)+'"'));
    assert(html.includes('p'+p+'-v1.webp'));assert(!/>P[1-5]</.test(html));assert(html.includes('alt="" aria-hidden="true"'));
  }
});
test('unknown values fail closed and compatible lists are pure and unique',()=>{
  for(const value of [null,undefined,true,false,0,6,1.2,'P1','01',{},'<script>'])assert.equal(P.markup(value),'');
  const original=[1,'1',3,5,6],before=JSON.stringify(original),html=P.list(original);
  assert.deepEqual([...html.matchAll(/data-position-icon="(\d)"/g)].map(m=>+m[1]),[1,3,5]);assert.equal(JSON.stringify(original),before);
  assert.equal(P.list(null),'');assert.equal(P.list([]),'');
});
test('native icon-only radio pickers preserve filter values and keyboard semantics',()=>{
  for(const selected of ['',1,5,'3']){
    const html=P.picker({name:'position',value:selected,attributes:'data-filter="position"'});
    assert.equal((html.match(/type="radio"/g)||[]).length,6);assert.equal((html.match(/ checked/g)||[]).length,1);
    assert(html.includes('value="'+selected+'" aria-label="'+(selected?P.label(selected):'Tous les postes')+'" checked'));
    assert.equal((html.match(/name="position"/g)||[]).length,6);assert.equal((html.match(/data-filter="position"/g)||[]).length,6);
    assert(!/>P[1-5]</.test(html));
  }
});
test('generated emblems are uniform transparent lossless assets with source provenance',()=>{
  const proof=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-10-12-position-identity/media-provenance.json')));
  assert.deepEqual(proof.assets.map(a=>a.position),[1,2,3,4,5]);
  for(const a of proof.assets){
    const bytes=fs.readFileSync(path.join(root,a.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);
    assert.equal(bytes.toString('ascii',12,16),'VP8L');const bits=bytes.readUInt32LE(21);
    assert.equal((bits&0x3fff)+1,128);assert.equal(((bits>>>14)&0x3fff)+1,128);assert(bits&0x10000000);
  }
});
test('positions render before consumers and preserve native data/engine ownership',()=>{
  const boot=fs.readFileSync(path.join(__dirname,'boot.js'),'utf8');for(const name of ['collection-binder.js','deck-builder.js','statistics.js','lineup-intro.js','app.js'])assert(boot.indexOf("'positions.js'")<boot.indexOf("'"+name+"'"));
  const source=fs.readFileSync(path.join(__dirname,'positions.js'),'utf8');assert(!/localStorage|indexedDB|setInterval|requestAnimationFrame|KalistarEngine/.test(source));
  const css=fs.readFileSync(path.join(__dirname,'positions.css'),'utf8');assert(css.includes('44px'));assert(css.includes('input:focus-visible'));assert(css.includes('prefers-reduced-motion'));
});
