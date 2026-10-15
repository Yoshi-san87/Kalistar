const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root,file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const manifest = JSON.parse(read('V3/donnees/revision_buffs_scenes_weapons.json'));
  const matrix = JSON.parse(read('V3/donnees/armes.json'));
  const names = Object.keys(matrix);
  assert.equal(names.length,20);
  for (const name of names) assert.deepEqual(Object.keys(matrix[name]),names);
  assert.equal(manifest.ready_count,20);
  assert.equal(manifest.assets.length,20);
  assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,20);
  const results=[];
  for (let i=0;i<20;i++) {
    const asset=manifest.assets[i], id=String(i).padStart(2,'0');
    assert.equal(asset.index,i);
    assert.equal(asset.category,names[i]);
    assert.equal(asset.output,`V3/assets/revisions-buffs-scenes-20260914/armes/${id}.png`);
    assert.equal(asset.visual_qa.status,'passed');
    assert.equal(asset.visual_qa.scale_px,90);
    assert(asset.orientation.verified_visually);
    const bytes=read(asset.output), original=read(`V1/assets/armes/${id}.jpg`);
    assert.equal(hash(bytes),asset.sha256);
    assert.equal(hash(original),asset.source_evidence.sha256);
    assert.equal(hash(read(`V2/assets/armes/${id}.jpg`)),hash(original));
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.deepEqual([info.width,info.height,info.channels],[512,512,4]);
    let min=255,max=0,visible=0,edge=0,nonwhite=0;
    for(let p=0;p<512*512;p++) {
      const a=data[p*4+3],x=p%512,y=Math.floor(p/512);
      min=Math.min(min,a);max=Math.max(max,a);
      if(a) {visible++;if(data[p*4]!==255||data[p*4+1]!==255||data[p*4+2]!==255)nonwhite++;}
      if(x===0||x===511||y===0||y===511)edge=Math.max(edge,a);
    }
    assert.equal(min,0);assert.equal(max,255);assert.equal(edge,0);assert.equal(nonwhite,0);
    assert(visible>1000&&visible<512*512/2);
    assert.equal(512*512-visible,asset.alpha_qa.fully_transparent_pixels);
    results.push({index:i,category:names[i],sha256:asset.sha256,alpha:[min,max],edge,nonwhite});
  }
  for(const item of manifest.qa.canonical_and_gameplay_hashes_unchanged_during_run) {
    assert.equal(hash(read(item.file)),item.sha256,`Protected file changed since production: ${item.file}`);
  }
  for(const file of manifest.qa.contact_sheets) {
    const meta=await sharp(read(file)).metadata();
    assert.deepEqual([meta.width,meta.height],[725,600]);
  }
  assert(manifest.assets[11].production.native_svg.includes('circle cx="50" cy="61"'));
  console.log(JSON.stringify({status:'passed',count:results.length,matrix_size:[20,20],
    protected_files_unchanged:22,contact_sheets_verified:2,results},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
