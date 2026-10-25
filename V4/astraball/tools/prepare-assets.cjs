const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.KALISTAR_NODE_MODULES ? path.join(process.env.KALISTAR_NODE_MODULES,'sharp') : 'sharp');
const root = path.resolve(__dirname,'..'), repo = path.resolve(root,'../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main() {
  const assets = path.join(root,'assets');
  fs.mkdirSync(path.join(assets,'portraits'),{recursive:true});
  const refs = JSON.parse(fs.readFileSync(path.join(repo,'V4/atelier/data/references.json'),'utf8'));
  const names = ['momo','kaylis','taulio','cana','balmhyr','voloden','lok','darnako','iliane','valazar'];
  const files=[];
  for(const key of names) {
    const ref = refs.cards.find(card => card.key === key);
    if (!ref) throw Error('Missing approved character: ' + key);
    const source = path.join(repo,ref.png), target = path.join(assets,'portraits',key+'.webp');
    await sharp(source).extract({left:170,top:180,width:550,height:640}).resize(220,256).webp({quality:88}).toFile(target);
    files.push({file:'assets/portraits/'+key+'.webp',source:ref.png,sourceSha256:hash(source),sha256:hash(target)});
  }
  const source=path.join(root,'sources/arena-v1.png'), target=path.join(assets,'arena-v1.webp');
  await sharp(source).resize({width:1920,withoutEnlargement:true}).webp({quality:87}).toFile(target);
  files.push({file:'assets/arena-v1.webp',source:'V4/astraball/sources/arena-v1.png',sourceSha256:hash(source),sha256:hash(target)});
  fs.writeFileSync(path.join(root,'assets/provenance.json'),JSON.stringify({version:1,tool:'Built-in image_gen for arena; Sharp crop of existing approved cards for tactical portrait tokens. No native source modified.',files},null,2)+'\n');
  console.log(JSON.stringify(files.map(f=>({file:f.file,bytes:fs.statSync(path.join(root,f.file)).size}))));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
