#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/gold-optical'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var c = charIDToTypeID, s = stringIDToTypeID;
    var capsules = [{ die: 6, cx: 142, cy: 147, radius: 52 }, { die: 5, cx: 155.5, cy: 371.5, radius: 38 }, { die: 3, cx: 155.5, cy: 576.5, radius: 38 }, { die: 1, cx: 155.5, cy: 773.5, radius: 38 }];
    var icons = [
        { name: 'ATK D4 - effet retry', dx: 2, dy: 1 },
        { name: 'DEF D4 - effet retry', dx: 2, dy: 1 },
        { name: 'ATK D2 - effet mana', dx: 1, dy: -2 }
    ];
    // Stops run from the lower lit edge to the shaded upper edge (90-degree gradient).
    var stops = [[0, 192, 168, 5], [950, 150, 130, 3], [2250, 93, 81, 2], [4096, 53, 47, 5]];
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
    function bounds(layer) { var b = layer.bounds; return [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')]; }
    function state(parent, list) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i];
            var entry = { id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, blend: String(l.blendMode), bounds: bounds(l) };
            if (l.typename === 'ArtLayer') {
                entry.grouped = l.grouped; entry.kind = String(l.kind);
                if (l.kind === LayerKind.TEXT) { entry.text = l.textItem.contents; try { entry.font = l.textItem.font; entry.size = l.textItem.size.as('pt'); } catch (e) {} }
            }
            list.push(entry);
            if (l.typename === 'LayerSet') state(l, list);
        }
        return list;
    }
    function rgb(r, g, b) { var d = new ActionDescriptor(); d.putDouble(c('Rd  '), r); d.putDouble(c('Grn '), g); d.putDouble(c('Bl  '), b); return d; }
    function gold(layer) {
        doc.activeLayer = layer;
        var d = new ActionDescriptor(), ref = new ActionReference(), fill = new ActionDescriptor(), grad = new ActionDescriptor();
        ref.putEnumerated(s('contentLayer'), c('Ordn'), c('Trgt')); d.putReference(c('null'), ref);
        fill.putUnitDouble(c('Angl'), c('#Ang'), 90); fill.putEnumerated(c('Type'), c('GrdT'), c('Lnr '));
        fill.putBoolean(c('Rvrs'), false); fill.putBoolean(c('Dthr'), false); fill.putBoolean(c('Algn'), true);
        fill.putUnitDouble(c('Scl '), c('#Prc'), 100);
        grad.putString(c('Nm  '), 'Kalistar - or ombre / jaune lumineux');
        grad.putEnumerated(c('GrdF'), c('GrdF'), c('CstS')); grad.putDouble(c('Intr'), 4096);
        var colors = new ActionList();
        for (var i = 0; i < stops.length; i++) {
            var stop = new ActionDescriptor(); stop.putObject(c('Clr '), c('RGBC'), rgb(stops[i][1], stops[i][2], stops[i][3]));
            stop.putEnumerated(c('Type'), c('Clry'), c('UsrS')); stop.putInteger(c('Lctn'), stops[i][0]); stop.putInteger(c('Mdpn'), 50);
            colors.putObject(c('Clrt'), stop);
        }
        grad.putList(c('Clrs'), colors);
        var transparency = new ActionList();
        for (i = 0; i < 2; i++) { var alpha = new ActionDescriptor(); alpha.putUnitDouble(c('Opct'), c('#Prc'), 100); alpha.putInteger(c('Lctn'), i * 4096); alpha.putInteger(c('Mdpn'), 50); transparency.putObject(c('TrnS'), alpha); }
        grad.putList(c('Trns'), transparency); fill.putObject(c('Grad'), c('Grdn'), grad);
        d.putObject(c('T   '), s('gradientLayer'), fill); executeAction(c('setd'), d, DialogModes.NO);
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_07_FONDS_ATK_LISIBLES.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - or degrade et centrage optique');
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var report = { sourceHadUnsavedChanges: !source.saved, before: state(doc, []), capsules: capsules, gradientStops: stops, fills: [], icons: icons };
        for (i = 0; i < capsules.length; i++) {
            var spec = capsules[i], oldName = 'ATK D' + spec.die + ' - COEUR SOMBRE - degrade editable';
            var layer = find(doc, oldName);
            if (!layer || layer.kind !== LayerKind.GRADIENTFILL) throw Error('Degrade natif manquant : ' + oldName);
            gold(layer);
            layer.name = 'ATK D' + spec.die + ' - OR DEGRADE - fond editable';
            var ref = new ActionReference(); ref.putIdentifier(s('layer'), layer.id);
            var descriptor = executeActionGet(ref);
            report.fills.push({ id: layer.id, oldName: oldName, name: layer.name, vectorMask: descriptor.getBoolean(s('hasVectorMask')), kind: String(layer.kind) });
        }
        for (i = 0; i < icons.length; i++) {
            var spec = icons[i], layer = find(doc, spec.name);
            if (!layer) throw Error('Pictogramme manquant : ' + spec.name);
            spec.id = layer.id; spec.beforeBounds = bounds(layer);
            layer.translate(UnitValue(spec.dx, 'px'), UnitValue(spec.dy, 'px'));
            spec.afterBounds = bounds(layer);
        }
        report.after = state(doc, []);
        doc.info.caption = 'Kalistar V4 | Momo | fonds ATK or ombre vers jaune lumineux, degrades natifs | centrage optique des deux trefles et de la potion | retouches du drapeau et autres elements preserves | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_08_OR_DEGRADE_CENTRAGE.psd');
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(target, options, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true);
        report.saved = state(reopened, []);
        var f = new File(folder.fsName + '/changes.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Degrades or restaures ; trefles et potion ajustes optiquement.';
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
