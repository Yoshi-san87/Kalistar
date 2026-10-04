'use strict';
const L=require('../../atelier/lib.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,read,write,sharp,hash,assert,ROOT}=L;
async function prepare(){
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 const source=path.join(__dirname,'source-CRUSTOS.png'),output=path.join(__dirname,'race-CRUSTOS.png');
 assert(!fs.existsSync(output),'Do not overwrite calibrated output.');
 const race=await A.race(source,output);
 write(path.join(__dirname,'race-components.json'),{schemaVersion:1,races:{CRUSTOS:race}});
 fs.copyFileSync(output,path.join(ROOT,'V4/atelier/designer-assets/extensions/race-CRUSTOS.png'),fs.constants.COPYFILE_EXCL);
 await sharp(source).resize(256,256,{fit:'contain',background:'#00000000'}).png().toFile(path.join(ROOT,'V4/site/assets/races/CRUSTOS.png'));
 console.log(JSON.stringify(race,null,2));
}
prepare().catch(e=>{console.error(e);process.exitCode=1;});
