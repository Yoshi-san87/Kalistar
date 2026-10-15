#target photoshop

app.displayDialogs = DialogModes.NO;

if (typeof LayerColor === "undefined") {
    var LayerColor = {
        RED: null,
        ORANGE: null,
        YELLOW: null,
        GREEN: null,
        BLUE: null,
        VIOLET: null,
        GRAY: null
    };
}

var srcPath = "C:/Users/guill/Documents/Doc/GP/Cartes/Kalistar/Templates/Template_Kalistar_Card_TENEBRE.psd";
var dstPath = "C:/Users/guill/Documents/Doc/GP/Cartes/Kalistar/Templates/Template_Kalistar_Card_PROPRE.psd";

function px(v) {
    try { return Math.round(v.as("px")); } catch (e) { return 0; }
}

function bounds(layer) {
    try {
        var b = layer.bounds;
        return { left: px(b[0]), top: px(b[1]), right: px(b[2]), bottom: px(b[3]) };
    } catch (e) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
    }
}

function allLayers(container, out) {
    for (var i = 0; i < container.layers.length; i++) {
        var layer = container.layers[i];
        out.push(layer);
        if (layer.typename === "LayerSet") {
            allLayers(layer, out);
        }
    }
    return out;
}

function findFirstByName(container, name) {
    var list = allLayers(container, []);
    for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) return list[i];
    }
    return null;
}

function findAllByName(container, name) {
    var list = allLayers(container, []);
    var out = [];
    for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) out.push(list[i]);
    }
    return out;
}

function findTextByContents(container, text) {
    var list = allLayers(container, []);
    for (var i = 0; i < list.length; i++) {
        var layer = list[i];
        try {
            if (layer.typename === "ArtLayer" && layer.kind === LayerKind.TEXT && layer.textItem.contents === text) {
                return layer;
            }
        } catch (e) {}
    }
    return null;
}

function findTextByContentsWhere(container, text, predicate) {
    var list = allLayers(container, []);
    for (var i = 0; i < list.length; i++) {
        var layer = list[i];
        try {
            if (layer.typename === "ArtLayer" && layer.kind === LayerKind.TEXT && layer.textItem.contents === text) {
                if (predicate(layer, bounds(layer))) return layer;
            }
        } catch (e) {}
    }
    return null;
}

function renameExact(container, oldName, newName, labelColor) {
    var layer = findFirstByName(container, oldName);
    if (layer) renameLayer(layer, newName, labelColor);
    return layer;
}

function renameLayer(layer, newName, labelColor) {
    try { layer.name = newName; } catch (e) {}
    try { if (labelColor) layer.color = labelColor; } catch (e2) {}
}

function isTextLayer(layer) {
    try { return layer.typename === "ArtLayer" && layer.kind === LayerKind.TEXT; } catch (e) { return false; }
}

function isSmartObject(layer) {
    try { return layer.typename === "ArtLayer" && layer.kind === LayerKind.SMARTOBJECT; } catch (e) { return false; }
}

function isSolidFill(layer) {
    try { return layer.typename === "ArtLayer" && layer.kind === LayerKind.SOLIDFILL; } catch (e) { return false; }
}

function renameBubbleStats(group, prefix) {
    if (!group || group.typename !== "LayerSet") return;

    var bubbles = [];
    for (var i = 0; i < group.layers.length; i++) {
        var child = group.layers[i];
        if (child.typename === "LayerSet") {
            var b = bounds(child);
            bubbles.push({ layer: child, top: b.top });
        }
    }
    bubbles.sort(function(a, b) { return a.top - b.top; });

    for (var j = 0; j < bubbles.length; j++) {
        var pos = j + 1;
        var bubble = bubbles[j].layer;
        renameLayer(bubble, prefix + "__POS_" + pos + "__bulle", LayerColor.YELLOW);

        for (var k = 0; k < bubble.layers.length; k++) {
            var l = bubble.layers[k];
            if (isTextLayer(l)) {
                renameLayer(l, "EDIT__" + prefix + "__POS_" + pos + "__VALEUR", LayerColor.RED);
            } else if (isSmartObject(l)) {
                renameLayer(l, "EDIT__" + prefix + "__POS_" + pos + "__ICONE_ELEMENT", LayerColor.ORANGE);
            }
        }
    }
}

