'use strict';
const { fs, path, sharp, hash, write, ROOT } = require('../../atelier/lib.cjs');
async function main() {
  const original = path.join(__dirname, 'assets/captain-crown-source.png');
  if (!fs.existsSync(original)) {
    fs.mkdirSync(path.dirname(original), { recursive: true });
    fs.copyFileSync(process.argv[2], original, fs.constants.COPYFILE_EXCL);
  }
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0, transparent = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (!alpha) transparent++;
    if (alpha > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1); }
  }
  if (transparent < info.width * info.height * .1) throw Error('Crown needs a transparent cutout.');
  const target = path.join(ROOT, 'V4/site/assets/ui/captain-crown-v1.webp');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const cropped = await sharp(original).extract({ left, top, width: right - left, height: bottom - top }).resize({ width: 320, height: 256, fit: 'inside' }).png().toBuffer();
  const size = await sharp(cropped).metadata();
  await sharp({ create: { width: 336, height: 272, channels: 4, background: '#00000000' } }).composite([{ input: cropped, left: Math.round((336 - size.width) / 2), top: Math.round((272 - size.height) / 2) }]).webp({ quality: 92, alphaQuality: 100 }).toFile(target);
  write(path.join(__dirname, 'assets/crown-provenance.json'), { source: 'Built-in imagegen; user-requested unique captain crown', prompt: require('./crown-prompt.json'), original: 'assets/captain-crown-source.png', originalHash: await hash(original), target: 'V4/site/assets/ui/captain-crown-v1.webp', targetHash: await hash(target), transformation: 'Alpha-bound crop and size export only; no visual retouch', bounds: { left, top, right, bottom }, transparentPixels: transparent });
  console.log({ target, width: 336, height: 272, transparentPixels: transparent });
}
main().catch(e => { console.error(e); process.exitCode = 1; });
