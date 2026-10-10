'use strict';
const {formation,deploy}=require('../2026-10-09-skaern-luxo/fixtures.cjs');
const deck=[...Array.from({length:7},(_,i)=>String(49901601+i)),'49901901','49901801','49901803'];
module.exports={deck,formation,deploy};
