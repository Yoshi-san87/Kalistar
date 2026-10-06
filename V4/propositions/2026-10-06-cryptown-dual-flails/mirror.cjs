'use strict';
const {fs,path,sharp,assert,hash}=require('../../atelier/lib.cjs');
async function main(){
 const source=path.join(__dirname,'cryptown-dual-flails-v1.png');
 const output=path.join(__dirname,'cryptown-dual-flails-v2-mirror.png');
 assert(!fs.existsSync(output),'Preserve the existing output');
 const before=await hash(source),original=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const png=await sharp(source).flop().png().toBuffer();
 const restored=await sharp(png).flop().ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(restored.info.width,original.info.width);assert.equal(restored.info.height,original.info.height);
 assert(restored.data.equals(original.data),'Horizontal mirror must preserve every RGBA pixel');
 assert.equal(await hash(source),before,'Original must remain unchanged');
 fs.writeFileSync(output,png,{flag:'wx'});
 const proof={operation:'exact horizontal mirror',tool:'sharp.flop; no image regeneration',source:path.basename(source),output:path.basename(output),sourceSha256:before,outputSha256:await hash(output),width:original.info.width,height:original.info.height,roundtripRgbaIdentical:true,originalPreserved:true};
 fs.writeFileSync(path.join(__dirname,'mirror-verification.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(proof,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
