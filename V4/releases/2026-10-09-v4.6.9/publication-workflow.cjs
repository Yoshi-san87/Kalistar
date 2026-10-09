'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
module.exports=root=>{
 const text=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'}),eol=text.includes('\r\n')?'\r\n':'\n';
 const anchor='          node --test V4/expansions/2026-10-09-crossover-crystals/integration.test.cjs'+eol;
 const line='          node --test V4/revisions/2026-10-09-homme-mystere/integration.test.cjs'+eol;
 const media='      - name: Fetch renamed card illustration proof'+eol+'        run: git lfs pull --include="V4/creations/49901503/illustration.png" --exclude=""'+eol;
 assert(text.includes(anchor));assert(text.includes('      - name: Install equipment media verifier'));
 return text.replace(anchor,anchor+line).replace('      - name: Install equipment media verifier',media+'      - name: Install equipment media verifier');
};
