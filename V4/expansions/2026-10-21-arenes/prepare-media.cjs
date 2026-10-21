'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime, '_arena-media.cjs'))('sharp');
const provenance = require('./provenance.json');
const root = path.resolve(__dirname, '../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function main() {
  const report = [];
  await fs.mkdir(path.join(__dirname, 'sources'), { recursive: true });
  for (const image of provenance.images) {
    const source = path.join(__dirname, 'sources', image.id + '.png');
    try { await fs.access(source); } catch { await fs.copyFile(image.generated, source, 1); }
    const bytes = await fs.readFile(source), metadata = await sharp(bytes).metadata();
    const output = path.join(root, 'V4/site/assets/arenes', image.id + '.webp');
    const web = await sharp(bytes).resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toBuffer();
    await fs.writeFile(output, web);
    report.push({ id: image.id, source: path.relative(root, source).replaceAll('\\', '/'), sourceBytes: bytes.length, sourceSha256: hash(bytes), width: metadata.width, height: metadata.height, image: path.relative(root, output).replaceAll('\\', '/'), webBytes: web.length, sha256: hash(web) });
  }
  await fs.writeFile(path.join(__dirname, 'media.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
