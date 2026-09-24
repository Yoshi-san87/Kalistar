'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {buildCatalog} = require('../atelier/game-catalog.cjs');
const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(__dirname, 'dist');
const MARKER = '.kalistar-static-build';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse((await fs.readFile(path.join(ROOT, file), 'utf8')).replace(/^\uFEFF/, ''));
function inside(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw Error('Unsafe build path');
  const result = path.resolve(root, relative);
  if (!result.startsWith(root + path.sep)) throw Error('Build path escapes root');
  return result;
}
async function plan() {
  const references = await json('V4/atelier/data/references.json');
  const published = (await json('V4/donnees/catalogue.json')).cards.filter(c => c.kind === 'created');
  if (published.some(c => c.testOnly || c.profile?.testOnly || c.profile?.published === false)) throw Error('Test or unpublished card in publication registry');
  const catalogue = await buildCatalog({published});
  const files = new Map();
  function add(source, target, expectedHash, card = false) {
    inside(ROOT, source); inside(DIST, target);
    files.set(target, {source, target, expectedHash, card});
  }
  async function tree(source, target, allowed = () => true) {
    for (const entry of await fs.readdir(inside(ROOT, source), {withFileTypes: true})) {
      if (!allowed(entry.name)) continue;
      if (entry.isSymbolicLink()) throw Error('Symbolic links are not publishable');
      const src = source + '/' + entry.name, dst = target + '/' + entry.name;
      if (entry.isDirectory()) await tree(src, dst, allowed);
      else if (entry.isFile()) add(src, dst);
    }
  }
  for (const entry of await fs.readdir(path.join(ROOT, 'V4/site'), {withFileTypes: true})) {
    if (entry.isFile() && /\.(js|css|html|webmanifest)$/.test(entry.name)) add('V4/site/' + entry.name, 'jeu/' + entry.name);
  }
  await tree('V3/site/assets', 'jeu/assets', name => name !== 'cards' && !['arena.png','logo.png','back.png'].includes(name));
  await tree('V4/site/assets', 'jeu/assets');
  for (const folder of ['cristaux','effets','factions','races','armes','armes_transparentes']) {
    await tree('V3/assets/' + folder, 'jeu/shared/' + folder);
  }
  for (const ref of references.cards) {
    const expected = references.protectedFiles[ref.png];
    if (!expected) throw Error('Approved PNG missing from reference lock: ' + ref.key);
    add(ref.png, 'media/reference/' + ref.key + '.png', expected, true);
  }
  for (const card of published) {
    if (card.pngUrl !== '/media/created/' + card.id + '.png' || card.png !== 'V4/creations/' + card.id + '/card.png') throw Error('Unexpected published image path: ' + card.id);
    add(card.png, card.pngUrl.slice(1), null, true);
  }
  for (const card of catalogue.cards) card.psdUrl = null;
  for (const arena of catalogue.arenas) {
    if (!files.has(arena.image.slice(1))) throw Error('Missing arena: ' + arena.image);
  }
  return {files: [...files.values()].sort((a,b) => a.target.localeCompare(b.target)), catalogue};
}
async function build() {
  const {files, catalogue} = await plan();
  // Only this fixed, marked output directory may be replaced. Sources stay read-only.
  if (path.dirname(DIST) !== __dirname) throw Error('Unsafe output directory');
  let stat;
  try { stat = await fs.lstat(DIST); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (stat) {
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.readFile(path.join(DIST, MARKER), 'utf8') !== 'Kalistar static output\n') throw Error('Output is not an owned build directory');
    await fs.rm(DIST, {recursive: true});
  }
  await fs.mkdir(DIST, {recursive: true});
  await fs.writeFile(path.join(DIST, MARKER), 'Kalistar static output\n');
  const assets = [];
  for (const file of files) {
    let bytes = await fs.readFile(inside(ROOT, file.source));
    if (bytes.subarray(0, 100).toString().startsWith('version https://git-lfs.github.com/spec/v1')) throw Error('LFS object not downloaded: ' + file.source);
    if (file.expectedHash && digest(bytes) !== file.expectedHash) throw Error('Approved image changed: ' + file.source);
    if (file.card && (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== 897 || bytes.readUInt32BE(20) !== 1497)) throw Error('Invalid card dimensions: ' + file.source);
    if (file.target === 'jeu/index.html') {
      const html = bytes.toString('utf8');
      if (html.split('data-hosting="local"').length !== 2) throw Error('Missing hosting marker');
      bytes = Buffer.from(html.replace('data-hosting="local"', 'data-hosting="static"'));
    }
    const target = inside(DIST, file.target);
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.writeFile(target, bytes);
    assets.push({path: file.target, bytes: bytes.length, sha256: digest(bytes)});
  }
  await fs.writeFile(path.join(DIST, 'jeu/catalogue.json'), JSON.stringify(catalogue));
  await fs.writeFile(path.join(DIST, 'index.html'), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=jeu/"><title>Kalistar</title><a href="jeu/">Jouer a Kalistar</a></html>');
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');
  const manifest = {edition: 'V4', cards: catalogue.cards.length, assets, bytes: assets.reduce((n,a) => n+a.bytes, 0)};
  if (manifest.bytes > 900 * 1024 ** 2) throw Error('Static publication exceeds 900 MiB budget');
  await fs.writeFile(path.join(DIST, 'release.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({cards: manifest.cards, files: assets.length, megabytes: +(manifest.bytes / 1024 ** 2).toFixed(1), output: DIST}));
  return manifest;
}
module.exports = {plan, build, ROOT, DIST, inside};
if (require.main === module) {
  (process.argv.includes('--lfs-paths') ? plan().then(p => console.log(p.files.map(f=>f.source).join(','))) : build())
    .catch(error => {console.error(error.message); process.exitCode = 1;});
}
