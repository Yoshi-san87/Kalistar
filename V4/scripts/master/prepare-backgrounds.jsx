#target photoshop
(function(){
  var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/',dir=root+'master/';
  var previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs;
  var doc=null,temp=null;app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
  function alpha(layer){var d=new ActionDescriptor(),r=new ActionReference(),s=new ActionReference();r.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));d.putReference(charIDToTypeID('null'),r);s.putEnumerated(charIDToTypeID('Chnl'),charIDToTypeID('Chnl'),charIDToTypeID('Trsp'));s.putIdentifier(charIDToTypeID('Lyr '),layer.id);d.putReference(charIDToTypeID('T   '),s);executeAction(charIDToTypeID('setd'),d,DialogModes.NO);}
  function fill(mask){
    temp=app.open(new File(dir+'preparation/'+mask));var l=temp.activeLayer.duplicate(doc,ElementPlacement.PLACEATBEGINNING);temp.close(SaveOptions.DONOTSAVECHANGES);temp=null;app.activeDocument=doc;
    alpha(l);l.remove();doc.activeLayer=doc.layers[0];
    var d=new ActionDescriptor();d.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('FlCn'),stringIDToTypeID('contentAware'));d.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);d.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));executeAction(charIDToTypeID('Fl  '),d,DialogModes.NO);doc.selection.deselect();
  }
  try{
    var source=app.open(new File(root+'cartes/MOMO_ELECTRO_V4_04-typographie.png'));
    doc=source.duplicate('KALISTAR - fonds de reconstruction');
    if(doc.activeLayer.isBackgroundLayer)doc.activeLayer.isBackgroundLayer=false;
    fill('texte-mask.png');doc.saveAs(new File(dir+'preparation/sans-textes.png'),new PNGSaveOptions(),true);
    fill('sous-identite-mask.png');doc.saveAs(new File(dir+'preparation/sous-identite.png'),new PNGSaveOptions(),true);
    doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;
    return 'Fonds reconstruits une seule fois. Reference inchangee.';
  }finally{if(temp)temp.close(SaveOptions.DONOTSAVECHANGES);if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
