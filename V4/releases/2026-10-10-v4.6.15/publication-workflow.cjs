'use strict';
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
module.exports=root=>{
  let text=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'});
  const nl=text.includes('\r\n')?'\r\n':'\n',fetch='      - name: Install equipment media verifier';
  const anchor='          node --test V4/expansions/2026-10-10-castlevania/integration.test.cjs V4/expansions/2026-10-10-castlevania/publication.test.cjs';
  assert(text.includes(fetch)&&text.includes(anchor));assert(!text.includes('Fetch Le Fauve supplied artwork proof'));
  text=text.replace(fetch,[
    '      - name: Fetch Le Fauve supplied artwork proof',
    '        run: git lfs pull --include="V4/creations/49901901/illustration.png,V4/expansions/2026-10-10-le-fauve/art/le-fauve.png" --exclude=""',
    fetch].join(nl));
  return text.replace(anchor,anchor+nl+'          node --test V4/expansions/2026-10-10-le-fauve/integration.test.cjs');
};
