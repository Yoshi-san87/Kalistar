'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const catalogue=require('./weapons.js'),art=require('./weapon-art.js'),crop=require('./card-media.js').crop;
const source=fs.readFileSync(path.join(__dirname,'equipment-presentation.js'),'utf8');
const gear=[catalogue.weapons.find(w=>w.id==='fallen-king-axe'),catalogue.weapons.find(w=>w.id==='durane-rampart'),catalogue.weapons.find(w=>w.id==='little-joys-flute')];
function fixture({width=500,height=600,fit='contain',reduced=false}={}){
  const children=[],listeners=[],observers=[],image={offsetLeft:12,offsetTop:8,naturalWidth:797,naturalHeight:1388,css:{width:String(width),height:String(height),objectFit:fit},addEventListener:(...args)=>listeners.push(args)};
  const container={querySelector:()=>image,closest:()=>({addEventListener:(...args)=>listeners.push(args)}),append:n=>children.push(n)};
  const context={window:{KalistarWeapons:catalogue,KalistarWeaponArt:art,addEventListener(){}},KalistarCardMedia:{crop},matchMedia:()=>({matches:reduced,addEventListener(){}}),performance:{now:()=>1777},AbortController,getComputedStyle:n=>n.css,
    ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},document:{createElement:()=>({dataset:{},style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},remove(){this.removed=true;}})}};
  vm.runInNewContext(source,context);return {fx:context.window.KalistarEquipmentFX,children,listeners,observers,image,container};
}
function geometry(f){
  const width=Number(f.image.css.width),height=Number(f.image.css.height),scale=Math.min(width/crop.width,height/crop.height);
  for(const n of f.children.filter(n=>!n.removed)){
    const layout=f.fx.layouts[n.dataset.slot],expected={left:12+(width-crop.width*scale)/2+(layout.left-crop.left)*scale,top:8+(height-crop.height*scale)/2+(layout.top-crop.top)*scale,width:layout.width*scale,height:layout.height*scale};
    for(const [key,value]of Object.entries(expected))assert(Math.abs(parseFloat(n.style[key])-value)<1e-7,n.dataset.slot+' '+key);
  }
}
test('three-slot detail uses native asymmetrical glyphs, letterboxing and one shared radar epoch',()=>{
  const f=fixture();f.fx.mountDetail(f.container,gear.map(w=>({weapon:w,slot:w.slot,active:null})),{bonus:false});
  assert.equal(f.children.length,3);assert.deepEqual(f.children.map(n=>n.dataset.slot),['weapon','shield','relic']);geometry(f);
  assert.equal(new Set(f.children.map(n=>n.style['--eq-loop-delay'])).size,1);
  for(const n of f.children){assert(!n.innerHTML.includes('eq-tab'));assert.match(n['aria-label'],/equipement porte/);}
  assert.equal(f.fx.layouts.weapon.center.x,160);assert.equal(f.fx.layouts.shield.center.x,735);assert.equal(f.fx.layouts.shield.center.y,270.5);
  const render=require('../template-stable/elements-01/balmhyr/render.json'),nativeShield=render.before.find(n=>n.name==='Calque 46 copie 3').bounds;
  assert.equal(f.fx.layouts.shield.center.x,(nativeShield[0]+nativeShield[2])/2);assert.equal(f.fx.layouts.shield.center.y,(nativeShield[1]+nativeShield[3])/2);
  for(const [width,height]of [[159.4,277.6],[320,480],[412,1007],[900,530],[240,460]]){f.image.css.width=String(width);f.image.css.height=String(height);f.observers[0].fn();geometry(f);}
});
test('inactive arena equipment is omitted and old single-definition popup stays in its legacy position',()=>{
  const f=fixture();f.fx.mountDetail(f.container,[{weapon:gear[0],slot:'weapon',active:false},{weapon:gear[1],slot:'shield',active:true}],{bonus:true});
  assert.equal(f.children.length,1);assert.match(f.children[0]['aria-label'],/active, \+30 DEF/);assert(f.children[0].innerHTML.includes('eq-tab'));
  f.fx.mountDetail(f.container,catalogue.legacyWeapons[0]);assert(f.children[0].removed);assert.equal(f.children[1].dataset.slot,'relic');assert.equal(f.fx.layouts.relic,f.fx.native);geometry(f);
});
test('new detail cleanup cancels all three overlays and artwork is the real medallion cutout',()=>{
  const f=fixture();f.fx.mountDetail(f.container,gear.map(w=>({weapon:w,slot:w.slot,active:true})));f.fx.clearDetail();
  assert(f.children.every(n=>n.removed));assert(f.observers[0].disconnected);assert(f.listeners.every(([, ,options])=>options.signal.aborted));
  for(const w of catalogue.weapons){const url=f.fx.art(w);assert(url.endsWith('.webp'));assert(f.fx.markup(w).includes('src="'+url+'"'));assert(fs.existsSync(path.join(__dirname,url)));}
});
test('retained D6 radar shares delay without losing its center during impact and reduced motion remains quiet',()=>{
  const css=fs.readFileSync(path.join(__dirname,'elemental-roll.css'),'utf8'),equipmentCss=fs.readFileSync(path.join(__dirname,'weapons.css'),'utf8');
  assert.match(css,/\.ritual-result\[data-equipment-six\].*3\.6s linear var\(--eq-loop-delay,0ms\) infinite/);
  assert.match(equipmentCss,/\.eq-overlay\.is-active:is\(\[data-slot=weapon\],\[data-slot=shield\]\) \.eq-radar\{animation-direction:normal/);
  assert.match(equipmentCss,/prefers-reduced-motion:reduce/);assert.match(equipmentCss,/eq-mechanism :is\(\.eq-orbit,\.eq-radar\)\{animation:none!important/);
  const combat=fs.readFileSync(path.join(__dirname,'combat-effects.js'),'utf8');assert.match(combat,/!ward&&d\.formula\?\.equipmentProtection>0/);
});
