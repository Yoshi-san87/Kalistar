'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { approvedAdditionFixtures, runDatabaseScenarios } = require('../../site/catalogue-evolution.test.cjs');
const SITE = path.resolve(__dirname, '../../site');
const scripts = ['engine.js', 'ownership.js', 'local-db.js'];

async function check() {
  const fixture = await approvedAdditionFixtures();
  const context = { structuredClone, crypto: webcrypto, console }; context.window = context;
  vm.createContext(context);
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(SITE, file), 'utf8'), context, { filename: file });
  const O = context.KalistarOwnership, E = context.KalistarEngine;
  const state = Object.fromEntries(O.stores.map(name => [name, []]));
  O.seed(state, (table, row) => state[table].push(row), fixture.old);
  assert.equal(state.collectibles.length, fixture.old.cards.length);
  O.validateBackup(state, fixture.old);
  assert.throws(() => O.validateBackup(state, fixture.next), /originaux/);
  const engine = E.createEngine(fixture.next);
  const decks = fixture.old.decks.player.map((_, slot) => fixture.old.decks.player.map((id, i) => i === slot ? fixture.addedId : id));
  assert.ok(decks.some(deck => !engine.validatePlayableDeck(deck).length));
  new vm.Script('(' + runDatabaseScenarios.toString() + ')');
  return { nodeChecksPassed: true, oldApproved: fixture.old.cards.length, currentApproved: fixture.next.cards.length, addedId: fixture.addedId, indexedDBTestsRun: false };
}

const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Voloden - sauvegardes V4</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>
body{font:16px system-ui;margin:32px;max-width:1000px;color:#172024;background:#f5f7f8}button{font:inherit;padding:10px 20px;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere}li{margin:8px 0}.fail{color:#a20c25}.pass{color:#146c36}
</style><h1>Voloden : sauvegarde approuvee 26 vers 27</h1><button id="run">Ex&eacute;cuter</button>
<p id="status" role="status">Pret. Base de test isolee.</p><ol id="checks"></ol><pre id="result"></pre>
<script src="/engine.js"></script><script src="/ownership.js"></script><script src="/local-db.js"></script><script src="/tests.js"></script></html>`;

const browserScript = `'use strict';
const runDatabaseScenarios = ${runDatabaseScenarios.toString()};
document.getElementById('run').addEventListener('click', async () => {
  const button = document.getElementById('run'), status = document.getElementById('status');
  button.disabled = true; document.getElementById('checks').replaceChildren(); document.getElementById('result').textContent = '';
  const report = { running: true, passed: false, namespace: 'kalistar-v4-cards-test-voloden-' + crypto.randomUUID(), results: [] };
  window.KALISTAR_BACKUP_TEST_RESULTS = report;
  status.textContent = 'Tests en cours';
  try {
    const response = await fetch('/fixtures.json'); if (!response.ok) throw Error('Fixtures indisponibles');
    const fixture = await response.json(); report.counts = [fixture.old.cards.length, fixture.next.cards.length]; report.referenceId = fixture.next.referenceId;
    await runDatabaseScenarios({ ...fixture, namespace: report.namespace }, result => {
      report.results.push(result); const li = document.createElement('li'); li.className = result.passed ? 'pass' : 'fail';
      li.textContent = (result.passed ? 'PASS ' : 'FAIL ') + result.name + (result.error ? ': ' + result.error : ''); document.getElementById('checks').append(li);
    });
    report.passed = true; status.textContent = 'PASS - ' + report.results.length + ' scenarios IndexedDB';
  } catch (error) { report.error = error.message; status.textContent = 'ECHEC : ' + error.message; }
  finally { report.running = false; button.disabled = false; document.getElementById('result').textContent = JSON.stringify(report, null, 2); }
});`;

function createServer() {
  return http.createServer(async (req, res) => {
    const send = (status, type, body) => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body); };
    if (req.method !== 'GET') return send(405, 'text/plain', 'Read-only harness');
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) return send(403, 'text/plain', 'Local harness only');
    try {
      if (req.url === '/') return send(200, 'text/html; charset=utf-8', html);
      if (req.url === '/tests.js') return send(200, 'text/javascript; charset=utf-8', browserScript);
      if (req.url === '/fixtures.json') return send(200, 'application/json', JSON.stringify(await approvedAdditionFixtures()));
      const file = scripts.find(file => req.url === '/' + file);
      if (file) return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(path.join(SITE, file)));
      return send(404, 'text/plain', 'Not found');
    } catch (error) { send(500, 'text/plain; charset=utf-8', error.message); }
  });
}

module.exports = { check, createServer };
if (require.main === module) {
  if (process.argv[2] === '--check') check().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error); process.exitCode = 1; });
  else if (process.argv[2] === '--serve') {
    const port = Number(process.argv[3] || 0); assert.ok(Number.isInteger(port) && port >= 0 && port <= 65535);
    const server = createServer(); server.on('error', error => { console.error(error); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log('Isolated backup tests: http://127.0.0.1:' + server.address().port + '/'));
  } else { console.error('Usage: node backup-tests.cjs --check | --serve [port]'); process.exitCode = 1; }
}
