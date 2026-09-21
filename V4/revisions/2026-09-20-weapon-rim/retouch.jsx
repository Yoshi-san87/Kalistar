#include "../../scripts/stable/common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var source=ctx.open(work+'frame-original.png'),clean=ctx.duplicate(source,'Email nettoye');
    clean.selection.select([[53,1282],[55,1275],[65,1265],[71,1266],[70,1270],[59,1283]],SelectionType.REPLACE,1,true);
    var fill=new ActionDescriptor();fill.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('FlCn'),stringIDToTypeID('contentAware'));
    fill.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);fill.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));
    executeAction(charIDToTypeID('Fl  '),fill,DialogModes.NO);clean.selection.deselect();
    clean.saveAs(new File(work+'frame-clean.png'),new PNGSaveOptions(),true);
    var original=ctx.open(root+'V4/templates/TAULIO_V4_02_POSITIONS.psd'),doc=ctx.duplicate(original,'Essai email');
    var symbols=K.need(doc,'22 ARME RACE CRISTAL - objets dynamiques');symbols.visible=false;
    doc.saveAs(new File(work+'frame-before-native.png'),new PNGSaveOptions(),true);symbols.visible=true;
    var frame=K.need(doc,'FOND INFERIEUR V4 - echelle uniforme 83.7897%');doc.activeLayer=frame;
    var locked=frame.allLocked;frame.allLocked=false;
    var select=new ActionDescriptor(),ref=new ActionReference();ref.putIdentifier(stringIDToTypeID('layer'),frame.id);select.putReference(charIDToTypeID('null'),ref);select.putBoolean(charIDToTypeID('MkVs'),true);executeAction(charIDToTypeID('slct'),select,DialogModes.NO);
    var replace=new ActionDescriptor();replace.putPath(charIDToTypeID('null'),new File(work+'frame-clean.png'));
    executeAction(stringIDToTypeID('placedLayerReplaceContents'),replace,DialogModes.NO);
    frame.allLocked=locked;
    doc.saveAs(new File(work+'trial.png'),new PNGSaveOptions(),true);
    symbols.visible=false;doc.saveAs(new File(work+'frame-after-native.png'),new PNGSaveOptions(),true);
});
'Retouche preparee';
