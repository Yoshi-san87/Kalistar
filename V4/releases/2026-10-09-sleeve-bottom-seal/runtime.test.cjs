'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
test('native verification loads sharp from the configured runner, not a workstation path',()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-runtime-qa-'));
  const modules=path.join(temporary,'node_modules'),library=path.resolve(__dirname,'../../atelier/lib.cjs');
  try{
    fs.mkdirSync(path.join(modules,'sharp'),{recursive:true});
    fs.writeFileSync(path.join(modules,'sharp/index.js'),'module.exports={runner:"isolated-test"};');
    const script='const assert=require("node:assert/strict"),lib=require('+JSON.stringify(library)+');assert.equal(lib.sharp.runner,"isolated-test");';
    execFileSync(process.execPath,['-e',script],{env:{...process.env,KALISTAR_NODE_MODULES:modules}});
    assert(fs.readFileSync(library,'utf8').includes("|| 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'"),'local default is preserved');
  }finally{
    assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));
    assert(!fs.lstatSync(temporary).isSymbolicLink());
    fs.rmSync(temporary,{recursive:true,force:true});
  }
});
