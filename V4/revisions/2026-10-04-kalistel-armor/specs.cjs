'use strict';
const prior = require('../2026-10-04-guards-arborium/specs.cjs');
const keys = ["orven","isvel","aeren","vessa","neryk","brask","maelka","tilko","eryss","velran","saelor","liorne"];
const cards = keys.map(key => {
  const c = prior.cards.find(c => c.key === key);
  if (!c) throw Error('Unknown character: ' + key);
  return { ...c, previousArt: c.art, art: c.art.replace(/_(\d+)\.png$/, (_, n) => '_' + String(Number(n) + 1).padStart(2, '0') + '.png') };
});
module.exports = { cards };
