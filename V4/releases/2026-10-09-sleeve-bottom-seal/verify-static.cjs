'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
async function main(){
  assert(process.argv[2],'Provide the isolated snapshot directory');
  const snapshot=path.resolve(process.argv[2]),{DIST,inside}=require(path.join(snapshot,'V4/deploy/build.cjs'));
  const output=path.resolve(__dirname,'verification/built'),checks=[];
  const mime={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
  const server=http.createServer((req,res)=>{
    try{
      const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''),file=inside(DIST,relative.endsWith('/')||!relative?relative+'index.html':relative);
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    for(const [file,folder]of [['collection-map.browser.test.cjs','map'],['collection-versions.test.cjs','versions']]){
      const code=await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,[path.join(snapshot,'V4/site',file)],{
          cwd:snapshot,env:{...process.env,KALISTAR_URL:'http://127.0.0.1:'+server.address().port,KALISTAR_VERIFICATION_DIR:path.join(output,folder)},stdio:'inherit'
        });child.once('error',reject);child.once('exit',resolve);
      });
      assert.equal(code,0,file+' failed');checks.push({file,passed:true});
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
  }finally{await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
