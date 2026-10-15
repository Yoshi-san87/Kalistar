const {spawn}=require('node:child_process');
const L=require('../../atelier/lib.cjs');
const {fs,path,DATA,ROOT,read,write,hash,assert}=L;
(async()=>{
  const ref=read(path.join(__dirname,'references-before.json')),plan=read(path.join(__dirname,'plan.json'));
  const mode=process.argv[2]||'inspect';assert.ok(['inspect','render'].includes(mode));
  await L.protectedCheck(ref);
  const lock=path.join(DATA,'render.lock');let fd;
  try{
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,revision:plan.revision,mode}));
    write(path.join(__dirname,'native-request.json'),{mode});
    await new Promise((resolve,reject)=>{
      const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(__dirname,'../2026-09-18-branches/bridge.ps1'),'-Script',path.join(__dirname,'native.jsx')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
      p.stdout.on('data',b=>process.stdout.write(b));p.stderr.on('data',b=>process.stderr.write(b));p.on('error',reject);p.on('close',c=>c?reject(Error('Photoshop: '+c)):resolve());
    });
    await L.protectedCheck(ref);
    for(const [file,sha]of Object.entries(plan.sourceHashes))assert.equal(await hash(path.join(ROOT,file)),sha);
    write(path.join(__dirname,mode+'-complete.json'),{passed:true,sourcesUnchanged:true,completedAt:new Date().toISOString()});
  }finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
})().catch(e=>{console.error(e);process.exitCode=1;});
