'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,sharp}=L;
const set=require('./set.json');
async function main(){
  const out=path.join(__dirname,'qa/native');fs.mkdirSync(out,{recursive:true});
  const cards=[],layers=[],width=300,height=501,gap=12,footer=26,cols=4;
  for(const [i,spec] of set.cards.entries()){
    const dir=path.join(__dirname,'cards',spec.key),file=path.join(dir,'card.png');
    const v=L.read(path.join(dir,'verification.json')),native=L.read(path.join(dir,'render/native.json'));
    assert.equal(v.passed,true);assert.equal(v.modelId,spec.id);
    assert.equal(v.hashes['card.png'],await L.hash(file));
    assert.equal(v.hashes['card.psd'],await L.hash(path.join(dir,'card.psd')));
    assert.equal(v.components.fixedDifferences,0);assert.equal(v.components.severePixels,0);
    assert.equal(v.roundtrip.changed,0);assert.equal(v.barcode.passed,true);
    assert.equal(Object.keys(v.barcode.cases).length,4);
    for(const values of Object.values(v.barcode.cases))assert.deepEqual(values,[spec.id]);
    assert.deepEqual([native.width,native.height,native.resolution],[897,1497,300]);
    assert.equal(native.photoshop,'26.11.7');
    for(const name of ['NOM','TITLE'])assert.equal(native.typography[name].font,'TimesNewRomanPSMT');
    const x=gap+(i%cols)*(width+gap),y=gap+Math.floor(i/cols)*(height+footer+gap);
    layers.push({input:await sharp(file).resize(width,height).png().toBuffer(),left:x,top:y});
    layers.push({input:Buffer.from('<svg width="300" height="26"><text x="150" y="20" text-anchor="middle" fill="#edf0ee" font-size="15" font-family="Arial">'+spec.key+'</text></svg>'),left:x,top:y+height});
    cards.push({key:spec.key,id:spec.id,png:v.hashes['card.png'],psd:v.hashes['card.psd'],fixedDifferences:0,reopenedDifferences:0,barcodeCases:4,nativeTypography:true});
  }
  const guard=require('./preservation.cjs').createGuard(L,require('../../atelier/designer-core.cjs'),__dirname);
  guard.publication();await L.protectedCheck();
  const target=path.join(out,'cards-contact.jpg');
  await sharp({create:{width:cols*(width+gap)+gap,height:Math.ceil(cards.length/cols)*(height+footer+gap)+gap,channels:3,background:'#111719'}}).composite(layers).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(target);
  const report={passed:true,checkedAt:new Date().toISOString(),cards,existingCreatedUnchanged:51,referenceLockUnchanged:true,contactHash:await L.hash(target),visualReview:'Contact sheet to be inspected separately by parent.'};
  L.write(path.join(out,'report.json'),report);console.log(JSON.stringify({passed:true,cards:cards.length,contact:target}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
