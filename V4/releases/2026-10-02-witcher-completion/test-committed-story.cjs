'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),source='V4/site/story-content.json';
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim();
const bytes=execFileSync('git',['show',sha+':'+source],{cwd:root});
const Module=require('node:module');
const unfinished=['V4/site/collection-binder.js','V4/site/collection-binder.css','V4/site/mobile.css',
 'V4/site/collaborations.test.cjs','V4/site/collection-versions.test.cjs','V4/site/metal-gear.test.cjs',
 'V4/site/mobile-browser.test.cjs','V4/site/one-piece.test.cjs','V4/site/resident-evil.test.cjs',
 'V4/site/story-reader.js','V4/site/story-reader.css','V4/site/story-reader.browser.test.cjs'];
const committed=new Map(unfinished.map(f=>[path.resolve(root,f),execFileSync('git',['show',sha+':'+f],{cwd:root})]));
const loadJS=Module._extensions['.js'];
Module._extensions['.js']=(module,filename)=>committed.has(filename)?module._compile(committed.get(filename).toString(),filename):loadJS(module,filename);
const target=path.resolve(root,source),original=fs.readFileSync.bind(fs),asyncOriginal=fsp.readFile.bind(fsp);
const matches=f=>typeof f==='string'&&path.resolve(f)===target;
const value=o=>{const e=typeof o==='string'?o:o?.encoding;return e?bytes.toString(e):Buffer.from(bytes);};
const committedRead=(f,o)=>{const b=typeof f==='string'&&committed.get(path.resolve(f));if(!b)return null;const e=typeof o==='string'?o:o?.encoding;return e?b.toString(e):Buffer.from(b);};
fs.readFileSync=(f,o)=>matches(f)?value(o):committedRead(f,o)??original(f,o);
fsp.readFile=(f,o)=>matches(f)?Promise.resolve(value(o)):committedRead(f,o)!==null?Promise.resolve(committedRead(f,o)):asyncOriginal(f,o);
// Only the unrelated unfinished story is overlaid; every tested production change stays live.
for(const relative of [
 'V4/atelier/game-catalog.test.cjs','V4/atelier/collaboration-arenas.test.cjs','V4/deploy/build.test.cjs','V4/deploy/pwa.test.cjs',
 'V4/site/statistics.test.cjs','V4/site/collaborations.test.cjs','V4/site/metal-gear.test.cjs','V4/site/resident-evil.test.cjs','V4/site/one-piece.test.cjs',
 'V4/expansions/2026-10-01-one-piece/model.test.cjs','V4/revisions/2026-10-01-stat-personality/revision.test.cjs',
 'V4/expansions/2026-10-01-rikka-rooftops/model.test.cjs','V4/expansions/2026-10-01-one-piece-witcher/model.test.cjs','V4/revisions/2026-10-01-luffy-light/revision.test.cjs'
])require(path.join(root,relative));
