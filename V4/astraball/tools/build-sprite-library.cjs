'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v2/prompts.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v2/atlas-report.json'), 'utf8'));
const scales = { brund: 1.28, nell: 1.25, brask: 1.45, ithrek: 1.48, nessyra: 1.5, vaerok: 1.48 };
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
const library = { schemaVersion: 1, packId: 'kalistar-originals-02',
  template: { id: 'astraball-16-v1', columns: 4, rows: 4, cell: 96, foot: 90 },
  entries };
fs.writeFileSync(path.join(root, 'data/sprite-library.json'), JSON.stringify(library, null, 2) + '\n');
console.log(entries.length + ' entries, ' + entries.reduce((sum, entry) => sum + entry.bytes, 0) + ' bytes');
