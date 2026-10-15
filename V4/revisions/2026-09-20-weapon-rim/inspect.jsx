#include "../../scripts/stable/common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var doc=ctx.open(root+'V4/templates/TAULIO_V4_02_POSITIONS.psd');
    if(!doc.saved)throw Error('Source non enregistree');
    var frame=K.need(doc,'FOND INFERIEUR V4 - echelle uniforme 83.7897%');
    var info={frame:K.bounds(frame),layers:K.state(doc,[],'')};
    K.write(work+'inspection.json',info);
    app.activeDocument=doc;doc.activeLayer=frame;
    var select=new ActionDescriptor(),ref=new ActionReference();ref.putIdentifier(stringIDToTypeID('layer'),frame.id);select.putReference(charIDToTypeID('null'),ref);select.putBoolean(charIDToTypeID('MkVs'),true);executeAction(charIDToTypeID('slct'),select,DialogModes.NO);
    var exported=new ActionDescriptor();exported.putPath(charIDToTypeID('null'),new File(work+'frame-original.png'));
    executeAction(stringIDToTypeID('placedLayerExportContents'),exported,DialogModes.NO);
    var source=ctx.open(work+'frame-original.png');
    info.source={width:source.width.as('px'),height:source.height.as('px'),resolution:source.resolution,layers:K.state(source,[],'')};
    source.saveAs(new File(work+'frame-source.png'),new PNGSaveOptions(),true);
    K.write(work+'inspection.json',info);
});
'Source inspectee';
