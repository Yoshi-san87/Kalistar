#target photoshop

app.displayDialogs = DialogModes.NO;

var psdPath = "C:/Users/guill/Documents/Doc/GP/Cartes/Kalistar/Templates/Template_Kalistar_Card_PROPRE.psd";
var pngPath = "C:/Users/guill/Documents/Doc/GP/Cartes/Kalistar/Templates/Template_Kalistar_Card_PROPRE_preview.png";

var doc = app.open(new File(psdPath));
var out = new File(pngPath);
var opts = new ExportOptionsSaveForWeb();
opts.format = SaveDocumentType.PNG;
opts.PNG8 = false;
opts.transparency = true;
opts.interlaced = false;
opts.quality = 100;
doc.exportDocument(out, ExportType.SAVEFORWEB, opts);
doc.close(SaveOptions.DONOTSAVECHANGES);
