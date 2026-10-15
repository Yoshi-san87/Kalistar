#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'momo-bal/';
    return K.lifecycle(function (ctx) {
        var assets = K.read(work + 'assets.json'), registry = K.read(folder + 'registry-electro-03c.json'), card = K.read(work + 'card.json');
        var source = ctx.open(root + assets.baseTemplate), donor = ctx.open(root + card.sourcePSD);
        if (!source.saved || !donor.saved) throw Error('Source avec modifications non enregistrees : sauvegarder avant production.');
        var doc = ctx.duplicate(source, 'KALISTAR V4 - Electro 03C Momo Bal');
        function png(d, name) { app.activeDocument = d; d.saveAs(new File(work + name), new PNGSaveOptions(), true); }
        png(source, 'template-previous.png');
        var donorState = K.state(donor, [], '');
        var art = K.transplant(donor, K.need(donor, 'ILLUSTRATION - remplacer le contenu'), doc, K.need(doc, 'ART - MOMO'), 'ART - MOMO BAL');
        art = K.smart(doc, art); art.visible = false;
        var barcode = K.transplant(donor, K.need(donor, 'ID CODE128 - ' + card.id), doc, K.need(doc, 'ID CODE128 - 30000001'), 'ID CODE128 - ' + card.id);
        barcode = K.smart(doc, barcode); barcode.visible = false;
        // Reuse the approved optical alignment, translated between fixed slot centres.
        var effects = [['retry', 4, 3, 101], ['mana', 2, 1, 97]];
        for (var i = 0; i < effects.length; i++) {
            var e = effects[i], icon = K.need(doc, 'ATK D' + e[1] + ' - effet ' + e[0]).duplicate(K.need(doc, 'ATK D' + e[2] + ' - valeur'), ElementPlacement.PLACEBEFORE);
            icon.name = 'ATK D' + e[2] + ' - effet ' + e[0]; icon.translate(0, e[3]); icon.visible = false;
        }
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION'), visibility = [];
        for (i = 0; i < frame.layers.length; i++) visibility.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) {
            var l = frame.layers[i]; if (l.typename === 'ArtLayer' && l.id !== 17 && l.id !== 11 && !l.grouped) l.grouped = true;
        }
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = visibility[i];
        doc.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 03C MOMO BAL';
        doc.info.caption = 'Geometrie Electro 03B conservee. Variante Momo Le Bal des objets perdus V3 incorporee. Champs natifs, effets et contenus separes.';
        K.save(doc, root + registry.template, work + 'template-new.png');
        var master = ctx.open(root + registry.template); png(master, 'template-reopened.png');
        var rendered = ctx.duplicate(master, 'MOMO - LE BAL DES OBJETS PERDUS');
        var report = renderRegistered(rendered, card, registry);
        report.photoshop = app.version; report.resolution = rendered.resolution; report.donor = donorState; report.registry = registry;
        K.save(rendered, root + 'V4/templates/' + card.output + '.psd', work + 'render.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd'); png(reopened, 'reopened.png');
        report.reopened = K.state(reopened, [], '');
        K.write(work + 'render.json', report);
        function hideChanged(p) {
            for (var j = 0; j < p.layers.length; j++) {
                var l = p.layers[j]; if (l.typename === 'LayerSet') hideChanged(l);
                else for (var a = 0; a < report.allowedLayerIds.length; a++) if (l.id === report.allowedLayerIds[a]) l.visible = false;
            }
        }
        var fixed = ctx.duplicate(master, 'Controle cadre maitre'); hideChanged(fixed); png(fixed, 'fixed-template.png');
        fixed = ctx.duplicate(reopened, 'Controle cadre variante Momo'); hideChanged(fixed); png(fixed, 'fixed-card.png');
        var regressions = [
            ['momo', 'V4/template-stable/revision-03/momo/card.json', 'MOMO_V4_11_POSITIONS'],
            ['taulio', 'V4/template-stable/revision-03/taulio/card.json', 'TAULIO_V4_02_POSITIONS'],
            ['jelly-joe', 'V4/template-stable/jelly-joe-encre/card.json', 'JELLY_JOE_V4_03_ENCRE']
        ];
        for (i = 0; i < regressions.length; i++) {
            var r = regressions[i], profile = K.read(root + r[1]), regression = ctx.duplicate(master, 'Controle ' + r[0]);
            renderRegistered(regression, profile, registry); png(regression, r[0] + '-regression.png');
            var approved = ctx.open(root + 'V4/templates/' + r[2] + '.psd');
            if (!approved.saved) throw Error('Carte approuvee non enregistree : ' + r[0]);
            png(approved, r[0] + '-approved.png');
        }
        return 'Momo Le Bal des objets perdus, PSD et template 03C enregistres, reouverts et controles.';
    });
})();
