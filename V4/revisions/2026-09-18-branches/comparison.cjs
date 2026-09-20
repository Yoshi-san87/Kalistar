const L=require('../../atelier/lib.cjs');
(async()=>{
  const layers=[];
  const files=[L.path.join(__dirname,'originals/V4/cartes/RUBY_V4_01_HYDRO.png'),L.path.join(L.ROOT,'V4/cartes/RUBY_V4_01_HYDRO.png')];
  for(const [i,file] of files.entries()){
    layers.push({input:await L.sharp(file).extract({left:170,top:1181,width:220,height:62}).resize(880,248).png().toBuffer(),left:0,top:i*280+28});
    const label=`<svg width="880" height="28"><text x="12" y="21" font-family="Arial" font-size="18" fill="white">${i?'APRES':'AVANT'}</text></svg>`;
    layers.push({input:Buffer.from(label),left:0,top:i*280});
  }
  await L.sharp({create:{width:880,height:560,channels:4,background:'#10171b'}}).composite(layers).png().toFile(L.path.join(__dirname,'raccord-avant-apres.png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
