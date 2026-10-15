'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),config=require('./release.json');
const git=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...options}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['branch','--show-current']),'main');assert.equal(git(['rev-parse','HEAD']),config.parent);
assert.equal(git(['diff','--cached','--name-only']),'');
if(process.argv.includes('--stage')){
 assert.equal(git(['ls-remote','origin','refs/heads/main']).split(/\s/)[0],config.parent);
 assert(require('./verification/tests.json').passed);
 const roots=[...config.scope,...config.versionFiles];git(['add','--',...roots]);
 const workflow='.github/workflows/pages.yml',before=git(['show','HEAD:'+workflow]),anchor='          node --test V4/expansions/2026-10-08-final-fantasy-ix/integration.test.cjs V4/revisions/2026-10-08-resident-evil-faces/integration.test.cjs';
 assert(before.includes(anchor));const newline=before.includes('\r\n')?'\r\n':'\n',next=before.replace(anchor,anchor+newline+"          node --test V4/expansions/2026-10-09-final-fantasy-trilogy/integration.test.cjs V4/revisions/2026-10-09-ff-logo-banners/integration.test.cjs")+newline;
 const complete=next.replace('      - name: Install equipment media verifier',"      - name: Fetch Final Fantasy native proof sources\n        run: git lfs pull --include=\"V4/atelier/designer-assets/extensions/race-*.png,V4/creations/499010*/illustration.png,V4/creations/499011*/illustration.png,V4/propositions/2026-10-08-ff9/*.png,V4/propositions/2026-10-09-ff6-ff15-ff13/*.png\" --exclude=\"\"".replaceAll('\n',newline)+newline+'      - name: Install equipment media verifier');
 const blob=git(['hash-object','-w','--stdin','--path',workflow],{input:complete});git(['update-index','--cacheinfo','100644,'+blob+','+workflow]);
 const files=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
 assert(files.every(f=>f===workflow||roots.some(r=>f===r||f.startsWith(r+'/'))));
 console.log(JSON.stringify({version:config.version,staged:files.length}));
}else{
 assert.equal(git(['diff','--name-only','--',...config.versionFiles]),'','Preserve concurrent edits');
 for(const name of config.versionFiles){
  const file=path.join(root,name),before=fs.readFileSync(file,'utf8'),escape=s=>s.replaceAll('.','\\.');
  assert(before.includes(config.previousVersion)||before.includes(escape(config.previousVersion)));
  const after=before.replaceAll(config.previousVersion,config.version).replaceAll(escape(config.previousVersion),escape(config.version));
  assert.notEqual(after,before);fs.writeFileSync(file,after);
 }console.log(JSON.stringify({version:config.version,files:config.versionFiles.length}));
}
