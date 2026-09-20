const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),v3=path.join(root,'../V3');
async function main(){
 const source=path.join(v3,'cartes/01_ELECTRO_MOMO.png');
 await sharp(source).extract({left:65,top:1068,width:765,height:370}).png().toFile(path.join(root,'references/bas-momo-v3.png'));
 await sharp(source).extract({left:50,top:50,width:797,height:1388}).png().toFile(path.join(root,'references/momo-v3.png'));
 await sharp(source).extract({left:60,top:55,width:190,height:790}).png().toFile(path.join(root,'references/electricite-v3.png'));
 await sharp(source).extract({left:650,top:775,width:170,height:300}).png().toFile(path.join(root,'references/fixation-drapeau-v3.png'));
 fs.copyFileSync('C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-3443180b-1cfc-4a00-b9fe-fc8d316a4957.png',path.join(root,'references/fond-sombre-a-conserver.png'));
 const card=JSON.parse(fs.readFileSync(path.join(v3,'donnees/cartes.json'),'utf8')).find(c=>c.slug==='01_ELECTRO_MOMO');
 card.title="L'ARTISTE MAGIQUE";
 card.text="Au milieu des rebuts de Chroma, Momo joue pour ceux que l'on a oubli\u00e9s. Sa fl\u00fbte \u00e9veille une lumi\u00e8re dans la ferraille. Il ne sait pas encore si quelqu'un l'\u00e9coute. Alors il continue.";
 fs.writeFileSync(path.join(root,'donnees/momo.json'),JSON.stringify(card,null,2));
 const files=['templates/01_ELECTRO_MOMO.psd','cartes/01_ELECTRO_MOMO.png','assets/illustrations/01_ELECTRO_MOMO.png','donnees/cartes.json','site/index.html','site/data.js'];
 fs.writeFileSync(path.join(root,'verification/v3-sources.json'),JSON.stringify(files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(v3,file))).digest('hex')})),null,2));
 console.log('V3 references prepared. Rejected V4 removed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
