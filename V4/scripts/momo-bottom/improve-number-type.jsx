#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/number-type'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var font = 'Bahnschrift-BoldSemiCondensed';
    var specs = [
        ['ATK D6 - valeur', 142, 150, 'large'], ['ATK D5 - valeur', 155.5, 371.5, 'small'],
        ['ATK D3 - valeur', 155.5, 576.5, 'small'], ['ATK D1 - valeur', 155.5, 773.5, 'small'],
        ['DEF D6 - valeur', 756, 150, 'large'], ['DEF D5 - valeur', 734, 372, 'small'],
        ['DEF D3 - valeur', 734, 577, 'small'], ['DEF D2 - valeur', 734, 677, 'small'], ['DEF D1 - valeur', 734, 774, 'small']
    ];
    var metrics = { large: { sizePx: 72, maxWidth: 96, maxHeight: 52 }, small: { sizePx: 47, maxWidth: 62, maxHeight: 34 } };
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i]; if (l.name === name) return l;
            if (l.typename === 'LayerSet') { var match = find(l, name); if (match) return match; }
        }
        return null;
    }
    function ink(layer) {
        var ref = new ActionReference(); ref.putIdentifier(stringIDToTypeID('layer'), layer.id);
        var b = executeActionGet(ref).getObjectValue(stringIDToTypeID('boundsNoEffects'));
        return [b.getUnitDoubleValue(stringIDToTypeID('left')), b.getUnitDoubleValue(stringIDToTypeID('top')), b.getUnitDoubleValue(stringIDToTypeID('right')), b.getUnitDoubleValue(stringIDToTypeID('bottom'))];
    }
    function color(hex) { var c = new SolidColor(); c.rgb.hexValue = hex; return c; }
    function contrast(layer) {
        doc.activeLayer = layer;
        var d = new ActionDescriptor(), ref = new ActionReference(), effects = new ActionDescriptor(), shadow = new ActionDescriptor(), stroke = new ActionDescriptor(), c = new ActionDescriptor();
        ref.putProperty(charIDToTypeID('Prpr'), charIDToTypeID('Lefx'));
        ref.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
        d.putReference(charIDToTypeID('null'), ref);
        effects.putUnitDouble(charIDToTypeID('Scl '), charIDToTypeID('#Prc'), 100);
        c.putDouble(charIDToTypeID('Rd  '), 5); c.putDouble(charIDToTypeID('Grn '), 12); c.putDouble(charIDToTypeID('Bl  '), 20);
        shadow.putBoolean(charIDToTypeID('enab'), true);
        shadow.putEnumerated(charIDToTypeID('Md  '), charIDToTypeID('BlnM'), charIDToTypeID('Mltp'));
        shadow.putObject(charIDToTypeID('Clr '), charIDToTypeID('RGBC'), c);
        shadow.putUnitDouble(charIDToTypeID('Opct'), charIDToTypeID('#Prc'), 55);
        shadow.putBoolean(charIDToTypeID('uglg'), false);
        shadow.putUnitDouble(charIDToTypeID('lagl'), charIDToTypeID('#Ang'), 90);
        shadow.putUnitDouble(charIDToTypeID('Dstn'), charIDToTypeID('#Pxl'), 1);
        shadow.putUnitDouble(charIDToTypeID('Ckmt'), charIDToTypeID('#Pxl'), 0);
        shadow.putUnitDouble(charIDToTypeID('blur'), charIDToTypeID('#Pxl'), 1.5);
        shadow.putUnitDouble(charIDToTypeID('Nose'), charIDToTypeID('#Prc'), 0);
        shadow.putBoolean(charIDToTypeID('AntA'), false);
        effects.putObject(charIDToTypeID('DrSh'), charIDToTypeID('DrSh'), shadow);
        stroke.putBoolean(charIDToTypeID('enab'), true);
        stroke.putEnumerated(charIDToTypeID('Styl'), charIDToTypeID('FStl'), charIDToTypeID('OutF'));
        stroke.putEnumerated(charIDToTypeID('PntT'), charIDToTypeID('FrFl'), charIDToTypeID('SClr'));
        stroke.putEnumerated(charIDToTypeID('Md  '), charIDToTypeID('BlnM'), charIDToTypeID('Nrml'));
        stroke.putUnitDouble(charIDToTypeID('Opct'), charIDToTypeID('#Prc'), 65);
        stroke.putUnitDouble(charIDToTypeID('Sz  '), charIDToTypeID('#Pxl'), 1);
        stroke.putObject(charIDToTypeID('Clr '), charIDToTypeID('RGBC'), c);
        effects.putObject(charIDToTypeID('FrFX'), charIDToTypeID('FrFX'), stroke);
        d.putObject(charIDToTypeID('T   '), charIDToTypeID('Lefx'), effects);
        executeAction(charIDToTypeID('setd'), d, DialogModes.NO);
    }
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k; if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_04_OMBRE_ATTACHE.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - chiffres lisibles');
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var report = { font: font, metrics: metrics, numbers: [] }, fitting = { large: 1, small: 1 };
        for (i = 0; i < specs.length; i++) {
            var spec = specs[i], layer = find(doc, spec[0]), m = metrics[spec[3]];
            if (!layer || layer.kind !== LayerKind.TEXT) throw Error('Valeur native absente : ' + spec[0]);
            var t = layer.textItem, old = ink(layer);
            report.numbers.push({ name: spec[0], value: t.contents, oldFont: t.font, oldInkBounds: old, targetCenter: [spec[1], spec[2]] });
            t.font = font; t.size = UnitValue(m.sizePx * 72 / doc.resolution, 'pt');
            t.horizontalScale = 100; t.verticalScale = 100; t.tracking = 0; t.baselineShift = 0;
            t.fauxBold = false; t.fauxItalic = false; t.color = color('F7F5EF');
            t.antiAliasMethod = AntiAlias.SHARP; t.justification = Justification.CENTER;
            var b = ink(layer);
            fitting[spec[3]] = Math.min(fitting[spec[3]], m.maxWidth / (b[2] - b[0]), m.maxHeight / (b[3] - b[1]));
        }
        // Use a single common size for every small capsule and one for both D6 capsules.
        for (i = 0; i < specs.length; i++) {
            spec = specs[i]; layer = find(doc, spec[0]); m = metrics[spec[3]];
            layer.textItem.size = UnitValue(m.sizePx * fitting[spec[3]] * 72 / doc.resolution, 'pt');
            contrast(layer);
            b = ink(layer); layer.translate(spec[1] - (b[0] + b[2]) / 2, spec[2] - (b[1] + b[3]) / 2);
            report.numbers[i].font = layer.textItem.font;
            report.numbers[i].sizePt = layer.textItem.size.as('pt'); report.numbers[i].inkBounds = ink(layer);
        }
        report.fitting = fitting;
        doc.info.caption = 'Kalistar V4 | Momo | chiffres ATK et DEF : Bahnschrift Bold SemiCondensed, deux corps communs, centrage sur les glyphes, contraste fin | valeurs et tous les autres elements inchanges | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_05_CHIFFRES_LISIBLES.psd');
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(target, options, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        for (i = 0; i < specs.length; i++) {
            layer = find(reopened, specs[i][0]);
            if (!layer || layer.kind !== LayerKind.TEXT || layer.textItem.contents !== report.numbers[i].value) throw Error('Valeur modifiee ou texte aplati.');
            report.numbers[i].savedFont = layer.textItem.font;
        }
        reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true);
        var f = new File(folder.fsName + '/typography.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Neuf valeurs ATK/DEF composees en Bahnschrift Bold SemiCondensed, sans changement de score.';
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
