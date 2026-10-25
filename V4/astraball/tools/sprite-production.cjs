'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), repo = path.resolve(root, '../..');
const folder = 'sources/sprites-v3', manifest = path.join(root, folder, 'production.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};
function localReference(value) {
  if (typeof value !== 'string' || !value) return null;
  const absolute = path.resolve(repo, value), relative = path.relative(repo, absolute).replaceAll('\\', '/');
  if (relative.startsWith('../') || path.isAbsolute(relative) || !fs.existsSync(absolute)) return null;
  return relative;
}
async function inventory(previous = null) {
  const rows = read(path.join(repo, 'V4/donnees/catalogue.json')).cards;
  const refs = read(path.join(repo, 'V4/atelier/data/references.json')).cards;
  const { cards } = await require('../../atelier/game-catalog.cjs').buildCatalog({ published: rows.filter(x => x.kind !== 'approved') });
  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.characterId)) groups.set(card.characterId, []);
    groups.get(card.characterId).push(card);
  }
  const covered = new Map();
  for (const version of [1, 2]) {
    const spec = read(path.join(root, `sources/sprites-v${version}/prompts.json`));
    for (const item of spec.characters) {
      const characterId = item.characterId || item.id;
      if (!groups.has(characterId)) throw Error('Unknown existing identity: ' + characterId);
      covered.set(characterId, { ...item, version });
    }
  }
  const old = new Map((previous?.characters || []).map(c => [c.characterId, c]));
  const characters = [...groups].map(([characterId, models]) => {
    models.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const existing = covered.get(characterId), saved = old.get(characterId);
    const modelId = String(existing?.modelId || saved?.modelId || models[0].id);
    const card = models.find(c => String(c.id) === modelId);
    if (!card) throw Error('Selected model disappeared: ' + modelId);
    const row = rows.find(c => String(c.id) === modelId), ref = refs.find(c => String(c.card.id) === modelId);
    const profile = ref?.card || row?.profile || {};
    const reference = localReference(existing?.reference) || localReference(saved?.reference) ||
      localReference(profile.artworkSource) || localReference(profile.art) ||
      localReference(`V4/expansions/2026-09-23-return/cards/${profile.artwork}/illustration.png`) ||
      localReference(`V4/creations/${modelId}/illustration.png`) || localReference(row?.png || ref?.png);
    if (!reference) throw Error('No canonical visual reference: ' + characterId);
    const id = existing?.id || saved?.id || characterId;
    const referenceSha256 = hash(path.join(repo, reference));
    if (saved && saved.referenceSha256 !== referenceSha256) throw Error('Reference changed; explicit review required: ' + id);
    return { ...saved, id, characterId, modelId, modelIds: models.map(c => String(c.id)),
      name: card.name, race: card.race, faction: card.faction, job: card.job, element: card.element,
      description: card.description, reference, referenceSha256,
      source: existing?.source || saved?.source || `${folder}/${id}.png`,
      file: existing ? `assets/sprites-v${existing.version}/${id}.png` : `assets/sprites-v3/${id}.png`,
      status: existing ? 'existing' : saved?.status || 'pending',
      ...(existing ? { sha256: hash(path.join(root, `assets/sprites-v${existing.version}/${id}.png`)) } : {}),
    };
  }).sort((a, b) => a.modelId.localeCompare(b.modelId));
  return { schemaVersion: 1, scope: 'One sprite per canonical characterId; card appearances remain distinct models',
    template: 'sources/sprites-v1/kaylis.png', tool: 'Built-in image_gen',
    cardCount: cards.length, characterCount: characters.length,
    commonPrompt: read(path.join(root, 'sources/sprites-v2/prompts.json')).commonPrompt,
    characters };
}
async function main() {
  const [command, id, input, revisionPrompt] = process.argv.slice(2);
  if (command === 'inventory') {
    write(manifest, await inventory(fs.existsSync(manifest) ? read(manifest) : null));
  } else if (command === 'record' || command === 'repack' || command === 'revise') {
    const spec = read(manifest), character = spec.characters.find(c => c.id === id);
    if (!character || (command === 'record' ? character.status !== 'pending' : !['generated','review','ready'].includes(character.status))) throw Error('Invalid production transition');
    const registered = read(path.join(repo, 'V4/deploy/runtime-media.json')).files;
    if (registered.some(file => file.source === 'V4/astraball/' + character.file)) throw Error('Published sprites require a new version');
    character.subject = read(path.join(root, folder, 'subjects.json'))[id];
    if (!character.subject) throw Error('Individual subject must be specified first');
    if (hash(path.join(repo, character.reference)) !== character.referenceSha256) throw Error('Reference changed');
    if (command === 'revise') {
      if (!revisionPrompt) throw Error('A revision prompt is required');
      if (hash(path.join(root, character.source)) !== character.sourceSha256) throw Error('Source changed');
      const revision = (character.history?.length || 0) + 2;
      const nextSource = `${folder}/${id}-${String(revision).padStart(2, '0')}.png`;
      if (fs.existsSync(path.join(root, nextSource))) throw Error('Revision source already exists');
      const previous = { source: character.source, sourceSha256: character.sourceSha256,
        generatedAt: character.generatedAt, atlas: read(path.join(root, folder, id + '.atlas.json')) };
      fs.copyFileSync(path.resolve(input), path.join(root, nextSource));
      character.history = [...(character.history || []), previous];
      character.source = nextSource;
      character.revisionPrompt = revisionPrompt;
      character.generatedAt = new Date().toISOString();
    }
    const target = path.join(root, character.source);
    if (command === 'record') {
      if (fs.existsSync(target)) throw Error('Source already exists; preserve it and review before replacing');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.resolve(input), target);
    } else if (command === 'repack' && hash(target) !== character.sourceSha256) throw Error('Source changed');
    character.status = 'generated';
    delete character.reviewedAt;
    character.generatedAt ||= new Date().toISOString();
    character.sourceSha256 = hash(target);
    write(manifest, spec);
    const packed = await require('./prepare-sprites-v2.cjs').pack(character, 'sprites-v3');
    write(path.join(root, folder, id + '.atlas.json'), packed);
    character.status = 'review'; character.sha256 = packed.sha256; character.bytes = packed.bytes;
    write(manifest, spec);
  } else if (command === 'accept') {
    const spec = read(manifest), character = spec.characters.find(c => c.id === id);
    if (!character || character.status !== 'review') throw Error('Only a packed character can be accepted');
    if (hash(path.join(root, character.file)) !== character.sha256) throw Error('Packed sprite changed');
    character.status = 'ready'; character.reviewedAt = new Date().toISOString();
    write(manifest, spec);
  } else if (command !== 'status') throw Error('Use inventory, record <id> <generated PNG>, revise <id> <PNG> <prompt>, repack <id>, accept <id>, or status');
  const spec = read(manifest), counts = {};
  for (const c of spec.characters) counts[c.status] = (counts[c.status] || 0) + 1;
  console.log(JSON.stringify({ cards: spec.cardCount, characters: spec.characterCount, counts }));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { inventory, localReference };
