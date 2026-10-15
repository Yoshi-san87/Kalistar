'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'arena-prompts.css'),'utf8');
const code=app.slice(app.indexOf('function arenaCardPrompt('),app.indexOf('function board('));
function fixture(){const c=vm.createContext({game:{phase:'choose',turn:0,mode:'local'},ui:{attacker:null,target:null},rolling:false,presentationOpening:false,E:{equipmentChoice:()=>null}});vm.runInContext(code,c);return c;}
test('both teams invite selection, then only the missing choice breathes',()=>{
  for(const turn of [0,1]){const c=fixture();c.game.turn=turn;const before=JSON.stringify(c.game);
    assert.equal(c.arenaCardPrompt(turn,{}),'attacker');assert.equal(c.arenaCardPrompt(1-turn,{}),'target');
    c.ui.attacker=0;assert.equal(c.arenaCardPrompt(turn,{}),'');assert.equal(c.arenaCardPrompt(1-turn,{}),'target');
    c.ui.target=0;assert.equal(c.arenaCardPrompt(1-turn,{}),'');assert.equal(c.arenaCardPrompt(turn,null),'');
    assert.equal(JSON.stringify(c.game),before);
  }
});
test('AI choices, busy states and passive cards never invite a gameplay click',()=>{
  const c=fixture();c.game.mode='ai';c.game.turn=1;
  for(const side of [0,1])assert.equal(c.arenaCardPrompt(side,{}),'');
  c.game.mode='local';for(const key of ['rolling','presentationOpening']){c[key]=true;assert.equal(c.arenaCardPrompt(0,{}, {beneficiary:true,compatible:true}),'');c[key]=false;}
  for(const phase of ['initiative','attack','defense','result','over']){c.game.phase=phase;assert.equal(c.arenaCardPrompt(0,{}),'');}
});
test('only existing eligible support recipients and placements invite selection',()=>{
  const c=fixture();c.game.phase='guard';assert.equal(c.arenaCardPrompt(0,{}, {beneficiary:true}),'support');assert.equal(c.arenaCardPrompt(1,{}),'');
  c.game.phase='replace';assert.equal(c.arenaCardPrompt(0,null,{compatible:true}),'placement');assert.equal(c.arenaCardPrompt(0,null),'');
});

test('a pending ultimate suppresses normal selection and deployment prompts',()=>{
  const c=fixture();c.E.equipmentChoice=()=>({type:'ultimate',sourceUid:'0-0'});
  for(const phase of ['choose','attack','replace','result']){
    c.game.phase=phase;
    assert.equal(c.arenaCardPrompt(0,{}, {compatible:true}),'');
    assert.equal(c.arenaCardPrompt(1,{}, {beneficiary:true}),'support');
  }
});
test('cues use existing geometry, composited motion, modal/busy guards and Reduced Motion',()=>{
  assert(app.includes('data-arena-prompt="${prompt}"'));assert(app.includes('class="arena-action-cue" aria-hidden="true"'));
  assert(css.includes('pointer-events:none'));assert(css.includes(':not(:disabled):not(.is-casting)'));assert(css.includes(':not(.lineup-opening):not(:has(dialog[open]))'));
  assert(css.includes('#app:not(.rolling)'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));
  const keyframes=css.slice(css.indexOf('@keyframes'),css.indexOf('@media'));assert(!/\b(?:box-shadow|filter|width|height|top|left):/.test(keyframes));
  assert(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').includes('href="arena-prompts.css"'));
});
