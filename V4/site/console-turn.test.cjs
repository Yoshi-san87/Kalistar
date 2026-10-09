'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'duel-console.css'),'utf8');
const sync=app.slice(app.indexOf('function syncConsole('),app.indexOf('function recapRow('));
test('console cue follows the decision owner, including defense, support and reinforcements',()=>{
  const node={dataset:{},style:{setProperty(){}}};
  const context=vm.createContext({$:()=>node,consoleParticipants:()=>({a:null,b:null}),E:{},data:{elements:{}}});
  vm.runInContext(sync,context);
  for(const turn of [0,1])for(const phase of ['choose','attack','kalistel','clover','potion','physical','heart','guard','defense','replace','setup','initiative','result','over']){
    context.state={phase,turn,replacing:1-turn};const before=JSON.stringify(context.state);context.syncConsole(context.state);
    const expected=['setup','initiative','result','over'].includes(phase)?'':String(['defense','replace'].includes(phase)?1-turn:turn);
    assert.equal(node.dataset.actingSide,expected,phase+' / '+turn);assert.equal(node.dataset.phase,phase);
    assert.equal(JSON.stringify(context.state),before);
  }
});
test('the cue is decorative, reduced-motion safe and adds no phase or engine changes',()=>{
  assert(app.includes('<span class="console-turn-light" aria-hidden="true"></span>'));
  assert(css.includes('pointer-events:none;opacity:0'));
  assert(css.includes('.duel-console[data-acting-side="1"] .console-turn-light'));
  assert(css.includes('@media(prefers-reduced-motion:reduce)'));
  const cue=css.slice(css.indexOf('.duel-console .console-turn-light'),css.indexOf('.arena-view .duel-die'));
  assert(!cue.includes('animation:'));
});
