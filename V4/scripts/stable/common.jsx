var K = (function () {
    var c = charIDToTypeID, s = stringIDToTypeID;
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k; if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    function read(path) { var f = new File(path); f.encoding = 'UTF8'; if (!f.open('r')) throw Error('Lecture impossible : ' + path); var v = f.read(); f.close(); return eval('(' + v + ')'); }
    function write(path, v) { var f = new File(path); f.encoding = 'UTF8'; if (!f.open('w')) throw Error('Ecriture impossible : ' + path); f.write(json(v)); f.close(); }
    function find(p, name) { for (var i = 0; i < p.layers.length; i++) { var l = p.layers[i]; if (l.name === name) return l; if (l.typename === 'LayerSet') { var f = find(l, name); if (f) return f; } } return null; }
    function need(p, name) { var l = find(p, name); if (!l) throw Error('Calque absent : ' + name); return l; }
    function byId(p, id) { for (var i = 0; i < p.layers.length; i++) { var l = p.layers[i]; if (l.id === id) return l; if (l.typename === 'LayerSet') { var f = byId(l, id); if (f) return f; } } return null; }
    function descriptor(l) { var r = new ActionReference(); r.putIdentifier(s('layer'), l.id); return executeActionGet(r); }
    function bounds(l) { var b = l.bounds; return [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')]; }
    function ink(l) { var b = descriptor(l).getObjectValue(s('boundsNoEffects')); return [b.getUnitDoubleValue(s('left')), b.getUnitDoubleValue(s('top')), b.getUnitDoubleValue(s('right')), b.getUnitDoubleValue(s('bottom'))]; }
    function center(l, x, y) { var b = l.kind === LayerKind.TEXT ? ink(l) : bounds(l); l.translate(UnitValue(x - (b[0] + b[2]) / 2, 'px'), UnitValue(y - (b[1] + b[3]) / 2, 'px')); }
    function optical(l, layout) {
        // The anchor follows the visible motif, not the rectangular file centre.
        var visible = l.visible; app.activeDocument.activeLayer = l; l.visible = true;
        try {
            var b = bounds(l), w = b[2] - b[0], h = b[3] - b[1];
            if (Math.abs(w - layout.width) > 1 || Math.abs(h - layout.height) > 1) {
                var ratio = Math.min(layout.width / w, layout.height / h);
                l.resize(ratio * 100, ratio * 100, AnchorPosition.MIDDLECENTER);
                b = bounds(l); w = b[2] - b[0]; h = b[3] - b[1];
            }
            var dx = layout.center[0] - (b[0] + w * layout.anchor[0]);
            var dy = layout.center[1] - (b[1] + h * layout.anchor[1]);
            // Photoshop quantizes raster bounds: ignore sub-half-pixel round trips.
            if (Math.abs(dx) > 0.55 || Math.abs(dy) > 0.55) l.translate(UnitValue(Math.round(dx), 'px'), UnitValue(Math.round(dy), 'px'));
            return bounds(l);
        } catch (e) { throw Error('Calibration ' + l.name + ': ' + e); }
        finally { l.visible = visible; }
    }
    function text(l, value, x, y, maxWidth) {
        if (l.kind !== LayerKind.TEXT) throw Error('Texte non natif : ' + l.name);
        l.textItem.contents = String(value); var b = ink(l);
        if (maxWidth && b[2] - b[0] > maxWidth) throw Error('Texte trop large : ' + l.name + ' (' + (b[2] - b[0]) + ')');
        center(l, x, y);
    }
    function smart(doc, l) {
        if (l.kind === LayerKind.SMARTOBJECT) return l;
        doc.activeLayer = l; var name = l.name;
        executeAction(s('newPlacedLayer'), undefined, DialogModes.NO);
        doc.activeLayer.name = name; return doc.activeLayer;
    }
    function unclip(doc, l) { doc.activeLayer = l; if (l.grouped) executeAction(c('Ungr'), undefined, DialogModes.NO); }
    function transplant(source, l, doc, before, name) {
        app.activeDocument = source;
        var n = l.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
        app.activeDocument = doc; unclip(doc, n); n.move(before, ElementPlacement.PLACEBEFORE); n.name = name; return n;
    }
    function state(p, list, prefix) {
        if (p.typename === 'Document') app.activeDocument = p;
        for (var i = 0; i < p.layers.length; i++) {
            var l = p.layers[i], o = { id: l.id, name: l.name, path: prefix + l.name, visible: l.visible, bounds: bounds(l), opacity: l.opacity, blend: String(l.blendMode) };
            if (l.typename === 'ArtLayer') {
                o.kind = String(l.kind); o.grouped = l.grouped;
                if (l.kind === LayerKind.TEXT) { o.text = l.textItem.contents; o.ink = ink(l); try { o.font = l.textItem.font; o.sizePt = l.textItem.size.as('pt'); } catch (e) {} }
            }
            list.push(o); if (l.typename === 'LayerSet') state(l, list, prefix + l.name + '/');
        }
        return list;
    }
    function save(doc, psdPath, pngPath) {
        app.activeDocument = doc;
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(new File(psdPath), options, true);
        if (pngPath) doc.saveAs(new File(pngPath), new PNGSaveOptions(), true);
    }
    function lifecycle(run) {
        var previous = app.documents.length ? app.activeDocument : null;
        var units = app.preferences.rulerUnits, dialogs = app.displayDialogs, opened = [], working = [];
        app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
        var api = {
            open: function (path) {
                var f = new File(path);
                for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === f.fsName) return app.documents[i]; } catch (e) {}
                var d = app.open(f); opened.push(d); return d;
            },
            duplicate: function (source, name) { app.activeDocument = source; var d = source.duplicate(name); working.push(d); return d; },
            track: function (d) { working.push(d); return d; }
        };
        try { return run(api); }
        finally {
            for (var i = working.length - 1; i >= 0; i--) try { working[i].close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
            for (i = opened.length - 1; i >= 0; i--) try { opened[i].close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
            app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
            if (previous) try { app.activeDocument = previous; } catch (e) {}
        }
    }
    return { c: function (v) { return charIDToTypeID(v); }, s: function (v) { return stringIDToTypeID(v); }, read: read, write: write, find: find, need: need, byId: byId, bounds: bounds, ink: ink, center: center, optical: optical, text: text, smart: smart, unclip: unclip, transplant: transplant, state: state, save: save, lifecycle: lifecycle };
})();
