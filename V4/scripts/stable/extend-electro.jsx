#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/template-stable/', work = folder + 'jelly-joe/';
    return K.lifecycle(function (ctx) {
        var source = ctx.open(folder + 'KALISTAR_V4_TEMPLATE_01.psd');
        var donor = ctx.open(root + 'V3/templates/32_ELECTRO_JELLY_JOE.psd');
        var doc = ctx.duplicate(source, 'KALISTAR V4 - Electro template 02');
        doc.saveAs(new File(work + 'reference-photoshop.png'), new PNGSaveOptions(), true);
        var report = { before: K.state(doc, [], ''), sourceUnsaved: !source.saved, donor: K.state(donor, [], '') };
        app.activeDocument = doc;
        function place(file, before, name) {
            app.activeDocument = doc; doc.activeLayer = before;
            var d = new ActionDescriptor(); d.putPath(K.c('null'), new File(file));
            executeAction(K.c('Plc '), d, DialogModes.NO);
            var l = doc.activeLayer; l.move(before, ElementPlacement.PLACEBEFORE); l.name = name; return l;
        }
        function fit(l, w, h, x, top) {
            var b = K.bounds(l), ratio = Math.min(w / (b[2] - b[0]), h / (b[3] - b[1]));
            l.resize(ratio * 100, ratio * 100, AnchorPosition.MIDDLECENTER);
            b = K.bounds(l); l.translate(x - (b[0] + b[2]) / 2, top - b[1]);
        }
        var art = place(root + 'V4/assets/illustrations/32_ELECTRO_JELLY_JOE_V4_01.png', K.need(doc, 'ART - MOMO'), 'ART - JELLY-JOE');
        fit(art, 737, 921, 448.5, 156); art.visible = false;
        var barcode = K.transplant(donor, K.need(donor, 'ID CODE128 - 30000032'), doc, K.need(doc, 'ID CODE128 - 30000001'), 'ID CODE128 - 30000032'); barcode.visible = false;
        var lance = K.transplant(donor, K.need(donor, 'ARME - Lance'), doc, K.need(doc, 'ARME Instrument'), 'ARME Lance - pictogramme');
        K.center(lance, 137, 1163.5); lance.visible = false;
        var enamel = K.need(doc, 'ARME Poing - email interieur').duplicate(lance, ElementPlacement.PLACEAFTER);
        enamel.name = 'ARME Lance - email interieur'; enamel.visible = false;
        var race = K.transplant(donor, K.need(donor, 'PICTOGRAMME RACE - TANTALAK'), doc, K.need(doc, 'RACE ROBOT'), 'RACE TANTALAK - pictogramme');
        var rb = K.bounds(race), rs = Math.min(87 / (rb[2] - rb[0]), 87 / (rb[3] - rb[1]));
        race.resize(rs * 100, rs * 100, AnchorPosition.MIDDLECENTER); K.center(race, 759, 1163.5); race.visible = false;
        var raceBase = enamel.duplicate(race, ElementPlacement.PLACEAFTER); raceBase.name = 'RACE TANTALAK - email interieur'; K.center(raceBase, 759, 1163.5); raceBase.visible = false;

        var cloth = place(work + 'crabazar-fabric.png', K.need(doc, 'FACTION - Chroma - tissu source agrandi'), 'FACTION - Crabazar - tissu source');
        fit(cloth, 100, 228, 720, 824);
        var shadow = cloth.duplicate(cloth, ElementPlacement.PLACEAFTER); shadow.name = 'OMBRE - Crabazar - detachement';
        doc.activeLayer = shadow; shadow.rasterize(RasterizeType.ENTIRELAYER); shadow.transparentPixelsLocked = false;
        shadow.adjustLevels(0, 255, 1, 0, 0); shadow.applyGaussianBlur(2); shadow.opacity = 55; shadow.translate(2, 3);
        cloth.visible = false; shadow.visible = false;

        var states = [['mana', 2, 5, -305], ['buff_atk', 1, 3, -197], ['guard', 2, 1, 97]];
        for (var i = 0; i < states.length; i++) {
            var a = states[i], icon = K.need(doc, 'ATK D' + a[1] + ' - effet ' + a[0]).duplicate(K.need(doc, 'ATK D' + a[2] + ' - valeur'), ElementPlacement.PLACEBEFORE);
            icon.name = 'ATK D' + a[2] + ' - effet ' + a[0]; icon.translate(0, a[3]); icon.visible = false;
        }
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION'), vis = [];
        for (i = 0; i < frame.layers.length; i++) vis.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) { var fl = frame.layers[i]; if (fl.typename === 'ArtLayer' && fl.id !== 17 && fl.id !== 11 && !fl.grouped) fl.grouped = true; }
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = vis[i];

        var registry = {
            schemaVersion: 2, template: 'V4/template-stable/KALISTAR_V4_TEMPLATE_02_ELECTRO.psd',
            canvas: [897, 1497], elements: ['ELECTRO'], banks: [
                { field: 'artwork', variants: { 'MOMO': ['ART - MOMO'], 'TAULIO': ['ART - TAULIO'], 'JELLY-JOE': ['ART - JELLY-JOE'] } },
                { field: 'id', variants: { '30000001': ['ID CODE128 - 30000001'], '30000013': ['ID CODE128 - 30000013'], '30000032': ['ID CODE128 - 30000032'] } },
                { field: 'weapon', variants: { 'Instrument': ['ARME Instrument'], 'Poing': ['ARME Poing - pictogramme', 'ARME Poing - email interieur'], 'Lance': ['ARME Lance - pictogramme', 'ARME Lance - email interieur'] } },
                { field: 'race', variants: { 'ROBOT': ['RACE ROBOT'], 'TANTALAK': ['RACE TANTALAK - pictogramme', 'RACE TANTALAK - email interieur'] } },
                { field: 'faction', variants: { 'Chroma': ['FACTION - Chroma - tissu source agrandi', 'OMBRE - detachement du tissu'], 'Crabazar': ['FACTION - Crabazar - tissu source', 'OMBRE - Crabazar - detachement'] } }
            ]
        };
        report.after = K.state(doc, [], ''); report.registry = registry;
        doc.info.title = 'KALISTAR V4 - TEMPLATE ELECTRO 02';
        doc.info.caption = 'Extension du template stable 01 : Momo, Taulio, Jelly-Joe. Cadre conserve, variantes incorporees, valeurs et effets separes. Regle artistique : V4/DIRECTION_ARTISTIQUE.md. 897 x 1497 px, 300 ppp, sRGB.';
        K.save(doc, root + registry.template, work + 'template-photoshop.png');
        K.write(folder + 'registry-electro-02.json', registry); K.write(work + 'extension.json', report);
        return 'Template Electro 02 etendu sans modifier la reference.';
    });
})();
