const test=require('node:test'),assert=require('node:assert/strict');
const {calibration,torsoAnchor,compactPalette,validateSourceOrigins,placeFrame,pagePlacement,scan,bake}=require('../tools/sprite-v2-bake.cjs');
const {checkSequences}=require('../tools/sprite-template-v2.cjs');
test('native imports reject missing, static and reused run drawings without certifying motion',async()=>{
  const {CLIPS}=await import('../animation-kit/template-v2.mjs');
  const hashes=Array.from({length:64},(_,i)=>String(i));
  assert.deepEqual(checkSequences(hashes,CLIPS),[]);
  const missing=[...hashes];missing[5]=null;
  assert.match(checkSequences(missing,CLIPS).join(' '),/Missing drawings in clip run/);
  const repeated=[...hashes];repeated[5]=repeated[4];
  assert.match(checkSequences(repeated,CLIPS).join(' '),/six distinct/);
  const staticIdle=[...hashes];staticIdle.fill('same',0,4);
  assert.match(checkSequences(staticIdle,CLIPS).join(' '),/Static repeated drawings in clip idle/);
});
test('offline source calibration is explicit, current and common to all sixteen poses',()=>{
  const parts=Array.from({length:16},()=>({height:250})),source={file:'hero/source-0-r1.png'};
  const recipe={file:source.file,referenceFrame:0,crownInsetPx:25};
  const result=calibration(recipe,source,parts,90);
  assert.equal(result.sourceScale,.4);assert.equal(result.sourceBody,225);
  assert.deepEqual(result.order,Array.from({length:16},(_,i)=>i));
  assert.throws(()=>calibration({...recipe,file:'old.png'},source,parts,90),/stale/);
  assert.throws(()=>calibration({...recipe,crownInsetPx:250},source,parts,90),/cranial/);
  assert.throws(()=>calibration({...recipe,referenceFrame:16},source,parts,90),/frame/);
  assert.throws(()=>calibration({...recipe,order:Array(16).fill(0)},source,parts,90),/every drawing/);
});
test('proposed torso anchor ignores transparent padding without manufacturing hand sockets',()=>{
  const labels=new Uint16Array(100*100),part={left:10,top:10,width:60,height:80,label:1};
  for(let y=10;y<90;y++)for(let x=30;x<50;x++)labels[y*100+x]=1;
  assert.equal(torsoAnchor(part,labels,100),29);
});

test('anatomical calibration excludes measured hardware below the sole with one factor per page',()=>{
  const source={file:'hero/source-0-r1.png'},parts=Array.from({length:16},()=>({height:250}));
  const recipe={file:source.file,referenceFrame:0,crownInsetPx:10};
  const original=calibration(recipe,source,parts,118);
  assert.equal(original.soleInsetPx,0);assert.equal(original.sourceBody,240);
  const measured=calibration({...recipe,soleInsetPx:20},source,parts,118);
  assert.equal(measured.sourceBody,220);assert.equal(measured.sourceScale,118/220);
  assert.deepEqual(calibration({...recipe,soleInsetPx:0},source,parts,118),original);
  for(const soleInsetPx of [null,'20',-1,.5,240,250,NaN,Infinity])assert.throws(()=>calibration({...recipe,soleInsetPx},source,parts,118),/sole measurement/);
  for(let local=0;local<16;local++){
    const part={left:20,top:10,width:100,height:150+local},origins=originFixture();
    origins.points[local]={x:70,y:part.top+part.height,grounded:true};
    const placed=placeFrame({part,index:local,sourceLocal:local,sourceScale:measured.sourceScale,origins});
    assert.equal(placed.h,Math.round(part.height*118/220));
    assert.equal(placed.top+placed.h,272);
  }
});
const originFixture=()=>({schemaVersion:1,sourceSha256:'a'.repeat(64),coordinateSpace:'source-pixels',method:'manual',review:'proposed',
  note:'Source ground line measured manually; placement remains unapproved.',
  points:Array.from({length:16},()=>({x:40,y:100,grounded:true}))});
