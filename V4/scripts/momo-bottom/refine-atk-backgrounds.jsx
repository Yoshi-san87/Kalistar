#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/atk-backgrounds'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var c = charIDToTypeID, s = stringIDToTypeID;
    var specs = [
        { die: 6, cx: 142, cy: 147, radius: 52 },
        { die: 5, cx: 155.5, cy: 371.5, radius: 38 },
        { die: 3, cx: 155.5, cy: 576.5, radius: 38 },
        { die: 1, cx: 155.5, cy: 773.5, radius: 38 }
    ];
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k; if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i]; if (l.name === name) return l;
            if (l.typename === 'LayerSet') { var match = find(l, name); if (match) return match; }
        }
        return null;
    }
    function state(parent, list) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i], b = l.bounds;
            var entry = { id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, blend: String(l.blendMode),
                bounds: [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')] };
            if (l.typename === 'ArtLayer') {
                entry.grouped = l.grouped;
                if (l.kind === LayerKind.TEXT) {
                    entry.text = l.textItem.contents;
                    try { entry.font = l.textItem.font; entry.size = l.textItem.size.as('pt'); } catch (e) {}
                }
            }
            list.push(entry);
            if (l.typename === 'LayerSet') state(l, list);
        }
        return list;
    }
    function rgb(r, g, b) { var d = new ActionDescriptor(); d.putDouble(c('Rd  '), r); d.putDouble(c('Grn '), g); d.putDouble(c('Bl  '), b); return d; }
    function gradient(spec) {
        var d = new ActionDescriptor(), ref = new ActionReference(), using = new ActionDescriptor(), fill = new ActionDescriptor(), grad = new ActionDescriptor(), shape = new ActionDescriptor();
        ref.putClass(s('contentLayer')); d.putReference(c('null'), ref);
        fill.putUnitDouble(c('Angl'), c('#Ang'), 90);
        fill.putEnumerated(c('Type'), c('GrdT'), c('Rdl '));
        fill.putBoolean(c('Rvrs'), false); fill.putBoolean(c('Dthr'), false); fill.putBoolean(c('Algn'), true);
        fill.putUnitDouble(c('Scl '), c('#Prc'), 100);
        grad.putString(c('Nm  '), 'Kalistar - coeur sombre / reflet or');
        grad.putEnumerated(c('GrdF'), c('GrdF'), c('CstS')); grad.putDouble(c('Intr'), 4096);
        var colors = new ActionList(), stops = [[0, 8, 20, 29], [2400, 14, 27, 34], [3500, 26, 34, 35], [4096, 58, 53, 29]];
        for (var i = 0; i < stops.length; i++) {
            var stop = new ActionDescriptor(); stop.putObject(c('Clr '), c('RGBC'), rgb(stops[i][1], stops[i][2], stops[i][3]));
            stop.putEnumerated(c('Type'), c('Clry'), c('UsrS')); stop.putInteger(c('Lctn'), stops[i][0]); stop.putInteger(c('Mdpn'), 50);
            colors.putObject(c('Clrt'), stop);
        }
        grad.putList(c('Clrs'), colors);
        var transparency = new ActionList();
        for (i = 0; i < 2; i++) { var alpha = new ActionDescriptor(); alpha.putUnitDouble(c('Opct'), c('#Prc'), 100); alpha.putInteger(c('Lctn'), i * 4096); alpha.putInteger(c('Mdpn'), 50); transparency.putObject(c('TrnS'), alpha); }
        grad.putList(c('Trns'), transparency); fill.putObject(c('Grad'), c('Grdn'), grad);
        using.putObject(c('Type'), s('gradientLayer'), fill);
        shape.putUnitDouble(c('Top '), c('#Pxl'), spec.cy - spec.radius);
        shape.putUnitDouble(c('Left'), c('#Pxl'), spec.cx - spec.radius);
        shape.putUnitDouble(c('Btom'), c('#Pxl'), spec.cy + spec.radius);
        shape.putUnitDouble(c('Rght'), c('#Pxl'), spec.cx + spec.radius);
        using.putObject(c('Shp '), c('Elps'), shape);
        d.putObject(c('Usng'), s('contentLayer'), using);
        executeAction(c('Mk  '), d, DialogModes.NO);
        var layer = doc.activeLayer;
        layer.name = 'ATK D' + spec.die + ' - COEUR SOMBRE - degrade editable';
        return layer;
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_06_CONTRASTE_ATK.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - fonds ATK lisibles');
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var report = { sourceHadUnsavedChanges: !source.saved, before: state(doc, []), capsules: specs, added: [] };
        // Keep the original electricity above the dark, independently masked interior.
        for (i = 0; i < specs.length; i++) {
            var spec = specs[i], halo = find(doc, 'ATK D' + spec.die + ' - HALO MAGIQUE');
            if (!halo) throw Error('Halo manquant D' + spec.die);
            doc.activeLayer = halo;
            var layer = gradient(spec);
            layer.move(halo, ElementPlacement.PLACEAFTER);
            doc.activeLayer = layer;
            if (layer.grouped) executeAction(c('Ungr'), undefined, DialogModes.NO);
            var ref = new ActionReference(); ref.putIdentifier(s('layer'), layer.id);
            var descriptor = executeActionGet(ref);
            report.added.push({ name: layer.name, kind: String(layer.kind), vectorMask: descriptor.getBoolean(s('hasVectorMask')) });
        }
        report.after = state(doc, []);
        doc.info.caption = 'Kalistar V4 | Momo | coeur des capsules ATK assombri, quatre degrades natifs avec masques vectoriels | eclairs, chiffres et modifications utilisateur preserves | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_07_FONDS_ATK_LISIBLES.psd');
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(target, options, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true);
        report.saved = state(reopened, []);
        var f = new File(folder.fsName + '/backgrounds.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Quatre fonds ATK crees avec degrades natifs editables.';
    } catch (error) {
        return 'Retouche error line ' + error.line + ': ' + error.message;
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
