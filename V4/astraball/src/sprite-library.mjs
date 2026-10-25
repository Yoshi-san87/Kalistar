import { validCalibration } from './sprite-sizing.mjs';
// Static media index only: no ownership, player state or gameplay statistics.
export function createSpriteLibrary(source) {
  if (source.schemaVersion !== 1 || source.template?.id !== 'astraball-16-v1' ||
      source.template.cell !== 96 || source.template.foot !== 90 ||
      source.template.columns !== 4 || source.template.rows !== 4 ||
      !Array.isArray(source.entries)) throw new Error('Unsupported sprite library');
  const ids = new Map(), models = new Map();
  for (const value of source.entries) {
    if (!/^[a-z0-9.-]+$/.test(value.id) || !/^[a-z0-9-]+$/.test(value.characterId) ||
        !/^[34]\d{7}$/.test(value.modelId) || !/^[a-z0-9-]+$/.test(value.spriteKey) ||
        !/^assets\/sprites-v\d+\/[a-z0-9-]+\.png$/.test(value.file) ||
        !/^[a-f0-9]{64}$/.test(value.sha256) ||
        !Number.isInteger(value.bytes) || value.bytes < 1 ||
        value.width !== 384 || value.height !== 384 ||
        !Number.isFinite(value.scale) || value.scale <= 0 || value.scale > 2 ||
        (value.calibration !== undefined && !validCalibration(value.calibration)) ||
        ['name', 'race', 'faction'].some(key => typeof value[key] !== 'string' || !value[key].trim())) {
      throw new Error('Invalid sprite entry: ' + value.id);
    }
    if (ids.has(value.id) || models.has(value.modelId)) throw new Error('Duplicate sprite identity: ' + value.id);
    const entry = Object.freeze({ ...value, ...(value.calibration ? {calibration:Object.freeze({...value.calibration})} : {}) });
    ids.set(entry.id, entry); models.set(entry.modelId, entry);
  }
  const entries = Object.freeze([...ids.values()]);
  return Object.freeze({
    entries,
    get: id => ids.get(id) || null,
    forModel: modelId => models.get(String(modelId)) || null,
    forCharacter: characterId => Object.freeze(entries.filter(entry => entry.characterId === characterId)),
  });
}
