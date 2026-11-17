'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..'),source=path.join(__dirname,'source'),output=path.join(root,'V4/site/assets/cinematics');
const qa=path.join(root,'work/qa/official-score'),name='kalistar-anime-v4';
const ffmpeg=process.env.KALISTAR_FFMPEG||path.join(root,'work/cinematics/tools/node_modules/ffmpeg-static/ffmpeg.exe');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_score.cjs')),sharp=runtime('sharp');
const generation=require('./generation.json'),fps=generation.editing.fps,duration=generation.editing.duration,cues=generation.editing.cueFrames.map(frame=>frame/fps),fade=.5;
const run=args=>execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit',timeout:1800000,windowsHide:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function render(phone){
  const width=phone?720:1280,height=phone?1280:720;
  const title=path.join(qa,'title-'+(phone?'phone':'desktop')+'.png');
  const logo=await sharp(path.join(root,'V4/site/assets/logo-rainbow-v2.webp')).resize(Math.round(width*.85)).toBuffer(),meta=await sharp(logo).metadata();
  await sharp({create:{width,height,channels:3,background:'#000000'}}).composite([{input:logo,left:Math.round((width-meta.width)/2),top:Math.round((height-meta.height)/2)}]).png().toFile(title);
  const frame=(index,returning=false)=>phone?`crop=404:720:${[returning?'640-120*t/6':'620',440,'270+42*t','270+50*t'][index]}:0,scale=${width}:${height}:flags=lanczos`:`scale=${width}:${height}:flags=lanczos`;
  const lengths=[cues[0]+fade,cues[1]-cues[0]+fade,cues[2]-cues[1]+fade,cues[3]-cues[2]+fade,cues[4]-cues[3]+fade,duration-cues[4]];
  const filters=[`[0:v]split=2[ma][mb]`,
    `[ma]trim=start=0:end=6,setpts=${lengths[0]/6}*(PTS-STARTPTS),${frame(0)},fps=${fps},setsar=1,format=yuv420p,trim=duration=${lengths[0]}[s0]`,
    `[mb]trim=start=6:end=10,setpts=${lengths[4]/4}*(PTS-STARTPTS),${frame(0,true)},fps=${fps},setsar=1,format=yuv420p,trim=duration=${lengths[4]}[s4]`];
  for(let i=1;i<=3;i++)filters.push(`[${i}:v]trim=duration=6,setpts=${lengths[i]/6}*(PTS-STARTPTS),${frame(i)},fps=${fps},setsar=1,format=yuv420p,trim=duration=${lengths[i]}[s${i}]`);
  filters.push(`[4:v]fps=${fps},setsar=1,format=yuv420p,trim=duration=${lengths[5]},setpts=PTS-STARTPTS[s5]`);
  let previous='s0';for(let i=1;i<=5;i++){filters.push(`[${previous}][s${i}]xfade=transition=fade:duration=${fade}:offset=${cues[i-1]}[j${i}]`);previous='j'+i;}
  filters.push(`[${previous}]fade=t=in:st=0:d=0.6,fade=t=out:st=${duration-.6}:d=0.6[film]`);
  filters.push(`[5:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2:LRA=9,afade=t=in:st=0:d=0.2,afade=t=out:st=${duration-1.8}:d=1.8[sound]`);
  const file=path.join(output,name+(phone?'-phone':'')+'.mp4');
  run([...['momo','kaylis','voloden','balmhyr'].flatMap(n=>['-threads','2','-i',path.join(source,n+'.mp4')]),'-loop','1','-i',title,'-i',path.join(source,'six-note-motif.mp3'),'-filter_complex_threads','2','-filter_complex',filters.join(';'),'-map','[film]','-map','[sound]','-t',String(duration),'-c:v','libx264','-threads','4','-preset','slow','-crf','19','-maxrate','4500k','-bufsize','9000k','-pix_fmt','yuv420p','-profile:v','high','-level','4.1','-c:a','aac','-b:a','160k','-ar','48000','-map_metadata','-1','-movflags','+faststart',file]);
  if(fs.statSync(file).size>=25*1024**2)throw Error('Cloudflare file limit');
  run(['-ss','1','-i',file,'-frames:v','1','-c:v','libwebp','-quality','82',file.replace('.mp4','-poster.webp')]);
  run(['-i',file,'-vf',`fps=1,scale=${phone?144:256}:-1,tile=${phone?'11x3':'6x6'}`,'-frames:v','1',path.join(qa,'contact-'+(phone?'phone':'desktop')+'.jpg')]);
  return {file:path.relative(root,file).replaceAll('\\','/'),width,height,duration,fps,bytes:fs.statSync(file).size,sha256:hash(file)};
}
async function main(){
  fs.mkdirSync(output,{recursive:true});fs.mkdirSync(qa,{recursive:true});fs.mkdirSync(path.join(root,'V4/site/assets/audio'),{recursive:true});
  const music=path.join(root,'V4/site/assets/audio/six-note-motif-v1.mp3');
  run(['-i',path.join(source,'six-note-motif.mp3'),'-map','0:a:0','-vn','-af','loudnorm=I=-22:TP=-3:LRA=9,afade=t=in:st=0:d=1.2,afade=t=out:st=166.5:d=2.2735','-c:a','libmp3lame','-b:a','128k','-ar','44100','-map_metadata','-1',music]);
  const exports=[];for(const phone of [false,true])exports.push(await render(phone));
  const inputs=['six-note-motif.mp3','momo.mp4','kaylis.mp4','voloden.mp4','balmhyr.mp4'].map(file=>({file:'source/'+file,sha256:hash(path.join(source,file))}));
  fs.writeFileSync(path.join(__dirname,'exports.json'),JSON.stringify({inputs,exports,music:{file:path.relative(root,music).replaceAll('\\','/'),sha256:hash(music),bytes:fs.statSync(music).size}},null,2)+'\n');
  console.log(JSON.stringify(exports));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
