'use strict';
const assert=require('node:assert/strict');
async function sceneFrame(page){
  await page.locator('.gaming-book-dialog iframe').waitFor();
  const real=await (await page.locator('.gaming-book-dialog iframe').elementHandle()).contentFrame();
  await real.waitForFunction(()=>globalThis.KalistarMomoScene?.snapshot().ready);
  return real;
}
async function playScene(frame){
  const page=frame.page();
  const state=()=>frame.evaluate(()=>KalistarMomoScene.snapshot());
  async function drain(phase){
    let guard=0,s=await state();
    while(s.story.phase===phase&&!s.story.acknowledged){
      assert(++guard<12);
      await frame.waitForFunction(()=>KalistarMomoScene.snapshot().canContinue,null,{timeout:20000});
      await frame.locator('#continue').click();s=await state();
    }
  }
  async function walk(phase){
    await frame.locator('#world').focus();await page.keyboard.down('ArrowRight');
    try{await frame.waitForFunction(p=>KalistarMomoScene.snapshot().story.phase===p,phase,{timeout:20000});}
    finally{await page.keyboard.up('ArrowRight');}
  }
  for(const phase of ['introBlack','introLight','introReveal','waking','road'])await drain(phase);
  await walk('search');await drain('search');await drain('afterCrate');
  await walk('abandoned');await drain('abandoned');await drain('roadToFlute');
  await walk('finding');await drain('finding');await drain('firstNote');
  await frame.locator('#flute').click();await drain('playing');await drain('surprised');await drain('journey');
  await walk('nightfall');await drain('nightfall');await walk('climbing');await drain('climbing');await drain('seating');await drain('seated');
  await frame.locator('#flute').click();await drain('finalPlaying');
  await frame.locator('#film[open]').waitFor();await frame.locator('#film-skip').click();
  await frame.locator('#ending:not([hidden])').waitFor();
  assert.equal((await state()).scheduled,false);
  await frame.locator('#exit').click();
}
module.exports={sceneFrame,playScene};
