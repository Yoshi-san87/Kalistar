'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'verification');fs.mkdirSync(out,{recursive:true});
const args=['--test','--test-reporter=tap','V4/deploy/build.test.cjs','V4/deploy/pwa.test.cjs','V4/releases/2026-10-09-public-cache-check/public-asset-check.test.cjs'];
const test=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});fs.writeFileSync(path.join(out,'tests.txt'),test.stdout+test.stderr);assert.equal(test.status,0,test.stdout+test.stderr);
const build=spawnSync(process.execPath,['V4/deploy/build.cjs'],{cwd:root,encoding:'utf8'});assert.equal(build.status,0,build.stdout+build.stderr);
const r=require('../../deploy/dist/release.json');
fs.writeFileSync(path.join(out,'build.json'),JSON.stringify({version:'4.5.62',build:r.version,cards:r.cards,files:r.assets.length,bytes:r.bytes,assets:r.assets.filter(a=>a.path.includes('/ff9-')||['jeu/index.html','jeu/weapons.js','jeu/weapon-art.js','jeu/weapon-cards.js','jeu/v4.css'].includes(a.path))},null,2)+'\n');
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,tests:Number(test.stdout.match(/# pass (\d+)/)[1]),build:JSON.parse(build.stdout)},null,2)+'\n');console.log(test.stdout.slice(-180)+build.stdout);