test('source origins require all sixteen measured points bound to the exact source',()=>{
  const origins=originFixture(),dimensions={width:100,height:100};
  assert.equal(validateSourceOrigins(undefined,'a'.repeat(64),dimensions),null);
  assert.equal(validateSourceOrigins(origins,'a'.repeat(64),dimensions),origins);
  assert.throws(()=>validateSourceOrigins(origins,'b'.repeat(64),dimensions),/stale/);
  for(const [field,value] of [['schemaVersion',2],['coordinateSpace','native-pixels'],['method','automatic'],['review','approved'],['note',''],['points',origins.points.slice(1)]]){
    assert.throws(()=>validateSourceOrigins({...origins,[field]:value},'a'.repeat(64),dimensions));
  }
  for(const point of [{x:-1,y:20,grounded:true},{x:1.2,y:20,grounded:true},{x:101,y:20,grounded:true},{x:40,y:101,grounded:true},{x:40,y:20},{x:40,y:20,grounded:true,scale:2}]){
    const invalid=structuredClone(origins);invalid.points[3]=point;
    assert.throws(()=>validateSourceOrigins(invalid,'a'.repeat(64),dimensions));
  }
});
test('manual source origins preserve airborne clearance without per-frame scale or runtime offsets',()=>{
  const part={left:10,top:20,width:60,height:80},origins=originFixture();
  origins.points[3]={x:45,y:120,grounded:false};
  const positioned=placeFrame({part,index:7,sourceLocal:3,sourceScale:.5,origins});
  assert.deepEqual(positioned,{left:142,top:222,w:30,h:40,sourceAnchor:{x:45,y:120},anchorMode:'manual-proposal',airborne:true});
  assert.equal(272-positioned.top-positioned.h,10);
  const grounded=placeFrame({part,index:7,sourceLocal:0,sourceScale:.5,origins});
  assert.equal(grounded.top+grounded.h,272);
  assert.equal(grounded.w,positioned.w);assert.equal(grounded.h,positioned.h);
  assert.equal(grounded.airborne,false);
});
test('automatic placement stays pixel-identical while its jump provenance describes the real origin',()=>{
  const width=100,labels=new Int32Array(100*100),part={left:10,top:10,width:60,height:80,label:1};
  for(let y=10;y<90;y++)for(let x=30;x<50;x++)labels[y*width+x]=1;
  const sourceScale=.4,referenceFullHeight=40;
  for(let index=0;index<64;index++){
    const actual=placeFrame({part,index,sourceLocal:index%16,sourceScale,referenceFullHeight,labels,width});
    const anchorX=[39,40,62,63].includes(index)?Math.round(part.width*.5):torsoAnchor(part,labels,width);
    const oldTop=[12,13,14].includes(index)?272-referenceFullHeight-({12:14,13:32,14:12}[index]):272-Math.round(part.height*sourceScale);
    assert.equal(actual.left,160-Math.round(anchorX*sourceScale));
    assert.equal(actual.top,oldTop);
    assert.equal(Math.round((actual.sourceAnchor.y-part.top)*sourceScale),272-oldTop);
    assert.equal(actual.anchorMode,'automatic-proposal');
  }
});
test('native bake records manual and authored placement without certifying motion or changing native scale',async()=>{
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
  const sharp=require(path.join(process.env.KALISTAR_NODE_MODULES,'sharp'));
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-origin-test-')),sources=[],recipes=[];
  try{
    for(let page=0;page<4;page++){
      const width=600,data=Buffer.alloc(width*width*4),points=[];
      for(let local=0;local<16;local++){
        const left=(local%4)*150+35,top=Math.floor(local/4)*150+30,w=46+local,h=60;
        for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++)data.set([80+page*30+(x-left)%30,60+local*6,80+(y-top)%60,255],(y*width+x)*4);
        points.push({x:left+Math.floor(w/2),y:top+h+(local===6?12:0),grounded:local!==6});
      }
      const file='source-'+page+'.png',absolute=path.join(out,file);
      await sharp(data,{raw:{width,height:width,channels:4}}).png().toFile(absolute);
      const sha256=crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
      sources.push({page,file,sha256});
      recipes.push({file,referenceFrame:0,crownInsetPx:0,sourceOrigins:{...originFixture(),sourceSha256:sha256,points}});
    }
    fs.writeFileSync(path.join(out,'production.json'),JSON.stringify({authorization:'test-only',entries:[{characterId:'fixture',modelId:'30000001',name:'Fixture',heightCm:100,weapon:'Poing',sources}]}));
    fs.writeFileSync(path.join(out,'calibration.json'),JSON.stringify({actors:{fixture:recipes}}));
    const result=await bake('fixture',{out}),actor=JSON.parse(fs.readFileSync(path.join(result.directory,'actor.json')));
    const authored=JSON.parse(fs.readFileSync(path.join(result.directory,'authoring.json')));
    assert.equal(actor.frames[6].grounded,false);
    assert.equal(actor.frames[5].grounded,true);
    assert.equal(actor.reviews.motion,false);assert.equal(actor.reviews.anchors,false);
    assert.equal(actor.production.runtimeScale,1);
    assert.equal(authored.frames[6].anchorMode,'manual-proposal');
    assert.equal(authored.sourcePages[0].sourceOrigins.sourceSha256,sources[0].sha256);
    assert.ok(authored.frames[6].nativeBounds.y+authored.frames[6].nativeBounds.height<272);
    assert.equal(actor.frames[6].sockets.mainHand,null);
    assert.equal(authored.palette.method,'canonical-glyphs-v1');
    assert.equal(authored.palette.colors,127);
    const oldPageHashes=actor.pages.map(p=>p.sha256);
    for(const [page,recipe] of recipes.slice(0,1).entries()){
      const {info,parts}=await scan(path.join(out,recipe.file));
      delete recipe.sourceOrigins;
      recipe.authoredPlacement={schemaVersion:1,status:'authored-proposal',
        source:{sha256:sources[page].sha256,width:info.width,height:info.height,page,order:Array.from({length:16},(_,i)=>i)},
        observations:{method:'manual',coordinateSpace:'source-pixels',status:'proposed',note:'Synthetic fixture landmarks, not character anatomy approval.',
          frames:parts.map((p,sourceLocal)=>({sourceLocal,pelvis:{x:p.left+Math.floor(p.width/2),y:p.top+30,uncertaintyPx:0},contact:{x:p.left+Math.floor(p.width/2),y:p.top+p.height,uncertaintyPx:0}}))},
        preset:{id:'fixture-flight',status:'authored-proposal',note:'Synthetic sixteenth-frame contract fixture only.',horizontalPolicy:'pelvis-to-root',contactPolicy:'observed-sole-to-ground',
          frames:Array.from({length:16},(_,i)=>i===6?{phase:'flight',mode:'flight',curve:'constant'}:{phase:'support',mode:'contact'}),
          flight:{baselineFrames:[0,1,2,3],constantRisePx:14,parabolaPeakRisePx:32,minimumClearancePx:1}}};
      assert.throws(()=>pagePlacement({...recipe,sourceOrigins:originFixture()},sources[page],{info,parts},64,page),/never both/);
      const stale=structuredClone(recipe);stale.authoredPlacement.source.sha256='f'.repeat(64);
      assert.throws(()=>pagePlacement(stale,sources[page],{info,parts},64,page),/stale source SHA/);
    }
    fs.writeFileSync(path.join(out,'calibration.json'),JSON.stringify({actors:{fixture:recipes}}));
    const next=await bake('fixture',{out});
    const placedActor=JSON.parse(fs.readFileSync(path.join(next.directory,'actor.json')));
    const placed=JSON.parse(fs.readFileSync(path.join(next.directory,'authoring.json')));
    assert.notEqual(next.directory,result.directory);
    for(const [page,originalHash] of oldPageHashes.entries()){
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(result.directory,`body-${page}.png`))).digest('hex'),originalHash);
      assert.deepEqual(placed.sourcePages[page].authoredPlacement,recipes[page].authoredPlacement);
      if(page>0){
        assert.deepEqual(placed.sourcePages[page].sourceOrigins,recipes[page].sourceOrigins);
        assert.equal(placedActor.pages[page].sha256,originalHash,'moving page zero cannot recolour another page');
      }
      assert.equal(placed.sourcePages[page].sourceScale,64/60);
      assert.equal(placedActor.frames[page*16+6].grounded,false);
      assert.equal(placedActor.frames[page*16+5].grounded,true);
    }
    assert.equal(placed.frames[6].anchorMode,'authored-proposal');
    assert.equal(placed.frames[6].sourceAnchor,undefined);
    assert.equal(placed.frames[6].virtualOrigin.sampling,false);
    assert.equal(placed.frames[6].supportIsMeasuredFact,false);
    assert.equal(placed.sourcePages[0].resolvedPlacement.frames[6].clearancePx,14);
    assert.equal(placedActor.production.runtimeScale,1);
    assert.equal(placedActor.reviews.motion,false);assert.equal(placedActor.reviews.anchors,false);
    assert.equal(placedActor.frames[6].sockets.mainHand,null);
    assert.notEqual(placedActor.pages[0].sha256,oldPageHashes[0]);
    assert.deepEqual(placed.palette,authored.palette);
    for(let index=0;index<64;index++){
      const page=Math.floor(index/16),local=index%16;
      const extract=async(directory,frame)=>{
        const b=frame.nativeBounds;
        return sharp(path.join(directory,`body-${page}.png`)).extract({left:local%4*320+b.x,top:Math.floor(local/4)*320+b.y,width:b.width,height:b.height}).ensureAlpha().raw().toBuffer();
      };
      assert.deepEqual(await extract(next.directory,placed.frames[index]),await extract(result.directory,authored.frames[index]),'RGBA glyph '+index+' is independent of placement');
    }
    const repeat=await bake('fixture',{out}),repeatActor=JSON.parse(fs.readFileSync(path.join(repeat.directory,'actor.json')));
    assert.deepEqual(repeatActor.pages,placedActor.pages);
    const legacy=await bake('fixture',{out,paletteMode:'legacy-placed-v1'});
    assert.equal(JSON.parse(fs.readFileSync(path.join(legacy.directory,'authoring.json'))).palette.method,'legacy-placed-v1');
    const legacyRepeat=await bake('fixture',{out,paletteMode:'legacy-placed-v1'});
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(legacyRepeat.directory,'actor.json'))).pages,JSON.parse(fs.readFileSync(path.join(legacy.directory,'actor.json'))).pages);
    await assert.rejects(bake('fixture',{out,paletteMode:'unknown'}),/Unknown native palette mode/);
    const soleRecipes=recipes.map(recipe=>({...recipe,soleInsetPx:5}));
    fs.writeFileSync(path.join(out,'calibration.json'),JSON.stringify({actors:{fixture:soleRecipes}}));
    const soleBake=await bake('fixture',{out});
    const soleAuthored=JSON.parse(fs.readFileSync(path.join(soleBake.directory,'authoring.json')));
    for(const p of soleAuthored.sourcePages){assert.equal(p.soleOffset,5);assert.equal(p.sourceBody,55);assert.equal(p.sourceScale,64/55);}
    assert.equal(JSON.parse(fs.readFileSync(path.join(soleBake.directory,'actor.json'))).production.runtimeScale,1);
  }finally{
    const resolved=path.resolve(out),temporaryRoot=path.resolve(os.tmpdir());
    assert.equal(path.dirname(resolved),temporaryRoot);
    assert.ok(path.basename(resolved).startsWith('kalistar-origin-test-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
test('shared palette reserves transparency without moving pixels or altering alpha',()=>{
  const pixels=Buffer.from([3,4,5,0,10,10,10,255,10,10,10,255,11,10,10,255,250,250,250,255]);
  const original=Buffer.from(pixels),result=compactPalette(pixels,2);
  assert.equal(result.colors,2);
  assert.deepEqual(result.merges,[{from:0x0b0a0a,to:0x0a0a0a,pixels:1,squaredDistance:1}]);
  assert.deepEqual(result.pixels,Buffer.from([3,4,5,0,10,10,10,255,10,10,10,255,10,10,10,255,250,250,250,255]));
  assert.deepEqual(pixels,original);
  assert.deepEqual(compactPalette(pixels,3),{pixels,colors:3,merges:[]});
});
test('128 opaque colours plus transparency become 127 shared opaque colours deterministically',()=>{
  const pixels=Buffer.alloc(129*4);
  for(let i=0;i<128;i++)pixels.set([i,20,30,255],i*4);
  const first=compactPalette(pixels),second=compactPalette(pixels);
  assert.equal(first.colors,127);assert.equal(first.merges.length,1);
  assert.deepEqual(first,second);
  for(let i=3;i<pixels.length;i+=4)assert.equal(first.pixels[i],pixels[i]);
  const soft=Buffer.from([1,2,3,128]);
  assert.throws(()=>compactPalette(soft),/binary alpha/);
  assert.throws(()=>compactPalette(pixels,0),/palette limit/);
});
test('repeated palette merges resolve earlier mappings and the rounded 256-entry PNG case',()=>{
  const chain=Buffer.from([0,0,0,255,1,0,0,255,2,0,0,255,255,0,0,255]);
  assert.deepEqual(compactPalette(chain,1).pixels,Buffer.from([0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255]));
  const pixels=Buffer.alloc(256*4);
  for(let i=0;i<255;i++)pixels.set([i,100,50,255],i*4);
  const result=compactPalette(pixels),opaque=new Set();
  for(let i=0;i<result.pixels.length;i+=4){
    assert.equal(result.pixels[i+3],pixels[i+3]);
    if(result.pixels[i+3])opaque.add(result.pixels.subarray(i,i+3).toString('hex'));
  }
  assert.equal(opaque.size,127);assert.equal(result.merges.length,128);
});
