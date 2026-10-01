'use strict';
const L = require('../../atelier/lib.cjs');
const {fs,path,assert,write,read,crypto,ROOT,sharp} = L;
const home = __dirname;
const digest = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function record(key, source) {
  assert(/^[a-z0-9-]+$/.test(key));
  const requestFile = path.join(home, 'art-prompts', key + '.json'), request = read(requestFile);
  assert(request.output.startsWith('V4/Illustrations/'));
  const target = path.join(ROOT, request.output);
  if (fs.existsSync(target)) assert.equal(digest(target), digest(source), 'Never replace a selected artwork silently');
  else fs.copyFileSync(source, target);
  const meta = await sharp(target).metadata();
  request.selected = {path:request.output, sha256:digest(target), generatedSource:source, width:meta.width, height:meta.height};
  request.referenceHashes = Object.fromEntries(request.references.map(f => [f,digest(path.join(ROOT,f))]));
  request.method = 'built-in image_gen';
  request.review = 'awaiting-parent-visual-review';
  write(requestFile, request);
  return request.selected;
}
module.exports = {record};
if (require.main === module) record(...process.argv.slice(2)).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1;});
