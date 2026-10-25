const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const shared = path.resolve(root, '../site');
const types = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'");
  let url;
  try { url = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const isShared = url.startsWith('/jeu/assets/') || ['/jeu/cloud-config.js','/jeu/cloud-session.js','/jeu/auth-guard.js'].includes(url);
  const base = isShared ? shared : root;
  let relative = isShared ? url.slice(5) : url.replace(/^\/jeu\/astraball\/?/, '').replace(/^\//,'');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const sharedLucide = isShared && relative === 'assets/lucide.min.js';
  const file = sharedLucide ? path.resolve(root,'../../V3/site/assets/lucide.min.js') : path.resolve(base, relative);
  if ((!file.startsWith(base + path.sep) && !sharedLucide) || /(?:^|[\\/])(?:node_modules|tools|tests|sources)(?:[\\/]|$)/.test(relative)) {res.writeHead(404).end();return;}
  fs.stat(file, (error,stat) => {
    if (error || !stat.isFile()) {res.writeHead(404).end();return;}
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
});
let port = Number(process.env.PORT || 4330);
server.on('error', error => {if(error.code === 'EADDRINUSE' && port < 4350) server.listen(++port,'127.0.0.1'); else throw error;});
server.on('listening', () => console.log('Astraball http://127.0.0.1:' + port + '/jeu/astraball/'));
server.listen(port,'127.0.0.1');
