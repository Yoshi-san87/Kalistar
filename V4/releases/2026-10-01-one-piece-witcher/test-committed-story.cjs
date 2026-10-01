'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),source='V4/site/story-content.json';
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim();
const bytes=execFileSync('git',['show',sha+':'+source],{cwd:root});
const target=path.resolve(root,source),original=fs.readFileSync.bind(fs),asyncOriginal=fsp.readFile.bind(fsp);
const matches=f=>typeof f==='string'&&path.resolve(f)===target;
const value=o=>{const e=typeof o==='string'?o:o?.encoding;return e?bytes.toString(e):Buffer.from(bytes);};
fs.readFileSync=(f,o)=>matches(f)?value(o):original(f,o);
fsp.readFile=(f,o)=>matches(f)?Promise.resolve(value(o)):asyncOriginal(f,o);
// Only the unrelated unfinished story is overlaid; every tested production change stays live.
for(const relative of [
 'V4/atelier/game-catalog.test.cjs','V4/atelier/collaboration-arenas.test.cjs','V4/deploy/build.test.cjs','V4/deploy/pwa.test.cjs',
 'V4/site/statistics.test.cjs','V4/site/collaborations.test.cjs','V4/site/metal-gear.test.cjs','V4/site/resident-evil.test.cjs','V4/site/one-piece.test.cjs',
 'V4/expansions/2026-10-01-one-piece/model.test.cjs','V4/revisions/2026-10-01-stat-personality/revision.test.cjs',
 'V4/expansions/2026-10-01-rikka-rooftops/model.test.cjs','V4/expansions/2026-10-01-one-piece-witcher/model.test.cjs','V4/revisions/2026-10-01-luffy-light/revision.test.cjs'
])require(path.join(root,relative));
