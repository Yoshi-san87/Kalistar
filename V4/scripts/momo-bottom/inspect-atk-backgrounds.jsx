#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/atk-backgrounds'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k; if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_06_CONTRASTE_ATK.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - inspection des fonds');
        var report = { sourceSaved: source.saved, width: Math.round(doc.width.as('px')), height: Math.round(doc.height.as('px')), ppi: doc.resolution, profile: doc.colorProfileName, layers: [] };
        function walk(parent, prefix, inherited) {
            for (var i = 0; i < parent.layers.length; i++) {
                var l = parent.layers[i], b = l.bounds, ref = new ActionReference();
                ref.putIdentifier(stringIDToTypeID('layer'), l.id);
                var d = executeActionGet(ref);
                var entry = { path: prefix + l.name, id: l.id, type: l.typename, visible: l.visible, effective: inherited && l.visible,
                    bounds: [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')], opacity: l.opacity, blend: String(l.blendMode) };
                if (l.typename === 'ArtLayer') { entry.kind = String(l.kind); entry.grouped = l.grouped; }
                if (l.typename === 'ArtLayer' && l.kind === LayerKind.TEXT) { entry.text = l.textItem.contents; try { entry.font = l.textItem.font; } catch (e) { entry.font = 'mixed'; } }
                report.layers.push(entry);
                if (entry.effective && /ATK|LECTR|capsule|fond/i.test(entry.path)) {
                    var f = new File(folder.fsName + '/layer-' + l.id + '.txt'); f.encoding = 'UTF8'; f.open('w'); f.write(d.toStream()); f.close();
                }
                if (l.typename === 'LayerSet') walk(l, entry.path + '/', entry.effective);
            }
        }
        walk(doc, '', true);
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var f = new File(folder.fsName + '/source-layers.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Inspection du PSD modifie : ' + report.layers.length + ' calques.';
    } catch (error) {
        return 'Inspection error line ' + error.line + ': ' + error.message;
    } finally {
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
