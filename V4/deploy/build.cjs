'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {buildCatalog} = require('../atelier/game-catalog.cjs');
const {assertPublicationLimits} = require('./publication-limits.cjs');
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
function versionStaticAssets(html, version) {
  const value = encodeURIComponent(version);
  return html.replace(/((?:href|src)="[^"]+\.(?:css|js|webmanifest))(?=")/g, `$1?v=${value}`);
}
async function releaseVersion(files) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    if (!file.target.startsWith('jeu/') || !/\.(?:css|js|html|webmanifest)$/.test(file.target)) continue;
    hash.update(file.target);
    hash.update(await fs.readFile(inside(ROOT, file.source)));
  }
  return hash.digest('hex').slice(0, 12);
}
async function plan({mediaPolicy = true} = {}) {
  await require('../site/rules-documents.cjs').validateSources();
  const references = await json('V4/atelier/data/references.json');
  const story = await json('V4/site/story-content.json');
  const approvedCardIds = new Set(references.cards.map(card => String(card.card.id)));
  for (const section of story.sections) {
    const anchors = new Set();
    for (const scene of section.illustrations || []) {
      if (!Number.isInteger(scene.afterParagraph) || scene.afterParagraph < 0 || scene.afterParagraph >= section.paragraphs.length || anchors.has(scene.afterParagraph) || !approvedCardIds.has(String(scene.cardId)) || !scene.alt?.trim() || !scene.caption?.trim()) {
        throw Error('Invalid approved story illustration anchor: ' + section.id);
      }
      anchors.add(scene.afterParagraph);
    }
  }
  const published = (await json('V4/donnees/catalogue.json')).cards.filter(c => c.kind === 'created');
  if (published.some(c => c.testOnly || c.profile?.testOnly || c.profile?.published === false)) throw Error('Test or unpublished card in publication registry');
  const catalogue = await buildCatalog({published});
  let media;
  if (mediaPolicy) {
    try { media = await json('V4/deploy/runtime-media.json'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const mediaBySource = media && new Map(media.files.map(file => [file.source, file]));
  const files = new Map();
  function add(source, target, expectedHash, card = false) {
    inside(ROOT, source); inside(DIST, target);
    if (mediaBySource && (card || source.includes('/assets/'))) {
      const record = mediaBySource.get(source);
      if (!record) throw Error('Media must be registered before publication: ' + source);
      if (expectedHash && expectedHash !== record.sha256) throw Error('Media registry disagrees with native lock: ' + source);
      expectedHash = record.sha256;
    }
    files.set(target, {source, target, expectedHash, card});
  }
  async function tree(source, target, allowed = () => true) {
    if (mediaBySource) {
      for (const file of media.files) {
        if (!file.source.startsWith(source + '/')) continue;
        const relative = file.source.slice(source.length + 1);
        if (relative.split('/').every(allowed)) add(file.source, target + '/' + relative);
      }
      return;
    }
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
  add('V4/site/story-content.json', 'jeu/story-content.json');
  if(process.env.CF_PAGES==='1'){
    add('V4/deploy/access-worker.mjs','_worker.js');
    add('V4/deploy/journey-worker.mjs','journey-worker.mjs');
    add('V4/deploy/journey-runtime.cjs','journey-runtime.cjs');
    add('V4/deploy/journey-legacy-4.6.85.json','journey-legacy-4.6.85.json');
  }
  await tree('V3/site/assets', 'jeu/assets', name => name !== 'cards' && !['arena.png','logo.png','back.png'].includes(name));
  await tree('V4/site/assets', 'jeu/assets');
  for (const folder of ['cristaux','effets','factions','races','armes','armes_transparentes']) {
    await tree('V3/assets/' + folder, 'jeu/shared/' + folder);
  }
  // Intermediate extraction atlases are authoring sources, never runtime textures.
  for (const file of ['factions/atlas_v2_subject.png','factions/atlas_v2_wand.png',
    'effets/icones_atlas_v2_subject.png','effets/icones_atlas_v2_wand.png']) {
    files.delete('jeu/shared/' + file);
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
  const version = await releaseVersion(files);
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
  let journeyHash='',compatibility=null;
  if(process.env.CF_PAGES==='1'){
    journeyHash=await require('./journey-hash.cjs').hash(ROOT);
    const candidate=await json('V4/deploy/journey-compatibility.json');
    if(candidate.compatibleHash===journeyHash){
      if(digest(await fs.readFile(path.join(__dirname,candidate.catalogue)))!==candidate.catalogueSha256)throw Error('Legacy journey catalogue changed');
      compatibility=candidate;
    }
  }
  for (const file of files) {
    let bytes = await fs.readFile(inside(ROOT, file.source));
    if (bytes.subarray(0, 100).toString().startsWith('version https://git-lfs.github.com/spec/v1')) throw Error('LFS object not downloaded: ' + file.source);
    if (file.expectedHash && digest(bytes) !== file.expectedHash) throw Error('Approved image changed: ' + file.source);
    if (file.card && (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== 897 || bytes.readUInt32BE(20) !== 1497)) throw Error('Invalid card dimensions: ' + file.source);
    if (file.target === 'jeu/index.html') {
      const html = bytes.toString('utf8');
      if (html.split('data-hosting="local"').length !== 2) throw Error('Missing hosting marker');
      bytes = Buffer.from(versionStaticAssets(html.replace('data-hosting="local"', 'data-hosting="static" data-auth-state="checking"'), version));
    }
    if(file.target==='jeu/login.html')bytes=Buffer.from(versionStaticAssets(bytes.toString('utf8'),version));
    if(file.target==='journey-runtime.cjs')bytes=Buffer.from("'use strict';\nmodule.exports={Combat:require('./jeu/journey-combat.js'),Composition:require('./jeu/team-composition.js'),hash:"+JSON.stringify(journeyHash)+",snapshotHashes:"+JSON.stringify(compatibility?.snapshotHashes||[])+",legacy:"+(compatibility?"{hash:"+JSON.stringify(compatibility.legacyHash)+",data:require('./journey-legacy-4.6.85.json')}":'null')+"};\n");
    const target = inside(DIST, file.target);
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.writeFile(target, bytes);
    assets.push({path: file.target, bytes: bytes.length, sha256: digest(bytes)});
  }
  await fs.writeFile(path.join(DIST, 'jeu/catalogue.json'), JSON.stringify(catalogue));
  await fs.writeFile(path.join(DIST, 'index.html'), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=jeu/"><title>Kalistar</title><a href="jeu/">Jouer a Kalistar</a></html>');
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');
  if(process.env.CF_PAGES==='1')await fs.writeFile(path.join(DIST,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]}));
  const manifest = {edition: 'V4', version, cards: catalogue.cards.length, assets, bytes: assets.reduce((n,a) => n+a.bytes, 0)};
  const generatedAssets = process.env.CF_PAGES === '1' ? await Promise.all([
    MARKER, 'jeu/catalogue.json', 'index.html', '.nojekyll', '_routes.json'
  ].map(async file => ({path: file, bytes: (await fs.stat(path.join(DIST, file))).size}))) : [];
  if (process.env.CF_PAGES === '1') generatedAssets.push({path: 'release.json', bytes: Buffer.byteLength(JSON.stringify(manifest))});
  assertPublicationLimits([...assets, ...generatedAssets]);
  await fs.writeFile(path.join(DIST, 'release.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({cards: manifest.cards, files: assets.length, megabytes: +(manifest.bytes / 1024 ** 2).toFixed(1), output: DIST}));
  return manifest;
}
module.exports = {plan, build, ROOT, DIST, inside, versionStaticAssets, releaseVersion};
if (require.main === module) {
  (process.argv.includes('--lfs-paths') ? plan().then(p => console.log(p.files.map(f=>f.source).join(','))) : build())
    .catch(error => {console.error(error.message); process.exitCode = 1;});
}
