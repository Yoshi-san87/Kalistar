const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname,'..');
const card = path.join(root,'cartes/MOMO_ELECTRO_V4_04-typographie.png');
const previous = path.join(root,'cartes/MOMO_ELECTRO_V4_03-correction-complete.png');
const generated = 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-c13a9ee9-30af-4028-a250-fe7696065a05.png';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function inkBounds(p,box) {
  const {data,info} = await sharp(p).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width,minY=info.height,maxX=0,maxY=0;
  for(let y=box[1];y<box[3];y++) {
    const row=[];
    for(let x=box[0];x<box[2];x++) {
      if(box[1]>1400 && y>1525 && (x<150+(y-1525)*1.5 || x>800-(y-1525)*1.5)) continue;
      const i=(y*info.width+x)*3;
      const rgb=[data[i],data[i+1],data[i+2]];
      if(Math.min(...rgb)>170&&Math.max(...rgb)-Math.min(...rgb)<45) row.push(x);
    }
    if(row.length<8) continue;
    minX=Math.min(minX,...row);maxX=Math.max(maxX,...row);
    minY=Math.min(minY,y);maxY=y;
  }
  return {bounds:[minX,minY,maxX,maxY],centerY:(minY+maxY)/2,width:maxX-minX+1,height:maxY-minY+1};
}

async function main() {
  if(hash(card)!==hash(generated)) throw new Error('Final card is not the untouched generated output');
  const {width,height}=await sharp(card).metadata();
  const titleBox=[280,1222,685,1262],descriptionBox=[132,1440,820,1575];
  const titleBefore=await inkBounds(previous,titleBox),titleAfter=await inkBounds(card,titleBox);
  const descriptionBefore=await inkBounds(previous,descriptionBox),descriptionAfter=await inkBounds(card,descriptionBox);
  const checks={titleMovedDown:titleAfter.centerY>titleBefore.centerY,descriptionWider:descriptionAfter.width>descriptionBefore.width,descriptionTaller:descriptionAfter.height>descriptionBefore.height};
  if(Object.values(checks).some(v=>!v)) throw new Error('Requested typography changes were not detected: '+JSON.stringify(checks));
  // Verification previews only; no regional edits or compositing into the final card.
  await sharp(card).extract({left:20,top:1200,width:910,height:433}).png()
    .toFile(path.join(root,'verification/typographie-04-bas.png'));
  await sharp(card).resize({width:280}).png()
    .toFile(path.join(root,'verification/typographie-04-petit-format.png'));
  const manifest={
    status:'complete-generative-design-candidate-awaiting-approval',
    method:'built-in imagegen, full-card output copied without modification',
    output:'cartes/MOMO_ELECTRO_V4_04-typographie.png',
    previous:'cartes/MOMO_ELECTRO_V4_03-correction-complete.png',
    prompt:'donnees/prompt-typographie-04.txt',
    generated,dimensions:[width,height],sha256:hash(card),regionalCompositing:false,
    titleBefore,titleAfter,descriptionBefore,descriptionAfter,checks,
    productionReady:false,pixelIdentityOutsideTextGuaranteed:false,
    originalIllustrationAndBarcodeSourcesRetained:true,
    v3SiteDatabaseChanged:false,previousPsdUpdated:false
  };
  fs.writeFileSync(path.join(root,'donnees/typographie-04.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({checks,titleBefore,titleAfter,descriptionBefore,descriptionAfter}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
