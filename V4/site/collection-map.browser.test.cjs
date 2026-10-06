'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_map_qa__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(os.tmpdir(),'kalistar-astralia-map-qa');
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(90000);
    await page.goto(url+'/jeu/#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('.cb-spread').waitFor();
    const action=(name,id)=>page.locator(`[data-binder-action="${name}"]${id===undefined?'':`[data-id="${id}"]`}:visible`);
    await action('scope','catalogue').click();
    const asset=await page.locator('.cb-workbench').evaluate(async node=>{
      const source=getComputedStyle(node).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
      const image=new Image();image.src=source;await image.decode();
      return {source,width:image.naturalWidth,height:image.naturalHeight};
    });
    assert.match(asset.source,/collection-astralia-planisphere-v1\.webp$/);
    assert.equal(asset.width/asset.height,2,'the full atlas has its original aspect ratio');
    for(const [width,height]of [[2041,1383],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>[...document.querySelectorAll('.cb-card img')].every(n=>n.complete&&n.naturalWidth>0));
      await page.waitForTimeout(150);
      const geometry=await page.locator('.cb-spread').evaluate(node=>{
        const work=node.parentElement,style=getComputedStyle(work),rect=work.getBoundingClientRect();
        const captions=[...node.querySelectorAll('.cb-caption')].map(n=>{
          const box=n.getBoundingClientRect(),name=n.querySelector('h2');
          return {ink:getComputedStyle(name).color,paper:getComputedStyle(n).backgroundColor,fits:[...n.querySelectorAll('.cb-copy-count,.cb-version-count,h2,.cb-icon')].every(c=>{const r=c.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;})};
        });
        return {background:style.backgroundImage,size:style.backgroundSize,spine:getComputedStyle(node,'::before').content,spreadBackground:getComputedStyle(node).backgroundImage,overflow:document.documentElement.scrollWidth-innerWidth,captions,cards:[...node.querySelectorAll('.cb-card')].map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,inside:r.left>=rect.left&&r.right<=rect.right&&r.height>0};})};
      });
      assert.match(geometry.background,/collection-astralia-planisphere-v1\.webp/);
      assert.equal(geometry.size,'cover','atlas is cropped proportionally, never stretched');
      assert.equal(geometry.spine,'none','the collection has no book seam');
      assert.equal(geometry.spreadBackground,'none','pagination does not repaint a second book texture');
      assert.ok(geometry.overflow<=1,'no horizontal overflow at '+width+'x'+height);
      assert.ok(geometry.cards.length>0&&geometry.cards.every(c=>c.inside&&c.height>=120),'cards remain readable and inside the atlas');
      for(const caption of geometry.captions){
        assert.ok(caption.fits,'caption tools fit at '+width+'x'+height);
        const ink=caption.ink.match(/[\d.]+/g).map(Number),paper=caption.paper.match(/[\d.]+/g).map(Number);
        assert.ok((paper[3]??1)>=.9,'map detail is screened behind captions');
        assert.ok((luminance(paper.slice(0,3))+.05)/(luminance(ink.slice(0,3))+.05)>=4.5,'caption contrast exceeds 4.5:1');
      }
      await page.screenshot({path:path.join(output,`collection-${width}x${height}.png`),scale:'css'});
    }
    await page.setViewportSize({width:1440,height:1000});
    const initial=await page.locator('.cb-page-label').textContent();
    await action('next-page').last().click();assert.notEqual(await page.locator('.cb-page-label').textContent(),initial);
    await action('pages').click();await page.locator('.cb-overlay:modal').waitFor();
    assert.match(await page.locator('.cb-mini-book').first().evaluate(n=>getComputedStyle(n).backgroundImage),/collection-astralia-planisphere-v1\.webp/);
    await action('jump-page','0').click();
    await action('filters').click();
    await page.locator('[data-binder-filter=collection]').last().selectOption('kalistar');
    await action('close-overlay').last().click();
    await page.locator('[data-binder-field=search]').fill('MOMO');
    const before=await page.locator('.cb-pocket').first().getAttribute('data-card-id');
    const cycle=action('cycle-version').first();assert.ok(await cycle.isVisible());
    await cycle.click();assert.notEqual(await page.locator('.cb-pocket').first().getAttribute('data-card-id'),before);
    await action('open').first().click();
    assert.match(await page.locator('.cb-workbench').evaluate(n=>getComputedStyle(n).backgroundImage),/collection-reader-grimoire-v1\.webp/,'character notebooks retain their reading surface');
    const notes=action('pane','notes');if(await notes.isVisible())await notes.click();
    for(const tab of ['profile','career','copies']){await action('tab',tab).click();await page.locator('#cb-read-content').waitFor();}
    await action('back').click();
    await page.locator('[data-view=story]').click();await page.locator('.story-library').waitFor();
    assert.match(await page.locator('.story-volume-object img').first().getAttribute('src'),/story-closed-grimoire-v2\.webp/,'Story is unchanged');
    await page.locator('[data-view=collection]').click();await page.locator('.cb-spread').waitFor();
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.match(await page.locator('.cb-workbench').evaluate(n=>getComputedStyle(n).backgroundImage),/collection-astralia-planisphere-v1\.webp/);
    const phone=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),touch=await phone.newPage();
    touch.on('pageerror',e=>errors.push(e.message));
    await touch.goto(url+'/jeu/#collection');await touch.waitForFunction(()=>window.KALISTAR_READY);
    await touch.locator('[data-binder-action=scope][data-id=catalogue]').tap();
    const label=touch.locator('.cb-page-label'),firstPage=await label.textContent();
    await touch.locator('.cb-footer [data-binder-action=next-page]').tap();
    await touch.waitForFunction(value=>document.querySelector('.cb-page-label').textContent!==value,firstPage);
    await touch.locator('.cb-footer [data-binder-action=previous-page]').tap();
    await touch.locator('[data-binder-action=filters]').tap();
    await touch.locator('.cb-overlay:modal').waitFor();
    await touch.locator('[data-binder-action=close-overlay]').last().tap();
    const favoriteInk=await touch.locator('.cb-caption .cb-icon .lucide').first().evaluate(n=>getComputedStyle(n).color);
    assert.ok((luminance([234,217,185])+.05)/(luminance(favoriteInk.match(/[\d.]+/g).slice(0,3).map(Number))+.05)>=3,'touch favorite icons remain visible on parchment');
    await touch.screenshot({path:path.join(output,'collection-razr-touch.png'),scale:'css'});
    await phone.close();
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({sizes:7,asset,checks:'atlas, captions, paging, filters, editions, notebook, Story, reload and real touch controls',screenshots:output}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
