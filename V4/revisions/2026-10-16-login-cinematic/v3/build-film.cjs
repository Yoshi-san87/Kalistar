'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../../..');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_cinematic.cjs'));
const sharp=runtime('sharp');
const input=path.resolve(process.env.KALISTAR_FILM_SOURCE||path.join(root,'work/cinematics/kalistar-anime-v3'));
const ffmpeg=process.env.KALISTAR_FFMPEG||path.join(root,'work/cinematics/tools/node_modules/ffmpeg-static/ffmpeg.exe');
const output=path.join(root,'V4/site/assets/cinematics'),name='kalistar-anime-v3';
const run=args=>execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit',timeout:1800000});
async function title(width,height,phone){
  const logo=await sharp(path.join(root,'V3/site/assets/logo.webp')).resize(phone?990:Math.round(width*.84375)).toBuffer();
  const meta=await sharp(logo).metadata(),target=path.join(input,'title-'+width+'x'+height+'.png');
  await sharp({create:{width,height,channels:3,background:'#000000'}}).composite([{input:logo,left:Math.round((width-meta.width)/2),top:Math.round((height-meta.height)/2)}]).png().toFile(target);
  return target;
}
async function render(mode){
  const phone=mode==='phone',master=mode==='master',width=master?3840:phone?1080:1920,height=master?2160:phone?1920:1080;
  const target=master?path.join(__dirname,'master',name+'-4k.mp4'):path.join(output,name+(phone?'-phone':'')+'.mp4');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  // Normalize AI upscaler dimensions once; portrait anchors use the approved 720p coordinate system.
  const framing=index=>phone?`scale=3840:2160:flags=lanczos,crop=1212:2160:${[1440,1170,780,'750+40*t'][index]}:0,scale=${width}:${height}:flags=lanczos`:`scale=${width}:${height}:flags=lanczos`;
  const filters=[`[0:v]trim=duration=10,setpts=1.1*(PTS-STARTPTS),${framing(0)},fps=24,setsar=1,format=yuv420p,split=2[momoA][momoB]`,
    '[momoA]trim=duration=5.5,setpts=PTS-STARTPTS[opening]',
    '[momoB]trim=start=5.5:end=11,setpts=PTS-STARTPTS,fade=t=out:st=3.8:d=1.2[closing]'];
  for(let index=1;index<=3;index++)filters.push(`[${index}:v]trim=duration=${index===1?4:6},setpts=${index===1?'1.5*(PTS-STARTPTS)':'PTS-STARTPTS'},${framing(index)},fps=24,setsar=1,format=yuv420p[v${index}]`);
  filters.push(`[4:v]scale=${width}:${height},fps=24,setsar=1,format=yuv420p,trim=duration=3.5,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.8,fade=t=out:st=3.1:d=0.4[title]`);
  const segments=['opening','v1','v2','v3','closing','title'],offsets=[5,10.5,16,21.5,26.5];
  let previous=segments[0];
  for(let i=1;i<segments.length;i++){const next='join'+i;filters.push(`[${previous}][${segments[i]}]xfade=transition=fade:duration=0.5:offset=${offsets[i-1]}[${next}]`);previous=next;}
  filters.push(`[${previous}]fade=t=in:st=0:d=0.4[film]`);
  filters.push('[5:a]atrim=duration=30,asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2:LRA=9,afade=t=in:st=0:d=0.18,afade=t=out:st=28.6:d=1.4[sound]');
  const sources=['momo','kaylis','voloden','balmhyr'].flatMap(n=>['-threads','2','-i',path.join(input,'upscaled',n+'.mp4')]);
  const quality=master?['-crf','18']:['-crf','21','-maxrate','5800k','-bufsize','5800k'];
  run([...sources,'-loop','1','-i',await title(width,height,phone),'-i',path.join(input,'music.mp3'),'-filter_complex_threads','2','-filter_complex',filters.join(';'),
    '-map','[film]','-map','[sound]','-t','30','-c:v','libx264','-threads','4','-preset','slow',...quality,'-pix_fmt','yuv420p','-profile:v','high','-level',master?'5.1':'4.1',
    '-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',target]);
  if(!master){
    if(fs.statSync(target).size>=25*1024**2)throw Error('Web film exceeds Cloudflare file limit: '+target);
    run(['-ss','0.8','-i',target,'-frames:v','1','-c:v','libwebp','-quality','82',target.replace('.mp4','-poster.webp')]);
  }
  run(['-i',target,'-vf',`fps=1,scale=${phone?180:320}:-1,tile=${phone?'10x3':'6x5'}`,'-frames:v','1',path.join(input,'contact-'+mode+'.jpg')]);
  return{file:path.relative(root,target).replaceAll('\\','/'),bytes:fs.statSync(target).size,width,height,duration:30,fps:24};
}
async function main(){
  const modes=process.argv.slice(2);const files=[];
  for(const mode of modes.length?modes:['master','desktop','phone']){if(!['master','desktop','phone'].includes(mode))throw Error('Unknown render mode');files.push(await render(mode));}
  fs.writeFileSync(path.join(input,'render-'+(modes.join('-')||'all')+'.json'),JSON.stringify({files},null,2)+'\n');console.log(JSON.stringify({files}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
