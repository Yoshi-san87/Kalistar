'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){
  const classes=new Set(),nodes=[],listeners={},motion={matches:false,addEventListener(type,fn){listeners.motion=fn;}};
  let intro=false;
  const app={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
  const document={getElementById:()=>app,querySelector:()=>intro?{}:null,body:{append:n=>nodes.push(n)},createElement:()=>({setAttribute(){},append(){},addEventListener(type,fn){this.end=fn;},remove(){this.removed=true;}})};
  const window={addEventListener(type,fn){listeners[type]=fn;}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/page-transitions.js','utf8'),{window,document,matchMedia:()=>motion});
  return {api:window.KalistarPageTransitions,classes,nodes,listeners,motion,intro:()=>{intro=true;}};
}
test('page entry uses native deck media and ignores child animation end',()=>{
  const f=fixture();f.api.enter('decks');const n=f.nodes[0];
  assert(n.innerHTML.includes('assets/back.webp'));assert(f.classes.has('page-arriving'));
  n.end({target:{}});assert(!n.removed);n.end({target:n});assert(n.removed);assert(!f.classes.has('page-arriving'));
});
test('navigation replacement and pagehide remove transient elements',()=>{
  const f=fixture();f.api.enter('home');f.api.enter('collection');assert(f.nodes[0].removed);
  assert(f.nodes[1].innerHTML.includes('collection-v1.webp'));f.listeners.pagehide();assert(f.nodes[1].removed);assert(!f.classes.size);
});
test('reduced motion changes cancel entry and lineup is never covered',()=>{
  const f=fixture();f.api.enter('home');f.motion.matches=true;f.listeners.motion();assert(f.nodes[0].removed);
  f.api.enter('decks');assert.equal(f.nodes.length,1);f.motion.matches=false;f.intro();f.api.enter('arena');assert.equal(f.nodes.length,1);
});
