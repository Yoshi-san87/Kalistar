'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const backup=require('./backup.cjs'),{drill}=require('./backup-drill.cjs');
test('logical export restores every application row, ownership and security schema in an isolated database',async()=>{
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/jeu/catalogue.json'),'utf8'));
  const db=await require('./browser-fixture.cjs').create(data,{journeyKey:'fixture-'.repeat(8)});
  try{
    await db.call('kalistar_sync_read');
    const rows=await db.backup(),csv='part,parts,sha256,chunk\n'+rows.map(r=>[r.part,r.parts,r.sha256,r.chunk].join(',')).join('\n');
    const snapshot=backup.decodeCSV(csv),b=backup.bundle(snapshot),result=await drill(b);
    assert.equal(result.passed,true);assert.equal(result.tables['public.kalistar_collectibles'],data.cards.length+10);
    assert.equal(result.tables['kalistar_private.players'],2);assert.equal(result.tables['kalistar_private.admins'],1);
    assert.equal(b.migrations.length,15);assert.equal(snapshot.tables.find(t=>t.name==='journey_config').rows.length,1);
    assert.equal(snapshot.tables.find(t=>t.name==='registry_version').rows[0].version,14);
    assert.equal(result.tables['kalistar_private.journey_reward_adjustments'],0);
    assert.throws(()=>backup.decodeCSV(csv.replace(/.$/,'!')),/Invalid|checksum/);
    assert.throws(()=>backup.decodeCSV(csv.split('\n').slice(0,-1).join('\n')),/Incomplete/);
    const missing=structuredClone(snapshot);missing.tables=missing.tables.filter(t=>t.name!=='player_saves');assert.throws(()=>backup.validate(missing),/Missing/);
  }finally{await db.close();}
});
