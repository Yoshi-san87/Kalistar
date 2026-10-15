'use strict';
const assert = require('node:assert/strict');
const { validateCrop } = require('./model.cjs');
const ART = Object.freeze({ left: 80, top: 156, width: 737, height: 921 });
function cropRect(width, height, crop) {
  validateCrop(crop); assert.ok(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0);
  const scale = Math.max(ART.width / width, ART.height / height) * crop.zoom;
  const w = Math.max(1, Math.min(width, Math.round(ART.width / scale))), h = Math.max(1, Math.min(height, Math.round(ART.height / scale)));
  return { left: Math.round((width - w) * (1 - crop.x) / 2), top: Math.round((height - h) * (1 - crop.y) / 2), width: w, height: h };
}
async function cropArt(sharp, input, crop) {
  const m = await sharp(input).metadata(); assert.equal(m.format, 'png');
  return sharp(input).extract(cropRect(m.width, m.height, crop)).resize(ART.width, ART.height, { fit: 'fill' }).png().toBuffer();
}
function clearAlphaBelow(data, info, y) {
  assert.equal(info.channels, 4); assert.ok(Number.isInteger(y) && y > 0 && y < info.height);
  const after = Buffer.from(data); let changed = 0;
  for (let i = y * info.width * 4 + 3; i < after.length; i += 4) if (after[i]) { after[i] = 0; changed++; }
  return { data: after, changed };
}
module.exports = { ART, cropRect, cropArt, clearAlphaBelow };
