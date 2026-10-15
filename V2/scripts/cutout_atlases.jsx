#target photoshop
(function(){
 var R='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V2/assets/';
 app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;
 var names=['effets/icones_atlas_v2.png','factions/atlas_v2.png'],log=[];
 for(var i=0;i<names.length;i++){
  var source=app.open(new File(R+names[i]));
  for(var method=0;method<2;method++){
   var d=source.duplicate('CUTOUT');d.activeLayer.isBackgroundLayer=false;
   try{
    if(method==0){
     var a=new ActionDescriptor();a.putBoolean(stringIDToTypeID('sampleAllLayers'),false);
     executeAction(stringIDToTypeID('autoCutout'),a,DialogModes.NO);
     d.selection.invert();
    }else{
     var a=new ActionDescriptor(),r=new ActionReference(),p=new ActionDescriptor();
     r.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));a.putReference(charIDToTypeID('null'),r);
     p.putUnitDouble(charIDToTypeID('Hrzn'),charIDToTypeID('#Pxl'),2);p.putUnitDouble(charIDToTypeID('Vrtc'),charIDToTypeID('#Pxl'),2);
     a.putObject(charIDToTypeID('T   '),charIDToTypeID('Pnt '),p);a.putInteger(charIDToTypeID('Tlrn'),75);a.putBoolean(charIDToTypeID('AntA'),true);a.putBoolean(charIDToTypeID('Cntg'),true);a.putBoolean(charIDToTypeID('Mrgd'),false);
     executeAction(charIDToTypeID('setd'),a,DialogModes.NO);
    }
    d.selection.clear();d.selection.deselect();
    d.saveAs(new File(R+names[i].replace('.png',method==0?'_subject.png':'_wand.png')),new PNGSaveOptions(),true);
    log.push(names[i]+' '+method+' OK');
   }catch(e){log.push(names[i]+' '+method+' '+e.message);}
   d.close(SaveOptions.DONOTSAVECHANGES);
  }
  source.close(SaveOptions.DONOTSAVECHANGES);
 }
 return log.join('\n');
})();