function createReadmeGroup(doc) {
    var group = doc.layerSets.add();
    group.name = "00__README__MODE_D_EMPLOI";
    group.visible = false;
    try { group.color = LayerColor.VIOLET; } catch (e) {}

    var t = group.artLayers.add();
    t.kind = LayerKind.TEXT;
    t.name = "README__champs_a_modifier";
    t.textItem.size = 22;
    t.textItem.position = [65, 95];
    t.textItem.contents =
        "KALISTAR CARD TEMPLATE - MODE D'EMPLOI\n" +
        "1. Modifie surtout les calques qui commencent par EDIT__.\n" +
        "2. Nom, titre, description, stats ATK/DEF et bonus sont des calques texte.\n" +
        "3. Arme, race, tribu/drapeau, personnage et crystal sont des smart objects ou options visibles/cachees.\n" +
        "4. Pour creer une nouvelle carte: duplique ce PSD, change les textes, remplace les smart objects utiles, puis ajuste la couleur du cadre selon rarete/contexte.\n" +
        "5. Les calques BASE__ et ARCHIVE__ servent de support; evite de les modifier sauf besoin graphique.";
    try { t.color = LayerColor.VIOLET; } catch (e2) {}
    return group;
}

function makeRgb(r, g, b) {
    var c = new SolidColor();
    c.rgb.red = r;
    c.rgb.green = g;
    c.rgb.blue = b;
    return c;
}

function createBorderOption(doc, group, name, color, visible, opacity) {
    doc.activeLayer = group;
    var layer = group.artLayers.add();
    layer.name = name;
    layer.visible = true;
    doc.activeLayer = layer;
    try { layer.opacity = opacity; } catch (opacityError) {}
    try { layer.blendMode = BlendMode.OVERLAY; } catch (e) {}
    try { layer.color = LayerColor.GREEN; } catch (e2) {}

    doc.selection.select([[40, 40], [857, 40], [857, 1457], [40, 1457]]);
    doc.selection.fill(color, ColorBlendMode.NORMAL, 100, false);
    doc.selection.select([[74, 80], [823, 80], [823, 1422], [74, 1422]]);
    doc.selection.clear();
    doc.selection.deselect();
    layer.visible = visible;
    return layer;
}

function createFrameColorGroup(doc) {
    var group = doc.layerSets.add();
    group.name = "01__EDIT__CADRE_COULEUR_RARETE__options_cachees";
    group.visible = true;
    try { group.color = LayerColor.GREEN; } catch (e) {}

    createBorderOption(doc, group, "EDIT__CADRE_RARETE_COMMUNE__argent", makeRgb(192, 200, 210), false, 55);
    createBorderOption(doc, group, "EDIT__CADRE_RARETE_RARE__bleu", makeRgb(70, 140, 255), false, 55);
    createBorderOption(doc, group, "EDIT__CADRE_RARETE_EPIQUE__violet", makeRgb(150, 78, 255), false, 55);
    createBorderOption(doc, group, "EDIT__CADRE_RARETE_LEGENDAIRE__or", makeRgb(255, 190, 65), false, 55);
    createBorderOption(doc, group, "EDIT__CADRE_CONTEXTE_TENEBRE__violet_noir", makeRgb(95, 40, 140), false, 50);
    group.visible = false;
    return group;
}

function renameFooterText(doc) {
    var assassin = findTextByContents(doc, "Assassin");
    if (assassin) renameLayer(assassin, "EDIT__RACE_NOM__texte_bas_gauche", LayerColor.RED);

    var skullzTexts = findAllByName(doc, "SKULLZ");
    for (var i = 0; i < skullzTexts.length; i++) {
        var l = skullzTexts[i];
        if (isTextLayer(l)) renameLayer(l, "EDIT__TRIBU_NOM__texte_bas_droit", LayerColor.RED);
        if (isSolidFill(l)) renameLayer(l, "EDIT__RACE_ROND_DROIT__icone_SKULLZ", LayerColor.ORANGE);
    }

    var elf = findFirstByName(doc, "Elf");
    if (elf && isSolidFill(elf)) renameLayer(elf, "OPTION__RACE_ROND_DROIT__icone_ELF_cache", LayerColor.ORANGE);

    var draxLayers = findAllByName(doc, "Drax");
    for (var d = 0; d < draxLayers.length; d++) {
        if (isSolidFill(draxLayers[d])) renameLayer(draxLayers[d], "OPTION__RACE_ROND_DROIT__icone_DRAX_cache", LayerColor.ORANGE);
    }
}

