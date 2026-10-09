'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),check=require('./public-asset-check.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const local='123456abcdef',remote='fedcba654321';
const html=v=>'<title>Kalistar</title><link href="v4.css?v='+v+'"><script src="boot.js?v='+v+'"></script>';
const fixture=()=>({asset:{path:'jeu/index.html',sha256:hash(html(local))},bytes:Buffer.from(html(remote)),manifest:{version:remote,assets:[{path:'jeu/index.html',sha256:hash(html(remote))}]}});
test('only the documented local hash versus GITHUB_SHA cache token differs',()=>{const f=fixture();check(f.asset,f.bytes,f.manifest,local);});
test('changed content is never hidden by cache normalization',()=>{const f=fixture();f.bytes=Buffer.from(html(remote).replace('Kalistar','Changed'));f.manifest.assets[0].sha256=hash(f.bytes);assert.throws(()=>check(f.asset,f.bytes,f.manifest,local));});
test('mixed or stale cache versions fail',()=>{const f=fixture();f.bytes=Buffer.from(html(remote).replace('boot.js?v='+remote,'boot.js?v='+local));f.manifest.assets[0].sha256=hash(f.bytes);assert.throws(()=>check(f.asset,f.bytes,f.manifest,local));});
test('assets must match both manifests byte for byte',()=>{
  const bytes=Buffer.from('image'),asset={path:'jeu/image.webp',sha256:hash(bytes)},manifest={assets:[asset]};check(asset,bytes,manifest,local);
  assert.throws(()=>check(asset,Buffer.from('changed'),manifest,local));assert.throws(()=>check({...asset,sha256:hash('old')},bytes,manifest,local));
});
