#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/generated-gold'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var c = charIDToTypeID, s = stringIDToTypeID;
    var asset = { width: 1254, height: 1254, cx: 627, cy: 620, radius: 475 };
    var specs = [
        { die: 6, cx: 142, cy: 147, radius: 52, anchor: 'ATK D6 - HALO MAGIQUE' },
        { die: 5, cx: 155.5, cy: 371.5, radius: 38, anchor: 'ATK D5 - HALO MAGIQUE' },
        { die: 4, cx: 155.5, cy: 475.5, radius: 38, anchor: 'ATK D4 - effet retry' },
        { die: 3, cx: 155.5, cy: 576.5, radius: 38, anchor: 'ATK D3 - HALO MAGIQUE' },
        { die: 2, cx: 155.5, cy: 676.5, radius: 38, anchor: 'ATK D2 - effet mana' },
        { die: 1, cx: 155.5, cy: 773.5, radius: 38, anchor: 'ATK D1 - HALO MAGIQUE' }
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
    function descriptor(layer) { var ref = new ActionReference(); ref.putIdentifier(s('layer'), layer.id); return executeActionGet(ref); }
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
    function quad(layer) {
        var a = descriptor(layer).getObjectValue(s('smartObjectMore')).getList(s('transform')), q = [];
        for (var i = 0; i < a.count; i++) q.push(a.getDouble(i)); return q;
    }
    function mapTexture(layer, spec) {
        doc.activeLayer = layer;
        var q = quad(layer), currentWidth = Math.sqrt(Math.pow(q[2] - q[0], 2) + Math.pow(q[3] - q[1], 2));
        var targetWidth = asset.width * spec.radius / asset.radius, scale = 100 * targetWidth / currentWidth;
        layer.resize(scale, scale, AnchorPosition.MIDDLECENTER);
        q = quad(layer);
        var x = q[0] + (q[2] - q[0]) * asset.cx / asset.width + (q[6] - q[0]) * asset.cy / asset.height;
        var y = q[1] + (q[3] - q[1]) * asset.cx / asset.width + (q[7] - q[1]) * asset.cy / asset.height;
        layer.translate(UnitValue(spec.cx - x, 'px'), UnitValue(spec.cy - y, 'px'));
    }
    function circleMask(layer, spec) {
        var x = spec.cx, y = spec.cy, r = spec.radius, k = r * 0.5522847498307936;
        var coordinates = [
            [[x + r, y], [x + r, y - k], [x + r, y + k]],
            [[x, y + r], [x + k, y + r], [x - k, y + r]],
            [[x - r, y], [x - r, y + k], [x - r, y - k]],
            [[x, y - r], [x - k, y - r], [x + k, y - r]]
        ];
        var points = [];
        for (var i = 0; i < coordinates.length; i++) {
            var p = new PathPointInfo(); p.kind = PointKind.SMOOTHPOINT;
            // Photoshop path coordinates use points even when ruler units are pixels.
            var pt = 72 / doc.resolution;
            p.anchor = [coordinates[i][0][0] * pt, coordinates[i][0][1] * pt];
            p.leftDirection = [coordinates[i][2][0] * pt, coordinates[i][2][1] * pt];
            p.rightDirection = [coordinates[i][1][0] * pt, coordinates[i][1][1] * pt]; points.push(p);
        }
        var sub = new SubPathInfo(); sub.closed = true; sub.operation = ShapeOperation.SHAPEADD; sub.entireSubPath = points;
        var path = doc.pathItems.add('TEMP - interieur ATK D' + spec.die, [sub]);
        path.makeSelection(0, true, SelectionType.REPLACE);
        var sb = doc.selection.bounds;
        var actual = [sb[0].as('px'), sb[1].as('px'), sb[2].as('px'), sb[3].as('px')];
        var channel = doc.channels.add(); channel.name = 'TEMP - verification cercle';
        doc.selection.store(channel, SelectionType.REPLACE);
        var histogram = channel.histogram, area = 0;
        for (var h = 0; h < histogram.length; h++) area += histogram[h] * h / 255;
        channel.remove();
        doc.activeChannels = [doc.channels[0], doc.channels[1], doc.channels[2]];
        doc.selection.deselect();
        if (Math.abs(actual[0] - (x - r)) > 1 || Math.abs(actual[1] - (y - r)) > 1) throw Error('Coordonnees du trace inattendues : ' + json(actual));
        if (Math.abs(area - Math.PI * r * r) > Math.PI * r * r * 0.02) throw Error('Surface du masque non circulaire : ' + area);
        doc.activeLayer = layer;
        var select = new ActionDescriptor(), selection = new ActionReference();
        selection.putName(c('Path'), path.name); select.putReference(c('null'), selection);
        executeAction(c('slct'), select, DialogModes.NO);
        var d = new ActionDescriptor(), ref = new ActionReference(), at = new ActionReference(), using = new ActionReference();
        ref.putClass(c('Path')); d.putReference(c('null'), ref);
        at.putEnumerated(c('Path'), c('Path'), s('vectorMask')); d.putReference(c('At  '), at);
        using.putEnumerated(c('Path'), c('Ordn'), c('Trgt')); d.putReference(c('Usng'), using);
        executeAction(c('Mk  '), d, DialogModes.NO);
        path.remove();
        var result = bounds(layer);
        if (result[2] - result[0] < r || result[3] - result[1] < r) throw Error('Masque vide : ' + json(result));
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_08_OR_DEGRADE_CENTRAGE.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - matiere or generee');
        doc.selection.deselect();
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var report = { sourceHadUnsavedChanges: !source.saved, before: state(doc, []), asset: asset, capsules: specs, hidden: [], objects: [] };
        var d = new ActionDescriptor(); d.putPath(c('null'), new File(root + 'V4/propositions/ronds-generatifs-02/ROND_OR_NUANCE_BORD_SIMPLE.png'));
        d.putEnumerated(c('FTcs'), c('QCSt'), c('Qcsa')); executeAction(c('Plc '), d, DialogModes.NO);
        var master = doc.activeLayer; master.move(doc, ElementPlacement.PLACEATBEGINNING);
        doc.activeLayer = master; if (master.grouped) executeAction(c('Ungr'), undefined, DialogModes.NO);
        // Duplicate before masking so the six instances share the same embedded artwork.
        var layers = [master];
        for (i = 1; i < specs.length; i++) layers.push(master.duplicate());
        for (i = 0; i < specs.length; i++) {
            var spec = specs[i], layer = layers[i], anchor = find(doc, spec.anchor);
            if (!anchor) throw Error('Calque repere manquant : ' + spec.anchor);
            layer.name = 'ATK D' + spec.die + ' - OR GENERE - objet dynamique partage';
            mapTexture(layer, spec);
            layer.move(anchor, ElementPlacement.PLACEAFTER);
            doc.activeLayer = layer; if (layer.grouped) executeAction(c('Ungr'), undefined, DialogModes.NO);
            circleMask(layer, spec);
            var old = find(doc, 'ATK D' + spec.die + ' - OR DEGRADE - fond editable');
            if (old) { report.hidden.push(old.id); old.visible = false; }
            report.objects.push({ id: layer.id, name: layer.name, kind: String(layer.kind), vectorMask: descriptor(layer).getBoolean(s('hasVectorMask')), transform: quad(layer), bounds: bounds(layer) });
        }
        report.after = state(doc, []);
        doc.info.caption = 'Kalistar V4 | Momo | matiere or generative validee integree aux six fonds ATK | objets dynamiques partages et masques vectoriels | chiffres, icones, bordures, eclairs, DEF et retouches utilisateur preserves | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_09_OR_GENERE_INTEGRE.psd');
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(target, options, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true);
        report.saved = state(reopened, []);
        var f = new File(folder.fsName + '/integration.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Matiere or integree en six objets dynamiques masques ; source preservee.';
    } catch (error) {
        return 'Integration error line ' + error.line + ': ' + error.message;
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
