'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const requireRuntime=createRequire(path.join(runtime,'__weapon_cards_export__.cjs')),{chromium}=requireRuntime('playwright'),sharp=requireRuntime('sharp');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=path.join(__dirname,'exports');
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1080},reducedMotion:'reduce',serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,String(name)+'-weapon-export-only',version);};});
    const page=await context.newPage();await page.goto(base+'/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);
    const ids=await page.evaluate(()=>KalistarWeapons.weapons.map(w=>w.id));await fs.mkdir(out,{recursive:true});const files=[];
    for(const id of ids){
      if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid weapon ID for export');
      await page.evaluate(id=>{
        document.querySelector('#app').innerHTML=`<section class="weapons-page" style="padding:0;max-width:none"><div class="weapon-card" style="width:1400px;margin:20px">${KalistarWeaponCards.markup(KalistarWeapons.weapons.find(w=>w.id===id),{cards:KALISTAR_DATA.cards,medallion:KalistarEquipmentFX.markup,url:p=>KalistarSite.url(p)})}</div></section>`;
        lucide.createIcons();
      },id);
      await page.waitForFunction(()=>[...document.querySelectorAll('#app img')].every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>document.fonts.ready);
      const face=page.locator('#app .wc-surface'),rect=await face.boundingBox();
      if(rect.width!==1400||rect.height!==1000)throw Error('Unexpected export dimensions');
      const png=await sharp(await face.screenshot()).withMetadata({density:400}).png().toBuffer();
      await fs.writeFile(path.join(out,id+'.png'),png);
      files.push({id,file:id+'.png',width:1400,height:1000,dpi:400,sha256:crypto.createHash('sha256').update(png).digest('hex')});
    }
    await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({format:'poker-landscape',millimeters:[88.9,63.5],layoutVersion:require('../site/weapon-cards.js').layout.version,files},null,2)+'\n');
    console.log(JSON.stringify({exported:files.length,out}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
