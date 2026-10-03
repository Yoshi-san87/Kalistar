'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,ROOT,read,write,hash,assert}=L;
const file=n=>path.join(__dirname,n);
async function main(){
  const id=process.argv[2];assert(L.ID.test(id));
  const source=L.jobDir(id),request=read(path.join(source,'request.json')),status=read(path.join(source,'status.json')),report=read(path.join(source,'verification.json'));
  assert.equal(request.kind,'regression');assert.equal(status.state,'verified');assert.equal(report.passed,true);assert.equal(report.referenceId,L.baseline().id);assert.equal(report.results.length,38);
  assert(report.results.every(r=>r.passed&&r.comparison.changed===0&&r.roundtrip.changed===0&&r.barcode.passed));
  const copied={};
  async function copy(name){
    const target=file('native-regression/'+name);fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(source,name),target);copied[name]=await hash(target);
  }
  for(const name of ['request.json','status.json','verification.json','native-results.json','photoshop.log'])await copy(name);
  for(const item of request.items)for(const name of ['native.json','verification.json'])await copy(item.key+'/'+name);
  await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
  write(file('native-regression.json'),{passed:true,job:id,referenceId:report.referenceId,rendererHash:report.rendererHash,referenceCount:report.results.length,zeroPixelDifferences:true,reopenedPsdIdentical:true,barcodesPassed:true,checkedAt:report.checkedAt,copied});
  const published=read(file('published.json'));published.nativeRegressionPending=false;published.nativeRegression='V4/revisions/2026-10-03-flail-glyph/native-regression.json';write(file('published.json'),published);
  console.log({passed:true,references:38,proof:file('native-regression.json')});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
