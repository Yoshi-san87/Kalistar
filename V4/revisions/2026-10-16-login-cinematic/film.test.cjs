'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),assets=path.join(root,'V4/site/assets/cinematics');
function boxes(bytes,start=0,end=bytes.length){
  const found=[];let offset=start;
  while(offset+8<=end){
    let size=bytes.readUInt32BE(offset),header=8;const type=bytes.toString('ascii',offset+4,offset+8);
    if(size===1){size=Number(bytes.readBigUInt64BE(offset+8));header=16;}
    if(size===0)size=end-offset;
    assert(size>=header&&offset+size<=end,'valid MP4 '+type+' box');found.push({type,start:offset+header,end:offset+size,offset});offset+=size;
  }
  return found;
}
function movie(bytes){
  const top=boxes(bytes),moov=top.find(b=>b.type==='moov'),mdat=top.find(b=>b.type==='mdat');
  assert(moov&&mdat&&moov.offset<mdat.offset,'fast-start metadata precedes media');
  const inner=boxes(bytes,moov.start,moov.end),mvhd=inner.find(b=>b.type==='mvhd');assert(mvhd);assert.equal(bytes[mvhd.start],0);
  const scale=bytes.readUInt32BE(mvhd.start+12),duration=bytes.readUInt32BE(mvhd.start+16)/scale;
  const tracks=inner.filter(b=>b.type==='trak').map(track=>{
    const content=boxes(bytes,track.start,track.end),tkhd=content.find(b=>b.type==='tkhd'),mdia=content.find(b=>b.type==='mdia');
    const handler=boxes(bytes,mdia.start,mdia.end).find(b=>b.type==='hdlr');
    return {type:bytes.toString('ascii',handler.start+8,handler.start+12),width:bytes.readUInt32BE(tkhd.end-8)/65536,height:bytes.readUInt32BE(tkhd.end-4)/65536};
  });
  return {duration,tracks};
}
test('v2 preserves the original music and records all generated source hashes',()=>{
  const folder=path.join(__dirname,'v2'),data=JSON.parse(fs.readFileSync(path.join(folder,'generation.json')));
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(hash(path.join(folder,'source/music.mp3')),data.music.sha256);
  assert.equal(hash(path.join(__dirname,'source/music.mp3')),data.music.sha256);
  for(const [file,sha256] of Object.entries(data.sourceHashes))assert.equal(hash(path.join(folder,'source',file)),sha256,file);
  assert.equal(data.creditsSpent.total,336);assert.equal(data.creditsSpent.purchasesPerformed,0);
  const momo=data.editing.segments.filter(s=>s.character==='momo');assert.equal(momo.length,2);
  assert.equal(momo[0].sourceEnd,momo[1].sourceStart);assert.equal(momo[0].sourceStart,0);assert.equal(momo[1].sourceEnd,10);
});
test('v3 preserves sources and music, and supplies an actual UHD master outside runtime',()=>{
  const folder=path.join(__dirname,'v3'),data=JSON.parse(fs.readFileSync(path.join(folder,'generation.json')));
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(hash(path.join(folder,'source/music.mp3')),hash(path.join(__dirname,'source/music.mp3')));
  for(const [file,sha256] of Object.entries(data.sourceHashes))assert.equal(hash(path.join(folder,'source',file)),sha256,file);
  assert.equal(data.creditsSpent.total,244);assert.equal(data.creditsSpent.purchasesPerformed,0);
  const master=movie(fs.readFileSync(path.join(folder,data.editing.master)));
  assert(Math.abs(master.duration-30)<.1);
  assert.deepEqual(master.tracks.find(t=>t.type==='vide'),{type:'vide',width:3840,height:2160});
  assert(master.tracks.some(t=>t.type==='soun'));
  const registry=JSON.parse(fs.readFileSync(path.join(root,'V4/deploy/runtime-media.json')));
  assert(!registry.files.some(r=>r.source.endsWith('/kalistar-anime-v3-4k.mp4')),'large archive master must not enter web build');
  const momo=data.editing.segments.filter(s=>s.character==='momo');
  assert.equal(momo[0].sourceEnd,momo[1].sourceStart);
});
for(const [version,duration,limit] of [[1,12,10],[2,30,25],[3,30,25]])for(const phone of [false,true])test('v'+version+' '+(phone?'portrait':'desktop')+' is a real '+duration+'-second H264/AAC film, small and registered',()=>{
  const name='kalistar-anime-v'+version+(phone?'-phone':'')+'.mp4',file=path.join(assets,name),bytes=fs.readFileSync(file),data=movie(bytes);
  const short=version===3?1080:720,long=version===3?1920:1280;
  assert(Math.abs(data.duration-duration)<.1);assert.deepEqual(data.tracks.find(t=>t.type==='vide'),{type:'vide',width:phone?short:long,height:phone?long:short});assert(data.tracks.some(t=>t.type==='soun'));
  assert(bytes.includes(Buffer.from('avc1')));assert(bytes.includes(Buffer.from('mp4a')));assert(bytes.length<limit*1024**2);
  const registry=JSON.parse(fs.readFileSync(path.join(root,'V4/deploy/runtime-media.json'))),record=registry.files.find(r=>r.source.endsWith('/cinematics/'+name));
  assert(record);assert.equal(record.bytes,bytes.length);assert.equal(record.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert(fs.statSync(path.join(assets,name.replace('.mp4','-poster.webp'))).size<300000);
});
