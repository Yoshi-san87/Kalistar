#target photoshop
(function () {
    var root = File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g, '/') + '/';
    var folder = new Folder(root + 'V4/momo-bottom/attachment-shadow'); if (!folder.exists) folder.create();
    var previous = app.documents.length ? app.activeDocument : null, source = null, doc = null, reopened = null, opened = false;
    var units = app.preferences.rulerUnits, dialogs = app.displayDialogs;
    app.preferences.rulerUnits = Units.PIXELS; app.displayDialogs = DialogModes.NO;
    function find(parent, name) {
        for (var i = 0; i < parent.layers.length; i++) {
            var l = parent.layers[i]; if (l.name === name) return l;
            if (l.typename === 'LayerSet') { var result = find(l, name); if (result) return result; }
        }
        return null;
    }
    function rgbChannel() {
        var d = new ActionDescriptor(), ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID('RGB '));
        d.putReference(charIDToTypeID('null'), ref); executeAction(charIDToTypeID('slct'), d, DialogModes.NO);
    }
    try {
        var file = new File(root + 'V4/templates/MOMO_V4_03_DRAPEAU_CODE_COULEUR.psd');
        for (var i = 0; i < app.documents.length; i++) try { if (app.documents[i].fullName.fsName === file.fsName) source = app.documents[i]; } catch (e) {}
        if (!source) { source = app.open(file); opened = true; }
        doc = source.duplicate('MOMO - ombre de contact de l attache');
        doc.saveAs(new File(folder.fsName + '/before-photoshop.png'), new PNGSaveOptions(), true);
        var fabric = find(doc, 'FACTION - Chroma - tissu source agrandi');
        if (!fabric) throw Error('Tissu du drapeau introuvable.');
        doc.activeLayer = fabric; rgbChannel();
        var shadow = doc.artLayers.add(); shadow.name = 'OMBRE CONTACT - barre DEF sur le tissu';
        shadow.move(fabric, ElementPlacement.PLACEBEFORE);
        doc.activeLayer = shadow;
        var color = new SolidColor(); color.rgb.hexValue = '030A10';
        // The bar casts onto the fabric, so this shadow belongs above the cloth.
        doc.selection.select([[675, 825], [777, 825], [777, 833], [675, 833]], SelectionType.REPLACE, 0, false);
        doc.selection.fill(color); doc.selection.deselect();
        shadow.applyGaussianBlur(3.4); shadow.blendMode = BlendMode.MULTIPLY; shadow.opacity = 72;
        if (shadow.parent.name !== '15 FACTION - drapeau sous la barre DEF') throw Error('L ombre doit rester dans le masque de protection du drapeau.');
        doc.info.caption = 'Kalistar V4 | Momo | ombre de contact ajoutee au-dessus du tissu, sous la barre DEF ; opacite 72 %, flou 3.4 px ; masque du rebord conserve | aucune autre modification | 897 x 1497 px, 300 ppp, sRGB.';
        var target = new File(root + 'V4/templates/MOMO_V4_04_OMBRE_ATTACHE.psd');
        var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
        doc.saveAs(target, psd, true);
        doc.saveAs(new File(folder.fsName + '/after-photoshop.png'), new PNGSaveOptions(), true);
        doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
        reopened = app.open(target);
        var savedShadow = find(reopened, 'OMBRE CONTACT - barre DEF sur le tissu');
        if (!savedShadow || !savedShadow.visible) throw Error('Ombre absente du PSD enregistre.');
        reopened.saveAs(new File(folder.fsName + '/reopened-photoshop.png'), new PNGSaveOptions(), true);
        return 'Ombre de contact visible ajoutee sur son calque separe, dans le masque du drapeau. MOMO_V4_04_OMBRE_ATTACHE.psd';
    } finally {
        if (reopened) reopened.close(SaveOptions.DONOTSAVECHANGES);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        if (source && opened) source.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = units; app.displayDialogs = dialogs;
        if (previous) try { app.activeDocument = previous; } catch (e) {}
    }
})();
