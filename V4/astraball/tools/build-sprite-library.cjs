'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v2/prompts.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v2/atlas-report.json'), 'utf8'));
const scales = { brund: 1.28, nell: 1.25, brask: 1.45, ithrek: 1.48, nessyra: 1.5, vaerok: 1.48,
  momo: 1.1, kaylis: 1.4, taulio: 1.48, cana: 1.4, balmhyr: 1.32,
  voloden: 1.5, lok: 1.32, darnako: 1.5, iliane: 1.45, valazar: 1.5,
  kognus: 1.28, reevus: 1.28, gilmarr: 1.48, nazar: 1.48, belrog: 1.48, magnar: 1.5,
  'vulcan-raven-mgs': 1.5, 'kimahri-ff10': 1.48,
  'barret-ff7': 1.48, 'fatman-mgs': 1.48, 'volgin-mgs': 1.5,
  'nemesis-re': 1.5, 'tyrant-t103-re': 1.5, 'alcina-dimitrescu-re': 1.5,
  'ramon-salazar-re': 1.22, 'eveline-re': 1.2,
  'tony-tony-chopper-op': 1.08, 'franky-op': 1.48, 'brook-op': 1.5,
  'jinbe-op': 1.5, 'arlong-op': 1.48,
  'tilko-kalistar': 1.35, 'orel-kalistar': 1.28,
  'daska-kalistar': 1.48, 'hadruk-kalistar': 1.48, 'pelag-kalistar': 1.45,
  'tivrek-kalistar': 1.42, 'nacre-kalistar': 1.48,
  'vivi-ff9': 1.12, 'eiko-ff9': 1.12, 'steiner-ff9': 1.48,
  'tarask-ff9': 1.5, 'pile-ff9': 1.17, 'face-ff9': 1.17,
  'branet-ff9': 1.48, 'garland-ff9': 1.5, 'bach-ff9': 1.48,
  'markus-ff9': 1.45, 'cina-ff9': 1.2,
  'kweena-ff9': 1.48, 'strago-ff6': 1.2, 'relm-ff6': 1.12,
  'gau-ff6': 1.2, 'umaro-ff6': 1.5, 'sabin-ff6': 1.48,
  'gladiolus-ff15': 1.5, 'snow-ff13': 1.5, 'hope-ff13': 1.24,
  'wolverine-xmen': 1.32, 'le-fauve-xmen': 1.5, 'pingouin-batman': 1.28,
  'zangief-street-fighter': 1.5, 'blanka-street-fighter': 1.45,
  'sagat-street-fighter': 1.5, 'e-honda-street-fighter': 1.48,
  't-hawk-street-fighter': 1.5, 'balrog-street-fighter': 1.48,
  'robo-chrono-trigger': 1.48, 'frog-chrono-trigger': 1.26,
  'hrold-kalistar': 1.48, 'ulvren-kalistar': 1.48,
  'kaervan-kalistar': 1.48, 'drogan-kalistar': 1.5,
  'general-barok-kalistar': 1.5, 'raskel-kalistar': 1.25,
  'perelle-kalistar': 1.2, 'ossum-kalistar': 1.5,
  'nereis-kalistar': 1.48, 'khorna-kalistar': 1.48,
  'krang-tmnt': 1.5, 'bebop-tmnt': 1.48, 'rocksteady-tmnt': 1.5,
  'maitre-splinter-tmnt': 1.3, 'zhaerik-kalistar': 1.5,
  'syrkha-kalistar': 1.48, 'dhorven-kalistar': 1.5,
  'orzhan-kalistar': 1.5, 'ochette-octopath-traveler': 1.25 };
if (report.characters.length !== spec.characters.length) throw Error('Incomplete sprite pack');
async function build() {
const { calibrationFromFrames } = await import('../src/sprite-sizing.mjs');
const entries = spec.characters.map(character => {
  const asset = report.characters.find(row => row.id === character.id);
  if (!asset) throw Error('Missing packed sprite: ' + character.id);
  return {
    id: 'astraball.' + character.characterId + '.' + character.modelId + '.v1',
    spriteKey: character.id, characterId: character.characterId, modelId: character.modelId,
    name: character.name, race: character.race, faction: character.faction,
    file: asset.file, width: 384, height: 384, bytes: asset.bytes,
    sha256: asset.sha256, scale: scales[character.id] || 1.4,
    calibration: calibrationFromFrames(asset.frames),
  };
});
const production = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v3/production.json'), 'utf8'));
const originals = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v1/atlas-report.json'), 'utf8'));
const hash = file => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
for (const character of production.characters) {
  const original = originals.characters.find(c => c.id === character.id);
  if (!original && character.status !== 'ready') continue;
  const asset = original || JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v3', character.id + '.atlas.json'), 'utf8'));
  if (asset.sha256 !== hash(asset.file) || asset.sourceSha256 !== hash(asset.source)) throw Error('Unverified sprite: ' + character.id);
  entries.push({
    id: 'astraball.' + character.characterId + '.' + character.modelId + '.v1',
    spriteKey: character.id, characterId: character.characterId, modelId: character.modelId,
    name: character.name, race: character.race, faction: character.faction,
    file: asset.file, width: 384, height: 384, bytes: asset.bytes,
    sha256: asset.sha256, scale: scales[character.id] || 1.4,
    calibration: calibrationFromFrames(asset.frames),
  });
}
if (new Set(entries.map(c => c.characterId)).size !== entries.length) throw Error('Duplicate canonical sprite');
const library = { schemaVersion: 1, packId: 'kalistar-roster-03',
  template: { id: 'astraball-16-v1', columns: 4, rows: 4, cell: 96, foot: 90 },
  entries };
fs.writeFileSync(path.join(root, 'data/sprite-library.json'), JSON.stringify(library, null, 2) + '\n');
const allowedFile = path.join(root, 'runtime-files.json');
const allowed = JSON.parse(fs.readFileSync(allowedFile, 'utf8'));
for (const entry of entries) if (!allowed.includes(entry.file)) allowed.push(entry.file);
fs.writeFileSync(allowedFile, JSON.stringify(allowed, null, 2) + '\n');
console.log(entries.length + ' entries, ' + entries.reduce((sum, entry) => sum + entry.bytes, 0) + ' bytes');
}
build().catch(error => { console.error(error); process.exitCode = 1; });
