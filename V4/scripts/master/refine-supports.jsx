#target photoshop
(function(){
  var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
  var previous=app.documents.length?app.activeDocument:null,dialogs=app.displayDialogs;
  var source=null,doc=null,opened=false;
  app.displayDialogs=DialogModes.NO;
  function find(p,name){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.name===name)return l;if(l.typename==='LayerSet'){var f=find(l,name);if(f)return f;}}return null;}
  try{
    var file=new File(root+'templates/KALISTAR_MASTER_V4.psd');
    for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName===file.fsName){source=app.documents[i];break;}}catch(e){}
    if(!source){source=app.open(file);opened=true;}
    doc=source.duplicate('KALISTAR V4 - supports continus');
    var group=find(doc,'20 CADRE FIXE - verrouille');group.allLocked=false;
    var layer=find(group,'CADRE MAITRE - ne pas redimensionner');doc.activeLayer=layer;
    var d=new ActionDescriptor();d.putPath(charIDToTypeID('null'),new File(root+'master/assets/frame-supports.png'));
    executeAction(stringIDToTypeID('placedLayerReplaceContents'),d,DialogModes.NO);
    group.allLocked=true;
    doc.info.caption='Kalistar V4 - maitre ELECTRO revision supports. Geometrie inchangee. Source maitre conservee. Pas un BAT imprimeur.';
    var psd=new PhotoshopSaveOptions();psd.layers=true;psd.embedColorProfile=true;
    doc.saveAs(new File(root+'templates/KALISTAR_MASTER_V4_01-supports.psd'),psd,true);
    doc.saveAs(new File(root+'master/verification/MOMO-supports.png'),new PNGSaveOptions(),true);
    return 'Revision des supports sauvegardee, maitre precedent conserve.';
  }finally{
    if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);
    if(source&&opened)source.close(SaveOptions.DONOTSAVECHANGES);
    app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}
  }
})();
