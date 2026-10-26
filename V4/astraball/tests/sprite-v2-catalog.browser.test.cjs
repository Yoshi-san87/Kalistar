const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const {serve}=require('../tools/sprite-template-v2.cjs');
const {OUT}=require('../tools/sprite-v2-catalog.cjs');
async function main(){
  const library=JSON.parse(fs.readFileSync(path.join(OUT,'library.json'))),qa=path.join(OUT,'qa');
  assert.ok(library.entries.length>=10);assert.ok(library.counts.total>=library.entries.length);
  fs.mkdirSync(qa,{recursive:true});const server=await serve(0),browser=await chromium.launch({channel:'chrome',headless:true});
  try{for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'phone',width:390,height:844}]){
    const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[],images=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/body-[0-3]\.png$/.test(r.url()))images.push(r.url());});
    await page.goto('http://127.0.0.1:'+server.address().port+'/batch.html?catalog=all');
    await page.waitForSelector('#grid[aria-busy="false"]');
    const size=viewport.name==='phone'?6:12,visible=Math.min(size,library.entries.length);
    assert.equal(await page.locator('#count').textContent(),library.entries.length+' / '+library.counts.total+' personnages');
    assert.equal(await page.locator('#grid canvas').count(),visible);
    assert.equal(images.length,visible,'Only the current native page is loaded, not four textures per actor');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.selectOption('#clip','physical');await page.waitForSelector('#grid[aria-busy="false"]');
    assert.equal(images.filter(url=>url.endsWith('body-3.png')).length,visible);
    assert.deepEqual(await page.locator('#grid canvas').evaluateAll(cs=>cs.map(c=>[c.width,c.height,c.dataset.frame,c.dataset.scale])),Array.from({length:visible},()=>[320,320,'48','1']));
    await page.click('#play');await page.waitForFunction(()=>document.querySelector('#grid canvas')?.dataset.frame!=='48',{},{timeout:3000});await page.click('#play');
    if(library.entries.length>size){await page.click('#page-next');await page.waitForSelector('#grid[aria-busy="false"]');assert.equal(await page.locator('#grid canvas').count(),Math.min(size,library.entries.length-size));await page.click('#page-previous');await page.waitForSelector('#grid[aria-busy="false"]');}
    const target=library.entries.find(e=>e.characterId==='general-barok-kalistar');
    await page.fill('#search',target.characterId);await page.waitForSelector('#grid[aria-busy="false"]');
    assert.equal(await page.locator('#grid canvas').count(),1);assert.equal(await page.locator('#grid h2').textContent(),target.name);
    await page.selectOption('#faction',target.faction);await page.waitForSelector('#grid[aria-busy="false"]');assert.equal(await page.locator('#grid canvas').count(),1);
    await page.fill('#search','no-character-with-this-name');await page.waitForSelector('#grid[aria-busy="false"]',{state:'attached'});assert.equal(await page.locator('#grid canvas').count(),0);assert.ok(await page.locator('#empty').isVisible());
    await page.fill('#search','');await page.selectOption('#faction','');await page.waitForSelector('#grid[aria-busy="false"]');
    await page.selectOption('#clip','idle');await page.waitForSelector('#grid[aria-busy="false"]');
    await page.screenshot({path:path.join(qa,viewport.name+'.png'),fullPage:true});
    const delayed=library.entries.find(e=>e.characterId==='momo');
    let release,seen=false;
    const gate=new Promise(resolve=>{release=resolve;});
    const routePattern='**/data/'+delayed.manifest;
    await page.route(routePattern,async route=>{seen=true;await gate;await route.abort('failed');});
    await page.fill('#search',delayed.characterId);
    for(let tries=0;!seen&&tries<100;tries++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(seen,'The superseded search has an outstanding request');
    await page.fill('#search',target.characterId);await page.waitForSelector('#grid[aria-busy="false"]');
    assert.equal(await page.locator('#grid h2').textContent(),target.name);
    release();await page.waitForTimeout(100);await page.unroute(routePattern);
    assert.equal(await page.locator('#error').textContent(),'','A failed obsolete search must not poison the current selection');
    assert.equal(await page.locator('#error').textContent(),'');assert.deepEqual(errors,[]);await context.close();
  }}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
  console.log('PASS full catalogue: honest progress, bounded native textures, paging, search, factions, animation, desktop/mobile.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
