'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
// Public card/arena data is snapshotted. These mixed modules still execute on
// restore (weapons.kind/categories and factions.same), so cannot be excluded.
const modules=Object.freeze(['engine','equipment','defensive-equipment','relic-ultimates','ultimate-runtime','turn-order','performance-index','ai-strategies','team-composition','journey-combat','weapons','factions']);
async function hash(root=path.resolve(__dirname,'../..')){
  const result=crypto.createHash('sha256').update('kalistar-fragment-snapshot-v1\n');
  for(const name of modules){result.update(name+'\n');result.update(await fs.readFile(path.join(root,'V4/site',name+'.js')));}
  return result.digest('hex');
}
module.exports={hash,modules};
