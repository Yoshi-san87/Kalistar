#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'rikka-revision-03/';
    var registry = K.read(folder + 'registry-electro-03f.json'), card = K.read(work + 'card.json'), sources = K.read(work + 'sources.json');
    return K.lifecycle(function (ctx) {
        var report = { registry: registry, photoshop: app.version };
        function png(doc, name) { app.activeDocument = doc; doc.saveAs(new File(work + name), new PNGSaveOptions(), true); }
        function fixed(doc, name) {
            app.activeDocument = doc; var art = K.need(doc, 'ART - RIKKA'), visible = art.visible;
            art.visible = false; png(doc, name); art.visible = visible;
        }
        var source = ctx.open(root + sources.baseTemplate), oldCard = ctx.open(root + sources.baseCard);
        if (!source.saved || !oldCard.saved) throw Error('Source ouverte avec modifications non enregistrees.');
        report.masterBefore = K.state(source, [], ''); report.cardBefore = K.state(oldCard, [], '');
        png(source, 'master-before.png');
        var proof = ctx.duplicate(oldCard, 'Rikka - cadre avant'); fixed(proof, 'fixed-before.png'); proof.close(SaveOptions.DONOTSAVECHANGES);
        var master = ctx.duplicate(source, 'KALISTAR V4 - Electro 03F');
        app.activeDocument = master; var art = K.need(master, 'ART - RIKKA'), visible = art.visible;
        master.activeLayer = art; art.visible = true;
        var desired = registry.artworkAssets.RIKKA.framing.bounds, before = K.bounds(art);
        if (before[2] - before[0] !== desired[2] - desired[0] || before[3] - before[1] !== desired[3] - desired[1]) throw Error('Changement de taille interdit.');
        art.translate(UnitValue(desired[0] - before[0], 'px'), UnitValue(desired[1] - before[1], 'px')); art.visible = visible;
        master.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 03F RIKKA';
        report.masterAfter = K.state(master, [], ''); report.artworkBefore = before; report.artworkAfter = K.bounds(art);
        K.save(master, root + registry.template, work + 'master-after.png');
        var savedMaster = ctx.open(root + registry.template); png(savedMaster, 'master-reopened.png');
        var rendered = ctx.duplicate(savedMaster, 'RIKKA - cadrage fouet et Kalistel');
        report.render = renderRegistered(rendered, card, registry); report.resolution = rendered.resolution;
        K.save(rendered, root + 'V4/templates/' + card.output + '.psd', work + 'render.png');
        fixed(rendered, 'fixed-after.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd');
        png(reopened, 'reopened.png'); report.reopened = K.state(reopened, [], '');
        K.write(work + 'render.json', report);
        return 'Rikka V4-03 et maitre 03F enregistres, carte reconstruite depuis le maitre sauvegarde, PSD reouvert.';
    });
})();
