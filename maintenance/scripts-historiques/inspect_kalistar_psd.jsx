#target photoshop

app.displayDialogs = DialogModes.NO;

var psdPath = "C:/Users/guill/Documents/Doc/GP/Cartes/Kalistar/Templates/Template_Kalistar_Card_TENEBRE.psd";
var outPath = "C:/Users/guill/Documents/Doc/GP/Cartes/Kalistar/Templates/Template_Kalistar_Card_TENEBRE_layers.txt";

function layerKindName(layer) {
    try {
        if (layer.typename === "LayerSet") {
            return "group";
        }
        switch (layer.kind) {
            case LayerKind.TEXT: return "text";
            case LayerKind.SOLIDFILL: return "solid-fill";
            case LayerKind.GRADIENTFILL: return "gradient-fill";
            case LayerKind.PATTERNFILL: return "pattern-fill";
            case LayerKind.SMARTOBJECT: return "smart-object";
            case LayerKind.NORMAL: return "normal";
            default: return String(layer.kind);
        }
    } catch (e) {
        return "unknown";
    }
}

function boundsText(layer) {
    try {
        var b = layer.bounds;
        return [
            Math.round(b[0].as("px")),
            Math.round(b[1].as("px")),
            Math.round(b[2].as("px")),
            Math.round(b[3].as("px"))
        ].join(",");
    } catch (e) {
        return "";
    }
}

function walk(container, depth, lines) {
    for (var i = 0; i < container.layers.length; i++) {
        var layer = container.layers[i];
        var indent = new Array(depth + 1).join("  ");
        var flags = [];
        if (!layer.visible) flags.push("hidden");
        if (layer.allLocked) flags.push("locked");
        lines.push(indent + "- " + layer.name + " [" + layer.typename + "/" + layerKindName(layer) + "] bounds=" + boundsText(layer) + (flags.length ? " flags=" + flags.join(",") : ""));
        if (layer.typename === "LayerSet") {
            walk(layer, depth + 1, lines);
        }
    }
}

var file = new File(psdPath);
if (!file.exists) {
    throw new Error("PSD introuvable: " + psdPath);
}

var doc = app.open(file);
var lines = [];
lines.push("Document: " + doc.name);
lines.push("Size: " + doc.width.as("px") + " x " + doc.height.as("px") + " px");
lines.push("Resolution: " + doc.resolution);
lines.push("Mode: " + doc.mode);
lines.push("");
walk(doc, 0, lines);

var out = new File(outPath);
out.encoding = "UTF8";
out.open("w");
out.write(lines.join("\n"));
out.close();

doc.close(SaveOptions.DONOTSAVECHANGES);
