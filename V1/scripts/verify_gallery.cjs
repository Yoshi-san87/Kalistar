const fs=require('fs'),path=require('path'),vm=require('vm');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const cards=JSON.parse(fs.readFileSync(path.join(root,'donnees/cartes.json'),'utf8'));
 const result=[];
 for(const c of cards){
  const raw=fs.readFileSync(path.join(root,'verification',c.slug+'_layers.txt'),'utf8').replace(/\r\n|\r|\n/g,'\\n');
  const layers=vm.runInNewContext(raw);
  const normalize=s=>s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
  if(layers.NOM!==c.name||layers['TITRE DE VERSION']!==c.title||normalize(layers['DESCRIPTION NARRATIVE'])!==normalize(c.text))throw new Error('Text mismatch '+c.name);
  for(const side of ['ATK','DEF'])for(let j=0;j<6;j++){
   const expected=(side==='ATK'?c.atk:c.defense)[j];
   if(typeof expected==='number' && layers[side+' D'+(6-j)+' - valeur']!==String(expected))throw new Error('Stat mismatch '+c.name);
  }
  result.push({card:c.name,editable_texts_match:true,numeric_faces_match:true});
 }
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 for(const v of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport:v});
  await page.goto('file:///'+root.replace(/\\/g,'/')+'/OUVRIR_LES_CARTES.html');
  await page.locator('img').evaluateAll(async images=>{for(const i of images){i.loading='eager';await i.decode();}});
  const state=await page.evaluate(()=>({images:[...document.images].filter(i=>i.naturalWidth===897).length,overflow:document.documentElement.scrollWidth>innerWidth}));
  if(state.images!==12||state.overflow)throw new Error(JSON.stringify(state));
  await page.screenshot({path:path.join(root,'verification','galerie_'+v.width+'.png'),fullPage:false});
  await page.selectOption('select','PYRO');
  if(await page.locator('figure:visible').count()!==1)throw new Error('Filter');
  result.push({viewport:v,images:12,overflow:false,element_filter:true});
  await page.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(root,'verification/controle_textes_galerie.json'),JSON.stringify(result,null,2));
 console.log('12 editable card records match data; gallery desktop/mobile checked, images and filter pass.');
})().catch(e=>{console.error(e);process.exit(1)});
