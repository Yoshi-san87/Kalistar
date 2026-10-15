'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),snapshot=path.resolve(process.argv[2]);
assert(snapshot.startsWith(path.join(require('node:os').tmpdir(),'kalistar-450-')));
assert.notEqual(snapshot,root);
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const lfs=path.resolve(root,git(['rev-parse','--git-path','lfs/objects']));
const head=process.argv[3]||'1afc2d8f5c30e20c2377b0a2b99c1b61dee2ff28';
const files=git(['ls-tree','-r','--name-only',head]).split('\n').filter(f=>/^V4\/(atelier\/designer-assets\/extensions\/race-[^/]+|creations\/49901[01]\d\d\/illustration|propositions\/2026-10-08-ff9\/[^/]+|propositions\/2026-10-09-ff6-ff15-ff13\/[^/]+)\.png$/.test(f));
let hydrated=0;
for(const f of files){
 const target=path.join(snapshot,f),pointer=fs.readFileSync(target);if(pointer.length>1024)continue;
 const m=pointer.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/);if(!m)continue;
 const [,oid,size]=m,candidates=[path.join(root,f),path.join(lfs,oid.slice(0,2),oid.slice(2,4),oid)];let found=false;
 for(const source of candidates){if(!fs.existsSync(source)||fs.statSync(source).size!==Number(size))continue;const bytes=fs.readFileSync(source);if(sha(bytes)!==oid)continue;fs.writeFileSync(target,bytes);hydrated++;found=true;break;}
 assert(found,'Missing verified LFS object '+f);
}
const relative='V4/expansions/2026-10-09-final-fantasy-trilogy/';
for(const f of ['current.cjs','integration.test.cjs','browser.test.cjs'])fs.copyFileSync(path.join(root,relative,f),path.join(snapshot,relative,f));
const revision='V4/revisions/2026-10-09-umaro-macako';
fs.cpSync(path.join(root,revision),path.join(snapshot,revision),{recursive:true,errorOnExist:true});
for(const f of ['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'])fs.copyFileSync(path.join(root,'V4/creations/49901114',f),path.join(snapshot,'V4/creations/49901114',f));
const catalogue='V4/donnees/catalogue.json',next=JSON.parse(fs.readFileSync(path.join(snapshot,catalogue))),current=JSON.parse(fs.readFileSync(path.join(root,catalogue)));
next.cards[next.cards.findIndex(c=>c.id==='49901114')]=current.cards.find(c=>c.id==='49901114');
fs.writeFileSync(path.join(snapshot,catalogue),JSON.stringify(next,null,2));
console.log(JSON.stringify({snapshot,head,hydrated,corrections:['portable integration profiles','Umaro Macako']}));
