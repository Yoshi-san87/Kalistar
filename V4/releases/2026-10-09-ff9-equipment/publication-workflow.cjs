'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
module.exports=function workflow(root){
  const text=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'}),eol=text.includes('\r\n')?'\r\n':'\n';
  const anchor='          node --test V4/site/defensive-equipment.test.cjs'+eol;
  const line='          node --test V4/site/ff9-equipment.test.cjs'+eol;
  assert(text.includes(anchor));
  // Preserve the separate, uncommitted performance experiment in the working tree.
  return text.includes(line)?text:text.replace(anchor,anchor+line);
};
