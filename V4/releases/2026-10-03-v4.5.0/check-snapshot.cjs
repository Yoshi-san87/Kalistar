'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const snapshot = path.resolve(process.argv[2] || '');
assert(process.argv[2], 'Provide the isolated snapshot path');
const workflow = fs.readFileSync(path.join(snapshot, '.github/workflows/pages.yml'), 'utf8');
const commands = workflow.split(/\r?\n/).map(line => line.trim()).filter(line => /^node /.test(line));
commands.push('node V4/deploy/build.cjs');
const results = [];
const directory = path.join(snapshot, 'release-verification');
fs.mkdirSync(directory, {recursive:true});
for (const command of commands) {
  const args = command.split(' ').slice(1);
  const run = spawnSync(process.execPath, args, {cwd:snapshot, encoding:'utf8', maxBuffer:8*1024*1024});
  const output = (run.stdout || '')+(run.stderr || '');
  fs.writeFileSync(path.join(directory, String(results.length+1).padStart(2,'0')+'.log'), output);
  const tests = Number(output.match(/^(?:#|\u2139) tests (\d+)/m)?.[1] || 0);
  const passed = run.status === 0;
  results.push({command, passed, tests});
  fs.writeFileSync(path.join(directory, 'results.json'), JSON.stringify(results, null, 2)+'\n');
  console.log((passed?'PASS':'FAIL')+' '+command+' ('+tests+' tests)');
  if (!passed) {console.error(output);process.exit(1);}
}
console.log('All workflow commands passed. Tests: '+results.reduce((n,r)=>n+r.tests,0));
