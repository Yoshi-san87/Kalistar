const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const {serve}=require('../tools/sprite-template-v2.cjs');
const root=path.resolve(__dirname,'../../..'),base=path.join(root,'work/astraball-v2/ten-characters');
async function main(){
  const library=JSON.parse(fs.readFileSync(path.join(base,'library.json'),'utf8'));
  assert.ok(library.entries.length>0,'A native review lot is required');
  const {CLIPS}=await import('../animation-kit/template-v2.mjs');
  const out=path.join(base,'qa'),server=await serve(0),browser=await chromium.launch({channel:'chrome',headless:true});
  fs.mkdirSync(out,{recursive:true});
  try{
    for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'phone',width:390,height:844}]){
      const context=await browser.newContext({viewport,acceptDownloads:true}),page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:'+server.address().port+'/batch.html');
      await page.waitForFunction(count=>document.querySelector('#count').textContent===count+' personnages',library.entries.length);
      assert.equal(await page.locator('#grid canvas').count(),library.entries.length);
      assert.equal(await page.locator('#error').textContent(),'');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const [id,clip] of Object.entries(CLIPS)){
        await page.selectOption('#clip',id);
        await page.waitForSelector('#grid[aria-busy="false"]');
        assert.deepEqual(await page.locator('#grid canvas').evaluateAll(nodes=>nodes.map(c=>[c.width,c.height,c.dataset.frame,c.dataset.scale])),library.entries.map(()=>[320,320,String(clip.frames[0].index),'1']));
        const visible=await page.locator('#grid canvas').evaluateAll(nodes=>nodes.map(c=>{
          const pixels=c.getContext('2d').getImageData(0,0,320,320).data;let count=0;
          for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==23||pixels[i+1]!==37||pixels[i+2]!==30)count++;
          return count;
        }));
        assert.ok(visible.every(n=>n>1000),'nonblank sprites for '+id);
      }
      await page.selectOption('#clip','run');await page.waitForSelector('#grid[aria-busy="false"]');await page.click('#play');
      await page.waitForTimeout(130);const before=await page.locator('#grid canvas').first().getAttribute('data-frame');
      await page.waitForTimeout(170);assert.notEqual(await page.locator('#grid canvas').first().getAttribute('data-frame'),before);
      await page.click('#play');await page.selectOption('#clip','death');await page.waitForSelector('#grid[aria-busy="false"]');await page.click('#play');
      await page.waitForTimeout(850);assert.equal(await page.locator('#grid canvas').first().getAttribute('data-frame'),'63');
      await page.waitForTimeout(250);assert.equal(await page.locator('#grid canvas').first().getAttribute('data-frame'),'63');
      await page.selectOption('#clip','idle');await page.waitForSelector('#grid[aria-busy="false"]');await page.click('#mirror');assert.equal(await page.locator('#mirror').getAttribute('aria-pressed'),'true');await page.click('#mirror');
      await page.screenshot({path:path.join(out,viewport.name+'.png'),fullPage:true});
      await page.locator('#grid button').first().click();assert.equal(await page.locator('#detail').getAttribute('open'),'');
      await page.locator('#next').click();assert.equal(await page.locator('#detail-canvas').getAttribute('data-frame'),'1');
      assert.equal(await page.locator('#detail-canvas').getAttribute('data-scale'),viewport.name==='phone'?'1':'2');
      await page.selectOption('#detail-clip','death');await page.waitForSelector('#grid[aria-busy="false"]');await page.click('#detail-play');await page.waitForTimeout(850);
      assert.equal(await page.locator('#detail-canvas').getAttribute('data-frame'),'63');
      await page.selectOption('#detail-clip','idle');await page.selectOption('#detail-zoom','1');
      await page.waitForSelector('#grid[aria-busy="false"]');
      assert.equal(await page.locator('#downloads a').count(),5);
      const download=page.waitForEvent('download');await page.locator('#downloads a').last().click();const item=await download;
      await item.saveAs(path.join(out,viewport.name+'-actor.json'));
      assert.equal(JSON.parse(fs.readFileSync(path.join(out,viewport.name+'-actor.json'))).frames.length,64);
      await page.screenshot({path:path.join(out,viewport.name+'-detail.png')});
      await page.click('#close');assert.deepEqual(errors,[]);await context.close();
    }
    console.log('PASS native lot browser: '+library.entries.length+' actors, 14 clips, playback, death hold, mirror, common native scale, desktop/mobile and exports. Artistic approval remains separate.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