function renameCadreChildren(cadre) {
    if (!cadre || cadre.typename !== "LayerSet") return;
    renameLayer(cadre, "BASE__CADRE_GENERAL__couleur_rarete_contexte", LayerColor.BLUE);

    var all = allLayers(cadre, []);
    var characterOption = 1;
    for (var i = 0; i < all.length; i++) {
        var l = all[i];
        if (l.name === "Banniere SKULLZ") renameLayer(l, "EDIT__TRIBU_DRAPEAU__SKULLZ_VISIBLE", LayerColor.ORANGE);
        else if (l.name === "Banniere Falco") renameLayer(l, "OPTION__TRIBU_DRAPEAU__FALCO_cache", LayerColor.ORANGE);
        else if (l.name === "Banniere Draks") renameLayer(l, "OPTION__TRIBU_DRAPEAU__DRAKS_cache", LayerColor.ORANGE);
        else if (l.name === "barcode") renameLayer(l, "EDIT__BARCODE_ID__image_code", LayerColor.RED);
        else if (l.name === "Calque 22") renameLayer(l, "BASE__BARCODE_ID__support", LayerColor.BLUE);
        else if (l.name === "Rectangle 1") renameLayer(l, "EDIT__CADRE_COULEUR_EXTERIEURE__base", LayerColor.GREEN);
        else if (l.name === "Rectangle 2") renameLayer(l, "EDIT__FOND_CARTE__couleur_interieure", LayerColor.GREEN);
        else if (l.name === "Calque 10") renameLayer(l, "BASE__CADRE_PRINCIPAL_VISIBLE", LayerColor.BLUE);
        else if (l.name === "Ellipse 1") renameLayer(l, "BASE__ROND_GAUCHE_ARME__cadre", LayerColor.BLUE);
        else if (l.name === "Ellipse 1 copie") renameLayer(l, "BASE__ROND_DROIT_RACE__cadre", LayerColor.BLUE);
        else if (l.name.indexOf("yoshisan78_Full_length_image_of_skull_Pirate") === 0) {
            renameLayer(l, "EDIT__IMAGE_PERSONNAGE__actuelle_smart_object", LayerColor.ORANGE);
        } else if (
            l.name.indexOf("yoshisan78_Full_length_image_of_Skull_women") === 0 ||
            l.name.indexOf("DALL") === 0 ||
            l.name === "Van Long"
        ) {
            renameLayer(l, "OPTION__IMAGE_PERSONNAGE__source_" + characterOption + "_cache", LayerColor.ORANGE);
            characterOption++;
        }
    }
}

function startsWith(text, prefix) {
    return text.substr(0, prefix.length) === prefix;
}

function enforceTemplateVisibility(doc) {
    var list = allLayers(doc, []);
    for (var i = 0; i < list.length; i++) {
        var layer = list[i];
        var name = layer.name;
        if (
            startsWith(name, "OPTION__") ||
            startsWith(name, "ARCHIVE__") ||
            startsWith(name, "00__README") ||
            startsWith(name, "01__EDIT__CADRE_COULEUR_RARETE") ||
            name.indexOf("_cache") !== -1
        ) {
            try { layer.visible = false; } catch (e) {}
        }
    }
}

var src = new File(srcPath);
if (!src.exists) throw new Error("PSD introuvable: " + srcPath);

var doc = app.open(src);

createReadmeGroup(doc);
createFrameColorGroup(doc);

renameExact(doc, "Capitaine SKULLY", "EDIT__NOM_PERSONNAGE__haut", LayerColor.RED);
renameExact(doc, "Tueuse redoutable", "EDIT__TITRE_CARTE__sous_crystal", LayerColor.RED);
renameExact(doc, "+30 LUMIERE", "EDIT__BONUS_ATK__texte", LayerColor.RED);
renameExact(doc, "-30 SANG", "EDIT__MALUS_DEF__texte", LayerColor.RED);
renameExact(doc, "291", "EDIT__ATTAQUE_GLOBALE__haut_gauche", LayerColor.RED);
var defGlobal = findTextByContentsWhere(doc, "123", function(layer, b) { return b.left > 650 && b.top < 250; });
if (defGlobal) renameLayer(defGlobal, "EDIT__DEFENSE_GLOBALE__haut_droit_cache", LayerColor.RED);
renameExact(doc, "A T K", "BASE__LIBELLE_ATK", LayerColor.BLUE);
renameExact(doc, "DEF", "BASE__LIBELLE_DEF", LayerColor.BLUE);

