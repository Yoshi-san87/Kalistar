#target photoshop
#include "common.jsx"
#include "registered.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'rikka/';
    return K.lifecycle(function (ctx) {
        var assets = K.read(work + 'assets.json'), registry = K.read(folder + 'registry-electro-03d.json'), card = K.read(work + 'card.json');
        var source = ctx.open(root + assets.baseTemplate);
        var whipDonor = ctx.open(root + 'V3/templates/10_NECRO_ZVIRI.psd');
        var raceDonor = ctx.open(root + 'V3/templates/31_PYRO_POLUX.psd');
        if (!source.saved || !whipDonor.saved || !raceDonor.saved) throw Error('Source non enregistree : sauvegarder avant production.');
        var doc = ctx.duplicate(source, 'KALISTAR V4 - Electro 03D Rikka');
        function png(d, name) { app.activeDocument = d; d.saveAs(new File(work + name), new PNGSaveOptions(), true); }
        png(source, 'template-previous.png');
        function place(file, before, name) {
            app.activeDocument = doc; doc.activeLayer = before;
            var d = new ActionDescriptor(); d.putPath(K.c('null'), new File(file));
            executeAction(K.c('Plc '), d, DialogModes.NO);
            var l = doc.activeLayer; l.move(before, ElementPlacement.PLACEBEFORE); l.name = name; return l;
        }
        function fit(l, w, h, x, y) {
            var b = K.bounds(l), ratio = Math.min(w / (b[2] - b[0]), h / (b[3] - b[1]));
            l.resize(ratio * 100, ratio * 100, AnchorPosition.MIDDLECENTER); K.center(l, x, y);
        }
        var placement = registry.artworkAssets.RIKKA.placement;
        var art = place(root + (registry.artworkAssets.RIKKA.renderSource || card.artworkSource), K.need(doc, 'ART - MOMO'), 'ART - RIKKA');
        fit(art, placement.width, placement.height, placement.centerX, placement.top + placement.height / 2); art.visible = false;
        var barcode = place(work + 'barcode.png', K.need(doc, 'ID CODE128 - 30000001'), 'ID CODE128 - ' + card.id);
        fit(barcode, 22, 210, 143, 953); barcode.visible = false;
        var whip = K.transplant(whipDonor, K.need(whipDonor, 'ARME - Fouet'), doc, K.need(doc, 'ARME Instrument'), 'ARME Fouet - pictogramme');
        whip = K.smart(doc, whip); K.center(whip, 137, 1163.5); whip.visible = false;
        var enamel = K.need(doc, 'ARME Poing - email interieur').duplicate(whip, ElementPlacement.PLACEAFTER);
        enamel.name = 'ARME Fouet - email interieur'; enamel.visible = false;
        var race = K.transplant(raceDonor, K.need(raceDonor, 'PICTOGRAMME RACE - FELINEUS'), doc, K.need(doc, 'RACE ROBOT'), 'RACE FELINEUS - pictogramme');
        race = K.smart(doc, race); fit(race, 87, 87, 759, 1163.5); race.visible = false;
        var raceBase = enamel.duplicate(race, ElementPlacement.PLACEAFTER);
        raceBase.name = 'RACE FELINEUS - email interieur'; K.center(raceBase, 759, 1163.5); raceBase.visible = false;
        var dodge = K.transplant(whipDonor, K.need(whipDonor, 'DEF D6 - effet dodge'), doc, K.need(doc, 'DEF D6 - valeur'), 'DEF D6 - effet dodge');
        dodge = K.smart(doc, dodge); fit(dodge, 99, 99, 756, 148); dodge.visible = false;
        var retry = K.need(doc, 'DEF D4 - effet retry').duplicate(K.need(doc, 'DEF D1 - valeur'), ElementPlacement.PLACEBEFORE);
        retry.name = 'DEF D1 - effet retry'; retry.translate(0, 298); retry.visible = false;
        var retryBase = K.need(doc, 'DEF D4 - fond effet').duplicate(retry, ElementPlacement.PLACEAFTER);
        retryBase.name = 'DEF D1 - fond effet'; retryBase.translate(0, 298); retryBase.visible = false;
        // New alternatives must remain in the approved illustration clipping chain.
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION'), visibility = [], i;
        for (i = 0; i < frame.layers.length; i++) visibility.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) {
            var l = frame.layers[i]; if (l.typename === 'ArtLayer' && l.id !== 17 && l.id !== 11 && !l.grouped) l.grouped = true;
        }
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = visibility[i];
        doc.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 03D RIKKA';
        doc.info.caption = 'Geometrie Electro 03C conservee. Rikka, Fouet, Felineus, dodge D6 et trefle DEF D1 incorpores. Champs natifs et contenus separes.';
        K.save(doc, root + registry.template, work + 'template-new.png');
        var master = ctx.open(root + registry.template); png(master, 'template-reopened.png');
        var rendered = ctx.duplicate(master, 'RIKKA - POUR UNE VIE DE PLUS');
        var report = renderRegistered(rendered, card, registry);
        report.photoshop = app.version; report.resolution = rendered.resolution; report.registry = registry;
        K.save(rendered, root + 'V4/templates/' + card.output + '.psd', work + 'render.png');
        var reopened = ctx.open(root + 'V4/templates/' + card.output + '.psd'); png(reopened, 'reopened.png');
        report.reopened = K.state(reopened, [], ''); K.write(work + 'render.json', report);
        function hideChanged(p) {
            for (var j = 0; j < p.layers.length; j++) {
                var l = p.layers[j]; if (l.typename === 'LayerSet') hideChanged(l);
                else for (var a = 0; a < report.allowedLayerIds.length; a++) if (l.id === report.allowedLayerIds[a]) l.visible = false;
            }
        }
        var fixed = ctx.duplicate(master, 'Controle cadre maitre'); hideChanged(fixed); png(fixed, 'fixed-template.png');
        fixed = ctx.duplicate(reopened, 'Controle cadre Rikka'); hideChanged(fixed); png(fixed, 'fixed-card.png');
        var regressions = [
            ['momo', 'V4/template-stable/revision-03/momo/card.json', 'MOMO_V4_11_POSITIONS'],
            ['taulio', 'V4/template-stable/revision-03/taulio/card.json', 'TAULIO_V4_02_POSITIONS'],
            ['jelly-joe', 'V4/template-stable/jelly-joe-encre/card.json', 'JELLY_JOE_V4_03_ENCRE'],
            ['momo-bal', 'V4/template-stable/momo-bal/card.json', 'MOMO_BAL_V4_01_TEMPLATE_ELECTRO']
        ];
        for (i = 0; i < regressions.length; i++) {
            var r = regressions[i], profile = K.read(root + r[1]), regression = ctx.duplicate(master, 'Controle ' + r[0]);
            renderRegistered(regression, profile, registry); png(regression, r[0] + '-regression.png');
            var approved = ctx.open(root + 'V4/templates/' + r[2] + '.psd');
            if (!approved.saved) throw Error('Carte approuvee non enregistree : ' + r[0]);
            png(approved, r[0] + '-approved.png');
        }
        return 'Rikka, PSD et template 03D sauvegardes, reouverts et controles.';
    });
})();
