#target photoshop
#include "common.jsx"
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var out = root + 'V4/template-stable/';
    return K.lifecycle(function (ctx) {
        var source = ctx.open(root + 'V4/templates/MOMO_V4_10_FONDS_RECENTRES.psd');
        var donor = ctx.open(root + 'V3/templates/13_ELECTRO_TAULIO.psd');
        var doc = ctx.duplicate(source, 'KALISTAR V4 - template stable 01');
        if (Math.round(doc.width.as('px')) !== 897 || Math.round(doc.height.as('px')) !== 1497) throw Error('Canevas non conforme.');
        doc.saveAs(new File(out + 'reference-photoshop.png'), new PNGSaveOptions(), true);
        var report = { version: 1, width: 897, height: 1497, ppi: doc.resolution, sourceUnsaved: !source.saved, donorUnsaved: !donor.saved, reference: K.state(doc, [], '') };
        var art = K.smart(doc, K.need(doc, 'ILLUSTRATION - remplacer le contenu')); art.name = 'ART - MOMO';
        var alt = K.transplant(donor, K.need(donor, 'ILLUSTRATION - remplacer le contenu'), doc, art, 'ART - TAULIO'); alt.visible = false;
        var barcode = K.smart(doc, K.need(doc, 'ID CODE128 - 30000001'));
        alt = K.transplant(donor, K.need(donor, 'ID CODE128 - 30000013'), doc, barcode, 'ID CODE128 - 30000013'); alt.visible = false;

        // Add absent native number fields without touching the approved visible states.
        var missing = [['ATK', 4, 155.5, 475.5], ['ATK', 2, 155.5, 676.5], ['DEF', 4, 734, 475.5]];
        for (var i = 0; i < missing.length; i++) {
            var a = missing[i], ref = K.need(doc, a[0] + ' D5 - valeur');
            var icon = K.need(doc, a[0] + ' D' + a[1] + ' - effet ' + (a[1] === 2 ? 'mana' : 'retry'));
            var n = ref.duplicate(icon, ElementPlacement.PLACEBEFORE); n.name = a[0] + ' D' + a[1] + ' - valeur';
            K.text(n, '0', a[2], a[3], 64); n.visible = false;
        }
        var defEffectBase = K.byId(doc, 148); defEffectBase.name = 'DEF D4 - fond effet';
        var dark = K.transplant(donor, K.byId(donor, 148), doc, defEffectBase, 'DEF D4 - fond physique'); dark.visible = false;
        var guard = K.transplant(donor, K.need(donor, 'ATK D2 - effet guard'), doc, K.need(doc, 'ATK D2 - effet mana'), 'ATK D2 - effet guard');
        K.center(guard, 157.5, 677.5); guard.visible = false;
        var attack = K.transplant(donor, K.need(donor, 'ATK D1 - effet buff_atk'), doc, K.need(doc, 'ATK D1 - valeur'), 'ATK D1 - effet buff_atk');
        K.center(attack, 157.5, 774.5); attack.visible = false;

        // Physical and magical modes share the approved support, not a flattened rail.
        var ys = { 5: 371.5, 4: 475.5, 3: 576.5, 2: 676.5, 1: 773.5 };
        for (var die = 5; die >= 1; die--) {
            if (!K.find(doc, 'ATK D' + die + ' - HALO MAGIQUE')) {
                var halo = K.need(doc, 'ATK D5 - HALO MAGIQUE').duplicate(K.need(doc, 'ATK D' + die + ' - OR GENERE - objet dynamique partage'), ElementPlacement.PLACEBEFORE);
                halo.translate(0, ys[die] - ys[5]); halo.name = 'ATK D' + die + ' - HALO MAGIQUE'; halo.visible = false;
            }
            if (!K.find(doc, 'DEF D' + die + ' - BARRIERE')) {
                var defValue = K.need(doc, 'DEF D' + die + ' - valeur');
                var barrier = K.need(doc, 'DEF D2 - BARRIERE').duplicate(defValue, ElementPlacement.PLACEAFTER);
                barrier.translate(0, ys[die] - ys[2]); barrier.name = 'DEF D' + die + ' - BARRIERE'; barrier.visible = false;
            }
        }

        var positions = K.need(doc, '03 POSITIONS AUTORISEES - P1 a P5');
        K.need(positions, 'P3').name = 'POSITION SLOT 1'; K.need(positions, 'P3 - support').name = 'SUPPORT SLOT 1';
        K.need(positions, 'P4').name = 'POSITION SLOT 2'; K.need(positions, 'P4 - support').name = 'SUPPORT SLOT 2';
        for (i = 3; i <= 5; i++) {
            var support = K.need(positions, 'SUPPORT SLOT 1').duplicate(positions, ElementPlacement.INSIDE);
            support.name = 'SUPPORT SLOT ' + i; support.translate((i - 1) * 50, 0); support.visible = false;
            var t = K.need(positions, 'POSITION SLOT 1').duplicate(support, ElementPlacement.PLACEBEFORE);
            t.name = 'POSITION SLOT ' + i; t.textItem.contents = String(i); K.center(t, 221 + (i - 1) * 50, 1024); t.visible = false;
        }

        var weapon = K.need(doc, 'ARME Instrument');
        var punch = K.transplant(donor, K.need(donor, 'ARME - Poing'), doc, weapon, 'ARME Poing - pictogramme');
        K.center(punch, 137, 1163.5); punch.visible = false;
        // The clean V3 enamel is a separate editable support inside the unchanged V4 copper rim.
        var enamel = K.transplant(donor, K.need(donor, 'ARME - email'), doc, weapon, 'ARME Poing - email interieur');
        var eb = K.bounds(enamel); enamel.resize(96 / (eb[2] - eb[0]) * 100, 96 / (eb[3] - eb[1]) * 100, AnchorPosition.MIDDLECENTER);
        K.center(enamel, 137, 1163.5); enamel.visible = false;

        // Inserting an unclipped alternative splits Photoshop's shared clipping chain.
        // Restore the original chain from its base upward, including the new alternatives.
        var frame = K.need(doc, '06 CADRE FIXE ET ILLUSTRATION');
        var visibility = [];
        for (i = 0; i < frame.layers.length; i++) visibility.push(frame.layers[i].visible);
        for (i = frame.layers.length - 1; i >= 0; i--) {
            var fl = frame.layers[i];
            if (fl.typename === 'ArtLayer' && fl.id !== 17 && fl.id !== 11 && !fl.grouped) fl.grouped = true;
        }
        // Photoshop's clipping command also reveals its target; preserve hidden variants.
        for (i = 0; i < frame.layers.length; i++) frame.layers[i].visible = visibility[i];

        doc.info.title = 'KALISTAR V4 - TEMPLATE STABLE 01';
        doc.info.caption = 'Reference Momo V4-10 preservee pixel pour pixel. Valeurs natives, six fonds or en objets dynamiques, effets separes, cinq positions horizontales, illustration et code-barres en objets dynamiques. Variante ELECTRO / Chroma / Robot calibree. Ne pas redimensionner les supports.';
        report.template = K.state(doc, [], '');
        K.save(doc, out + 'KALISTAR_V4_TEMPLATE_01.psd', out + 'template-photoshop.png');
        K.write(out + 'build.json', report);
        return 'Template stable sauvegarde, Momo conserve et champs Taulio prepares.';
    });
})();
