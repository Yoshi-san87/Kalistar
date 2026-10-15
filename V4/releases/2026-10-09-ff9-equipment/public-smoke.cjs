'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs');
const {openEquipment}=require('../../site/equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__ff9_public__.cjs'))('playwright');
const expected=require(process.env.KALISTAR_BUILD_PROOF?path.resolve(process.env.KALISTAR_BUILD_PROOF):'./verification/build.json'),base='https://yoshi-san87.github.io/Kalistar',out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/public');
let browser;
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const response=await fetch(base+'/release.json?ff9-release='+expected.build);assert(response.ok);
  const manifest=await response.json();
  for(const asset of expected.assets){
    const response=await fetch(base+'/'+asset.path+'?ff9-release='+expected.build);assert(response.ok,asset.path);
    check(asset,Buffer.from(await response.arrayBuffer()),manifest,expected.build);
  }
  browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
  for(const [name,width,height]of [['desktop',1440,1000],['phone',412,1007]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/jeu/?ff9-public='+expected.build+'#weapons');await page.waitForFunction(()=>window.KALISTAR_READY,{},{timeout:120000});
    assert.equal(await page.title(),'Kalistar V'+expected.version+' · Collection, Decks et Arène');assert.equal(await page.locator('.weapon-entry').count(),93);
    assert.equal(await page.evaluate(()=>KalistarWeapons.weapons.filter(w=>w.id.startsWith('ff9-')).length),18);
    for(const id of ['ff9-save-the-queen','ff9-vivi-hat','ff9-garnet-pendant']){
      await openEquipment(page,id);await page.waitForFunction(()=>[...document.querySelectorAll('#weapons-dialog img')].every(i=>i.complete&&i.naturalWidth));
      await page.screenshot({path:path.join(out,name+'-'+id+'.jpg'),type:'jpeg',quality:88,animations:'disabled'});await page.locator('[data-weapon-action=close]').click();
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,version:expected.version,assets:expected.assets.length,views:2,errors},null,2)+'\n');
  console.log('PASS public v'+expected.version+': '+expected.assets.length+' hashes, desktop + phone');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
