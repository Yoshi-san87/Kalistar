const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/console-fit'),read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
function fixture(){const s=E.newGame(data.decks.player,data.decks.enemy,{seed:'CONSOLE-FIT',mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);return s;}
const scenarios=new Map([['setup',fixture()]]);
const add=(key,s)=>{const previous=scenarios.get(key);if(!previous||(s.duel?.outcome?.length||0)>(previous.duel?.outcome?.length||0))scenarios.set(key,E.clone(s));};
const base=fixture();E.start(base);add('choose',base);
// Exercise real printed faces, including the longest result of each special action.
for(const side of [0,1])for(let i=0;i<5;i++)for(let j=0;j<5;j++)for(let die=1;die<=6;die++){
 const s=E.clone(base);s.turn=side;s.players[side].board[i].mana=60;s.players[1-side].board[j].reraise=1;E.lock(s,i,j);add('attack',s);E.rollAttack(s,die);
 if(['heart','potion','clover'].includes(s.phase)){add(s.phase,s);s.phase==='heart'?E.grantReraise(s,s.duel.attacker):s.phase==='potion'?E.grantPotion(s,s.duel.attacker):E.grantClover(s,s.duel.attacker);add('result-'+s.duel.attackValue,s);continue;}
 if(s.phase==='result'){add('result-'+s.duel.attackValue,s);continue;}
 add('defense',s);
 for(let def=1;def<=6;def++){const next=E.clone(s);E.rollDefense(next,def);add(next.phase+'-'+(typeof next.duel.defenseValue==='number'?'numeric':next.duel.defenseValue),next);}
}
const report={measureOnly:process.argv.includes('--measure'),screens:[],checks:[],errors:[]};
async function measure(page){return page.locator('.duel-centre').evaluate(centre=>{
 const recap=centre.querySelector('.duel-recap'),status=centre.querySelector('.duel-status'),r=recap.getBoundingClientRect();
 const boxes=Array.from(recap.children).map(n=>{const b=n.getBoundingClientRect();return {class:n.className,height:b.height,top:b.top-r.top,bottom:b.bottom-r.top};});
 const actualBottom=Math.max(...boxes.map(b=>b.bottom));
 return {recap:{client:recap.clientHeight,scroll:recap.scrollHeight,overflow:getComputedStyle(recap).overflowY,actualBottom,height:r.height,boxes},status:{client:status.clientHeight,scroll:status.scrollHeight},centreHeight:centre.getBoundingClientRect().height,
  textClipped:Array.from(recap.querySelectorAll('b,strong,span,small,p')).filter(n=>n.scrollWidth>n.clientWidth+1&&getComputedStyle(n).display!=='inline').map(n=>n.textContent),
  dice:Array.from(document.querySelectorAll('.duel-die')).map(n=>{const b=n.getBoundingClientRect();return {top:b.top+scrollY,height:b.height};})};
 });}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.KALISTAR_READY);
  const widths=report.measureOnly?[1440,390]:[2493,1440,1100,768,390,320];
  for(const width of widths){await page.setViewportSize({width,height:width<700?844:1000});let stable;
   for(const [key,s] of scenarios){
    await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    if(width<=1100)await page.locator('[data-action="focus-duel"]').click();
    const m=await measure(page);report.screens.push({width,scenario:key,...m});
    if(!report.measureOnly){assert(m.recap.scroll<=m.recap.client+1,JSON.stringify({width,key,recap:m.recap}));assert(m.recap.actualBottom<=m.recap.height+1,'Clipped recap: '+JSON.stringify({width,key,...m.recap}));assert(!['auto','scroll','hidden','clip'].includes(m.recap.overflow),'Content must fit without clipping');assert.deepEqual(m.textClipped,[]);assert(m.status.scroll<=m.status.client+1,'Status scrollbar: '+JSON.stringify({width,key,status:m.status}));if(stable)assert.deepEqual(m.dice,stable,'Dice shifted: '+key);else stable=m.dice;assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
    if(['setup','defense-shield_magic','result-numeric','potion'].includes(key))await page.locator('.duel-console').screenshot({path:path.join(out,key+'-'+width+'.jpg'),type:'jpeg',quality:93});
   }
  }
  report.checks.push(scenarios.size+' real-face scenarios: entire recap visible, no clipping, no scrollbar, stable dice, six viewport widths');
  if(report.measureOnly)console.log(JSON.stringify(report.screens.filter(m=>m.recap.scroll>m.recap.client+1).map(({width,scenario,recap,status})=>({width,scenario,recap,status})),null,2));
  else{assert.deepEqual(report.errors,[]);console.log(JSON.stringify({checks:report.checks,scenarios:scenarios.size,cases:report.screens.length,errors:report.errors},null,2));}
 }finally{await browser.close();fs.writeFileSync(path.join(out,report.measureOnly?'before.json':'console-fit-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
