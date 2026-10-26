'use strict';
// Image reduction needs Sharp; the dependency-free contract has its own test.
const test=require('node:test'),assert=require('node:assert/strict');
const {quantizeGlyphs}=require('../tools/sprite-v2-palette.cjs');
const {compactPalette}=require('../tools/sprite-v2-bake.cjs');
const options={compactPalette};
function solid(width=1,height=1,color=[40,80,120,255]){
  const pixels=Buffer.alloc(width*height*4);for(let i=0;i<pixels.length;i+=4)pixels.set(color,i);
  return {pixels,width,height};
}
const fixture=()=>Array.from({length:64},()=>solid());
function limited(count){
  return Array.from({length:64},(_,index)=>{
    const glyph=solid(3,1,[0,0,0,0]);
    for(let x=0;x<2;x++){const n=(index*2+x)%count;glyph.pixels.set([n,n*13%256,n*71%256,255],x*4);}
    return glyph;
  });
}
function rich(){
  return Array.from({length:64},(_,index)=>{
    const width=17+index%5,height=19+Math.floor(index/5)%4,pixels=Buffer.alloc(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const n=index*1000+y*width+x,i=(y*width+x)*4;
      pixels.set([(n*37)%256,(n*73+(n>>8)*19)%256,(n*53+(n>>4)*33)%256,(x+y+index)%5===0?0:255],i);
    }
    pixels.set([220,40,110,255],(width+1)*4);
    return {pixels,width,height};
  });
}
function colors(glyphs){const set=new Set();for(const {pixels} of glyphs)for(let i=0;i<pixels.length;i+=4)if(pixels[i+3])set.add(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]);return set;}
function geometry(before,after){
  assert.equal(after.length,64);
  for(let index=0;index<64;index++){
    const a=before[index],b=after[index];assert.deepEqual([b.width,b.height],[a.width,a.height]);
    assert.ok(Buffer.isBuffer(b.pixels));assert.equal(b.pixels.length,a.pixels.length);
    for(let i=3;i<a.pixels.length;i+=4)assert.equal(b.pixels[i],a.pixels[i],'alpha at glyph '+index+' byte '+i);
  }
}
async function rejects(edit,pattern=/Canonical palette:/){const glyphs=fixture();edit(glyphs);await assert.rejects(quantizeGlyphs(glyphs,options),pattern);}

test('the helper exports one async API and has no dependency on bake',()=>{
  assert.deepEqual(Object.keys(require('../tools/sprite-v2-palette.cjs')),['quantizeGlyphs']);
  const own=require.cache[require.resolve('../tools/sprite-v2-palette.cjs')];
  assert.ok(!own.children.some(child=>child.id.endsWith('sprite-v2-bake.cjs')));
});

test('the current synchronous compactor must be explicitly injected',async()=>{
  for(const value of [undefined,null,false,{},[],{compactPalette:null},{compactPalette:42},{compactPalette,limit:64}])await assert.rejects(quantizeGlyphs(fixture(),value),/Canonical palette:/);
  let read=false;
  await assert.rejects(quantizeGlyphs(fixture(),{get compactPalette(){read=true;return compactPalette;}}),/accessors/);
  assert.equal(read,false);
});

test('exactly 64 dense frame-ordered glyphs are required',async()=>{
  for(const value of [null,{},new Uint8Array(64),[],fixture().slice(0,63),[...fixture(),solid()]])await assert.rejects(quantizeGlyphs(value,options),/64 dense/);
  await rejects(g=>{delete g[20];},/dense/);
  await rejects(g=>{g.x=160;},/dense/);
  let invoked=false;
  await rejects(g=>Object.defineProperty(g,0,{get(){invoked=true;return solid();}}),/contain data/);
  assert.equal(invoked,false);
});

test('glyphs have exactly pixels, width and height as plain data',async()=>{
  for(const value of [null,[],{},new Date(),{pixels:Buffer.alloc(4),width:1}])await rejects(g=>{g[63]=value;});
  await rejects(g=>{Object.setPrototypeOf(g[1],{width:1});},/plain object/);
  let invoked=false;
  await rejects(g=>Object.defineProperty(g[1],'width',{get(){invoked=true;return 1;}}),/accessors/);
  assert.equal(invoked,false);
  await rejects(g=>{g[3][Symbol('offset')]=1;},/unknown fields/);
});

test('all width and height values are positive integers bounded by 312',async()=>{
  for(const field of ['width','height'])for(const value of [0,-1,.5,313,Number.MAX_SAFE_INTEGER,Infinity,NaN,'1',null,undefined]){
    await rejects(g=>{g[63][field]=value;},/integer in 1..312/);
  }
});

