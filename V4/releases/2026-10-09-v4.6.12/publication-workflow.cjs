'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
module.exports=root=>{
 const text=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'}),eol=text.includes('\r\n')?'\r\n':'\n';
 const anchor='          node --test V4/revisions/2026-10-09-homme-mystere/integration.test.cjs'+eol;
 const line='          node --test V4/expansions/2026-10-09-street-fighter/integration.test.cjs V4/expansions/2026-10-09-street-fighter/publication.test.cjs'+eol;
 const media='      - name: Fetch Street Fighter approved artwork proofs'+eol+'        run: git lfs pull --include="V4/creations/499017*/illustration.png,V4/propositions/2026-10-09-street-fighter/images/*.png" --exclude=""'+eol;
 assert(text.includes(anchor));assert(!text.includes(line));
 return text.replace(anchor,anchor+line).replace('      - name: Install equipment media verifier',media+'      - name: Install equipment media verifier');
};
