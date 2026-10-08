'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const weapons=require('./weapons.js').weapons,crop={left:50,top:50,width:797,height:1388};
const collectible=require('./weapon-cards.js');

test('bearer thumbnail occupies the lower-left illustration corner without covering the bonus',()=>{
  const {layout}=collectible,{holder,art,bonus,medallion}=layout.zones;
  assert.equal(layout.version,3);
  assert.deepEqual(holder,[90,746,131,204]);
  assert(holder[0]>=art[0]&&holder[0]+holder[2]<bonus[0]);
  assert(holder[1]>art[1]+art[3]/2);
  assert(holder[1]+holder[3]<layout.crop.y+layout.crop.height);
  assert.deepEqual(medallion,[32.5,62.92,275,275],'weapon medallion is untouched');
});

test('bearer names use the full right-hand band centered under its text panels',()=>{
  const {bearers,lore,holder}=collectible.layout.zones;
  assert.equal(bearers[0],lore[0]);
  assert.equal(bearers[2],lore[2]);
  assert(bearers[2]>350);
  assert(holder[0]+holder[2]<bearers[0]);
  for(const weapon of weapons){
    const html=collectible.markup(weapon);
    assert(html.includes('class="wc-bearers" style="'+collectible.zone('bearers')+'"'));
    assert(html.includes('class="wc-holder is-empty" style="'+collectible.zone('holder')+'"'));
    assert(!html.includes('undefined'));
  }
});
function fixture({width=500,height=600,objectFit='contain',cropped=true}={}){
  const listeners=[],observers=[],children=[];
  const image={offsetLeft:12,offsetTop:8,naturalWidth:cropped?797:897,naturalHeight:cropped?1388:1497,css:{width:String(width),height:String(height),objectFit},addEventListener:(...args)=>listeners.push(args)};
  const dialog={addEventListener:(...args)=>listeners.push(args)},container={querySelector:()=>image,closest:()=>dialog,append:node=>children.push(node)};
  const window={KalistarWeapons:{weapons},KalistarWeaponArt:require('./weapon-art.js'),addEventListener(){}};
  const context={window,KalistarCardMedia:{crop},matchMedia:()=>({matches:false,addEventListener(){}}),performance:{now:()=>1000},AbortController,getComputedStyle:img=>img.css,
    ResizeObserver:class{constructor(fn){this.fn=fn;this.targets=[];observers.push(this);}observe(node){this.targets.push(node);}disconnect(){this.disconnected=true;}},
    document:{createElement:()=>({style:{setProperty(key,value){this[key]=value;}},dataset:{},setAttribute(key,value){this[key]=value;},remove(){this.removed=true;}})}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'equipment-presentation.js'),'utf8'),context);
  return {fx:window.KalistarEquipmentFX,image,container,listeners,observers,children};
}
function assertGeometry(f,width,height){
  const overlay=f.children.at(-1),n=f.fx.native,scale=Math.min(width/crop.width,height/crop.height);
  const expected={left:12+(width-crop.width*scale)/2+(n.left-crop.left)*scale,top:8+(height-crop.height*scale)/2+(n.top-crop.top)*scale,width:n.width*scale,height:n.height*scale};
  for(const [key,value] of Object.entries(expected))assert(Math.abs(parseFloat(overlay.style[key])-value)<1e-8,key);
}
test('inspection anchors to drawn card through letterboxing, late crop and live resize',()=>{
  const f=fixture({cropped:false});f.fx.mountDetail(f.container,weapons[0]);
  assert.equal(f.children[0].style.visibility,'hidden','uncropped native image must not show a misplaced overlay');
  f.image.naturalWidth=797;f.image.naturalHeight=1388;f.listeners.find(([type])=>type==='load')[1]();
  assert.equal(f.children[0].style.visibility,'visible');assertGeometry(f,500,600);
  f.image.css.width='220';f.image.css.height='460';f.observers[0].fn();assertGeometry(f,220,460);
  assert.equal(f.observers[0].targets.length,2,'image and its container are observed');
});
test('normal proportional card geometry is unchanged and deck inspection has no active bonus plate',()=>{
  const f=fixture({width:159.4,height:277.6,objectFit:'fill'});f.fx.mountDetail(f.container,weapons[1],{bonus:false});
  assertGeometry(f,159.4,277.6);assert(!f.children[0].innerHTML.includes('eq-tab'));
  assert.equal(f.children[0].dataset.weaponId,weapons[1].id);assert.match(f.children[0]['aria-label'],/equipement porte/);
  assert.match(f.children[0].className,/is-active/,'CSS revolving ring is shared, with no extra JS timer');
});
test('closing, replacing, clearing and navigation disconnect inspection observers and listeners',()=>{
  const f=fixture();f.fx.mountDetail(f.container,weapons[0]);
  const first=f.children[0],close=f.listeners.find(([type])=>type==='close');close[1]();
  assert(first.removed);assert(f.observers[0].disconnected);assert(close[2].signal.aborted);
  f.fx.mountDetail(f.container,weapons[0]);f.fx.mountDetail(f.container,weapons[1]);
  assert(f.children[1].removed);assert(f.observers[1].disconnected);
  f.fx.mount({phase:'over'},null);assert(f.children[2].removed);assert(f.observers[2].disconnected);
  assert(f.listeners.every(([, ,options])=>options.signal.aborted));
  f.fx.mountDetail(f.container,null);assert.equal(f.children.length,3,'inactive or absent weapons create no DOM overlay');
});

test('each weapon uses its own painted ring and keeps that skin in enlarged inspection',()=>{
  const art=require('./weapon-art.js'),f=fixture();
  for(const w of weapons.filter(w=>art.get(w))){
    const skin=art.get(w);f.fx.mountDetail(f.container,w);
    const html=f.children.at(-1).innerHTML;
    assert(html.includes(skin.rim));assert(html.includes(skin.body));assert(html.includes('--eq-accent:'+skin.color));
    assertGeometry(f,500,600);
  }
  f.fx.clearDetail();
});
