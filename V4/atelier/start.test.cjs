'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');
const powershell = path.join(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
const windows = process.platform === 'win32';

function fixture(server) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar launcher test '));
  fs.mkdirSync(path.join(root, 'data'));
  fs.copyFileSync(path.join(__dirname, 'start.ps1'), path.join(root, 'start.ps1'));
  fs.writeFileSync(path.join(root, 'server.cjs'), server);
  return root;
}
function launch(root, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(powershell, ['-NoProfile', '-ExecutionPolicy', 'RemoteSigned', '-File', path.join(root, 'start.ps1'), '-NoBrowser', ...args], {
      cwd: os.tmpdir(), windowsHide: true,
      env: {...process.env, USERPROFILE: root, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH, ...env}
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    const timeout = setTimeout(() => child.kill(), 20000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    // Windows can keep pipe handles inherited by the background server open.
    child.on('exit', code => {
      clearTimeout(timeout);
      if (code === 0) resolve({stdout, stderr});
      else reject(Object.assign(Error('Launcher failed: ' + stdout + stderr), {code, stdout, stderr}));
    });
  });
}
async function cleanup(root) {
  const resolved = path.resolve(root);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('kalistar launcher test '));
  const runtimeFile = path.join(root, 'data/runtime.json');
  if (fs.existsSync(runtimeFile)) {
    try {
      const runtime = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
      if (/^http:\/\/127\.0\.0\.1:\d+$/.test(runtime.url)) {
        await fetch(runtime.url + '/shutdown', {signal: AbortSignal.timeout(1500)});
        for (let i = 0; i < 30; i++) {
          try { process.kill(runtime.pid, 0); } catch { break; }
          await delay(100);
        }
      }
    } catch {}
  }
  fs.rmSync(resolved, {recursive: true, force: true, maxRetries: 10, retryDelay: 100});
}

test('starts from another directory, handles stale runtime, reuses server and preserves Atelier entry', {skip: !windows}, async () => {
  const root = fixture(`
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const data = path.join(__dirname, 'data');
const count = path.join(data, 'starts.txt');
fs.writeFileSync(count, String(Number(fs.existsSync(count) ? fs.readFileSync(count, 'utf8') : 0) + 1));
const server = http.createServer((req, res) => {
  if (req.url === '/shutdown') { res.end('ok'); server.close(() => process.exit(0)); return; }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({integrity: {state: 'intact'}}));
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(path.join(data, 'server.lock'), JSON.stringify({pid: process.pid}));
  fs.writeFileSync(path.join(data, 'runtime.json'), JSON.stringify({pid: process.pid, url: 'http://127.0.0.1:' + server.address().port}));
});
`);
  try {
    fs.writeFileSync(path.join(root, 'data/runtime.json'), '{partial runtime');
    const first = await launch(root, ['-View', 'Game']);
    const runtime = JSON.parse(fs.readFileSync(path.join(root, 'data/runtime.json'), 'utf8'));
    assert.ok(first.stdout.includes(runtime.url + '/jeu/'));
    assert.ok(!first.stdout.includes('#atelier'));
    // A healthy server must reopen even when Node is not discoverable anymore.
    const again = await launch(root, ['-View', 'Game'], {PATH: ''});
    assert.ok(again.stdout.includes(runtime.url + '/jeu/'));
    const atelier = await launch(root);
    assert.ok(atelier.stdout.includes(runtime.url + '/jeu/#atelier'));
    assert.equal(fs.readFileSync(path.join(root, 'data/starts.txt'), 'utf8'), '1');
  } finally { await cleanup(root); }
});

test('reports startup failure with diagnostics instead of opening a dead page', {skip: !windows}, async () => {
  const root = fixture("throw Error('TEST_DEPENDENCY_MISSING');\n");
  try {
    await assert.rejects(launch(root, ['-View', 'Game']), error => {
      assert.ok(error.code !== 0);
      assert.match(error.stdout + error.stderr, /TEST_DEPENDENCY_MISSING/);
      assert.match(error.stdout + error.stderr, /server-error\.log/);
      assert.ok(!error.stdout.includes('Kalistar est pret'));
      return true;
    });
  } finally { await cleanup(root); }
});
