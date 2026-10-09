'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const tree=git(['rev-parse',process.argv[2]||git(['write-tree'])]);
  const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-460-')),archive=path.join(snapshot,'source.tar');
  execFileSync('git',['archive','--format=tar','--output='+archive,tree],{cwd:root,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}});
  const windowsTar=path.join(process.env.ProgramFiles||'','Git/usr/bin/tar.exe');
  const tar=process.platform==='win32'&&fs.existsSync(windowsTar)?windowsTar:'tar';
  execFileSync(tar,[...(tar===windowsTar?['--force-local']:[]),'-xf',archive,'-C',snapshot]);fs.unlinkSync(archive);
  const {files}=await require(path.join(snapshot,'V4/deploy/build.cjs')).plan(),paths=new Set(files.map(f=>f.source));
  // Hydrate exactly the extra verification sources fetched by the staged workflow.
  const workflow=fs.readFileSync(path.join(snapshot,'.github/workflows/pages.yml'),'utf8');
  const tracked=git(['ls-tree','-r','--name-only',tree]).split('\n');
  for(const match of workflow.matchAll(/git lfs pull --include="([^"$]+)"/g))for(const pattern of match[1].split(',')){
    const regex=new RegExp('^'+pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$');
    for(const name of tracked)if(regex.test(name))paths.add(name);
  }
  const lfs=path.resolve(root,git(['rev-parse','--git-path','lfs/objects']));let hydrated=0;
  for(const name of paths){
    const target=path.join(snapshot,name),pointer=fs.readFileSync(target);if(pointer.length>1024)continue;
    const match=pointer.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/);if(!match)continue;
    const [,oid,size]=match,candidates=[path.join(root,name),path.join(lfs,oid.slice(0,2),oid.slice(2,4),oid)];
    const source=candidates.find(p=>fs.existsSync(p)&&fs.statSync(p).size===Number(size)&&sha(fs.readFileSync(p))===oid);
    if(!source)throw Error('Missing verified LFS object '+name+' ('+oid+')');
    fs.copyFileSync(source,target);hydrated++;
  }
  console.log(JSON.stringify({snapshot,tree,hydrated,runtimeFiles:files.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
