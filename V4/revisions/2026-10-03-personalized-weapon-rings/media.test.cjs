'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {sharp,ROOT}=require('../../atelier/lib.cjs');
const proof=require('./media-provenance.json'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=fs.readFileSync(path.join(ROOT,'V4/site/equipment-presentation.js'),'utf8');
const window={addEventListener(){}},context={window,matchMedia:()=>({matches:false,addEventListener(){}})};
vm.runInNewContext(source,context);
test('generated rings retain transparent openings, clean contours and optical center throughout rotation',async()=>{
  for(const visual of ['axe','flute']){
    const radii={};
    for(const kind of ['ring','body']){
      const a=proof.assets.find(a=>a.visual===visual&&a.kind===kind),bytes=fs.readFileSync(path.join(ROOT,a.file));
      assert.equal(hash(bytes),a.sha256);
      const p=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      assert.equal(p.info.width,488);assert.equal(p.info.height,488);
      let min=Infinity,max=0,count=0;
      for(let y=0;y<488;y++)for(let x=0;x<488;x++)if(p.data[(y*488+x)*4+3]){
        count++;const r=Math.hypot(x+.5-proof.canvas.center.x,y+.5-proof.canvas.center.y);
        min=Math.min(min,r);max=Math.max(max,r);
        assert(r<241,'no residual card edge or alpha corner');
      }
      assert(count>1000);radii[kind]={min,max};
      if(kind==='ring'){assert(min>155);assert.equal(p.data[(242*488+244)*4+3],0);}
    }
    assert(radii.body.max<radii.ring.min-2,'the weapon and its glow never overlap the revolving ring');
    const s=proof.assets.find(a=>a.visual===visual&&a.kind==='sources');
    assert.equal(hash(fs.readFileSync(path.join(__dirname,s.ringSource))),s.ringHash);
    assert.equal(hash(fs.readFileSync(path.join(ROOT,s.weaponSource))),s.weaponHash);
    assert.equal(s.exportAlphaThreshold,4);
  }
});
test('Arsenal and Arena share the new skins without changing legacy snapshots or game definitions',()=>{
  for(const w of require('../../site/weapons.js').weapons){
    const before=JSON.stringify(w),html=window.KalistarEquipmentFX.markup(w),skin=window.KalistarEquipmentFX.skins[w.visual];
    assert(html.includes(skin.body)&&html.includes(skin.rim));assert(html.includes('eq-backplate'));
    assert(!html.includes('src="assets/equipment/rim.webp"'));
    const legacy={...w};delete legacy.art;
    assert.equal(window.KalistarEquipmentFX.markup(legacy),html);
    assert.equal(JSON.stringify(w),before);assert(!window.KalistarEquipmentFX.markup(w,{bonus:false}).includes('eq-tab'));
  }
});