test('RGBA requires Buffer with an exact byte length, not coercion',async()=>{
  for(const value of [null,[0,0,0,255],new Uint8Array(4),'rgba',Buffer.alloc(0),Buffer.alloc(3),Buffer.alloc(5),Buffer.alloc(8)]){
    await rejects(g=>{g[12].pixels=value;},/exact RGBA Buffer length/);
  }
});

test('partial alpha is rejected before compaction and never silently repaired',async()=>{
  for(const value of [1,127,128,254]){
    const glyphs=fixture();glyphs[63].pixels[3]=value;let calls=0;
    await assert.rejects(quantizeGlyphs(glyphs,{compactPalette(raw,limit){calls++;return compactPalette(raw,limit);}}),/binary alpha/);
    assert.equal(calls,0);assert.equal(glyphs[63].pixels[3],value);
  }
});

test('coordinates, identity overrides and configurable packing are absent from the input contract',async()=>{
  for(const key of ['x','y','left','top','origin','placement','scale','characterId','sourceLocal','index'])await rejects(g=>{g[0][key]=1;},/unknown fields/);
  for(const key of ['columns','rows','cell','inset','placements','scale','quality','colours'])await assert.rejects(quantizeGlyphs(fixture(),{compactPalette,[key]:2}),/unknown fields/);
});

test('canonical input is exactly eight by eight 320 cells with top-left inset four',async()=>{
  const glyphs=fixture();glyphs[0]=solid(312,312);glyphs[7]=solid(312,1);glyphs[8]=solid(1,312);glyphs[63]=solid(312,312);
  for(let i=0;i<129;i++)glyphs[0].pixels.set([i,80,120,255],i*4);
  let calls=0,packed;
  const result=await quantizeGlyphs(glyphs,{compactPalette(raw,limit){
    calls++;assert.equal(limit,127);assert.equal(raw.length,2560*2560*4);
    for(const [index,g] of glyphs.entries()){
      const left=index%8*320+4,top=Math.floor(index/8)*320+4;
      assert.equal(raw[((top)*2560+left)*4+3],255);
      assert.equal(raw[((top+g.height-1)*2560+left+g.width-1)*4+3],255);
      for(const [x,y] of [[left-1,top],[left,top-1],[left+g.width,top],[left,top+g.height]])assert.equal(raw[(y*2560+x)*4+3],0);
    }
    assert.equal(raw[3],0);assert.equal(raw.at(-1),0);
    packed=compactPalette(raw,limit);return packed;
  }});
  assert.equal(calls,1);geometry(glyphs,result.glyphs);
  for(const [index,{pixels,width,height}] of result.glyphs.entries()){
    const left=index%8*320+4,top=Math.floor(index/8)*320+4;
    for(let y=0;y<height;y++)assert.deepEqual(pixels.subarray(y*width*4,(y+1)*width*4),packed.pixels.subarray(((top+y)*2560+left)*4,((top+y)*2560+left+width)*4));
  }
  assert.deepEqual(result.palette.grid,{columns:8,rows:8,cell:320,inset:4});
});

test('a known small palette preserves the identity and order of all 64 glyphs',async()=>{
  const glyphs=Array.from({length:64},(_,i)=>Object.freeze(solid(1+i%3,1+Math.floor(i/3)%3,[(i%4)*85,(Math.floor(i/4)%4)*85,Math.floor(i/16)*85,255])));
  Object.freeze(glyphs);
  const actual=await quantizeGlyphs(glyphs,options);geometry(glyphs,actual.glyphs);
  for(let i=0;i<64;i++)assert.deepEqual(actual.glyphs[i].pixels,glyphs[i].pixels,'frame order '+i);
  assert.equal(colors(actual.glyphs).size,64);
});

test('conforming palettes including 127 rare colors bypass both reducers without losing RGBA',async()=>{
  for(const count of [1,64,127]){
    const glyphs=limited(count);
    if(count===127){
      const rarePair=glyphs[0].pixels.subarray(0,8);glyphs[0]=solid(312,312,[0,0,0,255]);rarePair.copy(glyphs[0].pixels);
    }
    const before=glyphs.map(g=>({...g,pixels:Buffer.from(g.pixels)}));
    assert.equal(colors(glyphs).size,count);
    const bypass={compactPalette(){assert.fail('A compliant palette must not invoke the compactor');}};
    const actual=await quantizeGlyphs(glyphs,bypass);geometry(glyphs,actual.glyphs);
    assert.deepEqual(actual.glyphs,before);assert.deepEqual(glyphs,before);
    assert.deepEqual(actual,await quantizeGlyphs(glyphs,bypass));
    for(let i=0;i<64;i++)assert.notEqual(actual.glyphs[i].pixels,glyphs[i].pixels);
    assert.deepEqual(actual.palette,{
      method:'canonical-glyphs-v1',colors:count,inputOpaqueColors:count,quantizationApplied:false,quantizedOpaqueColors:null,
      colours:null,quality:null,dither:null,effort:null,grid:{columns:8,rows:8,cell:320,inset:4},merges:[]
    });
  }
});

