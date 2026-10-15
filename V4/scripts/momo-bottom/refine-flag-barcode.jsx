#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = root + 'V4/momo-bottom/flag-barcode/';
    var outputName = 'MOMO_V4_03_DRAPEAU_CODE_COULEUR';
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i]; if (l.name === name) return l;
            if (l.typename === 'LayerSet') { var match = find(l, name); if (match) return match; }
        }
        return null;
    }
    function bounds(l) { var b = l.bounds; return [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')]; }
    function color(hex) { var c = new SolidColor(); c.rgb.hexValue = hex; return c; }
    function channel(id) {
        var d = new ActionDescriptor(), ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID(id));
        d.putReference(charIDToTypeID('null'), ref); executeAction(charIDToTypeID('slct'), d, DialogModes.NO);
    }
    function protectRightEdge(group) {
        doc.activeLayer = group; channel('Msk ');
        doc.selection.selectAll(); doc.selection.fill(color('000000'));
        doc.selection.select([[0, 829], [776, 829], [776, 1068], [0, 1068]], SelectionType.REPLACE, 0, false);
        doc.selection.fill(color('FFFFFF')); doc.selection.deselect(); channel('RGB ');
    }
    function restoreAttachmentShadow(layer) {
        layer.visible = true; doc.activeLayer = layer;
        doc.selection.select([[0, 0], [897, 0], [897, 848], [0, 848]], SelectionType.REPLACE, 8, false);
        var d = new ActionDescriptor(), ref = new ActionReference();
        d.putClass(charIDToTypeID('Nw  '), charIDToTypeID('Chnl'));
        ref.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID('Msk '));
        d.putReference(charIDToTypeID('At  '), ref);
        d.putEnumerated(charIDToTypeID('Usng'), charIDToTypeID('UsrM'), charIDToTypeID('RvlS'));
        executeAction(charIDToTypeID('Mk  '), d, DialogModes.NO);
        doc.selection.deselect(); channel('RGB ');
    }
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        if (typeof v !== 'object') return String(v);
        var a = [], k;
        if (v instanceof Array) { for (k = 0; k < v.length; k++) a.push(json(v[k])); return '[' + a.join(',') + ']'; }
        for (k in v) a.push(json(k) + ':' + json(v[k])); return '{' + a.join(',') + '}';
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_02_POSITIONS_DRAPEAU.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - finition drapeau et code couleur');
        doc.saveAs(new File(folder + 'before-photoshop.png'), new PNGSaveOptions(), true);
        var fabric = find(doc, 'FACTION - Chroma - tissu source agrandi');
        var fabricShadow = find(doc, 'OMBRE - detachement du tissu');
        var faction = find(doc, '15 FACTION - drapeau sous la barre DEF');
        var oldShadow = find(doc, 'FACTION - Chroma - ombre portee');
        if (!fabric || !fabricShadow || !faction || !oldShadow) throw Error('Les calques du drapeau sont incomplets.');
        var report = { beforeFabric: bounds(fabric), flagTranslation: [-8, 0], protectedRightEdge: 776, barcodeIdentity: '30000001' };
        fabric.translate(-8, 0); fabricShadow.translate(-8, 0);
        protectRightEdge(faction);
        restoreAttachmentShadow(oldShadow);
        report.afterFabric = bounds(fabric); report.originalAttachmentShadowRestored = oldShadow.visible;
        report.attachmentShadowOpacity = oldShadow.opacity;

        // Independent multiply tint: the original Code128 object and its modules stay untouched.
        var upper = find(doc, '10 V3 ORIGINALE - haut conserve, bas masque');
        doc.activeLayer = find(doc, '00 MARGE IMPRESSION - noir');
        var barcodeGroup = doc.layerSets.add(); barcodeGroup.name = '16 CODE-BARRES - spectre independant de l ID';
        barcodeGroup.move(upper, ElementPlacement.PLACEBEFORE); doc.activeLayer = barcodeGroup;
        var place = new ActionDescriptor(); place.putPath(charIDToTypeID('null'), new File(folder + 'barcode-spectrum.png'));
        executeAction(charIDToTypeID('Plc '), place, DialogModes.NO);
        var tint = doc.activeLayer; tint.name = 'DEGRADE - cyan violet rose dore'; tint.move(barcodeGroup, ElementPlacement.INSIDE);
        var b = bounds(tint); tint.resize(22 / (b[2] - b[0]) * 100, 210 / (b[3] - b[1]) * 100, AnchorPosition.TOPLEFT);
        b = bounds(tint); tint.translate(132 - b[0], 848 - b[1]); tint.blendMode = BlendMode.MULTIPLY;
        report.tintBounds = bounds(tint); report.tintBlendMode = String(tint.blendMode);
        report.positions = bounds(find(doc, '03 POSITIONS AUTORISEES - P1 a P5'));
        report.canvas = [Math.round(doc.width.as('px')), Math.round(doc.height.as('px'))];
        doc.info.caption = 'Kalistar V4 | Momo | drapeau rentre de 8 px, ombre d attache originale restauree, montant droit protege | Code128 30000001 : trace original, teinte spectrale separee | positions et autres elements inchanges | 897 x 1497 px, 300 ppp, sRGB.';
        var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
        var target = new File(root + 'V4/templates/' + outputName + '.psd');
        doc.saveAs(target, psd, true);
        doc.saveAs(new File(folder + 'after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        reopened.saveAs(new File(folder + 'reopened-photoshop.png'), new PNGSaveOptions(), true);
        var f = new File(folder + 'assembly.json'); f.encoding = 'UTF8'; f.open('w'); f.write(json(report)); f.close();
        return 'Momo : drapeau rentre, ombre d origine restauree, code-barres en couleur. ' + outputName + '.psd';
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
