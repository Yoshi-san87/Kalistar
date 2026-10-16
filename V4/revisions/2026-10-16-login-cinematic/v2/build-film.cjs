'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../../..');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_cinematic.cjs'));
const sharp=runtime('sharp');
const input=path.resolve(process.env.KALISTAR_FILM_SOURCE||path.join(root,'work/cinematics/kalistar-anime-v2'));
const ffmpeg=process.env.KALISTAR_FFMPEG||path.join(root,'work/cinematics/tools/node_modules/ffmpeg-static/ffmpeg.exe');
const output=path.join(root,'V4/site/assets/cinematics'),name='kalistar-anime-v2';
const run=args=>execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit',timeout:300000});
async function title(phone){
  const width=phone?720:1280,height=phone?1280:720;
  const logo=await sharp(path.join(root,'V3/site/assets/logo.webp')).resize(phone?660:1080).toBuffer();
  const meta=await sharp(logo).metadata(),target=path.join(input,phone?'title-phone.png':'title.png');
  await sharp({create:{width,height,channels:3,background:'#000000'}})
    .composite([{input:logo,left:Math.round((width-meta.width)/2),top:Math.round((height-meta.height)/2)}]).png().toFile(target);
  return target;
}
async function render(phone){
  const width=phone?720:1280,height=phone?1280:720,suffix=phone?'-phone':'';
  const framing=index=>phone?`crop=404:720:${[480,390,260,'250+13.333333*t'][index]}:0,scale=${width}:${height}`:`scale=${width}:${height}`;
  const filters=[`[0:v]trim=duration=10,setpts=1.1*(PTS-STARTPTS),${framing(0)},fps=24,setsar=1,format=yuv420p,split=2[momoA][momoB]`,
    '[momoA]trim=duration=5.5,setpts=PTS-STARTPTS[opening]',
    '[momoB]trim=start=5.5:end=11,setpts=PTS-STARTPTS,fade=t=out:st=3.8:d=1.2[closing]'];
  for(let index=1;index<=3;index++)filters.push(`[${index}:v]trim=duration=6,setpts=PTS-STARTPTS,${framing(index)},fps=24,setsar=1,format=yuv420p[v${index}]`);
  filters.push(`[4:v]scale=${width}:${height},fps=24,setsar=1,format=yuv420p,trim=duration=3.5,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.8,fade=t=out:st=3.1:d=0.4[title]`);
  // Opening and return are consecutive halves of one take, not a repeated clip.
  const segments=['opening','v1','v2','v3','closing','title'],offsets=[5,10.5,16,21.5,26.5];
  let previous=segments[0];
  for(let i=1;i<segments.length;i++){
    const next='join'+i;filters.push(`[${previous}][${segments[i]}]xfade=transition=fade:duration=0.5:offset=${offsets[i-1]}[${next}]`);previous=next;
  }
  filters.push(`[${previous}]fade=t=in:st=0:d=0.4[film]`);
  filters.push('[5:a]atrim=duration=30,asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2:LRA=9,afade=t=in:st=0:d=0.18,afade=t=out:st=28.6:d=1.4[sound]');
  const target=path.join(output,name+suffix+'.mp4');
  run(['-i',path.join(input,'momo.mp4'),'-i',path.join(input,'kaylis.mp4'),'-i',path.join(input,'voloden.mp4'),'-i',path.join(input,'balmhyr.mp4'),
    '-loop','1','-i',await title(phone),'-i',path.join(input,'music.mp3'),'-filter_complex_threads','2','-filter_complex',filters.join(';'),
    '-map','[film]','-map','[sound]','-t','30','-c:v','libx264','-threads','4','-preset','slow','-crf','22',
    '-pix_fmt','yuv420p','-profile:v','high','-level','4.0','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',target]);
  run(['-ss','0.8','-i',target,'-frames:v','1','-c:v','libwebp','-quality','82',path.join(output,name+suffix+'-poster.webp')]);
  run(['-i',target,'-vf',`fps=1,scale=${phone?180:320}:-1,tile=${phone?'10x3':'6x5'}`,'-frames:v','1',path.join(input,'contact'+suffix+'.jpg')]);
  return {file:path.relative(root,target).replaceAll('\\','/'),bytes:fs.statSync(target).size,width,height,duration:30,fps:24};
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const files=[await render(false),await render(true)];
  fs.writeFileSync(path.join(input,'render.json'),JSON.stringify({files},null,2)+'\n');console.log(JSON.stringify({files}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
