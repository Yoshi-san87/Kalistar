'use strict';
const REVISIONS = Object.freeze([
  { key: 'kaine', id: '45951088', kind: 'zoom', crop: { zoom: 1.12, x: 0, y: 0 } },
  { key: 'capitaine-skully', id: '30000035', kind: 'zoom', crop: { zoom: 1.12, x: 0, y: 0 } },
  { key: 'darnako', id: '30000004', kind: 'art', art: 'retouches/darnako.png' },
  { key: 'xiaomi', id: '30000027', kind: 'art', art: 'retouches/xiaomi.png' },
  { key: 'ruby', id: '30000039', kind: 'art', art: 'retouches/ruby.png' },
  { key: 'aelis', kind: 'flag' },
  { key: 'iliane', kind: 'flag' }
]);
const PRIOR = 'V4/expansions/2026-09-23-return';
const BANK = 'V4/atelier/designer-assets';
module.exports = { REVISIONS, PRIOR, BANK };
