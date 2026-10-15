#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/gold-alignment'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs, c = charIDToTypeID, s = stringIDToTypeID;
    var asset = { width: 1254, height: 1254, cx: 627, cy: 620, radius: 475 };
    var specs = [
        { die: 6, cx: 142, cy: 147, radius: 52, oldCx: 142, oldCy: 147, oldRadius: 52 },
        { die: 5, cx: 157.5, cy: 372.5, radius: 35.5, oldCx: 155.5, oldCy: 371.5, oldRadius: 38 },
        { die: 4, cx: 157.5, cy: 476.5, radius: 35.5, oldCx: 155.5, oldCy: 475.5, oldRadius: 38 },
        { die: 3, cx: 157.5, cy: 577.5, radius: 35.5, oldCx: 155.5, oldCy: 576.5, oldRadius: 38 },
        { die: 2, cx: 157.5, cy: 677.5, radius: 35.5, oldCx: 155.5, oldCy: 676.5, oldRadius: 38 },
        { die: 1, cx: 157.5, cy: 774.5, radius: 35.5, oldCx: 155.5, oldCy: 773.5, oldRadius: 38 }
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
            var l = parent.layers[i], entry = { id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, blend: String(l.blendMode), bounds: bounds(l) };
            if (l.typename === 'ArtLayer') {
                entry.grouped = l.grouped; entry.kind = String(l.kind);
                if (l.kind === LayerKind.TEXT) { entry.text = l.textItem.contents; try { entry.font = l.textItem.font; entry.size = l.textItem.size.as('pt'); } catch (e) {} }
            }
            list.push(entry); if (l.typename === 'LayerSet') state(l, list);
        }
        return list;
    }
    function quad(layer) {
        var a = descriptor(layer).getObjectValue(s('smartObjectMore')).getList(s('transform')), q = [];
        for (var i = 0; i < a.count; i++) q.push(a.getDouble(i)); return q;
    }
    function removeMask(layer) {
        doc.activeLayer = layer;
        var d = new ActionDescriptor(), ref = new ActionReference(); ref.putEnumerated(c('Path'), c('Path'), s('vectorMask'));
        d.putReference(c('null'), ref); executeAction(c('Dlt '), d, DialogModes.NO);
    }
    function mapTexture(layer, spec) {
        var q = quad(layer), currentWidth = Math.sqrt(Math.pow(q[2] - q[0], 2) + Math.pow(q[3] - q[1], 2));
        var scale = 100 * asset.width * spec.radius / asset.radius / currentWidth;
        layer.resize(scale, scale, AnchorPosition.MIDDLECENTER); q = quad(layer);
        var x = q[0] + (q[2] - q[0]) * asset.cx / asset.width + (q[6] - q[0]) * asset.cy / asset.height;
        var y = q[1] + (q[3] - q[1]) * asset.cx / asset.width + (q[7] - q[1]) * asset.cy / asset.height;
        layer.translate(UnitValue(spec.cx - x, 'px'), UnitValue(spec.cy - y, 'px'));
    }
    function circleMask(layer, spec) {
        var x = spec.cx, y = spec.cy, r = spec.radius, k = r * 0.5522847498307936, pt = 72 / doc.resolution;
        var coordinates = [
            [[x + r, y], [x + r, y + k], [x + r, y - k]],
            [[x, y + r], [x - k, y + r], [x + k, y + r]],
            [[x - r, y], [x - r, y - k], [x - r, y + k]],
            [[x, y - r], [x + k, y - r], [x - k, y - r]]
        ], points = [];
        for (var i = 0; i < coordinates.length; i++) {
            var p = new PathPointInfo(); p.kind = PointKind.SMOOTHPOINT;
            p.anchor = [coordinates[i][0][0] * pt, coordinates[i][0][1] * pt];
            p.leftDirection = [coordinates[i][1][0] * pt, coordinates[i][1][1] * pt];
            p.rightDirection = [coordinates[i][2][0] * pt, coordinates[i][2][1] * pt]; points.push(p);
        }
        var sub = new SubPathInfo(); sub.closed = true; sub.operation = ShapeOperation.SHAPEADD; sub.entireSubPath = points;
        var path = doc.pathItems.add('TEMP - cercle ATK D' + spec.die, [sub]);
        path.makeSelection(0, true, SelectionType.REPLACE);
        var channel = doc.channels.add(); channel.name = 'TEMP - controle masque'; doc.selection.store(channel, SelectionType.REPLACE);
        var hist = channel.histogram, area = 0; for (var h = 0; h < hist.length; h++) area += hist[h] * h / 255;
        channel.remove(); doc.activeChannels = [doc.channels[0], doc.channels[1], doc.channels[2]]; doc.selection.deselect();
        if (Math.abs(area - Math.PI * r * r) > Math.PI * r * r * 0.02) throw Error('Masque non circulaire.');
        spec.maskArea = area;
        doc.activeLayer = layer;
        var select = new ActionDescriptor(), selection = new ActionReference(); selection.putName(c('Path'), path.name); select.putReference(c('null'), selection); executeAction(c('slct'), select, DialogModes.NO);
        var d = new ActionDescriptor(), ref = new ActionReference(), at = new ActionReference(), using = new ActionReference();
        ref.putClass(c('Path')); d.putReference(c('null'), ref); at.putEnumerated(c('Path'), c('Path'), s('vectorMask')); d.putReference(c('At  '), at);
        using.putEnumerated(c('Path'), c('Ordn'), c('Trgt')); d.putReference(c('Usng'), using); executeAction(c('Mk  '), d, DialogModes.NO); path.remove();
    }
    function shade(layer) {
        doc.activeLayer = layer;
        var d = new ActionDescriptor(), ref = new ActionReference(), effects = new ActionDescriptor(), overlay = new ActionDescriptor(), black = new ActionDescriptor();
        ref.putProperty(c('Prpr'), c('Lefx')); ref.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt')); d.putReference(c('null'), ref);
        effects.putUnitDouble(c('Scl '), c('#Prc'), 100);
        black.putDouble(c('Rd  '), 0); black.putDouble(c('Grn '), 0); black.putDouble(c('Bl  '), 0);
        overlay.putBoolean(c('enab'), true); overlay.putEnumerated(c('Md  '), c('BlnM'), c('Mltp'));
        overlay.putUnitDouble(c('Opct'), c('#Prc'), 16); overlay.putObject(c('Clr '), c('RGBC'), black);
        effects.putObject(s('solidFill'), s('solidFill'), overlay);
        d.putObject(c('T   '), c('Lefx'), effects); executeAction(c('setd'), d, DialogModes.NO);
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_09_OR_GENERE_INTEGRE.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - fonds centres et or assombri'); doc.selection.deselect();
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var report = { sourceHadUnsavedChanges: !source.saved, shadePercent: 16, before: state(doc, []), capsules: specs, objects: [] };
        for (i = 0; i < specs.length; i++) {
            var spec = specs[i], layer = find(doc, 'ATK D' + spec.die + ' - OR GENERE - objet dynamique partage');
            if (!layer || layer.kind !== LayerKind.SMARTOBJECT) throw Error('Objet dynamique manquant D' + spec.die);
            if (spec.die !== 6) { removeMask(layer); mapTexture(layer, spec); circleMask(layer, spec); }
            shade(layer);
            var b = bounds(layer);
            if (b[2] - b[0] < spec.radius || b[3] - b[1] < spec.radius) throw Error('Fond masque ou vide.');
            report.objects.push({ id: layer.id, name: layer.name, kind: String(layer.kind), vectorMask: descriptor(layer).getBoolean(s('hasVectorMask')), bounds: b, transform: quad(layer) });
        }
        report.after = state(doc, []);
        doc.info.caption = 'Kalistar V4 | Momo | cinq petits fonds ATK recalibres sur l ouverture des cerclages ; six fonds or assombris de 16% via style natif reversible | chiffres, icones, bordures, eclairs, DEF et autres contenus preserves | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_10_FONDS_RECENTRES.psd');
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true; doc.saveAs(target, options, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true); doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target); reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true); report.saved = state(reopened, []);
        var f = new File(folder.fsName + '/alignment.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Fonds ATK recentres sur les ouvertures et or legerement assombri.';
    } catch (error) { return 'Retouche error line ' + error.line + ': ' + error.message; }
    finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES); if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
