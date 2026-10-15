'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {assertPublicationLimits, GITHUB_BUDGET, CLOUDFLARE_FILE_LIMIT, CLOUDFLARE_ASSET_LIMIT} = require('./publication-limits.cjs');
const root = path.resolve(__dirname, '../..');
const file = bytes => ({path:'media/card.png',bytes});

test('GitHub and local builds retain the 900 MiB guard', () => {
  for (const environment of [{},{CF_PAGES:'0'}]) {
    assert.doesNotThrow(() => assertPublicationLimits([file(GITHUB_BUDGET)], environment));
    assert.throws(() => assertPublicationLimits([file(GITHUB_BUDGET + 1)], environment), /900 MiB/);
  }
});

test('Cloudflare permits a site above 900 MiB within its own limits', () => {
  const assets = Array.from({length:48}, () => file(20 * 1024 ** 2));
  assert.doesNotThrow(() => assertPublicationLimits(assets, {CF_PAGES:'1'}));
  assert.throws(() => assertPublicationLimits(assets, {}), /900 MiB/);
});

test('Cloudflare enforces the 25 MiB per-file boundary', () => {
  assert.doesNotThrow(() => assertPublicationLimits([file(CLOUDFLARE_ASSET_LIMIT)], {CF_PAGES:'1'}));
  assert.throws(() => assertPublicationLimits([file(CLOUDFLARE_ASSET_LIMIT + 1)], {CF_PAGES:'1'}), /25 MiB: media\/card.png/);
});

test('Cloudflare enforces the 20000 file boundary', () => {
  const assets = Array.from({length:CLOUDFLARE_FILE_LIMIT}, () => file(1));
  assert.doesNotThrow(() => assertPublicationLimits(assets, {CF_PAGES:'1'}));
  assert.throws(() => assertPublicationLimits([...assets,file(1)], {CF_PAGES:'1'}), /20000 files/);
});

test('legacy clones defer LFS; new publication does not fetch any LFS media', () => {
  const config = fs.readFileSync(path.join(root,'.lfsconfig'),'utf8');
  assert.match(config, /\[lfs\]/);
  assert.match(config, /fetchexclude\s*=\s*\*\s*$/m);
  assert.doesNotMatch(config, /\b(?:url|pushurl|allowincompletepush|skipdownloaderrors)\s*=/);
  const workflow = fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
  assert.doesNotMatch(workflow,/git lfs pull|git lfs fetch/);
  assert.match(workflow,/--suite repository/);
});

test('the clone policy is honored by Git LFS without the Cloudflare build variable', () => {
  const env = {...process.env};
  delete env.GIT_LFS_SKIP_SMUDGE;
  delete env.GIT_LFS_SKIP_DOWNLOAD_ERRORS;
  const pointer = 'version https://git-lfs.github.com/spec/v1\noid sha256:' + '0'.repeat(64) + '\nsize 67000000\n';
  const result = spawnSync('git', ['-c','lfs.url=http://127.0.0.1:1/blocked-download','lfs','smudge','--','V4/native-test-only.psd'], {
    cwd:root,env,input:pointer,encoding:'utf8',timeout:10000
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, pointer, 'native source stays a pointer instead of triggering a download');
});

test('Cloudflare accounting includes generated files, not just copied media', () => {
  const source = fs.readFileSync(path.join(__dirname,'build.cjs'),'utf8');
  assert.match(source, /MARKER, 'jeu\/catalogue\.json', 'index\.html', '\.nojekyll'/);
  assert.match(source, /path: 'release\.json', bytes: Buffer\.byteLength\(JSON\.stringify\(manifest\)\)/);
  assert.match(source, /assertPublicationLimits\(\[\.\.\.assets, \.\.\.generatedAssets\]\)/);
});