var descGroup = renameExact(doc, "BOTTOM TXT COMPONENT 1", "EDIT__DESCRIPTION__groupe_texte", LayerColor.RED);
if (descGroup && descGroup.typename === "LayerSet") {
    for (var d = 0; d < descGroup.layers.length; d++) {
        if (isTextLayer(descGroup.layers[d])) renameLayer(descGroup.layers[d], "EDIT__DESCRIPTION__texte", LayerColor.RED);
    }
}

renameExact(doc, "FFBE_Whip_Icon", "EDIT__ARME_ROND_GAUCHE__icone_actuelle", LayerColor.ORANGE);
renameExact(doc, "FFBE_Staff_Icon", "OPTION__ARME_ROND_GAUCHE__staff_cache", LayerColor.ORANGE);
renameExact(doc, "ARC", "OPTION__ARME_ROND_GAUCHE__arc_cache", LayerColor.ORANGE);
renameExact(doc, "ARC copie", "OPTION__ARME_ROND_GAUCHE__arc_top_cache", LayerColor.ORANGE);
renameExact(doc, "Epee longue", "OPTION__ARME_ROND_GAUCHE__epee_longue_cache", LayerColor.ORANGE);
renameExact(doc, "Backwards_Dodge_HD_Icon copie", "EDIT__DEFENSE_ICONE__haut_droit", LayerColor.ORANGE);

var left = findFirstByName(doc, "Left bubble");
if (left) {
    renameLayer(left, "EDIT__STATS_ATTAQUE_GAUCHE__POSITIONS_1_A_5", LayerColor.YELLOW);
    renameBubbleStats(left, "ATK_GAUCHE");
}

var right = findFirstByName(doc, "Right bubble");
if (right) {
    renameLayer(right, "EDIT__STATS_DEFENSE_DROITE__POSITIONS_1_A_5", LayerColor.YELLOW);
    renameBubbleStats(right, "DEF_DROITE");
}

var crystals = renameExact(doc, "CRYSTALS", "EDIT__CRYSTAL_CENTRAL__groupe", LayerColor.ORANGE);
if (crystals && crystals.typename === "LayerSet") {
    for (var c = 0; c < crystals.layers.length; c++) {
        if (crystals.layers[c].name === "CRYSTAL TENEBRE") {
            renameLayer(crystals.layers[c], "EDIT__CRYSTAL_CENTRAL__TENEBRE_image", LayerColor.ORANGE);
        } else {
            renameLayer(crystals.layers[c], "BASE__CRYSTAL_CENTRAL__support_lumiere", LayerColor.BLUE);
        }
    }
}

renameExact(doc, "card1", "EDIT__POSITION_BOARD_CARD__actuelle", LayerColor.YELLOW);
renameExact(doc, "card2", "OPTION__POSITION_BOARD_CARD__cachee", LayerColor.YELLOW);

renameFooterText(doc);
renameCadreChildren(findFirstByName(doc, "Cadre"));

var finalPreviews = findAllByName(doc, "HiddenLayerWhenFinished");
for (var fp = 0; fp < finalPreviews.length; fp++) renameLayer(finalPreviews[fp], "ARCHIVE__APERCU_FINAL_ORIGINAL", LayerColor.GRAY);
var finalPreviewCopies = findAllByName(doc, "HiddenLayerWhenFinished copie");
for (var fpc = 0; fpc < finalPreviewCopies.length; fpc++) renameLayer(finalPreviewCopies[fpc], "ARCHIVE__APERCU_FINAL_ORIGINAL_cache", LayerColor.GRAY);
var oldGroups = findAllByName(doc, "old");
for (var og = 0; og < oldGroups.length; og++) renameLayer(oldGroups[og], "ARCHIVE__anciens_elements_cache", LayerColor.GRAY);

enforceTemplateVisibility(doc);

var opts = new PhotoshopSaveOptions();
opts.layers = true;
opts.embedColorProfile = true;
opts.maximizeCompatibility = true;

var dst = new File(dstPath);
doc.saveAs(dst, opts, true, Extension.LOWERCASE);
doc.close(SaveOptions.DONOTSAVECHANGES);
