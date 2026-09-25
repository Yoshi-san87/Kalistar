'use strict';
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs');
const { fs,path,ROOT,sharp,hash } = L;
async function install(source,target) {
  const m = await sharp(source).metadata(); assert.equal(m.format,'png');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if (fs.existsSync(target)) assert.equal(await hash(source), await hash(target), 'Destination existante differente.');
  else fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
  return { source:path.relative(ROOT,source),target:path.relative(ROOT,target),sha256:await hash(target) };
}
async function main() {
  const results = [];
  for (const id of require('./set.json').arenas) {
    const source=path.join(__dirname,'arenas',id+'.png'),m=await sharp(source).metadata();
    assert.ok(m.width>m.height);
    results.push(await install(source,path.join(ROOT,'V4/site/assets/arenes',id+'.png')));
  }
  results.push(await install(path.join(__dirname,'flag-FF10.png'),path.join(ROOT,'V4/site/assets/factions/FF10.png')));
  L.write(path.join(__dirname,'environments-installed.json'),results);console.log(JSON.stringify(results,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={install};
