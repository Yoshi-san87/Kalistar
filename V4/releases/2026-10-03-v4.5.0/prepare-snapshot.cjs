'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const git = args => execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:4*1024*1024}).trim();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const tree = git(['rev-parse', process.argv[2] || git(['write-tree'])]);
  const snapshot = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar-450-'));
  const archive = path.join(snapshot, 'source.tar');
  execFileSync('git', ['archive', '--format=tar', '--output='+archive, tree],
    {cwd:root, env:{...process.env, GIT_LFS_SKIP_SMUDGE:'1'}});
  const windowsTar = path.join(process.env.ProgramFiles || '', 'Git/usr/bin/tar.exe');
  const tar = process.platform === 'win32' && fs.existsSync(windowsTar) ? windowsTar : 'tar';
  execFileSync(tar, [...(tar === windowsTar ? ['--force-local'] : []), '-xf', archive, '-C', snapshot]);
  fs.unlinkSync(archive);
  const {files} = await require(path.join(snapshot, 'V4/deploy/build.cjs')).plan();
  const paths = new Set(files.map(f => f.source));
  for (const file of ['frame/default.png', 'packed/banks/weapon-Hache.png',
    'packed/banks/weapon-Instrument.png', 'packed/banks/return-weapon-4.png']) {
    paths.add('V4/atelier/designer-assets/'+file);
  }
  const lfs = path.resolve(root, git(['rev-parse', '--git-path', 'lfs/objects']));
  let hydrated = 0;
  for (const relative of paths) {
    const target = path.join(snapshot, relative);
    const pointer = fs.readFileSync(target);
    if (pointer.length > 1024) continue;
    const match = pointer.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/);
    if (!match) continue;
    const [, oid, size] = match;
    const candidates = [path.join(root, relative), path.join(lfs, oid.slice(0,2), oid.slice(2,4), oid)];
    let valid = false;
    for (const source of candidates) {
      if (!fs.existsSync(source) || fs.statSync(source).size !== Number(size)) continue;
      const bytes = fs.readFileSync(source);
      if (sha256(bytes) !== oid) continue;
      fs.writeFileSync(target, bytes);
      valid = true; hydrated++; break;
    }
    if (!valid) throw Error('Missing verified LFS object: '+relative+' ('+oid+')');
  }
  console.log(JSON.stringify({snapshot, tree, hydrated, runtimeFiles:files.length}));
}
main().catch(error => {console.error(error);process.exitCode=1;});
