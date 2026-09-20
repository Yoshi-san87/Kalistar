#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'jelly-joe-encre/';
    return K.lifecycle(function (ctx) {
        var registry = K.read(folder + 'registry-electro-03b.json'), card = K.read(work + 'card.json');
        var template = ctx.open(root + registry.template), previous = ctx.open(root + 'V4/templates/JELLY_JOE_V4_02_VISAGE_POSITIONS.psd');
        var doc = ctx.duplicate(template, 'Jelly-Joe Encre - positions 3 et 5');
        var report = renderRegistered(doc, card, registry);
        report.photoshop = app.version; report.registry = registry; report.resolution = doc.resolution;
        report.previous = K.state(previous, [], '');
        app.activeDocument = doc;
        doc.info.caption += ' Illustration Encre 08B validee. Positions 3 et 5 confirmees par utilisateur.';
        K.save(doc, root + 'V4/templates/' + card.output + '.psd', work + 'render.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd');
        app.activeDocument = reopened; reopened.saveAs(new File(work + 'reopened.png'), new PNGSaveOptions(), true);
        report.reopened = K.state(reopened, [], ''); K.write(work + 'render.json', report);
        function fixed(source, filename) {
            var proof = ctx.duplicate(source, 'Controle structure fixe');
            K.need(proof, 'ART - JELLY-JOE').visible = false;
            K.need(proof, '03 POSITIONS AUTORISEES - P1 a P5').visible = false;
            proof.saveAs(new File(work + filename), new PNGSaveOptions(), true); proof.close(SaveOptions.DONOTSAVECHANGES);
        }
        fixed(previous, 'fixed-previous.png'); fixed(reopened, 'fixed-new.png');
        return 'Carte Jelly-Joe Encre enregistree et reouverte avec les positions 3 et 5.';
    });
})();
