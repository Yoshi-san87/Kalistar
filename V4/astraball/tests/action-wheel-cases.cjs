const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async({browser,url,OUT,core})=>{
  for(const [name,width,height]of [['desktop',1440,900],['wide',1920,1080],['razr',412,915],['compact',360,800],['landscape',915,412]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<761,hasTouch:width<761});
    try{
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      const fixture=core.createMatch({seed:1536,mode:'hotseat'});
      while(fixture.phase==='placement')core.applyCommand(fixture,{type:'ready',team:fixture.placement.team});
      fixture.units.filter(u=>['sentry','meneur'].includes(u.role)).forEach(u=>u.acted=true);
      fixture.activeId='t0-kaylis';Object.assign(core.getUnit(fixture,'t0-kaylis'),{x:7,y:3});fixture.ball={holderId:'t0-kaylis',x:7,y:3};core.validateState(fixture);
      await page.goto(url);await page.waitForFunction(()=>window.Astraball?.ready);
      await page.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),fixture);
      await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      const wheel=page.locator('#action-wheel');assert.equal(await wheel.isVisible(),true);
      assert.equal(await page.locator('.tactics [data-mode],.tactics #wait').count(),0);
      async function bounded(){
        const boxes=await page.evaluate(()=>({host:document.querySelector('.arena').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.wheel-action,#action-toggle')].filter(b=>getComputedStyle(b).visibility!=='hidden').map(b=>b.getBoundingClientRect().toJSON())}));
        for(const b of boxes.buttons){assert.ok(b.width>=44&&b.height>=44);assert.ok(b.left>=boxes.host.left&&b.right<=boxes.host.right);assert.ok(b.top>=boxes.host.top&&b.bottom<=boxes.host.bottom);}
      }
      await bounded();await page.screenshot({path:path.join(OUT,name+'-action-wheel.png')});
      const before=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),input=await page.evaluate(()=>window.Astraball.metrics().input.cellActivations);
      await page.locator('[data-mode="pass"]').click();assert.equal(await wheel.getAttribute('data-open'),'false');
      assert.equal(await page.locator('[data-mode="shoot"]').isVisible(),false);
      await page.getByRole('button',{name:'Momo',exact:true}).click();
      assert.match(await page.locator('#analysis-detail').textContent(),/Trajectoire libre/);
      await page.locator('#cancel-target').click();assert.equal(await wheel.getAttribute('data-open'),'true');
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),before,'choosing/cancelling an action cannot mutate the match');
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().input.cellActivations),input,'menu tap must never reach the canvas');
      await page.locator('#action-toggle').focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-mode="move"]').evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-mode="pass"]').evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('Escape');assert.equal(await wheel.getAttribute('data-open'),'false');
      await page.locator('#action-toggle').click();
      await page.locator('#zoom-in').click();await bounded();
      const anchor=await page.evaluate(()=>({cell:window.Astraball.cell(7,3),link:document.querySelector('.wheel-link').getAttribute('d')}));
      assert.ok(anchor.link.startsWith(`M ${anchor.cell.x} ${anchor.cell.y} L `),'menu anchor follows actual camera coordinates');
      await page.locator('#help').click();assert.equal(await wheel.isVisible(),false);
      await page.keyboard.press('Escape');assert.equal(await wheel.isVisible(),true);
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await wheel.isVisible(),false);
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await page.locator('[data-mode="move"]').click();
      const move=core.legalMoves(fixture).find(p=>p.x===6&&p.y===3);assert.ok(move);
      const p=await page.evaluate(c=>window.Astraball.cell(c.x,c.y),move),box=await page.locator('#canvas-host').boundingBox();
      if(width<761)await page.touchscreen.tap(box.x+p.x,box.y+p.y);else await page.mouse.click(box.x+p.x,box.y+p.y);
      await page.waitForFunction(()=>window.Astraball.snapshot().moved&&!window.Astraball.metrics().busy);
      assert.equal(await wheel.getAttribute('data-open'),'true');assert.equal(await page.locator('[data-mode="move"]').isDisabled(),true);
      const saved=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),saved);await bounded();
      await page.locator('#wait').click();await page.waitForFunction(()=>!window.Astraball.metrics().busy);
      assert.notEqual(await page.evaluate(()=>window.Astraball.snapshot().activeId),'t0-kaylis');
      assert.equal(await page.locator('[data-mode="pass"]').isDisabled(),true,'next player has no ball');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
      assert.deepEqual(errors,[]);
    }finally{await context.close();}
  }
};
