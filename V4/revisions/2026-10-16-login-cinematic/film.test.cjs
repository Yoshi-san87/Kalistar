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
for(const phone of [false,true])test((phone?'portrait':'desktop')+' is a real 12-second H264/AAC film, small and registered',()=>{
  const name='kalistar-anime-v1'+(phone?'-phone':'')+'.mp4',file=path.join(assets,name),bytes=fs.readFileSync(file),data=movie(bytes);
  assert(Math.abs(data.duration-12)<.1);assert.deepEqual(data.tracks.find(t=>t.type==='vide'),{type:'vide',width:phone?720:1280,height:phone?1280:720});assert(data.tracks.some(t=>t.type==='soun'));
  assert(bytes.includes(Buffer.from('avc1')));assert(bytes.includes(Buffer.from('mp4a')));assert(bytes.length<10*1024**2);
  const registry=JSON.parse(fs.readFileSync(path.join(root,'V4/deploy/runtime-media.json'))),record=registry.files.find(r=>r.source.endsWith('/cinematics/'+name));
  assert(record);assert.equal(record.bytes,bytes.length);assert.equal(record.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert(fs.statSync(path.join(assets,name.replace('.mp4','-poster.webp'))).size<300000);
});
