'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawnSync} = require('node:child_process');
const {inside} = require('./build.cjs');
const ROOT = path.resolve(__dirname, '../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const gitHash = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const environment = () => ({...process.env, GIT_NO_LAZY_FETCH:'1', GIT_LFS_SKIP_SMUDGE:'1', GIT_TERMINAL_PROMPT:'0'});
function git(root, args, input) {
  return execFileSync('git', args, {cwd:root, env:environment(), input, maxBuffer:256 * 1024 ** 2, windowsHide:true});
}
function parseTree(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
    if (!match) throw Error('Publication requires regular tracked files: ' + line);
    return {path:match[3], oid:match[2]};
  });
}
function parseBatch(buffer, entries) {
  const result = new Map();
  let offset = 0;
  for (const entry of entries) {
    const end = buffer.indexOf(10, offset);
    const header = buffer.subarray(offset, end).toString();
    const match = /^([a-f0-9]{40}) blob (\d+)$/.exec(header);
    if (!match || match[1] !== entry.oid) throw Error('Git object unavailable: ' + entry.path);
    const length = Number(match[2]);
    offset = end + 1;
    const bytes = buffer.subarray(offset, offset + length);
    if (bytes.length !== length || buffer[offset + length] !== 10 || gitHash(bytes) !== entry.oid) throw Error('Invalid Git object: ' + entry.path);
    result.set(entry.path, Buffer.from(bytes));
    offset += length + 1;
  }
  if (offset !== buffer.length) throw Error('Unexpected Git batch data');
  return result;
}
function readObjects(root, entries) {
  if (!entries.length) return new Map();
  return parseBatch(git(root, ['cat-file','--batch'], entries.map(e => e.oid).join('\n') + '\n'), entries);
}
function pointer(bytes) {
  const match = /^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)\r?\n$/.exec(bytes.toString('utf8'));
  return match && {oid:match[1], bytes:Number(match[2])};
}
function verifiedMedia(entry, committed, root, objectRoot) {
  const lfs = pointer(committed);
  if (!lfs) return committed;
  const candidates = [inside(root, entry.path), path.join(objectRoot,lfs.oid.slice(0,2),lfs.oid.slice(2,4),lfs.oid)];
  for (const candidate of candidates) {
    let stat;
    try { stat = fs.lstatSync(candidate); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== lfs.bytes) continue;
    const bytes = fs.readFileSync(candidate);
    if (sha(bytes) === lfs.oid) return bytes;
  }
  throw Error('Verified local media missing (no network fallback): ' + entry.path);
}
function isMetadata(file) {
  return /^V4\/(?:site|deploy)\/[^/]+\.(?:cjs|js|mjs|json|css|html|webmanifest)$/.test(file)
    || /^V4\/docs\/(?:joueurs\/)?[^/]+\.md$/.test(file)
    || /^V[34]\/donnees\/[^/]+\.json$/.test(file)
    || ['V4/atelier/game-catalog.cjs','V4/atelier/data/references.json',
      'V4/collaborations/ff8-set-01/set.json','V4/collaborations/ff10-set-01/set.json'].includes(file);
}
function isRuntimeTree(file) {
  return file.startsWith('V4/site/assets/') || file.startsWith('V3/site/assets/') && !file.startsWith('V3/site/assets/cards/')
    || /^V3\/assets\/(?:cristaux|effets|factions|races|armes|armes_transparentes)\//.test(file);
}
async function prepare({root=ROOT, ref='HEAD'} = {}) {
  const commit = git(root,['rev-parse','--verify',`${ref}^{commit}`]).toString().trim();
  const entries = parseTree(git(root,['ls-tree','-r','-z','--full-tree',commit]));
  const byPath = new Map(entries.map(e => [e.path,e]));
  const area = path.join(root,'work/publication');
  fs.mkdirSync(area,{recursive:true});
  const snapshot = fs.mkdtempSync(path.join(area, commit.slice(0,12) + '-'));
  fs.writeFileSync(path.join(snapshot,'.kalistar-publication-source'),'Kalistar frozen tracked source\n');
  const objectRoot = path.resolve(root,git(root,['rev-parse','--git-path','lfs/objects']).toString().trim());
  const initial = entries.filter(e => isMetadata(e.path) || isRuntimeTree(e.path));
  const objects = readObjects(root,initial);
  function copy(entry, committed) {
    const bytes = verifiedMedia(entry,committed,root,objectRoot);
    const destination = inside(snapshot,entry.path);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,bytes,{flag:'wx'});
  }
  for (const entry of initial) copy(entry,objects.get(entry.path));
  const mediaFile = path.join(snapshot,'V4/deploy/runtime-media.json');
  if (fs.existsSync(mediaFile)) {
    const media = JSON.parse(fs.readFileSync(mediaFile,'utf8'));
    require('./runtime-media.cjs').validateRegistry(media);
    for (const file of media.files) {
      const destination = inside(snapshot,file.source);
      if (fs.existsSync(destination)) {
        if (sha(fs.readFileSync(destination)) !== file.sha256) throw Error('Frozen media differs from registry: ' + file.source);
        continue;
      }
      const committed = Buffer.from(`version https://git-lfs.github.com/spec/v1\noid sha256:${file.sha256}\nsize ${file.bytes}\n`);
      copy({path:file.source},committed);
    }
  }
  const builder = require(path.join(snapshot,'V4/deploy/build.cjs'));
  const planned = await builder.plan();
  const remaining = planned.files.filter(f => !fs.existsSync(inside(snapshot,f.source))).map(f => {
    const entry = byPath.get(f.source);
    if (!entry) throw Error('Untracked media cannot be published: ' + f.source);
    return entry;
  });
  for (const [file,bytes] of readObjects(root,remaining)) copy(byPath.get(file),bytes);
  const result = spawnSync(process.execPath,[path.join(snapshot,'V4/deploy/build.cjs')],{
    cwd:snapshot,env:{...process.env,CF_PAGES:'1',GITHUB_SHA:commit},encoding:'utf8',windowsHide:true
  });
  if (result.status !== 0) throw Error(result.stderr || result.error || 'Frozen build failed');
  const dist = path.join(snapshot,'V4/deploy/dist');
  const release = JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
  const report = {schemaVersion:1,commit,dist,snapshot,cards:release.cards,files:release.assets.length,bytes:release.bytes,releaseSha256:sha(fs.readFileSync(path.join(dist,'release.json'))),trackedOnly:true,downloadedLfs:false};
  fs.writeFileSync(path.join(snapshot,'publication.json'),JSON.stringify(report,null,2));
  return report;
}
module.exports = {prepare,parseTree,parseBatch,pointer,verifiedMedia,isRuntimeTree,gitHash};
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args[0]?.startsWith('-')) { console.error('Usage: node V4/deploy/prepare-release.cjs [commit-or-tag]'); process.exitCode=1; }
  else prepare({ref:args[0] || 'HEAD'}).then(value => console.log(JSON.stringify(value,null,2))).catch(error => {console.error(error.message);process.exitCode=1;});
}
