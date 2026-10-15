#target photoshop
(function () {
 var ROOT='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V3/';
 var oldDialogs=app.displayDialogs,oldUnits=app.preferences.rulerUnits,count=0;
 app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;
 function read(name){var f=new File(ROOT+name);f.encoding='UTF8';f.open('r');var s=f.read();f.close();if(/_layers\.txt$/.test(name))s=s.replace(/\r\n|\r|\n/g,'\\n');return eval('('+s+')');}
 function write(name,s){var f=new File(ROOT+name);f.encoding='UTF8';f.open('w');f.write(s);f.close();}
 function find(parent,name){for(var i=0;i<parent.layers.length;i++){var l=parent.layers[i];if(l.name==name)return l;if(l.typename=='LayerSet'){var found=find(l,name);if(found)return found;}}return null;}
 function fit(layer,value){layer.textItem.contents=value;for(var i=0;i<30&&layer.bounds[2].as('px')-layer.bounds[0].as('px')>240;i++)layer.textItem.size=UnitValue(layer.textItem.size.as('pt')*.96,'pt');}
 var cards=read('donnees/cartes.json'),elements=read('donnees/elements.json');
 try {
  for(var n=0;n<cards.length;n++){
   var c=cards[n],record=new File(ROOT+'verification/'+c.slug+'_layers.txt');if(!record.exists)continue;
   var values=read('verification/'+c.slug+'_layers.txt'),e=elements[c.element];
   var advantage,weakness;
   if(c.element=='NONE'){advantage='SANS POUVOIR';weakness='VULNERABLE AUX CRISTAUX';}
   else if(c.element=='RAINBOW'){advantage='+40 CLASSIQUES';weakness='+30 SANS CRISTAL';}
   else{advantage='+'+c.advantage+' '+elements[e.strong_against].label;weakness='-'+c.disadvantage+' '+elements[e.weak_against].label;}
   if(values['AVANTAGE ELEMENTAIRE']==advantage&&values['FAIBLESSE ELEMENTAIRE']==weakness)continue;
   var doc=app.open(new File(ROOT+'templates/'+c.slug+'.psd'));
   fit(find(doc,'AVANTAGE ELEMENTAIRE'),advantage);fit(find(doc,'FAIBLESSE ELEMENTAIRE'),weakness);
   var options=new PhotoshopSaveOptions();options.layers=true;options.embedColorProfile=true;
   doc.saveAs(new File(ROOT+'templates/'+c.slug+'.psd'),options,true);
   var flat=doc.duplicate(c.slug+'_LABEL_REFRESH',true),tiff=new TiffSaveOptions();
   tiff.embedColorProfile=true;tiff.imageCompression=TIFFEncoding.TIFFLZW;tiff.layers=false;
   flat.saveAs(new File(ROOT+'impression/'+c.slug+'.tif'),tiff,true);
   flat.changeMode(ChangeMode.RGB);flat.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
   flat.saveAs(new File(ROOT+'cartes/'+c.slug+'.png'),new PNGSaveOptions(),true);flat.close(SaveOptions.DONOTSAVECHANGES);
   values['AVANTAGE ELEMENTAIRE']=advantage;values['FAIBLESSE ELEMENTAIRE']=weakness;
   write('verification/'+c.slug+'_layers.txt',values.toSource());
   doc.close(SaveOptions.DONOTSAVECHANGES);count++;
  }
  write('verification/labels-refreshed.txt',String(count));
 } finally {app.displayDialogs=oldDialogs;app.preferences.rulerUnits=oldUnits;}
 return 'Corrected '+count+' elemental labels';
})();
