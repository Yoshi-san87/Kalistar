'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__deck_profile__.cjs'));
async function main(){
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:412,height:1007}}),page=await context.newPage();
    await page.goto('http://127.0.0.1:4304/jeu/#decks');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('[data-deck-action=panel][data-id=recruit]').click();await page.waitForTimeout(1000);
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
    const ms=await page.evaluate(async()=>{const start=performance.now();for(const value of ['m','mo','mom','momo','']){const input=document.querySelector('[data-deck-filter=search]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return performance.now()-start;});
    const {profile}=await cdp.send('Profiler.stop'),nodes=new Map(profile.nodes.map(n=>[n.id,n])),totals=new Map();
    profile.samples.forEach((id,i)=>{const frame=nodes.get(id).callFrame,key=frame.functionName+' / '+frame.url.split('/').at(-1)+':'+(frame.lineNumber+1);totals.set(key,(totals.get(key)||0)+(profile.timeDeltas[i]||0));});
    const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/performance-audit/profile');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'deck.cpuprofile'),JSON.stringify(profile));
    console.log(JSON.stringify({ms,top:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,22).map(([frame,us])=>({frame,ms:Math.round(us/1000)}))},null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
