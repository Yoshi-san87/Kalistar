'use strict';
const path=require('node:path');
const sharp=(...args)=>require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','sharp'))(...args);
const COUNT=64,COLUMNS=8,ROWS=8,CELL=320,INSET=4,SIDE=COLUMNS*CELL,LIMIT=127;
const OPTIONS={palette:true,colours:128,quality:95,dither:0,effort:10};
function check(ok,message){if(!ok)throw Error('Canonical palette: '+message);}
function record(value,keys,label){
  check(value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),label+' must be a plain object');
  const actual=Reflect.ownKeys(value);
  check(actual.length===keys.length&&actual.every(key=>keys.includes(key)),label+' has missing or unknown fields');
  for(const key of keys)check(Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'),label+' must contain data, not accessors');
}
function dense(value,length,label){
  check(Array.isArray(value)&&value.length===length&&Reflect.ownKeys(value).length===length+1,label+' needs '+length+' dense entries');
  for(let i=0;i<length;i++)check(Object.hasOwn(value,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,String(i)),'value'),label+' must contain data at '+i);
}
function inspect(pixels,reference,label){
  check(Buffer.isBuffer(pixels)&&pixels.length===reference.length,label+' must preserve RGBA buffer length');
  const colors=new Set();
  for(let i=0;i<pixels.length;i+=4){
    check(pixels[i+3]===reference[i+3],label+' changed alpha');
    if(pixels[i+3])colors.add(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]);
  }
  return colors.size;
}

/**
 * In-memory, frame-ordered glyphs only; no placement, resize, IO or approval.
 * Inject the existing synchronous compactPalette(rgba, limit) from the caller,
 * so this module never imports bake. Scatter the returned glyphs AFTER this step.
 * At most 127 opaque colors bypass both reducers; null palette option fields mean not applied.
 */
async function quantizeGlyphs(glyphs,options){
  record(options,['compactPalette'],'options');
  const {compactPalette}=options;check(typeof compactPalette==='function','compactPalette must be a function');
  dense(glyphs,COUNT,'glyphs');
  const inputs=[];
  for(let index=0;index<COUNT;index++){
    const glyph=glyphs[index];record(glyph,['pixels','width','height'],'glyph '+index);
    const {pixels,width,height}=glyph;
    for(const [key,value] of [['width',width],['height',height]])check(Number.isInteger(value)&&value>0&&value<=CELL-2*INSET,'glyph '+index+' '+key+' must be an integer in 1..312');
    check(Buffer.isBuffer(pixels)&&pixels.length===width*height*4,'glyph '+index+' needs exact RGBA Buffer length');
    for(let i=3;i<pixels.length;i+=4)check(pixels[i]===0||pixels[i]===255,'glyph '+index+' needs binary alpha');
    inputs.push({pixels,width,height});
  }
  // Fixed packing removes native placement from palette learning; invisible RGB is canonical zero.
  const atlas=Buffer.alloc(SIDE*SIDE*4),inputColors=new Set();
  for(const [index,{pixels,width,height}] of inputs.entries()){
    const left=index%COLUMNS*CELL+INSET,top=Math.floor(index/COLUMNS)*CELL+INSET;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const source=(y*width+x)*4;if(!pixels[source+3])continue;
      inputColors.add(pixels[source]*65536+pixels[source+1]*256+pixels[source+2]);
      pixels.copy(atlas,((top+y)*SIDE+left+x)*4,source,source+4);
    }
  }
  const inputOpaqueColors=inputColors.size,quantizationApplied=inputOpaqueColors>LIMIT;
  let compacted={pixels:atlas,colors:inputOpaqueColors,merges:[]},quantizedOpaqueColors=null,merges=[];
  // Sharp quality 95 may merge even a small palette. Already compliant RGB must be lossless.
  if(quantizationApplied){
    const candidate=await sharp(atlas,{raw:{width:SIDE,height:SIDE,channels:4}}).png(OPTIONS).toBuffer();
    const quantized=await sharp(candidate).ensureAlpha().raw().toBuffer();
    quantizedOpaqueColors=inspect(quantized,atlas,'quantizer');
    compacted=compactPalette(quantized,LIMIT);
    record(compacted,['pixels','colors','merges'],'compaction result');
    const colors=inspect(compacted.pixels,atlas,'compactor');
    check(colors<=LIMIT&&compacted.colors===colors,'compactor must report the actual global palette of at most 127 opaque colors');
    check(Array.isArray(compacted.merges),'compactor merges must be an array');
    dense(compacted.merges,quantizedOpaqueColors-colors,'compactor merges');
    merges=compacted.merges.map(merge=>{
      record(merge,['from','to','pixels','squaredDistance'],'merge');
      for(const key of ['from','to'])check(Number.isInteger(merge[key])&&merge[key]>=0&&merge[key]<=0xffffff,'invalid merge color');
      check(Number.isInteger(merge.pixels)&&merge.pixels>0&&merge.pixels<=SIDE*SIDE,'invalid merge population');
      check(Number.isInteger(merge.squaredDistance)&&merge.squaredDistance>=0&&merge.squaredDistance<=3*255*255,'invalid merge distance');
      return {...merge};
    });
  }
  const result=inputs.map(({width,height},index)=>{
    const pixels=Buffer.alloc(width*height*4),left=index%COLUMNS*CELL+INSET,top=Math.floor(index/COLUMNS)*CELL+INSET;
    for(let y=0;y<height;y++)compacted.pixels.copy(pixels,y*width*4,((top+y)*SIDE+left)*4,((top+y)*SIDE+left+width)*4);
    for(let i=0;i<pixels.length;i+=4)if(!pixels[i+3])pixels.fill(0,i,i+4);
    return {pixels,width,height};
  });
  return {glyphs:result,palette:{method:'canonical-glyphs-v1',colors:compacted.colors,inputOpaqueColors,quantizationApplied,quantizedOpaqueColors,
    colours:quantizationApplied?OPTIONS.colours:null,quality:quantizationApplied?OPTIONS.quality:null,
    dither:quantizationApplied?OPTIONS.dither:null,effort:quantizationApplied?OPTIONS.effort:null,
    grid:{columns:COLUMNS,rows:ROWS,cell:CELL,inset:INSET},merges}};
}
module.exports={quantizeGlyphs};
