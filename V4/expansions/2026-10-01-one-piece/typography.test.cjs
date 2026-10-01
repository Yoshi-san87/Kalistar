'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('One Piece typography retains unmodified native checks',()=>assert.equal(require('./typography.cjs').verify,require('../../collaborations/nier-pilot-01/typography.cjs').verify));
