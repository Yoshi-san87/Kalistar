const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const DATA = path.join(__dirname, 'data');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const PYTHON = 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const EDITABLE = ['name', 'title', 'job', 'description', 'positions', 'atk', 'defense', 'magic', 'barriers'];
const ID = /^[a-f0-9-]{36}$/;
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2)); fs.renameSync(temp, file);
}
function inside(base, relative) {
  const target = path.resolve(base, relative), rel = path.relative(base, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Chemin interdit.');
  return target;
}
function jobDir(id) { if (!ID.test(id)) throw Error('Identifiant de travail invalide.'); return inside(path.join(DATA, 'jobs'), id); }
async function hash(file) { const h = crypto.createHash('sha256'); for await (const c of fs.createReadStream(file)) h.update(c); return h.digest('hex'); }
function baseline() { return read(path.join(DATA, 'references.json')); }
async function protectedCheck(ref = baseline()) {
  for (const [file, sha] of Object.entries(ref.protectedFiles)) {
    if (await hash(inside(ROOT, file)) !== sha) throw Error('Reference modifiee : ' + file + '. Generation bloquee.');
  }
  return Object.keys(ref.protectedFiles).length;
}
async function rendererHash() {
  const files = ['worker.jsx', 'runner.cjs', 'lib.cjs', 'barcode.py', 'bridge.ps1'];
  return crypto.createHash('sha256').update((await Promise.all(files.map(f => hash(path.join(__dirname, f))))).join(':')).digest('hex');
}
function editable(card) { return Object.fromEntries(EDITABLE.map(k => [k, structuredClone(card[k])])); }
function validatePatch(entry, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Fiche invalide.');
  if (Object.keys(input).some(k => !EDITABLE.includes(k))) throw Error('Champ protege.');
  const card = structuredClone(entry.card);
  for (const field of ['name', 'title', 'job', 'description']) if (field in input) {
    if (typeof input[field] !== 'string' || /[\x00-\x1f\x7f\u2028\u2029]/.test(input[field])) throw Error('Texte invalide : ' + field);
    const text = input[field].trim().replace(/ +/g, ' ');
    const max = field === 'description' ? 380 : field === 'title' ? 60 : 35;
    if (!text || text.length > max) throw Error('Longueur invalide : ' + field);
    card[field] = text;
  }
  for (const side of ['atk', 'defense']) if (side in input) {
    if (!Array.isArray(input[side]) || input[side].length !== 6) throw Error('Six valeurs requises.');
    card[side] = input[side].map((v, i) => {
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 999) return v;
      if (typeof v === 'string' && entry.options[side][i].includes(v)) return v;
      throw Error('Valeur ou effet non calibre : ' + side + ' D' + (6 - i));
    });
  }
  for (const field of ['positions', 'magic', 'barriers']) if (field in input) {
    const values = input[field], max = field === 'positions' ? 5 : 6;
    if (!Array.isArray(values) || values.length > max || values.some(v => !Number.isInteger(v) || v < 1 || v > max) || new Set(values).size !== values.length) throw Error('Positions ou modes invalides.');
    if (field === 'positions' && !values.length) throw Error('Choisir au moins une position.');
    card[field] = [...values].sort((a, b) => field === 'positions' ? a - b : b - a);
  }
  for (const [field, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
    if (card[field].some(d => typeof card[side][6 - d] !== 'number')) throw Error('Un effet ne peut pas recevoir de mode magique ou barriere.');
  }
  if (card.element === 'NONE' && (card.magic.length || card.barriers.length)) throw Error('Sans cristal : ni magie ni barriere.');
  return card;
}
async function pixels(file) { return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); }
async function diff(a, b, rectangles = []) {
  const x = await pixels(a), y = await pixels(b); assert.deepEqual(x.info, y.info);
  let changed = 0, outside = 0;
  for (let j = 0; j < x.info.height; j++) for (let i = 0; i < x.info.width; i++) {
    const p = (j * x.info.width + i) * 4;
    if (x.data[p] === y.data[p] && x.data[p+1] === y.data[p+1] && x.data[p+2] === y.data[p+2] && x.data[p+3] === y.data[p+3]) continue;
    changed++;
    if (!rectangles.some(r => i >= r[0] && j >= r[1] && i < r[2] && j < r[3])) outside++;
  }
  return { changed, outside };
}
module.exports = { fs, path, crypto, assert, ROOT, DATA, PYTHON, sharp, ID, EDITABLE, read, write, inside, jobDir, hash, baseline, protectedCheck, rendererHash, editable, validatePatch, diff };
