'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

let sharp;
try {
  sharp = require('sharp');
} catch {
  const runtime = process.env.KALISTAR_NODE_MODULES ||
    'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
  sharp = createRequire(path.join(runtime, '_kalistel_books_.cjs'))('sharp');
}

const root = __dirname;
const repo = path.resolve(root, '../../..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'generation.json'), 'utf8'));
const elements = JSON.parse(fs.readFileSync(path.join(repo, spec.elementsReference), 'utf8'));
const labels = {
  ELECTRO: '\u00c9lectricit\u00e9', PYRO: 'Feu', HYDRO: 'Eau',
  CRYO: 'Glace', AERO: 'Air', HERBO: 'Plante', GEO: 'Terre',
  MINERO: 'Roche', HEMATO: 'Sang', NECRO: 'T\u00e9n\u00e8bres',
  LUXO: 'Lumi\u00e8re', RAINBOW: 'Rainbow'
};
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fingerprint = file => ({ bytes: fs.statSync(file).size, sha256: hash(file) });

async function main() {
  for (const directory of ['originals', 'images', 'prompts', 'verification']) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  }
  const items = [];
  for (const item of spec.items) {
    if (!elements[item.code] || item.code === 'NONE') throw new Error('Unknown Kalistel: ' + item.code);
    const original = 'originals/' + item.code + '.png';
    const image = 'images/' + item.code.toLowerCase() + '-book-v1.webp';
    const prompt = 'prompts/' + item.code + '.txt';
    const originalFile = path.join(root, original);
    if (!fs.existsSync(originalFile)) fs.copyFileSync(item.sourcePath, originalFile);
    const promptText = item.promptSource ?
      fs.readFileSync(path.join(repo, item.promptSource)) : Buffer.from(item.prompt, 'utf8');
    fs.writeFileSync(path.join(root, prompt), promptText);
    const metadata = await sharp(originalFile).metadata();
    const stats = await sharp(originalFile).stats();
    const alpha = stats.channels[3];
    if (metadata.width !== 1024 || metadata.height !== 1536 || !metadata.hasAlpha ||
        !alpha || alpha.min !== 0 || alpha.max < 250) {
      throw new Error('Invalid transparent portrait: ' + item.code);
    }
    if (item.code === 'MINERO') {
      fs.copyFileSync(path.join(repo, spec.baseReference), path.join(root, image));
    } else {
      await sharp(originalFile).webp({ quality: 92, effort: 4 }).toFile(path.join(root, image));
    }
    const webpMetadata = await sharp(path.join(root, image)).metadata();
    if (!webpMetadata.hasAlpha) throw new Error('Alpha lost: ' + item.code);
    items.push({
      code: item.code, label: labels[item.code], color: '#' + elements[item.code].color,
      method: item.method, original, image, prompt,
      width: metadata.width, height: metadata.height, hasAlpha: true,
      alphaRange: [alpha.min, alpha.max],
      originalFile: fingerprint(originalFile),
      runtimeFile: fingerprint(path.join(root, image)),
      promptFile: fingerprint(path.join(root, prompt)),
      references: [
        { path: spec.baseReference, ...fingerprint(path.join(repo, spec.baseReference)) },
        { path: item.crystalReference, ...fingerprint(path.join(repo, item.crystalReference)) }
      ]
    });
  }
  const manifest = {
    schemaVersion: 1, createdOn: spec.createdOn, method: spec.method, count: items.length,
    purpose: 'Twelve Kalistel covers in Story; only Tome I opens, no new story content',
    runtimeFormat: '1024 x 1536 alpha WebP, quality 92, effort 4',
    sourceOfTruth: spec.elementsReference, items
  };
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const originalsBytes = items.reduce((sum, item) => sum + item.originalFile.bytes, 0);
  const webpBytes = items.reduce((sum, item) => sum + item.runtimeFile.bytes, 0);
  console.log(JSON.stringify({ count: items.length, originalsBytes, webpBytes, manifest: path.join(root, 'manifest.json') }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