test('128 globally distinct colors require reduction even when each glyph has only two',async()=>{
  const glyphs=limited(128);assert.equal(colors(glyphs).size,128);
  assert.ok(glyphs.every(g=>colors([g]).size===2));let calls=0;
  const actual=await quantizeGlyphs(glyphs,{compactPalette(raw,limit){calls++;return compactPalette(raw,limit);}});
  assert.equal(calls,1);geometry(glyphs,actual.glyphs);
  assert.equal(actual.palette.inputOpaqueColors,128);assert.equal(actual.palette.quantizationApplied,true);
  assert.ok(Number.isInteger(actual.palette.quantizedOpaqueColors));assert.ok(actual.palette.colors<=127);
  assert.equal(colors(actual.glyphs).size,actual.palette.colors);
  assert.deepEqual([actual.palette.colours,actual.palette.quality,actual.palette.dither,actual.palette.effort],[128,95,0,10]);
});

test('one learned palette handles more than 128 colors globally across all 64 glyphs',async()=>{
  const glyphs=rich(),before=glyphs.map(g=>Buffer.from(g.pixels));assert.ok(colors(glyphs).size>128);
  let calls=0,reported;
  const richOutput=await quantizeGlyphs(glyphs,{compactPalette(raw,limit){calls++;reported=compactPalette(raw,limit);return reported;}});
  assert.equal(calls,1);geometry(glyphs,richOutput.glyphs);
  assert.ok(richOutput.palette.quantizedOpaqueColors>127);assert.equal(richOutput.palette.colors,127);
  assert.equal(colors(richOutput.glyphs).size,richOutput.palette.colors);
  assert.deepEqual(richOutput.palette.merges,reported.merges);assert.notEqual(richOutput.palette.merges,reported.merges);
  assert.notEqual(richOutput.palette.merges[0],reported.merges[0]);
  assert.equal(richOutput.palette.merges.length,richOutput.palette.quantizedOpaqueColors-richOutput.palette.colors);
  assert.equal(richOutput.palette.method,'canonical-glyphs-v1');
  assert.equal(richOutput.palette.quantizationApplied,true);assert.equal(richOutput.palette.inputOpaqueColors,colors(glyphs).size);
  assert.deepEqual([richOutput.palette.colours,richOutput.palette.quality,richOutput.palette.dither,richOutput.palette.effort],[128,95,0,10]);
  const marker=richOutput.glyphs[0].pixels.subarray((glyphs[0].width+1)*4,(glyphs[0].width+1)*4+4);
  for(let i=0;i<64;i++){
    assert.deepEqual(glyphs[i].pixels,before[i]);
    assert.deepEqual(richOutput.glyphs[i].pixels.subarray((glyphs[i].width+1)*4,(glyphs[i].width+1)*4+4),marker,'shared input color at glyph '+i);
  }
});

test('all 64 returned buffers and global palette repeat identically without placement data',async()=>{
  const first=await quantizeGlyphs(rich(),options);
  const repeat=await quantizeGlyphs(rich(),options);
  assert.deepEqual(repeat,first);
});

test('invisible RGB and object property order cannot change the learned palette',async()=>{
  const alternative=rich().map(({pixels,width,height},index)=>{
    for(let i=0;i<pixels.length;i+=4)if(!pixels[i+3])pixels.set([255-index,index,255],i);
    return {height,width,pixels};
  });
  const expected=await quantizeGlyphs(rich(),options);
  const actual=await quantizeGlyphs(alternative,options);assert.deepEqual(actual,expected);
});

test('fully transparent glyphs are valid and remain transparent without invented colors',async()=>{
  const glyphs=Array.from({length:64},()=>solid(2,3,[80,120,240,0]));
  const actual=await quantizeGlyphs(glyphs,{compactPalette(){assert.fail('Transparent input must not be quantized');}});geometry(glyphs,actual.glyphs);
  assert.equal(actual.palette.colors,0);assert.equal(actual.palette.inputOpaqueColors,0);
  assert.equal(actual.palette.quantizationApplied,false);assert.equal(actual.palette.quantizedOpaqueColors,null);assert.deepEqual(actual.palette.merges,[]);
  assert.deepEqual([actual.palette.colours,actual.palette.quality,actual.palette.dither,actual.palette.effort],[null,null,null,null]);
  assert.ok(actual.glyphs.every(g=>g.pixels.every(v=>v===0)));
});

