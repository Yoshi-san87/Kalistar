const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname,'..');
const card = path.join(root,'cartes/TAULIO_ELECTRO_V4_01.png');
const master = path.join(root,'cartes/MOMO_ELECTRO_V4_04-typographie.png');
const generated = 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-03d11bb2-6639-40af-8ae3-fb1215609749.png';
const hash = p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function main() {
  const sources = JSON.parse(fs.readFileSync(path.join(root,'verification/taulio-sources.json'),'utf8'));
  for(const p of sources.protectedFiles) if(hash(p.path)!==p.sha256) throw new Error('Protected source modified: '+p.path);
  if(hash(card)!==hash(generated)) throw new Error('Generated card was modified');
  const profile = JSON.parse(fs.readFileSync(path.join(root,'donnees/taulio.json'),'utf8'));
  const old = JSON.parse(fs.readFileSync(path.join(root,'../V3/donnees/cartes.json'),'utf8')).find(c=>c.id===profile.id);
  for(const key of sources.mechanicKeys) if(JSON.stringify(profile[key])!==JSON.stringify(old[key])) throw new Error('Mechanics drift: '+key);
  const {width,height} = await sharp(card).metadata();
  const masterSize = await sharp(master).metadata();
  const ratioDeviation = Math.abs(width/height/(masterSize.width/masterSize.height)-1);
  if(ratioDeviation>.003) throw new Error('Card proportions diverged');
  const comparison=[];
  for(const [i,p] of [master,card].entries()) {
    comparison.push({input:await sharp(p).resize({width:475}).png().toBuffer(),left:12+i*491,top:12});
  }
  await sharp({create:{width:994,height:855,channels:3,background:'#10181b'}})
    .composite(comparison).png().toFile(path.join(root,'verification/MOMO-TAULIO-V4-comparaison.png'));
  await sharp(card).resize({width:280}).png().toFile(path.join(root,'verification/TAULIO-V4-petit-format.png'));
  await sharp(card).extract({left:10,top:1190,width:width-20,height:height-1200})
    .png().toFile(path.join(root,'verification/TAULIO-V4-bas.png'));
  const manifest={
    status:'second-card-visual-template-test-awaiting-approval',
    method:'built-in imagegen, full-card compositing from approved Momo and original Taulio references',
    output:'cartes/TAULIO_ELECTRO_V4_01.png',
    prompt:'donnees/prompt-taulio-01.txt',profile:'donnees/taulio.json',generated,
    sha256:hash(card),dimensions:[width,height],masterDimensions:[masterSize.width,masterSize.height],ratioDeviation,
    fullGeneratedOutputUnmodified:true,regionalPatching:false,
    protectedSourcesUnmodified:true,mechanicsEqualV3:true,
    visuallyChecked:{
      attack:[202,165,135,98,'guard','buff_atk'],defense:[294,242,190,145,93,41],
      attackMagic:[],defenseBarriers:[2],positions:[1],weapon:'Poing',race:'ROBOT',faction:'Chroma',element:'ELECTRO',
      title:'GARDE DU CORPS LOYAL',descriptionLines:4,
    },
    limitations:[
      'Visual comparison asset; a deterministic reusable master renderer has not yet been built.',
      'The source illustration is retained unchanged; generated artwork pixels are not guaranteed identical.',
      'The barcode inside the generated card is not certified to encode 30000013.',
      'Native generated RGB resolution; not a print-ready or CMYK master.'
    ],
    siteOrDatabaseChanged:false,previousFilesMovedOrDeleted:false
  };
  fs.writeFileSync(path.join(root,'donnees/generation-taulio-01.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({dimensions:manifest.dimensions,ratioDeviation,sourcesUnmodified:true,mechanicsEqualV3:true,output:manifest.output}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
