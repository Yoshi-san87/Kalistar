'use strict';
const assert = require('node:assert/strict');

// A journal is written before the first replacement so an interrupted batch can recover.
function transactionIO(L, journalFile) {
  const { fs, path, hash, write, read, crypto } = L;
  async function atomicCopy(from, to, expected) {
    const temp = to + '.' + crypto.randomUUID() + '.tmp';
    try {
      fs.copyFileSync(from, temp, fs.constants.COPYFILE_EXCL);
      assert.equal(await hash(temp), expected);
      fs.renameSync(temp, to);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  function validate(changes) {
    assert.ok(changes.length);
    assert.equal(new Set(changes.map(c => path.resolve(c.target))).size, changes.length);
    for (const c of changes) {
      assert.ok([c.target, c.backup, c.stage].every(path.isAbsolute));
      assert.equal(new Set([c.target, c.backup, c.stage].map(f => path.resolve(f))).size, 3);
      assert.match(c.beforeHash, /^[a-f0-9]{64}$/); assert.match(c.afterHash, /^[a-f0-9]{64}$/);
    }
  }
  async function rollback(journal, hooks = {}) {
    validate(journal.changes);
    assert.ok(['publishing', 'published', 'rollback-blocked'].includes(journal.state), 'Transaction non recuperable.');
    await hooks.guard?.();
    // Inspect the entire batch before restoring even one file.
    for (const c of journal.changes) {
      assert.equal(await hash(c.backup), c.beforeHash, 'Sauvegarde alteree.');
      assert.ok([c.beforeHash, c.afterHash].includes(await hash(c.target)), 'Modification externe : restauration refusee.');
    }
    for (const c of [...journal.changes].reverse()) {
      if (await hash(c.target) !== c.beforeHash) await atomicCopy(c.backup, c.target, c.beforeHash);
    }
    await hooks.afterRollback?.();
    write(journalFile, { ...journal, state: 'rolled-back' });
    return { rolledBack: true };
  }
  async function commit(journal, hooks = {}) {
    validate(journal.changes);
    if (fs.existsSync(journalFile)) assert.equal(read(journalFile).state, 'rolled-back', 'Transaction existante : verifier ou restaurer.');
    await hooks.before?.();
    for (const c of journal.changes) {
      assert.equal(await hash(c.target), c.beforeHash, 'Source modifiee avant publication.');
      assert.equal(await hash(c.backup), c.beforeHash);
      assert.equal(await hash(c.stage), c.afterHash, 'Stage modifie apres verification.');
    }
    const current = { ...journal, state: 'publishing' }; write(journalFile, current);
    try {
      for (const [i, c] of current.changes.entries()) {
        assert.equal(await hash(c.target), c.beforeHash, 'Source modifiee pendant publication.');
        await atomicCopy(c.stage, c.target, c.afterHash);
        await hooks.afterWrite?.(c, i);
      }
      await hooks.after?.();
      for (const c of current.changes) assert.equal(await hash(c.target), c.afterHash);
      write(journalFile, { ...current, state: 'published' });
      return { published: true, files: current.changes.length };
    } catch (error) {
      try { await rollback(current, hooks); }
      catch (recovery) {
        write(journalFile, { ...current, state: 'rollback-blocked', error: error.message, recoveryError: recovery.message });
        throw new AggregateError([error, recovery], 'Publication interrompue ; restauration bloquee pour preserver une modification externe.');
      }
      throw error;
    }
  }
  return { commit, rollback };
}
module.exports = { transactionIO };
