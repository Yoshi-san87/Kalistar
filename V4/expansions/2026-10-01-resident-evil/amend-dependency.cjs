'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs');
const {fs,path,assert,read,write,ROOT}=L,home=__dirname;
const guard=require('../2026-09-27-metal-gear-mines/preservation.cjs').createGuard(L,D,home);
const target='V4/collaborations/resident-evil-banners-01/prepare.cjs';
const previous='22564cebc50752cd78675c861eef364cb5d585846652be10bd7794e68f0c3202';
const current='ccf0e34849b02b343541c3cffa14b90d0fb612c5d2ad6d19f8954f1fe5cc9bd3';
async function main(){
 assert.equal(process.env.KALISTAR_RE_PARENT_DEPENDENCY_AMENDMENT,'2026-10-01','Explicit parent amendment approval required');
 assert(!fs.existsSync(path.join(home,'cards')),'Amendment only before any native preparation');
 const file=path.join(home,'dependencies.json'),old=read(file),next={...old};assert.equal(old[target],previous);
 assert(!fs.existsSync(path.join(home,'dependencies.initial.json')),'Never replace amendment history');
 for(const [f,h] of Object.entries(old))assert.equal(guard.digest(path.join(ROOT,f)),f===target?current:h,'Unexpected dependency change: '+f);
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();await require('../../collaborations/resident-evil-banners-01/assets.cjs').verify();
 const snapshotHash=guard.digest(guard.snapshotFile),initialHash=guard.digest(file);
 fs.copyFileSync(file,path.join(home,'dependencies.initial.json'),fs.constants.COPYFILE_EXCL);
 next[target]=current;
 write(path.join(home,'dependency-amendment.json'),{schemaVersion:1,authorization:'Explicit parent pre-native amendment 2026-10-01',reason:'Correct assistant QA attribution; no human approval was given. Banner pixels and all other dependencies unchanged.',target,previous,current,initialDependenciesHash:initialHash,initialDependenciesPath:'V4/expansions/'+path.basename(home)+'/dependencies.initial.json',existingSnapshotHash:snapshotHash,protectedReferenceLocksUnchanged:true});
 write(file,next);guard.assertExisting();assert.equal(guard.digest(guard.snapshotFile),snapshotHash);return {passed:true,changedDependencies:1,initialFreezeRetained:true,existingSnapshotUnchanged:true};
}
module.exports={main};if(require.main===module)main().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
