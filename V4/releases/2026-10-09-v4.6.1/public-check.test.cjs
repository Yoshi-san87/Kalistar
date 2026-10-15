'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {cardPath}=require('../2026-10-09-v4.6.0/verify-public.cjs');
test('catalogue media paths are relative to the Pages root, not the jeu document',()=>{
  assert.equal(cardPath('/media/reference/balmhyr.png'),'media/reference/balmhyr.png');
  assert.equal(cardPath('/media/reference/momo-bal.png'),'media/reference/momo-bal.png');
  assert.equal(cardPath('/media/created/49900802.png'),'media/created/49900802.png');
});
test('verification rejects paths outside the native catalogue media route',()=>{
  for(const value of ['//example.com/card.png','/media/../secret.png','/Kalistar/media/reference/momo.png','https://example.com/card.png'])assert.throws(()=>cardPath(value));
});
