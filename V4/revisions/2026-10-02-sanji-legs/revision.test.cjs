'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = n => JSON.parse(fs.readFileSync(path.join(__dirname, n), 'utf8'));
test('Sanji artwork revision preserves every gameplay and printed profile field', () => {
  const old = read('originals/V4/creations/49800301/profile.json');
  const current = JSON.parse(fs.readFileSync(path.join(root, 'V4/creations/49800301/profile.json'), 'utf8'));
  assert.deepEqual(current, old);
  assert.deepEqual(read('work/sanji/profile.json'), old);
});
test('Sanji native text, style runs, components and geometry remain unchanged', () => {
  const audit = read('work/sanji/audit.json');
  const normalize = layers => layers.map(({ id, ...layer }) => layer);
  assert.deepEqual(normalize(audit.after), normalize(audit.before));
  assert.deepEqual(normalize(audit.reopened), normalize(audit.before));
  assert.deepEqual(audit.textsAfter, audit.textsBefore);
  assert.deepEqual(audit.textsReopened, audit.textsBefore);
  const proof = read('work/sanji/verification.json');
  assert(proof.passed);
  assert.equal(proof.scope.outside.outside, 0);
  assert.equal(proof.scope.withoutArt.changed, 0);
  assert.equal(proof.roundtrip.changed, 0);
  assert.equal(proof.components.fixedDifferences, 0);
  assert(proof.barcode.passed);
});
