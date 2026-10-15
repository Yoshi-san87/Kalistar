const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const source = 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-ee13ad4b-f589-4d31-b5da-1f8718fb34cd.png';
const card = path.join(root, 'cartes/MOMO_ELECTRO_V4_03-correction-complete.png');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function main() {
  if (hash(source) !== hash(card)) throw new Error('The full generated image was modified.');
  const {width, height} = await sharp(card).metadata();
  // QA derivatives only; never composite or change the generated card itself.
  await sharp(card).extract({left:730, top:275, width:210, height:655})
    .resize(420,1310).png().toFile(path.join(root,'verification/corrections-03-rail-def.png'));
  await sharp(card).extract({left:142,top:1110,width:160,height:100})
    .resize(640,400).png().toFile(path.join(root,'verification/corrections-03-positions.png'));
  const views = [];
  let left = 12;
  for (const w of [200, 280, 397]) {
    views.push({input:await sharp(card).resize({width:w}).png().toBuffer(),left,top:12});
    left += w + 16;
  }
  await sharp({create:{width:left,height:720,channels:3,background:'#11191b'}})
    .composite(views).png().toFile(path.join(root,'verification/corrections-03-petits-formats.png'));
  const manifest = {
    status:'complete-generative-design-candidate-awaiting-approval',
    method:'built-in imagegen, complete-card edit, untouched output',
    prompt:'donnees/prompt-corrections-03.txt',
    output:'cartes/MOMO_ELECTRO_V4_03-correction-complete.png',
    source,outputSha256:hash(card),identicalToGeneratedFile:true,
    dimensions:[width,height],regionalCompositing:false,
    changes:['Clean coherent capsule bezels and continuous DEF rail','Refined P3/P4 badges at accepted location'],
    visualChecks:['All numerical values retained','Upright stat typography retained','DEF barriers on D6 D5 D2 only'],
    productionReady:false,
    limitations:['Full generative output: original-artwork pixel identity is not guaranteed','Generated barcode is not certified for decoding','Not yet an editable master or a print-approved file'],
    v3SiteDatabaseChanged:false,
    previousPsdUpdated:false
  };
  fs.writeFileSync(path.join(root,'donnees/corrections-03.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({dimensions:[width,height],unalteredGeneratedOutput:true,output:manifest.output}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
