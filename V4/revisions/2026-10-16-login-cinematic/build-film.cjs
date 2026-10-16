'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_cinematic.cjs'));
const sharp=runtime('sharp');
const input=path.resolve(process.env.KALISTAR_FILM_SOURCE||path.join(root,'work/cinematics/kalistar-anime-v1'));
const ffmpeg=process.env.KALISTAR_FFMPEG||path.join(root,'work/cinematics/tools/node_modules/ffmpeg-static/ffmpeg.exe');
const output=path.join(root,'V4/site/assets/cinematics');
const name='kalistar-anime-v1';
const run=args=>execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit',timeout:180000});
async function title(phone){
  const width=phone?720:1280,height=phone?1280:720;
  const logo=await sharp(path.join(root,'V3/site/assets/logo.webp')).resize(phone?660:1080).toBuffer();
  const meta=await sharp(logo).metadata();
  const target=path.join(input,phone?'title-phone.png':'title.png');
  await sharp({create:{width,height,channels:3,background:'#000000'}})
    .composite([{input:logo,left:Math.round((width-meta.width)/2),top:Math.round((height-meta.height)/2)}]).png().toFile(target);
  return target;
}
async function render(phone){
  const width=phone?720:1280,height=phone?1280:720,suffix=phone?'-phone':'';
  const titleFile=await title(phone);
  // The portrait cut follows the character, not a CSS crop of a landscape file.
  const framing=index=>phone?`crop=404:720:${[480,390,340][index]}:0,scale=${width}:${height}`:`scale=${width}:${height}`;
  const sections=[3.5,3.5,3];
  const filters=sections.map((duration,index)=>`[${index}:v]trim=duration=${duration},setpts=PTS-STARTPTS,${framing(index)},fps=24,setsar=1,format=yuv420p[v${index}]`);
  filters.push(`[3:v]scale=${width}:${height},fps=24,setsar=1,format=yuv420p,trim=duration=2,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.3,fade=t=out:st=1.7:d=0.3[title]`);
  filters.push('[v0][v1][v2][title]concat=n=4:v=1:a=0,fade=t=in:st=0:d=0.2[film]');
  filters.push('[4:a]atrim=duration=12,asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2:LRA=9,afade=t=in:st=0:d=0.18,afade=t=out:st=10.8:d=1.2[sound]');
  const target=path.join(output,name+suffix+'.mp4');
  run(['-i',path.join(input,'momo.mp4'),'-i',path.join(input,'kaylis.mp4'),'-i',path.join(input,'balmhyr.mp4'),
    '-loop','1','-i',titleFile,'-i',path.join(input,'music.mp3'),'-filter_complex',filters.join(';'),
    '-map','[film]','-map','[sound]','-t','12','-c:v','libx264','-preset','slow','-crf','21',
    '-pix_fmt','yuv420p','-profile:v','high','-level','4.0','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',target]);
  run(['-ss','0.6','-i',target,'-frames:v','1','-c:v','libwebp','-quality','82',path.join(output,name+suffix+'-poster.webp')]);
  run(['-i',target,'-vf',`fps=1,scale=${phone?180:320}:-1,tile=${phone?'6x2':'4x3'}`,'-frames:v','1',path.join(input,'contact'+suffix+'.jpg')]);
  return {file:path.relative(root,target).replaceAll('\\','/'),bytes:fs.statSync(target).size,width,height,duration:12,fps:24};
}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const files=[await render(false),await render(true)];
  fs.writeFileSync(path.join(input,'render.json'),JSON.stringify({files},null,2)+'\n');
  console.log(JSON.stringify({files}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
