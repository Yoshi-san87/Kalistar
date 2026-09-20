const {spawn}=require('node:child_process');
const L=require('../../atelier/lib.cjs');
const {fs,path,DATA,read,write}=L;
(async()=>{
  const ref=read(path.join(__dirname,'references-before.json'));await L.protectedCheck(ref);
  const lock=path.join(DATA,'render.lock');let fd;
  try{
    fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,revision:'branches-2026-09-18'}));
    await new Promise((resolve,reject)=>{
      const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(__dirname,'bridge.ps1'),'-Script',path.join(__dirname,'batch.jsx')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
      p.stdout.on('data',b=>process.stdout.write(b));p.stderr.on('data',b=>process.stderr.write(b));
      p.on('error',reject);p.on('close',c=>c?reject(Error('Photoshop: '+c)):resolve());
    });
    await L.protectedCheck(ref);
    write(path.join(__dirname,'staging-complete.json'),{sourcesUnchanged:true,completedAt:new Date().toISOString()});
  }finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
})().catch(e=>{console.error(e);process.exitCode=1;});
