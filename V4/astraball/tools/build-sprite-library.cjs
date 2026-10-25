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
  'jinbe-op': 1.5, 'arlong-op': 1.48 };
if (report.characters.length !== spec.characters.length) throw Error('Incomplete sprite pack');
const entries = spec.characters.map(character => {
  const asset = report.characters.find(row => row.id === character.id);
  if (!asset) throw Error('Missing packed sprite: ' + character.id);
  return {
    id: 'astraball.' + character.characterId + '.' + character.modelId + '.v1',
    spriteKey: character.id, characterId: character.characterId, modelId: character.modelId,
    name: character.name, race: character.race, faction: character.faction,
    file: asset.file, width: 384, height: 384, bytes: asset.bytes,
    sha256: asset.sha256, scale: scales[character.id] || 1.4,
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
