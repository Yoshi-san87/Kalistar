#target photoshop
(function(){
 var R='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/';
 var old=app.displayDialogs,u=app.preferences.rulerUnits;app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;
 $.evalFile(new File(R+'V3/scripts/version_band.jsx'));
 var source=app.open(new File(R+'V2/templates/01_ELECTRO_MOMO.psd'));
 var d=source.duplicate('V3_MOMO_GABARIT');
 var title='ROBOT ARTISTE MAGIQUE',icons=[];
 function visit(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.name=='TITRE DE VERSION'){title=l.textItem.contents;l.visible=false;}if(l.name.indexOf('ARME - ')==0||l.name.indexOf('PICTOGRAMME RACE')==0)icons.push(l);if(l.typename=='LayerSet')visit(l);}}
 visit(d);var g=d.layerSets.add();g.name='V3 BANDE DE VERSION - editable';kalistarVersionBand(d,title,g);
 for(var j=0;j<icons.length;j++)icons[j].duplicate().move(g,ElementPlacement.PLACEBEFORE);
 d.saveAs(new File(R+'V3/templates/PROTOTYPE_MOMO.psd'),new PhotoshopSaveOptions(),true);
 var flat=d.duplicate('V3_GABARIT_APERCU',true);flat.changeMode(ChangeMode.RGB);flat.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
 flat.saveAs(new File(R+'V3/verification/prototype-momo.png'),new PNGSaveOptions(),true);flat.close(SaveOptions.DONOTSAVECHANGES);d.close(SaveOptions.DONOTSAVECHANGES);
 app.displayDialogs=old;app.preferences.rulerUnits=u;return 'Prototype V3 exported';
})();
