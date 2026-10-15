#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var previous = app.documents.length ? app.activeDocument : null, units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    var doc = null, opened = false;
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k;
        if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_BASE_V3_BAS_V4.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) doc = app.documents[i]; } catch (e) {}
        if (!doc) { doc = app.open(file); opened = true; }
        var report = { width: Math.round(doc.width.as('px')), height: Math.round(doc.height.as('px')), ppi: doc.resolution, profile: doc.colorProfileName, roots: [], nativeTexts: [], objects: [] };
        function walk(parent, prefix) {
            for (var i = 0; i < parent.layers.length; i++) {
                var l = parent.layers[i], path = prefix + l.name;
                if (l.typename === 'LayerSet') walk(l, path + '/');
                else if (l.kind === LayerKind.TEXT && prefix.indexOf('20 BLOC INFERIEUR V4') === 0) {
                    var b = l.bounds;
                    report.nativeTexts.push({ name: l.name, text: l.textItem.contents, font: l.textItem.font, sizePt: l.textItem.size.as('pt'), bounds: [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')] });
                } else if (l.kind === LayerKind.SMARTOBJECT && prefix.indexOf('20 BLOC INFERIEUR V4') === 0) {
                    var ref = new ActionReference(); ref.putIdentifier(stringIDToTypeID('layer'), l.id);
                    var info = executeActionGet(ref).getObjectValue(stringIDToTypeID('smartObjectMore')).getList(stringIDToTypeID('transform'));
                    var quad = []; for (var j = 0; j < info.count; j++) quad.push(info.getDouble(j));
                    report.objects.push({ name: l.name, transform: quad });
                }
            }
        }
        for (i = 0; i < doc.layers.length; i++) report.roots.push(doc.layers[i].name);
        walk(doc, '');
        if (report.width !== 897 || report.height !== 1497 || report.nativeTexts.length !== 4 || report.objects.length !== 5) throw Error('Structure du PSD inattendue.');
        doc.saveAs(new File(root + 'V4/momo-bottom/reopened-photoshop.png'), new PNGSaveOptions(), true);
        var f = new File(root + 'V4/momo-bottom/psd-inspection.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'PSD relu : 897 x 1497 px, ' + report.ppi + ' ppp ; 4 textes natifs et 5 objets dynamiques dans le bas V4.';
    } finally {
        if (doc && opened) doc.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
