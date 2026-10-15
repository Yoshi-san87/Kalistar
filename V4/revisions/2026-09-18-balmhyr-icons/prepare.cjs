const L = require('../../atelier/lib.cjs');
const { fs, path, ROOT, read, write } = L;
const work = __dirname;
(async () => {
  const ref = L.baseline();
  await L.protectedCheck(ref);
  if (fs.existsSync(path.join(work, 'references-before.json'))) throw Error('Revision already prepared');
  write(path.join(work, 'references-before.json'), ref);
  const items = ['balmhyr', 'lok'].map(key => {
    const c = ref.cards.find(c => c.key === key);
    const destination = `V4/revisions/2026-09-18-balmhyr-icons/staged/${key}`;
    fs.mkdirSync(path.join(ROOT, destination), { recursive: true });
    return { key, psd: c.psd, png: c.png, profile: c.profile,
      report: path.posix.join(path.posix.dirname(c.profile), 'render.json'), destination };
  });
  fs.mkdirSync(path.join(work, 'inspection'), { recursive: true });
  fs.mkdirSync(path.join(work, 'staged', 'banks'), { recursive: true });
  write(path.join(work, 'plan.json'), { revision: 'balmhyr-icons-2026-09-18', items,
    artwork: 'V4/assets/illustrations/elements-01/terre-plantes/BALMHYR_V4_02_CANYONERO.png',
    install: [], protect: [] });
  write(path.join(work, 'pack-before.json'), read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')));
  write(path.join(work, 'pack-raw-before.json'), read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.raw.json')));
  console.log('Prepared two-card revision against', ref.id);
})().catch(e => { console.error(e); process.exitCode = 1; });
