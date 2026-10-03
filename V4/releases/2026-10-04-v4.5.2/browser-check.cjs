'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(process.argv[2]||''),dist=path.join(root,'V4/deploy/dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
async function main(){
  if(!fs.existsSync(path.join(dist,'release.json')))throw Error('Build the isolated release first');
  const server=http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/Kalistar/'))throw Error('Invalid prefix');
      const relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));
      const file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
      if(!file.startsWith(dist+path.sep))throw Error('Invalid path');
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/Kalistar';
  const out=path.join(root,'release-verification/browsers');fs.mkdirSync(out,{recursive:true});
  const suites=['story-reader','weapon-cards','weapons-arsenal','weapons','ui-system'],results=[];
  try{
    for(const name of suites){
      const start=Date.now();let log='';
      const code=await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,['V4/site/'+name+'.browser.test.cjs'],{cwd:root,env:{...process.env,
          KALISTAR_URL:base,KALISTAR_BUILT_SITE:'1',KALISTAR_VERIFICATION_DIR:path.join(out,name)},windowsHide:true});
        child.stdout.on('data',chunk=>{log+=chunk;process.stdout.write(chunk);});child.stderr.on('data',chunk=>{log+=chunk;process.stderr.write(chunk);});
        child.on('error',reject);child.on('close',resolve);
      });
      fs.writeFileSync(path.join(out,name+'.log'),log);results.push({name,passed:code===0,milliseconds:Date.now()-start});
      fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
      if(code!==0)throw Error(name+' failed');
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
  console.log(JSON.stringify({passed:true,suites:results.length,output:out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
