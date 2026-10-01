'use strict';
const L=require('../../atelier/lib.cjs'),{path,ROOT,read,write,assert}=L;
async function main(){
 const home=__dirname,old=read(path.join(home,'attempts/01-donor-flag-selection/dependencies.json'));
 const key='V4/expansions/2026-10-01-one-piece-witcher/flags.cjs';
 assert.deepEqual(read(path.join(home,'dependencies.json')),old,'Only the original unprepared draft may be repaired');
 for(const [f,h]of Object.entries(old))if(f!==key)assert.equal(await L.hash(path.join(ROOT,f)),h,f);
 assert.equal(await L.hash(path.join(home,'attempts/01-donor-flag-selection/flags.cjs')),old[key]);
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 const next={...old,[key]:await L.hash(path.join(ROOT,key))};
 write(path.join(home,'draft-repair.json'),{phase:'failed-before-first-profile-and-before-Photoshop',reason:'R.components supplies a 109x230 Chroma donor; select its named layer and verified donor geometry before replacing with 98x223 packed banner, as existing production does.',before:old[key],after:next[key],onlyChangedSource:key,protectedSourcesUnchanged:true});
 write(path.join(home,'dependencies.json'),next);return {recordedDraftRepair:key};
}
main().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
