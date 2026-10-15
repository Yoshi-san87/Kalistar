const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('map remains in the shell and the extra navigation menu',()=>{
  const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
  assert(read('app.js').includes('const mapView=KalistarMap.create()'));assert(read('app.js').includes("navigationItem('map','Map')"));assert(read('app.js').includes('mapView.destroy()'));
  const boot=read('boot.js');assert(boot.includes("'map-view.js'"));assert(boot.indexOf("'map-view.js'")<boot.indexOf("'app.js'"));assert(read('index.html').includes('map-view.css'));
  assert(read('map-view.js').includes('controller?.abort()'));assert(read('map-view.js').includes('observer?.disconnect()'));
  assert(!read('map-view.js').includes('localStorage'));assert(!read('map-view.js').includes('IndexedDB'));
  assert(read('map-view.js').includes('data-map-landmark'));assert(read('map-view.js').includes('img.naturalWidth'));
  assert(read('map-view.css').includes('drop-shadow'));assert(read('map-view.css').includes('data-compact-labels'));
});
test('published atlas exists with no PSD or authoring data used at runtime',()=>{
  const source=fs.readFileSync(path.join(__dirname,'map-view.js'),'utf8');assert(source.includes('kalistar-atlas-1.33.webp'));assert(!source.includes('.psd'));const image=fs.readFileSync(path.join(__dirname,'assets/ui/kalistar-atlas-1.33.webp'));assert.equal(image.toString('ascii',0,4),'RIFF');assert(image.length>100000);
});

test('latest published map and eight city assets match their recorded provenance',()=>{
  const crypto=require('node:crypto'),root=path.resolve(__dirname,'../..');
  const proof=JSON.parse(fs.readFileSync(path.join(root,'V4/map/layers-1.33/published-media.json')));
  for(const asset of proof.assets){
    const bytes=fs.readFileSync(path.join(root,asset.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
    assert.equal(bytes.toString('ascii',12,16),'VP8L');
    if(asset.file.includes('/map/')){const bits=bytes.readUInt32LE(21);assert.equal(((bits>>>14)&0x3fff)+1,asset.file.endsWith('-v1.webp')?128:192);assert(bits&0x10000000);}
  }
  assert(proof.terrainChangedOnlyInsideMask&&proof.previousCityAssetsUnchanged&&!proof.citiesBakedIntoRuntime);
  assert.equal(proof.cityCount,8);
});
test('city accordion and mobile bottom layout have accessible, independent states',()=>{
  const js=fs.readFileSync(path.join(__dirname,'map-view.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'map-view.css'),'utf8');
  for(const city of ['kalistopolis','durane','arborium','velane','woodland','vulkar','cryptown','thalassea'])assert(js.includes("id:'"+city+"'"));
  assert(js.includes('aria-expanded="false"'));assert(js.includes('aria-controls="map-city-'));
  assert(js.includes('marker.hidden=!city'));assert(css.includes('align-items:flex-end'));assert(css.includes('.map-cities { flex:1;'));
  assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('animation:none'));
});
test('WoodLand is additive and agrees with the approved landmark coordinates',()=>{
  const vm=require('node:vm'),sandbox={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'map-view.js'),'utf8'),sandbox);
  const cities=JSON.parse(JSON.stringify(sandbox.window.KalistarMap.cities));
  const expected={kalistopolis:[881,403,62],durane:[449,355,76],arborium:[391,531,60],velane:[292,475,60],vulkar:[181,330,56],cryptown:[108,627,42]};
  assert.equal(cities.length,8);assert.equal(new Set(cities.map(city=>city.id)).size,8);
  for(const [id,position] of Object.entries(expected)){
    const city=cities.find(city=>city.id===id);assert.deepEqual([city.x,city.y,city.symbolSize],position);
  }
  const zone=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../map/layers-1.30/zone.json'),'utf8'));
  const woodland=cities.find(city=>city.id==='woodland');
  assert.equal(woodland.name,zone.city.name);assert.deepEqual([woodland.x,woodland.y,woodland.symbolSize],[zone.city.x,zone.city.y,zone.city.symbolSize]);
  assert(woodland.x>zone.lake.centerX);assert(woodland.text.includes('Cerelf'));assert(woodland.text.includes('lac en forme de cœur'));
});
