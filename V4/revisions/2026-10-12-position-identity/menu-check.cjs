'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/__position_menu__.cjs'));
const out=path.join(__dirname,'qa',process.argv.includes('--before')?'menu-before':'menu-after');
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const [name,width,height,touch]of [['desktop',1920,1080,false],['laptop',1440,900,false],['small-laptop',1280,720,false],['short-desktop',1007,412,false],['short-window',844,480,false],['tablet',800,1000,false],['razr',412,1007,true],['razr-landscape',1007,412,true]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,serviceWorkers:'block'});
      await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-position-menu-qa'):open.call(this,n+'-position-menu-qa',v);};});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:4304/jeu/#decks');await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
      const sample=await page.evaluate(()=>{
        const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const nav=document.querySelector('.main-nav'),header=document.querySelector('.masthead');
        return {viewport:[innerWidth,innerHeight],fine:matchMedia('(pointer:fine)').matches,nav:rect(nav),header:rect(header),overflow:document.documentElement.scrollWidth>innerWidth,
          buttons:[...nav.querySelectorAll('button')].filter(n=>getComputedStyle(n).display!=='none').map(n=>({view:n.dataset.view||'more',text:n.innerText,current:n.getAttribute('aria-current'),box:rect(n),icon:n.querySelector('img,.kalistar-sigil,.lucide')?rect(n.querySelector('img,.kalistar-sigil,.lucide')):null}))};
      });
      results.push({name,...sample});await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:84});await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2)+'\n');console.log(JSON.stringify({results,errors}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
