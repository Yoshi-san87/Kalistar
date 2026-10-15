'use strict';
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const {fs,path,read,write,ROOT,DATA} = L;
const M = require('./model.cjs'), home = __dirname;
const guard = require('./preservation.cjs').createGuard(L,D,home);
const dir = path.join(home,'amendments/snake-description');
const setFile = path.join(home,'set.json'), beforeFile = path.join(dir,'set.before.json');
const key = 'solid-snake-mgs1';
const card = name => path.join(home,'cards',name);
const nativeFiles = ['profile.json','illustration.png','card.png','card.psd','render/native.json','render/composition.json','render/expected-components.png','render/reopened.png','render/without-text.png'];
async function stage() {
  assert.ok(!fs.existsSync(path.join(DATA,'render.lock')), 'Ne pas amender une serie en cours.');
  assert.ok(!fs.existsSync(dir), 'Un amendement existe deja : inspecter son journal avant toute reprise.');
  guard.assertExisting(); await L.protectedCheck();
  const before = read(setFile); M.validateSet(before);
  const next = structuredClone(before), target = next.cards.find(c => c.key === key);
  assert.equal(target.description.split('mission ; ceux').length, 2);
  target.description = target.description.replace('mission ; ceux','mission. Ceux');
  M.validateSet(next);
  const oldHash = guard.digest(setFile), relativeSet = guard.relative(setFile), unchanged = {}, preparations = {};
  for (const spec of before.cards) {
    guard.preparation(spec.key);
    const folder = card(spec.key), prepFile = path.join(folder,'preparation.json');
    preparations[spec.key] = { beforeHash: guard.digest(prepFile), value: read(prepFile) };
    assert.equal(preparations[spec.key].value.inputs[relativeSet], oldHash);
    for (const name of nativeFiles) {
      const file = path.join(folder,name);
      assert.ok(fs.existsSync(file),'Rendu incomplet : ' + spec.key + '/' + name);
      if (spec.key !== key) unchanged[guard.relative(file)] = await L.hash(file);
    }
    if (spec.key !== key) assert.deepEqual(M.profile(spec,D),M.profile(next.cards.find(c=>c.key===spec.key),D));
  }
  fs.mkdirSync(dir,{recursive:true}); fs.copyFileSync(setFile,beforeFile,fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(path.join(dir,'original-snake'),{recursive:true});
  for (const name of ['card.png','card.psd','profile.json','render/native.json']) {
    const destination = path.join(dir,'original-snake',name);fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(path.join(card(key),name),destination,fs.constants.COPYFILE_EXCL);
  }
  const report = { schemaVersion:1, approval:'Parent request: replace mission ; ceux with mission. Ceux after the 13-card render; only Snake rerendered.',
    changedCard:key, beforeSetHash:oldHash, previousDescription:before.cards.find(c=>c.key===key).description,
    nextDescription:target.description, referenceId:L.baseline().id, frozenDependenciesHash:guard.digest(path.join(home,'dependencies.json')),
    existingSnapshotHash:guard.digest(guard.snapshotFile), unchangedNativeFiles:unchanged, preparations:{}, phase:'staged' };
  write(path.join(dir,'journal.json'),report);
  write(setFile,next); report.afterSetHash=guard.digest(setFile);
  // The shared set changed only in Snake's text. Preserve old preparation bytes,
  // and explicitly rebind this single metadata input for the other twelve cards.
  for (const [name,entry] of Object.entries(preparations)) {
    const targetFile=path.join(card(name),'preparation.json');
    assert.equal(guard.digest(targetFile),entry.beforeHash);
    fs.copyFileSync(targetFile,path.join(dir,'preparation-'+name+'.before.json'),fs.constants.COPYFILE_EXCL);
    if (name !== key) {
      const updated=structuredClone(entry.value);updated.inputs[relativeSet]=report.afterSetHash;
      write(targetFile,updated);
      report.preparations[name]={beforeHash:entry.beforeHash,afterHash:guard.digest(targetFile),onlyChangedInput:relativeSet};
    }
  }
  for (const [file,sha] of Object.entries(unchanged)) assert.equal(await L.hash(path.join(ROOT,file)),sha);
  guard.assertExisting();await L.protectedCheck();
  report.phase='metadata-rebound';write(path.join(dir,'journal.json'),report);
  return { changedCard:key, unchangedNativeCards:12, preparedAgain:false, next:'prepare/render/verify solid-snake-mgs1; full final verification remains required' };
}
async function complete() {
  assert.ok(!fs.existsSync(path.join(DATA,'render.lock')));
  const report=read(path.join(dir,'journal.json')), before=read(beforeFile), current=read(setFile);
  assert.equal(guard.digest(beforeFile),report.beforeSetHash);assert.equal(guard.digest(setFile),report.afterSetHash);
  const expected=structuredClone(before);expected.cards.find(c=>c.key===key).description=report.nextDescription;
  assert.deepEqual(current,expected,'Modification hors de la phrase autorisee.');
  assert.equal(guard.digest(path.join(home,'dependencies.json')),report.frozenDependenciesHash);
  assert.equal(guard.digest(guard.snapshotFile),report.existingSnapshotHash);
  for (const [file,sha] of Object.entries(report.unchangedNativeFiles)) assert.equal(await L.hash(path.join(ROOT,file)),sha,'Autre natif modifie : '+file);
  guard.publication();await L.protectedCheck();
  const n=read(path.join(card(key),'render/native.json')), lines=n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r');
  assert.ok(lines.every(line=>!/^\s*[;:!?.,]/.test(line)));
  const changed=await L.diff(path.join(dir,'original-snake/card.png'),path.join(card(key),'card.png'),[[100,1240,800,1395]]);
  assert.ok(changed.changed>0);assert.equal(changed.outside,0,'Pixels hors description modifies.');
  report.phase='verified';report.descriptionPixels=changed;report.unchangedNativeCards=12;report.completedAt=new Date().toISOString();
  write(path.join(dir,'journal.json'),report);return report;
}
async function main(args=process.argv.slice(2)) {
  assert.equal(args.length,1);assert.ok(['stage','complete'].includes(args[0]));
  return args[0]==='stage'?stage():complete();
}
module.exports={stage,complete,main};
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
