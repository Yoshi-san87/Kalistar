'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
async function main(){
  const rows=git(['status','--porcelain=v1','-z','-uno']).split('\0').filter(Boolean);
  const files=rows.map(row=>row.slice(3));
  const blobs=execFileSync('git',['cat-file','--batch'],{cwd:root,input:files.map(p=>'HEAD:'+p).join('\n')+'\n',maxBuffer:32*1024*1024});
  const result={identicalLfs:0,changed:[],missing:[],bytesChecked:0};let cursor=0;
  for(const file of files){
    const end=blobs.indexOf(10,cursor),header=blobs.subarray(cursor,end).toString(),size=Number(header.split(' ')[2]);cursor=end+1;
    if(!Number.isFinite(size))throw Error(header);
    const before=blobs.subarray(cursor,cursor+size);cursor+=size+1;
    const target=path.join(root,file);
    if(!fs.existsSync(target)){result.missing.push(file);continue;}
    const pointer=before.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/);
    if(!pointer){if(!before.equals(fs.readFileSync(target)))result.changed.push(file);continue;}
    const stat=fs.statSync(target);
    if(stat.size<1024&&before.equals(fs.readFileSync(target))){result.identicalLfs++;continue;}
    if(stat.size!==Number(pointer[2])){result.changed.push(file);continue;}
    const hash=crypto.createHash('sha256');
    for await(const chunk of fs.createReadStream(target))hash.update(chunk);
    result.bytesChecked+=stat.size;
    if(hash.digest('hex')===pointer[1])result.identicalLfs++;else result.changed.push(file);
  }
  const output=path.join(__dirname,'qa/working-tree-audit.json');fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
