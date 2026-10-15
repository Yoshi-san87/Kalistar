#target photoshop
(function(){
 var R='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V1/';
 app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;
 var f=new File(R+'donnees/cartes.json');f.encoding='UTF8';f.open('r');var cards=eval('('+f.read()+')');f.close();
 for(var i=0;i<cards.length;i++){var c=cards[i];if(!c.reference)continue;
  var original=app.open(new File(c.reference)),doc=original.duplicate(c.slug+'_REFERENCE_FIDELE');
  var baseline=doc.duplicate('BASELINE',true);baseline.changeMode(ChangeMode.RGB);baseline.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
  baseline.saveAs(new File(R+'verification/'+c.name+'_reference_rgb.png'),new PNGSaveOptions(),true);baseline.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument=doc;
  var d=new ActionDescriptor();d.putPath(charIDToTypeID('null'),new File(R+'assets/barcodes/'+c.id+'.png'));executeAction(charIDToTypeID('Plc '),d,DialogModes.NO);
  var l=doc.activeLayer,b=l.bounds;l.name='ID CODE128 - '+c.id;
  l.resize(22/(b[2].as('px')-b[0].as('px'))*100,210/(b[3].as('px')-b[1].as('px'))*100,AnchorPosition.MIDDLECENTER);
  b=l.bounds;l.translate(132-b[0].as('px'),848-b[1].as('px'));
  var psd=new PhotoshopSaveOptions();psd.layers=true;psd.embedColorProfile=true;doc.saveAs(new File(R+'templates/'+c.name+'_REFERENCE_JPG_IDENTIFIANT.psd'),psd,true);
  doc.flatten();var t=new TiffSaveOptions();t.embedColorProfile=true;t.imageCompression=TIFFEncoding.TIFFLZW;t.layers=false;doc.saveAs(new File(R+'impression/'+c.slug+'.tif'),t,true);
  doc.changeMode(ChangeMode.RGB);doc.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
  doc.saveAs(new File(R+'cartes/'+c.slug+'.png'),new PNGSaveOptions(),true);doc.close(SaveOptions.DONOTSAVECHANGES);
 }
 var master=new File(R+'templates/01_ELECTRO_MOMO.psd');master.copy(R+'templates/KALISTAR_MASTER_V1.psd');
 'Momo et Zviri preserves; master copied';
})();

