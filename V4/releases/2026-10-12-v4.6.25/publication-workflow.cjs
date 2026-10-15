'use strict';
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
module.exports=root=>{
 let text=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'});
 const nl=text.includes('\r\n')?'\r\n':'\n',fetch='      - name: Install equipment media verifier';
 const anchor='          node --test V4/expansions/2026-10-11-chrono-trigger/integration.test.cjs V4/expansions/2026-10-11-chrono-trigger/publication.test.cjs';
 assert(text.includes(fetch)&&text.includes(anchor));assert(!text.includes('Fetch Elyrane approved artwork'));
 text=text.replace(fetch,[
  '      - name: Fetch Elyrane approved artwork',
  '        run: git lfs pull --include="V4/creations/49902101/illustration.png,V4/expansions/2026-10-12-elyrane/cards/*/illustration.png,V4/propositions/2026-10-12-princesse-okami/princesse-okami-05.png" --exclude=""',
  fetch].join(nl));
 return text.replace(anchor,anchor+nl+'          node --test V4/expansions/2026-10-12-elyrane/integration.test.cjs');
};
