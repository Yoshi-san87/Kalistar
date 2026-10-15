'use strict';
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
module.exports=root=>{
 let text=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'});
 const nl=text.includes('\r\n')?'\r\n':'\n';
 const fetch='      - name: Install equipment media verifier';
 const test='          node --test V4/expansions/2026-10-09-street-fighter/integration.test.cjs V4/expansions/2026-10-09-street-fighter/publication.test.cjs';
 assert(text.includes(fetch)&&text.includes(test));
 assert(!text.includes('Fetch Castlevania approved artwork proofs'));
 text=text.replace(fetch,[
 '      - name: Fetch Castlevania approved artwork proofs',
 '        run: git lfs pull --include="V4/creations/499018*/illustration.png,V4/propositions/2026-10-09-castlevania/images/*.png" --exclude=""',
 fetch].join(nl));
 return text.replace(test,test+nl+'          node --test V4/expansions/2026-10-10-castlevania/integration.test.cjs V4/expansions/2026-10-10-castlevania/publication.test.cjs');
};
