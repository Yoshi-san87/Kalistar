#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/atk-contrast'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var names = ['ATK D6 - valeur', 'ATK D5 - valeur', 'ATK D3 - valeur', 'ATK D1 - valeur'];
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i]; if (l.name === name) return l;
            if (l.typename === 'LayerSet') { var match = find(l, name); if (match) return match; }
        }
        return null;
    }
    function state(layer) {
        var ref = new ActionReference(); ref.putIdentifier(stringIDToTypeID('layer'), layer.id);
        var b = executeActionGet(ref).getObjectValue(stringIDToTypeID('boundsNoEffects'));
        return { value: layer.textItem.contents, font: layer.textItem.font, sizePt: layer.textItem.size.as('pt'),
            color: layer.textItem.color.rgb.hexValue,
            inkBounds: [b.getUnitDoubleValue(stringIDToTypeID('left')), b.getUnitDoubleValue(stringIDToTypeID('top')), b.getUnitDoubleValue(stringIDToTypeID('right')), b.getUnitDoubleValue(stringIDToTypeID('bottom'))] };
    }
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
        shadow.putUnitDouble(charIDToTypeID('Opct'), charIDToTypeID('#Prc'), 90);
        shadow.putBoolean(charIDToTypeID('uglg'), false);
        shadow.putUnitDouble(charIDToTypeID('lagl'), charIDToTypeID('#Ang'), 90);
        shadow.putUnitDouble(charIDToTypeID('Dstn'), charIDToTypeID('#Pxl'), 2);
        shadow.putUnitDouble(charIDToTypeID('Ckmt'), charIDToTypeID('#Pxl'), 0);
        shadow.putUnitDouble(charIDToTypeID('blur'), charIDToTypeID('#Pxl'), 4);
        shadow.putUnitDouble(charIDToTypeID('Nose'), charIDToTypeID('#Prc'), 0);
        shadow.putBoolean(charIDToTypeID('AntA'), false);
        effects.putObject(charIDToTypeID('DrSh'), charIDToTypeID('DrSh'), shadow);
        stroke.putBoolean(charIDToTypeID('enab'), true);
        stroke.putEnumerated(charIDToTypeID('Styl'), charIDToTypeID('FStl'), charIDToTypeID('OutF'));
        stroke.putEnumerated(charIDToTypeID('PntT'), charIDToTypeID('FrFl'), charIDToTypeID('SClr'));
        stroke.putEnumerated(charIDToTypeID('Md  '), charIDToTypeID('BlnM'), charIDToTypeID('Nrml'));
        stroke.putUnitDouble(charIDToTypeID('Opct'), charIDToTypeID('#Prc'), 90);
        stroke.putUnitDouble(charIDToTypeID('Sz  '), charIDToTypeID('#Pxl'), 2);
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
        var file = new File(root + 'V4/templates/MOMO_V4_05_CHIFFRES_LISIBLES.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        if (!source.saved) throw Error('Le PSD source comporte des modifications non enregistrees.');
        doc = source.duplicate('MOMO - contraste ATK');
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var report = { strokeColor: '050C14', strokeOpacity: 90, strokeSmallPx: 2, strokeLargePx: 2,
            shadowOpacity: 90, shadowDistancePx: 2, shadowSizePx: 4, numbers: [] };
        for (i = 0; i < names.length; i++) {
            var layer = find(doc, names[i]);
            if (!layer || layer.kind !== LayerKind.TEXT) throw Error('Texte natif absent : ' + names[i]);
            var before = state(layer);
            contrast(layer);
            var after = state(layer);
            if (json(before) !== json(after)) throw Error('La typographie a change : ' + names[i]);
            report.numbers.push({ name: names[i], before: before, after: after });
        }
        doc.info.caption = 'Kalistar V4 | Momo | contraste ATK : contour sombre net et ombre courte, effets natifs editables | police, corps, centrage, valeurs et reste de la carte inchanges | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_06_CONTRASTE_ATK.psd');
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(target, options, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        for (i = 0; i < names.length; i++) {
            layer = find(reopened, names[i]);
            if (!layer || layer.kind !== LayerKind.TEXT) throw Error('Texte aplati.');
            report.numbers[i].saved = state(layer);
        }
        reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true);
        var f = new File(folder.fsName + '/contrast.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Contraste renforce sur les quatre valeurs ATK jaunes uniquement.';
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
