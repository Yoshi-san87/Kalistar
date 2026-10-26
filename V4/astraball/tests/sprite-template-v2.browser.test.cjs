const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const {serve}=require('../tools/sprite-template-v2.cjs');
const out=path.resolve(__dirname,'../../../work/astraball-v2/qa');
async function main(){
  const server=await serve(0),browser=await chromium.launch({channel:'chrome',headless:true});fs.mkdirSync(out,{recursive:true});
  try{
    for(const viewport of [{name:'desktop',width:1440,height:900},{name:'phone',width:390,height:844}]){
      const context=await browser.newContext({viewport,acceptDownloads:true}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#actor option').first().waitFor();
      const expected=JSON.parse(fs.readFileSync(path.join(out,'../inventory.json'),'utf8')).entries.length;
      assert.equal(await page.locator('#actor option').count(),expected);
      await page.selectOption('#view','motion');await page.selectOption('#clip','run');
      await page.waitForFunction(()=>document.getElementById('canvas').dataset.studyFrame==='4');
      const hashes=[];
      for(let i=0;i<6;i++){
        await page.locator('#frame').evaluate((e,i)=>{e.value=i;e.dispatchEvent(new Event('input'));},i);
        hashes.push(await page.locator('#canvas').evaluate(c=>c.toDataURL()));
      }
      assert.equal(new Set(hashes).size,6,'six different study crops; this does not validate gait, anatomy or grounding');
      await page.click('#play');await page.waitForTimeout(110);const a=await page.inputValue('#frame');await page.waitForTimeout(160);assert.notEqual(await page.inputValue('#frame'),a);await page.click('#play');
      await page.selectOption('#clip','death');assert.ok(await page.locator('#play').isDisabled());assert.match(await page.locator('#loop').textContent(),/maintenu/);
      assert.equal(await page.locator('#frame').getAttribute('max'),'3');
      await page.selectOption('#clip','run');await page.click('#mirror');assert.equal(await page.locator('#mirror').getAttribute('aria-pressed'),'true');
      await page.selectOption('#zoom','4');assert.equal(await page.locator('#canvas').getAttribute('width'),'1280');await page.selectOption('#zoom','1');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const download=page.waitForEvent('download');await page.click('#download');const item=await download;await item.saveAs(path.join(out,viewport.name+'-draft.json'));
      const actor=JSON.parse(fs.readFileSync(path.join(out,viewport.name+'-draft.json')));assert.equal(actor.status,'draft');assert.equal(actor.frames.length,64);assert.equal(actor.frames[0].sockets.mainHand,null);
      await page.screenshot({path:path.join(out,viewport.name+'.png'),fullPage:true});assert.deepEqual(errors,[]);await context.close();
    }
    const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/?view=motion&clip=run');
    await page.waitForFunction(()=>document.getElementById('canvas').dataset.studyFrame==='4');
    const other=await page.locator('#actor option').evaluateAll(options=>options.find(o=>!o.value.includes('.kaylis.')).value);
    await page.selectOption('#actor',other);assert.equal(await page.inputValue('#view'),'template');
    assert.equal(await page.locator('#canvas').getAttribute('data-study-frame'),'');
    const missing=await page.request.get('http://127.0.0.1:'+server.address().port+'/data/missing.png');assert.equal(missing.status(),404);
    await page.close();
    console.log('PASS V2 studio controls only: catalogue drafts, six different study crops, playback, death hold contract, mirror, integer zoom, exports, desktop/mobile, actor isolation, missing sources. Artwork NOT certified.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
