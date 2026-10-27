'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('./gaming-book.js');
test('narration preserves sentences and graphemes with short punctuation pauses',async()=>{
  const {formatNarration,narrationGlyphs,glyphDelay,typingDefaults}=await import('./gaming-book/momo/narration.mjs');
  assert.equal(formatNarration('La casse. Une melodie.'),'La casse.\nUne melodie.');
  assert.equal(narrationGlyphs('e\u0301')[0],'e\u0301');
  assert(glyphDelay('.')>glyphDelay(','));assert(glyphDelay(',')>glyphDelay('a'));
  const config=JSON.parse(fs.readFileSync(__dirname+'/gaming-book/momo/scene.json'));
  assert.deepEqual(config.narration,typingDefaults);
});
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

test('reading yields a clear scene and later melodies return silently to their gameplay phase',async()=>{
  const {createStory,enterStory,continueStory,narrative,hasDialogue,canPlay,canMove,beginPlay,finishPlay,cinematicState}=await import('./gaming-book/momo/story.mjs');
  const {checkpoint,restore}=await import('./gaming-book/momo/checkpoint.mjs');
  const config=JSON.parse(fs.readFileSync(__dirname+'/gaming-book/momo/scene.json'));
  const s=createStory();enterStory(s,'road');s.beat=1;s.beatElapsed=10000;
  assert(narrative(s));assert(continueStory(s));assert(canMove(s));assert.equal(narrative(s),'');
  enterStory(s,'firstNote');s.hasFlute=true;s.acknowledged=true;
  assert(beginPlay(s));assert(hasDialogue(s));finishPlay(s);assert(hasDialogue(s));assert(s.performanceComplete);
  for(const phase of ['journey','nightWalk']){
    enterStory(s,phase);s.acknowledged=true;s.firstMagic=true;s.nightStarted=phase==='nightWalk';s.night=s.nightStarted?1:0;
    for(let n=0;n<3;n++){
      assert(canPlay(s));assert(beginPlay(s));assert(!hasDialogue(s));assert.equal(narrative(s),'');assert(!canMove(s));assert(!beginPlay(s));
      const resumed=restore(checkpoint(s,{x:1500}),config).story;
      assert.equal(resumed.phase,phase);assert(canMove(resumed));assert(canPlay(resumed));assert.equal(narrative(resumed),'');
      assert.equal(resumed.nightStarted,phase==='nightWalk');
      finishPlay(s);assert.equal(s.phase,phase);assert(canMove(s));assert.equal(narrative(s),'');
    }
  }
  enterStory(s,'abandoned');s.beat=3;s.beatElapsed=0;
  const start=cinematicState(s).mood;s.beatElapsed=1400;
  assert(cinematicState(s).mood>start);assert.equal(cinematicState(s).mood,.72);
  enterStory(s,'roadToFlute');assert.equal(cinematicState(s).mood,.72);
  s.elapsed=1500;assert.equal(cinematicState(s).mood,0);
});
