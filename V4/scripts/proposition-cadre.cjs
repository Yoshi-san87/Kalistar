const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
async function main(){
 const reference=path.join(root,'apercus/MOMO-V4-reprise.png');
 const generated=path.join(root,'propositions/MOMO-cadre-unifie-generation-brute.png');
 const output=path.join(root,'propositions/MOMO-cadre-unifie-proposition.png');
 const {width,height}=await sharp(reference).metadata();
 const transition=1018,generatedTransition=1026;
 // Preserve original character, stats, barcode, flag and positions byte for byte.
 const fitted=await sharp(generated).resize(width,height,{fit:'fill'}).png().toBuffer();
 const bottom=await sharp(fitted).extract({left:0,top:generatedTransition,width,height:height-generatedTransition}).resize(width,height-transition,{fit:'fill'}).png().toBuffer();
 await sharp(reference).composite([{input:bottom,left:0,top:transition}]).withMetadata({density:300}).png().toFile(output);
 const region={left:0,top:0,width,height:transition};
 const before=await sharp(reference).extract(region).removeAlpha().raw().toBuffer();
 const after=await sharp(output).extract(region).removeAlpha().raw().toBuffer();
 if(!before.equals(after))throw new Error('Original upper card altered');
 await sharp(output).extract({left:0,top:transition,width,height:height-transition}).png().toFile(path.join(root,'propositions/detail-cadre-unifie.png'));
 fs.writeFileSync(path.join(root,'propositions/verification.json'),JSON.stringify({status:'visual-proposal-not-production-template',width,height,originalUpperRowsPreserved:transition,generatedPanelStart:generatedTransition,upperPixelsIdentical:true,originalReferenceSha256:crypto.createHash('sha256').update(fs.readFileSync(reference)).digest('hex'),productionFilesReplaced:false},null,2));
 console.log('Proposal saved; original upper 1018 rows are pixel-identical. No production files replaced.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
