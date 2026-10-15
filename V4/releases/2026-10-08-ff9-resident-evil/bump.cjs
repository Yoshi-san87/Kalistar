'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),config=require('./release.json');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),config.parent);
const changes=config.versionFiles.map(name=>{
 const file=path.join(root,name),before=fs.readFileSync(file,'utf8');
 const escaped=value=>value.replaceAll('.','\\.');
 assert(before.includes(config.previousVersion)||before.includes(escaped(config.previousVersion)),name);
 const after=before.replaceAll(config.previousVersion,config.version).replaceAll(escaped(config.previousVersion),escaped(config.version));
 assert.notEqual(after,before,name);return {file,after};
});
for(const {file,after}of changes)fs.writeFileSync(file,after);
console.log('Version '+config.version+': '+changes.length+' files, existing line endings preserved.');
