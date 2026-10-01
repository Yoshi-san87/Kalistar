'use strict';
const L = require('../../atelier/lib.cjs');
const A = require('../nier-pilot-01/assets.cjs');
const {fs, path, sharp, assert, read, write, hash, ROOT} = L;
const file = name => path.join(__dirname, name);
const bank = path.join(ROOT, 'V4/atelier/designer-assets');
const FLAG = Object.freeze({left:672, top:829, width:98, height:223});
const GEOMETRY = Object.freeze({left:711, top:1116, width:96, height:95});
const alpha = input => sharp(input).ensureAlpha().extractChannel(3).raw().toBuffer();
function saveSame(destination, buffer) {
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(buffer), 'Refusing to replace existing asset: ' + destination);
  else fs.writeFileSync(destination, buffer, {flag:'wx'});
}
async function prepare() {
  await L.protectedCheck();
  await require('../../atelier/designer-render.cjs').verifyAssets();
  const baseline = file('baseline.json');
  if (!fs.existsSync(baseline)) write(baseline, {
    referencesHash:await hash(path.join(ROOT,'V4/atelier/data/references.json')),
    manifestHash:await hash(path.join(bank,'manifest.json')),
    raceExtensions:read(path.join(bank,'race-extensions.json'))
  });
  const geometry = read(path.join(bank,'manifest.json')).factions.Chroma;
  assert.equal(geometry.width,109); assert.equal(geometry.height,230);
  const outline = path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
  const packedOutline = path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  const source = file('source-ONEPIECE.png');
  const texture = await sharp(source).flatten({background:'#101010'}).resize(109,230,{fit:'fill'}).png().toBuffer();
  const flag = await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
  const packed = await sharp(flag).extract({left:FLAG.left-geometry.left,top:FLAG.top-geometry.top,width:FLAG.width,height:FLAG.height}).png().toBuffer();
  assert.deepEqual(await alpha(flag),await alpha(outline));
  assert.deepEqual(await alpha(packed),await alpha(packedOutline));
  saveSame(file('flag-ONEPIECE.png'),flag);
  saveSame(file('flag-ONEPIECE-packed.png'),packed);
  saveSame(path.join(ROOT,'V4/site/assets/factions/ONEPIECE.png'),flag);
  write(file('factions.json'),{schemaVersion:1,officialCollaboration:false,expectedExpansionCards:11,factions:[{
    id:'ONEPIECE',label:'One Piece',source:'source-ONEPIECE.png',
    flag:'flag-ONEPIECE.png',packedFlag:'flag-ONEPIECE-packed.png',packedGeometry:FLAG,
    sourceHash:await hash(source),flagHash:await hash(file('flag-ONEPIECE.png')),
    packedHash:await hash(file('flag-ONEPIECE-packed.png')),
    outline:'V4/collaborations/ff8-set-01/flag-FF8.png',outlineHash:await hash(outline),
    packedOutlineHash:await hash(packedOutline),
    bonusField:'faction',bonusStat:'ATK',membersScope:'living-board-only'
  }]});
  const race = await A.race(file('source-SHARKAN.png'),file('race-SHARKAN.png'));
  write(file('race-components.json'),{schemaVersion:1,races:{SHARKAN:race}});
  saveSame(path.join(bank,'extensions/race-SHARKAN.png'),fs.readFileSync(file('race-SHARKAN.png')));
  const site = await sharp(file('source-SHARKAN.png')).resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
  saveSame(path.join(ROOT,'V4/site/assets/races/SHARKAN.png'),site);
  return {flag:FLAG,race:{...GEOMETRY,sha256:race.sha256},metrics:race.metrics,registryEntryPending:true};
}
module.exports = {prepare,FLAG,GEOMETRY};
if (require.main === module) prepare().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
