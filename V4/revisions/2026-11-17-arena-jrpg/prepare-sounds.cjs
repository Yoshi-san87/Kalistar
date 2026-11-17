'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../../..'),source=path.resolve(process.argv[2]||path.join(ROOT,'../../sauvegardes-personnelles/audio/2026-11-17-arena-jrpg/source'));
const ffmpeg=process.env.FFMPEG||path.join(ROOT,'work/cinematics/tools/node_modules/ffmpeg-static/ffmpeg.exe');
const output=path.join(ROOT,'V4/site/assets/audio/arena-jrpg-v1'),spec=require('./generation.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function decode(file){const bytes=execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-i',file,'-ar','44100','-ac','1','-f','f32le','pipe:1'],{maxBuffer:4000000});const data=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);return Float32Array.from(data);}
function measure(data){let square=0,peak=0;const windows=[];for(let i=0;i<data.length;i+=441){let q=0;for(let j=i;j<Math.min(i+441,data.length);j++){const x=data[j];square+=x*x;q+=x*x;peak=Math.max(peak,Math.abs(x));}windows.push(Math.sqrt(q/441));}return {rms:Math.sqrt(square/data.length),peak,windows};}
fs.mkdirSync(output,{recursive:true});const items=[];
for(const {key,taskId}of spec.items){
  if(!/^(?:[A-Z]+|engage|strike|shield|defeat|roll)$/.test(key))throw Error('Invalid key');
  const input=path.join(source,key+'.mp3'),original=fs.readFileSync(input),data=decode(input),m=measure(data),threshold=Math.max(...m.windows)*(key==='engage'?.22:.4);
  const onset=key==='roll'?0:Math.max(0,m.windows.findIndex(value=>value>=threshold)*.01-.025),duration=Math.min(1.35,data.length/44100-onset),target=path.join(output,key+'.mp3');
  const filter=['highpass=f=42','lowpass=f=14500','acompressor=threshold=0.20:ratio=2.5:attack=8:release=85:makeup=1.4','loudnorm=I=-14:TP=-1.8:LRA=8',`atrim=duration=${duration}`,`afade=t=in:st=0:d=0.003`,`afade=t=out:st=${Math.max(.05,duration-.12)}:d=0.12`,'alimiter=limit=0.68:level=0:attack=1:release=55'].join(',');
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-ss',onset.toFixed(3),'-i',input,'-vn','-af',filter,'-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k','-map_metadata','-1','-y',target]);
  const final=decode(target),levels=measure(final),bytes=fs.readFileSync(target);
  items.push({key,taskId,sourceSha256:hash(original),sourceBytes:original.length,sourceStartSeconds:+onset.toFixed(3),sourceDurationSeconds:+(data.length/44100).toFixed(3),path:'V4/site/assets/audio/arena-jrpg-v1/'+key+'.mp3',sha256:hash(bytes),bytes:bytes.length,durationSeconds:+(final.length/44100).toFixed(3),peak:+levels.peak.toFixed(5),rms:+levels.rms.toFixed(5)});
}
fs.writeFileSync(path.join(__dirname,'exports.json'),JSON.stringify({schemaVersion:1,sampleRate:44100,channels:1,bitrate:128000,creditsUsed:spec.creditsUsed,items},null,2)+'\n');
console.log(JSON.stringify({count:items.length,bytes:items.reduce((s,i)=>s+i.bytes,0),levels:items.map(({key,rms,peak,durationSeconds})=>({key,rms,peak,durationSeconds}))},null,2));
