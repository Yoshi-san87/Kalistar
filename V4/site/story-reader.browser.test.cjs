'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__story_reader__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(os.tmpdir(),'kalistar-story-reader-qa');

async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(90000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('requestfailed',request=>{if(request.url().includes('story-content.json'))errors.push(request.url()+' '+request.failure()?.errorText);});
    await page.goto(url+'/jeu/#story');
    await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('.story-library').waitFor();
    assert.equal(await page.locator('.story-reader-book').count(),0,'Story starts with a closed volume, not the manuscript');
    assert.equal(await page.locator('.story-volume-title').textContent(),'Le Réveil');
    await page.waitForFunction(()=>document.querySelector('.story-volume-object img')?.naturalWidth===1024);
    await page.screenshot({path:path.join(output,'library-desktop.png')});
    for(const [width,height] of [[1440,1000],[1024,768],[850,760],[412,1007],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      const layout=await page.locator('.story-volume').evaluate(node=>{
        const button=node.getBoundingClientRect(),book=node.querySelector('.story-volume-object').getBoundingClientRect(),title=node.querySelector('.story-volume-inscription').getBoundingClientRect(),host=document.querySelector('#story-reader-root').getBoundingClientRect();
        return {button:button.toJSON(),book:book.toJSON(),title:title.toJSON(),host:host.toJSON(),overflow:document.documentElement.scrollWidth-innerWidth};
      });
      assert.ok(layout.overflow<=1,'library has no horizontal overflow at '+width+'x'+height);
      assert.ok(layout.button.top>=layout.host.top-1&&layout.button.bottom<=layout.host.bottom+1,'closed volume and open action fit the available screen at '+width+'x'+height);
      assert.ok(layout.title.left>=layout.book.left&&layout.title.right<=layout.book.right&&layout.title.bottom<layout.book.top+layout.book.height*.5,'cover inscription stays above the crystal at '+width+'x'+height);
      if(width===412)await page.screenshot({path:path.join(output,'library-phone.png')});
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-story-action=open-book]').focus();
    await page.keyboard.press('Enter');
    await page.locator('.story-reader-book').waitFor();
    assert.equal(await page.locator('.story-book-opening').evaluate(node=>getComputedStyle(node).animationName),'none','reduced motion skips the book opening animation');
    await page.evaluate(async()=>{
      const background=new Image();
      background.src=new URL('assets/ui/collection-reader-grimoire-v1.webp',location.href).href;
      await background.decode();
    });
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'Les éclats du ciel');
    assert.equal(await page.locator('.story-chapter').count(),18);
    assert.ok(await page.locator('.story-text p').count()>=5);
    const desktop=await page.locator('.story-reader-book').evaluate(node=>{
      const book=node.getBoundingClientRect(),toc=node.querySelector('.story-toc').getBoundingClientRect(),reading=node.querySelector('.story-reading-page').getBoundingClientRect();
      return {ratio:book.width/book.height,center:book.left+book.width/2,tocRight:toc.right,readingLeft:reading.left,width:book.width};
    });
    assert.ok(Math.abs(desktop.ratio-1672/941)<.02,'grimoire spread keeps its native aspect ratio');
    assert.ok(desktop.tocRight<=desktop.center+1&&desktop.readingLeft>=desktop.center-1,'contents and text occupy their respective book pages');
    await page.locator('[data-story-section="1"]').click();
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'La Z13');
    assert.equal(await page.locator('.story-illustration').count(),1,'Baba appears at the tavern scene in chapter I');
    const firstScene=page.locator('.story-illustration').first();
    await firstScene.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{const image=document.querySelector('.story-illustration img');return image?.dataset.v4Cropped==='art'&&image.naturalWidth===460&&image.naturalHeight===880;});
    await page.locator('.story-illustration-trigger').first().click();
    const cardDialog=page.locator('[data-story-dialog]');
    await cardDialog.waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('[data-story-full-image]')?.naturalWidth===897);
    assert.match(await page.locator('[data-story-full-image]').getAttribute('alt'),/MALABA/,'the scene opens its matching full card');
    await page.keyboard.press('Escape');
    assert.equal(await cardDialog.evaluate(node=>node.open),false,'Escape closes the full-card view');
    await page.screenshot({path:path.join(output,'desktop.png')});
    await page.locator('[data-story-section="4"]').click();
    assert.equal(await page.locator('.story-illustration').count(),1,'Kaylis appears during the escape, not the Electro discovery');
    assert.match(await page.locator('.story-illustration').evaluate(node=>node.previousElementSibling.textContent),/Kaylis s’arrêta tout à fait/,'the artwork follows its exact manuscript scene');
    await page.locator('.story-illustration-trigger').click();
    await cardDialog.waitFor({state:'visible'});
    assert.match(await page.locator('[data-story-full-image]').getAttribute('alt'),/KAYLIS/);
    await page.keyboard.press('Escape');
    await page.locator('[data-story-section="5"]').click();
    assert.equal(await page.locator('.story-illustration-trigger').getAttribute('data-story-full').then(value=>value.endsWith('/balmhyr.png')),true,'Balmhyr appears with the bear scene');
    await page.locator('[data-story-section="8"]').click();
    assert.equal(await page.locator('.story-illustration-trigger').getAttribute('data-story-full').then(value=>value.endsWith('/lanio-astraball.png')),true,'Lanio appears during the Astraball scene');
    assert.match(await page.locator('.story-illustration').evaluate(node=>node.previousElementSibling.textContent),/Un joueur lui lança le ballon.*Lanio.*course/,'Lanio artwork follows the actual running scene after the chapter rewrite');
    await page.locator('[data-story-section="1"]').click();
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
    const overallProgress=await page.locator('.story-progress-track[role=progressbar]').getAttribute('aria-valuenow');
    await page.locator('[data-story-action=library]').click();
    assert.equal(await page.locator('[data-story-action=open-book]').evaluate(node=>node===document.activeElement),true,'closing returns keyboard focus to the volume');
    assert.match(await page.locator('.story-volume-command').textContent(),/Reprendre/);
    assert.equal(await page.locator('.story-library-progress [role=progressbar]').getAttribute('aria-valuenow'),overallProgress,'closed volume keeps the same manuscript progress');
    for(const [width,height] of [[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      const fits=await page.locator('.story-library').evaluate(node=>{
        const host=node.getBoundingClientRect(),children=[...node.children].map(child=>child.getBoundingClientRect());
        return children.every(box=>box.top>=host.top&&box.bottom<=host.bottom);
      });
      assert.ok(fits,'book and saved reading marker fit the short screen together at '+width+'x'+height);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.locator('.story-library').waitFor();
    assert.match(await page.locator('.story-library-progress').textContent(),/Chapitre I.*La Z13/);
    await page.locator('[data-story-action=open-book]').click();await page.locator('.story-reader-book').waitFor();
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
      if(!isSingle){
        await page.waitForFunction(()=>{
          const stage=document.querySelector('.story-reader').getBoundingClientRect(),book=document.querySelector('.story-reader-book').getBoundingClientRect();
          return book.left>=stage.left+9&&book.right<=stage.right-9&&book.top>=stage.top+9&&book.bottom<=stage.bottom-9;
        });
        const safe=await page.locator('.story-reader-book').evaluate(node=>{
          const book=node.getBoundingClientRect();
          return [...node.querySelectorAll('.story-book-heading,.story-progress,.story-chapters,.story-toc-quote,.story-reading-header,.story-text,.story-reading-footer')].map(element=>{
            const box=element.getBoundingClientRect();
            return {left:(box.left-book.left)/book.width,right:(box.right-book.left)/book.width,bottom:(box.bottom-book.top)/book.height,leftPage:element.closest('.story-toc')!==null};
          });
        });
        assert.ok(safe.every(box=>box.left>=(box.leftPage?.089:.55)&&box.right<=(box.leftPage?.46:.911)&&box.bottom<.85),'writing and controls stay clear of the ornamental margins at '+width+'x'+height);
      }
      if(width===412)await page.screenshot({path:path.join(output,'phone.png')});
      if(width===320){
        const nav=await page.locator('.main-nav button:visible').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),label=node.querySelector('span').getBoundingClientRect();return {button:box.toJSON(),label:label.toJSON()};}));
        assert.equal(nav.length,5,'phone navigation retains five comfortable destinations');
        assert.ok(nav.every(item=>item.label.left>=item.button.left-1&&item.label.right<=item.button.right+1),'phone navigation labels fit without clipping');
        await page.locator('.nav-more').click();
        assert.equal(await page.locator('#mobile-dialog [data-view=story]').isVisible(),true,'Story remains available in Plus');
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewportSize({width:412,height:1007});
    await page.locator('[data-story-select]').selectOption('1');
    assert.equal(await page.locator('.story-illustration').count(),1,'Baba’s anchored illustration is available on phone');
    const phoneScene=await page.locator('.story-illustration').first().evaluate(node=>({frame:node.getBoundingClientRect().toJSON(),page:document.querySelector('.story-text').getBoundingClientRect().toJSON(),scrollWidth:document.querySelector('.story-text').scrollWidth,clientWidth:document.querySelector('.story-text').clientWidth}));
    assert.ok(phoneScene.frame.left>=phoneScene.page.left-1&&phoneScene.frame.right<=phoneScene.page.right+1,'phone illustration stays within the manuscript leaf');
    assert.ok(phoneScene.scrollWidth<=phoneScene.clientWidth+1,'phone illustration causes no horizontal reading overflow');
    await page.locator('[data-story-select]').selectOption('2');
    assert.equal(await page.locator('.story-current-heading h2').textContent(),'Les révélations');
    const controls=await page.locator('.story-reading-tools button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
    assert.ok(controls.every(height=>height>=44),'reading controls retain touch-sized targets');
    await page.locator('[data-story-action=library]').click();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-story-action=open-book]').click();
    await page.locator('.story-reader-book').waitFor();
    assert.equal(await page.locator('.story-book-opening').evaluate(node=>getComputedStyle(node).animationName),'story-book-open','normal motion includes a short opening transition');
    await page.locator('[data-story-action=library]').click();
    await page.locator('[data-story-action=open-book]').evaluate(node=>{for(let i=0;i<6;i++)node.click();});
    await page.locator('.story-reader-book').waitFor();
    assert.equal(await page.locator('.story-reader-book').count(),1,'rapid clicks open a single reader');
    assert.deepEqual(errors,[],'no browser errors or failed manuscript request');
    await context.close();

    const raceContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    try{
      const racePage=await raceContext.newPage();
      let releaseTexture;
      const release=new Promise(resolve=>{releaseTexture=resolve;});
      await racePage.goto(url+'/jeu/#story');
      await racePage.locator('.story-library').waitFor();
      await racePage.route('**/collection-reader-grimoire-v1.webp',async route=>{await release;await route.continue();});
      const requested=racePage.waitForRequest('**/collection-reader-grimoire-v1.webp');
      await racePage.locator('[data-story-action=open-book]').click();
      await requested;
      await racePage.locator('.main-nav [data-view=collection]').click();
      await racePage.locator('#collection-binder-root').waitFor();
      releaseTexture();
      await racePage.waitForTimeout(450);
      assert.equal(await racePage.locator('#story-reader-root').count(),0,'late book decoding cannot repaint Collection');
      await racePage.unroute('**/collection-reader-grimoire-v1.webp');
      await racePage.evaluate(()=>{location.hash='story';});
      await racePage.locator('.story-library').waitFor();
      await racePage.locator('[data-story-action=open-book]').click();
      await racePage.locator('.story-reader-book').waitFor();
    }finally{await raceContext.close();}
    console.log(JSON.stringify({chapters:18,desktopRatio:desktop.ratio,phoneSizes:4,screenshots:output}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