test('bypassed inputs are snapshotted and outputs are independent buffers',async()=>{
  const shared=solid(),glyphs=Array.from({length:64},()=>({...shared}));
  const promise=quantizeGlyphs(glyphs,options);
  shared.pixels[3]=0;glyphs[0].width=300;
  const actual=await promise;
  for(const g of actual.glyphs){assert.equal(g.width,1);assert.equal(g.height,1);assert.equal(g.pixels[3],255);}
  assert.notEqual(actual.glyphs[0].pixels,actual.glyphs[1].pixels);assert.notEqual(actual.glyphs[0].pixels,shared.pixels);
  const second=Buffer.from(actual.glyphs[1].pixels);actual.glyphs[0].pixels.fill(0);
  assert.deepEqual(actual.glyphs[1].pixels,second);assert.equal(shared.pixels[3],0);
  assert.deepEqual(Object.keys(actual).sort(),['glyphs','palette']);
  assert.ok(actual.glyphs.every(g=>Object.keys(g).sort().join(',')==='height,pixels,width'));
  assert.ok(!/"(?:ready|review|approved|sockets|motion)"/.test(JSON.stringify(actual.palette)));
});

test('rich inputs are snapshotted before awaiting Sharp',async()=>{
  const expected=await quantizeGlyphs(rich(),options),glyphs=rich();
  const pending=quantizeGlyphs(glyphs,options);
  glyphs[0].pixels.fill(0);glyphs[0].width=300;
  assert.deepEqual(await pending,expected);
});

test('the lossless path canonicalizes only invisible RGB without changing alpha or opaque colors',async()=>{
  const glyphs=limited(127),expected=await quantizeGlyphs(glyphs,options);
  for(const {pixels} of glyphs)for(let i=0;i<pixels.length;i+=4)if(!pixels[i+3])pixels.set([70,80,90],i);
  const before=glyphs.map(g=>Buffer.from(g.pixels));
  const actual=await quantizeGlyphs(glyphs,options);geometry(glyphs,actual.glyphs);
  assert.deepEqual(actual,expected);
  glyphs.forEach((g,i)=>assert.deepEqual(g.pixels,before[i]));
});

test('invalid or asynchronous compactor return values fail instead of falling back',async()=>{
  for(const fn of [()=>null,()=>({}),raw=>({pixels:new Uint8Array(raw),colors:1,merges:[]}),raw=>({pixels:raw.subarray(4),colors:1,merges:[]}),async raw=>compactPalette(raw)]){
    await assert.rejects(quantizeGlyphs(rich(),{compactPalette:fn}),/Canonical palette:/);
  }
  const error=Error('Injected compactor failure');await assert.rejects(quantizeGlyphs(rich(),{compactPalette(){throw error;}}),e=>e===error);
});

test('compactor changes to opaque alpha, empty gutter or partial alpha are rejected',async()=>{
  for(const [pixel,value] of [[4*2560+5,0],[4*2560+5,128],[0,255]]){
    await assert.rejects(quantizeGlyphs(rich(),{compactPalette(raw){const result=compactPalette(raw);result.pixels[pixel*4+3]=value;return result;}}),/compactor changed alpha/);
  }
});

test('a global palette above 127 colors or a false reported count is rejected',async()=>{
  await assert.rejects(quantizeGlyphs(rich(),{compactPalette(raw){return {pixels:raw,colors:colors([{pixels:raw}]).size,merges:[]};}}),/at most 127/);
  await assert.rejects(quantizeGlyphs(rich(),{compactPalette(raw){const result=compactPalette(raw);result.colors++;return result;}}),/actual global palette/);
});

test('compaction provenance must contain the actual number of valid merge records',async()=>{
  for(const merges of [null,{},[{}]])await assert.rejects(quantizeGlyphs(rich(),{compactPalette(raw){return {...compactPalette(raw),merges};}}),/merges/);
  await assert.rejects(quantizeGlyphs(rich(),{compactPalette(raw){const result=compactPalette(raw);assert.ok(result.merges.length);result.merges[0].from=-1;return result;}}),/invalid merge color/);
});

test('canonical dimensions agree with the existing native cell and margin contract',async()=>{
  const {TEMPLATE,CLIPS}=await import('../animation-kit/template-v2.mjs');
  const result=await quantizeGlyphs(fixture(),options);
  assert.equal(result.palette.grid.cell,TEMPLATE.cell);assert.equal(result.palette.grid.inset,TEMPLATE.margin);
  assert.equal(Object.values(CLIPS).reduce((n,clip)=>n+clip.frames.length,0),64);
});
