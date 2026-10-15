const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..'), work = path.join(root, 'V4/template-stable/rikka');
const read = p => JSON.parse(fs.readFileSync(path.resolve(work, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const raw = p => sharp(path.resolve(work, p)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
function diff(a, b) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw Error('Canvas mismatch');
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 3) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) changed++;
  return changed;
}
async function main() {
  const card = read('card.json'), assets = read('assets.json'), render = read('render.json'), result = await raw('render.png');
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b), find = name => render.after.find(l => l.name === name);
  const allowed = new Set(render.allowedLayerIds), before = new Map(render.before.map(l => [l.id,l]));
  const unexpected = render.after.filter(l => l.kind && !allowed.has(l.id) && !same(before.get(l.id),l)).map(l => l.name);
  const active = pattern => render.after.filter(l => l.visible && pattern.test(l.name)).map(l => l.name).sort();
  const regression = {};
  for (const name of ['momo','taulio','jelly-joe','momo-bal']) regression[name] = diff(await raw(name+'-regression.png'), await raw(name+'-approved.png'));
  const description = find('DESCRIPTION'), art = find('ART - RIKKA');
  const report = {
    canvas: [result.info.width,result.info.height], resolution: render.resolution, photoshop: render.photoshop,
    protectedSourcesUnchanged: Object.entries(assets.protectedFiles).every(([p,h]) => hash(p) === h),
    approvedArtworkCopiedExactly: hash(assets.artwork) === assets.artworkSha256,
    templateDefaultPixelDifference: diff(await raw('template-previous.png'),await raw('template-new.png')),
    reopenedTemplatePixelDifference: diff(await raw('template-new.png'),await raw('template-reopened.png')),
    reopenedCardPixelDifference: diff(result,await raw('reopened.png')),
    fixedFramePixelDifference: diff(await raw('fixed-template.png'),await raw('fixed-card.png')),
    previousCardsPixelDifference: regression, unexpectedLayerChanges: unexpected,
    numbersCorrect: render.slots.filter(s => typeof s.value === 'number').every(s => { const l=find(`${s.side} D${s.die} - valeur`); return l.kind==='LayerKind.TEXT' && l.visible && l.text===String(s.value) && l.font==='Bahnschrift-BoldSemiCondensed'; }),
    numericCentresCorrect: render.slots.filter(s => typeof s.value === 'number').every(s => { const l=find(`${s.side} D${s.die} - valeur`), x=s.side==='ATK'?(s.die===6?142:155.5):(s.die===6?756:734), y={6:150,5:371.5,4:475.5,3:576.5,2:676.5,1:773.5}[s.die]; return Math.abs((l.ink[0]+l.ink[2])/2-x)<1.1 && Math.abs((l.ink[1]+l.ink[3])/2-y)<1.1; }),
    effectsCorrect: same(active(/^(ATK|DEF) D\d - effet /),['DEF D1 - effet retry','DEF D6 - effet dodge']),
    magicCorrect: same(active(/^ATK D\d - HALO MAGIQUE$/),['ATK D5 - HALO MAGIQUE']),
    barriersCorrect: active(/^DEF D\d - BARRIERE$/).length===0,
    positionsCorrect: [1,2,3,4,5].every(n => { const t=find(`POSITION SLOT ${n}`),s=find(`SUPPORT SLOT ${n}`); return t.visible===(n===1) && s.visible===(n===1) && t.kind==='LayerKind.TEXT' && s.kind==='LayerKind.SMARTOBJECT' && (n!==1 || t.text==='2'); }),
    labelsCorrect: [['NOM',card.name],['TITLE',card.title],['JOB',card.job],['RACE',card.race]].every(([n,v]) => find(n).text===v && find(n).kind==='LayerKind.TEXT'),
    descriptionCorrect: description.text.replace(/\r/g,' ')===card.description && description.ink[1]>=1251 && description.ink[3]<=1387,
    newAssetsEditable: ['ART - RIKKA','ARME Fouet - pictogramme','RACE FELINEUS - pictogramme','DEF D6 - effet dodge','ID CODE128 - '+card.id].every(n => find(n).visible && find(n).kind==='LayerKind.SMARTOBJECT'),
    artworkClipped: art.grouped, artworkBounds: art.bounds,
    framingOnlyChangesRikkaArtwork: !render.framingProof || render.framingProof.every(p => p.unchangedLeaves.every(l => same(l.before,l.after))),
    framingAssetMatchesRegistry: !render.framing || hash(render.framing.renderSource)===render.framing.renderSha256,
    barcodeBoundsCorrect: same(find('ID CODE128 - '+card.id).bounds,[132,848,154,1058]),
    illustrationReviewRequired: true, physicalPrintVerified: false
  };
  report.passed = ['protectedSourcesUnchanged','approvedArtworkCopiedExactly','numbersCorrect','numericCentresCorrect','effectsCorrect','magicCorrect','barriersCorrect','positionsCorrect','labelsCorrect','descriptionCorrect','newAssetsEditable','artworkClipped','barcodeBoundsCorrect','framingOnlyChangesRikkaArtwork','framingAssetMatchesRegistry'].every(k=>report[k]) && !unexpected.length && !report.templateDefaultPixelDifference && !report.reopenedTemplatePixelDifference && !report.reopenedCardPixelDifference && !report.fixedFramePixelDifference && Object.values(regression).every(n=>n===0) && same(report.canvas,[897,1497]) && report.resolution===300;
  fs.writeFileSync(path.join(work,'verification.json'),JSON.stringify(report,null,2));
  for (const [name,width] of [['preview',686],['small-240',240]]) await sharp(result.data,{raw:result.info}).extract({left:48,top:48,width:800,height:1400}).resize(width).png().toFile(path.join(work,name+'.png'));
  console.log(JSON.stringify(report,null,2));
  if (!report.passed) throw Error('Rikka verification failed');
  await sharp(result.data,{raw:result.info}).withIccProfile('srgb').withMetadata({density:300}).png().toFile(path.join(root,'V4/cartes',card.output+'.png'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
