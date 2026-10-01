'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__story_reader__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const output=path.join(os.tmpdir(),'kalistar-story-reader-qa');

async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('requestfailed',request=>{if(request.url().includes('story-content.json'))errors.push(request.url()+' '+request.failure()?.errorText);});
    await page.goto(url+'/jeu/#story');
    await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('.story-reader-book').waitFor();
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'Les éclats du ciel');
    assert.equal(await page.locator('.story-chapter').count(),10);
    assert.ok(await page.locator('.story-text p').count()>=5);
    const desktop=await page.locator('.story-reader-book').evaluate(node=>{
      const book=node.getBoundingClientRect(),toc=node.querySelector('.story-toc').getBoundingClientRect(),reading=node.querySelector('.story-reading-page').getBoundingClientRect();
      return {ratio:book.width/book.height,center:book.left+book.width/2,tocRight:toc.right,readingLeft:reading.left,width:book.width};
    });
    assert.ok(Math.abs(desktop.ratio-1692/940)<.02,'grimoire spread keeps its native aspect ratio');
    assert.ok(desktop.tocRight<=desktop.center+1&&desktop.readingLeft>=desktop.center-1,'contents and text occupy their respective book pages');
    await page.screenshot({path:path.join(output,'desktop.png')});
    await page.locator('[data-story-section="1"]').click();
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'La Z13');
    const text=page.locator('.story-text');
    assert.ok(await text.evaluate(node=>node.scrollHeight>node.clientHeight),'long chapters scroll inside the page, not the window');
    await page.locator('[data-story-action=larger]').click();
    await page.locator('[data-story-action=theme]').click();
    assert.equal(await page.locator('.story-reader').getAttribute('data-text-size'),'large');
    assert.equal(await page.locator('.story-reader').getAttribute('data-paper'),'night');
    await text.evaluate(node=>{node.scrollTop=node.scrollHeight;node.dispatchEvent(new Event('scroll',{bubbles:true}));});
    await page.waitForTimeout(250);
    const saved=await page.evaluate(()=>{
      const key=Object.keys(localStorage).find(value=>value.endsWith('story-progress'));
      return key?JSON.parse(localStorage.getItem(key)):null;
    });
    assert.equal(saved.section,1);assert.equal(saved.size,'large');assert.equal(saved.paper,'night');assert.ok(saved.ratio>.95);
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.locator('.story-reader-book').waitFor();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'La Z13');
    assert.ok(await text.evaluate(node=>node.scrollTop/Math.max(1,node.scrollHeight-node.clientHeight)>.9),'chapter position resumes after reload');

    for(const [width,height] of [[1440,1000],[1024,768],[850,760],[412,1007],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      const isSingle=width<=850||width<=950&&height<=500;
      if(isSingle){
        assert.equal(await page.locator('.story-chapter-picker').isVisible(),true,'chapter selector is visible at '+width+'x'+height);
        assert.equal(await page.locator('.story-toc').evaluate(node=>getComputedStyle(node).display),'none','single readable leaf at '+width+'x'+height);
      }else assert.equal(await page.locator('.story-toc').isVisible(),true,'desktop contents are visible');
      const bounds=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,app:document.querySelector('#app').getBoundingClientRect().toJSON(),reader:document.querySelector('.story-reader').getBoundingClientRect().toJSON()}));
      assert.ok(bounds.document<=bounds.viewport+1,'no horizontal page overflow at '+width+'x'+height);
      assert.ok(bounds.reader.width>0&&bounds.reader.height>0,'reader fills its host at '+width+'x'+height);
      if(width===412)await page.screenshot({path:path.join(output,'phone.png')});
      if(width===320){
        const nav=await page.locator('.main-nav button:visible').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),label=node.querySelector('span').getBoundingClientRect();return {button:box.toJSON(),label:label.toJSON()};}));
        assert.equal(nav.length,6,'Story is available in the six-item phone navigation');
        assert.ok(nav.every(item=>item.label.left>=item.button.left-1&&item.label.right<=item.button.right+1),'phone navigation labels fit without clipping');
      }
    }
    await page.setViewportSize({width:412,height:1007});
    await page.locator('[data-story-select]').selectOption('2');
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'La lumière sous la peau');
    const controls=await page.locator('.story-reading-tools button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
    assert.ok(controls.every(height=>height>=44),'reading controls retain touch-sized targets');
    assert.deepEqual(errors,[],'no browser errors or failed manuscript request');
    await context.close();
    console.log(JSON.stringify({chapters:10,desktopRatio:desktop.ratio,phoneSizes:4,screenshots:output}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
