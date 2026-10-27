'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('./gaming-book.js');
test('only the fourth Momo victory opens a Gaming Book',()=>{
  const game={phase:'over',winner:0,journey:{bookId:'momo-petits-bonheurs',stage:3}};
  assert(api.victorious(game));
  for(const patch of [{winner:1},{winner:'draw'},{phase:'result'},{journey:{...game.journey,stage:2}},{journey:{...game.journey,stage:4}},{journey:{bookId:'balmhyr-retour',stage:3}}])assert(!api.victorious({...game,...patch}));
  assert(api.supports({id:game.journey.bookId,rewardModelId:'30000001'}));
  assert(!api.supports({id:game.journey.bookId,rewardModelId:'30000014'}));
});
test('reading bookmarks are bounded and never resume autoplay halfway through music',async()=>{
  const {checkpoint,restore}=await import('./gaming-book/momo/checkpoint.mjs');
  const {passages,createStory,enterStory}=await import('./gaming-book/momo/story.mjs');
  const config=JSON.parse(fs.readFileSync(__dirname+'/gaming-book/momo/scene.json'));
  for(const phase of Object.keys(passages).filter(p=>!['playing','finalPlaying'].includes(p))){
    const story=createStory();enterStory(story,phase);
    for(let beat=0;beat<passages[phase].length;beat++){
      story.beat=beat;
      const result=restore(checkpoint(story,{x:900}),config);
      assert.equal(result.story.phase,phase);assert.equal(result.story.beat,beat);
      assert.equal(result.story.elapsed,0);assert.equal(result.story.acknowledged,false);
    }
  }
  for(const phase of ['film','finalPlaying'])assert.equal(restore({version:1,phase,beat:0,acknowledged:true,x:1780},config).story.phase,'seated');
  assert.equal(restore({version:1,phase:'playing',beat:0,acknowledged:true,x:1200},config).story.phase,'firstNote');
  for(const invalid of [null,{}, {version:1,phase:'ending',beat:99,acknowledged:true,x:10}, {version:1,phase:'finding',beat:1,acknowledged:false,x:Infinity}])assert.equal(restore(invalid,config).story.phase,'introBlack');
  const bounded=restore({version:1,phase:'road',beat:0,acknowledged:false,x:1e10},config);
  assert.equal(bounded.actor.x,config.route.seatX);
});
test('production scene is allowlisted without prototype tools or sources',()=>{
  const files=require('./gaming-book/runtime-files.json');
  assert(files.includes('momo/host.mjs'));assert.equal(new Set(files).size,files.length);
  assert(files.every(f=>f.startsWith('momo/')&&!f.includes('..')&&!/(tools|sources|qa|revisions)/.test(f)));
  for(const file of files)assert(fs.existsSync(__dirname+'/gaming-book/'+file));
});
