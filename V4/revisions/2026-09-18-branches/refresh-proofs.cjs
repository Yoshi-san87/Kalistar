const L=require('../../atelier/lib.cjs');
(async()=>{
  const plan=L.read(L.path.join(__dirname,'plan.json')),audit=L.read(L.path.join(__dirname,'verification.json'));
  L.assert.equal(audit.passed,true);
  for(const item of plan.items.filter(i=>i.png)){
    const relative=item.report.replace('render.json','reopened.png'),target=L.inside(L.ROOT,relative);
    const backup=L.inside(L.path.join(__dirname,'originals'),relative);
    if(!L.fs.existsSync(backup)){
      const difference=await L.diff(target,L.path.join(__dirname,'originals',item.png));L.assert.equal(difference.changed,0);
      L.fs.mkdirSync(L.path.dirname(backup),{recursive:true});L.fs.copyFileSync(target,backup);
    }
    const source=L.path.join(L.ROOT,item.destination,'reopened.png');
    L.assert.equal((await L.diff(source,L.path.join(L.ROOT,item.png))).changed,0);
    L.fs.copyFileSync(source,target);
  }
  console.log('21 preuves de reouverture actualisees, anciennes conservees.');
})().catch(e=>{console.error(e);process.exitCode=1;});
