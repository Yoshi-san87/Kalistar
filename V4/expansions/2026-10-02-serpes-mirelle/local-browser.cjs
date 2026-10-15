'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const {DIST,inside}=require('../../deploy/build.cjs');
const mime={'.html':'text/html','.json':'application/json','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{try{
 const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/Kalistar/'))throw Error('outside');
 const rel=decodeURIComponent(u.pathname.slice(10)),f=inside(DIST,rel.endsWith('/')?rel+'index.html':rel);
 res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(f));
}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1',()=>{
 const p=spawn(process.execPath,[path.join(__dirname,'browser.cjs')],{stdio:'inherit',env:{...process.env,KALISTAR_REVIEW_URL:'http://127.0.0.1:'+server.address().port+'/Kalistar/jeu/',KALISTAR_REVIEW_KIND:'local'}});
 p.on('exit',code=>server.close(()=>{process.exitCode=code;}));
 p.on('error',e=>{console.error(e);server.close();process.exitCode=1;});
});
