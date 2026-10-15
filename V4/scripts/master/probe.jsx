#target photoshop
(function(){
var old=app.documents.length?app.activeDocument:null,d=app.documents.add(950,1655,300,'PROBE',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1');
try{var a=new ActionDescriptor();a.putPath(charIDToTypeID('null'),new File('C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V4/master/assets/identity/position.png'));executeAction(charIDToTypeID('Plc '),a,DialogModes.NO);var r=new ActionReference();r.putEnumerated(stringIDToTypeID('layer'),stringIDToTypeID('ordinal'),stringIDToTypeID('targetEnum'));var z=executeActionGet(r).getObjectValue(stringIDToTypeID('smartObjectMore'));var t=z.getList(stringIDToTypeID('transform'));var v=[];for(var i=0;i<t.count;i++)v.push(t.getDouble(i));return v.join(',')+' | '+d.activeLayer.bounds.join(',');}finally{d.close(SaveOptions.DONOTSAVECHANGES);if(old)app.activeDocument=old;}
})();
