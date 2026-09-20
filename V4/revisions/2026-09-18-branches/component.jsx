#include "../../scripts/stable/common.jsx"
var work=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
K.lifecycle(function(ctx){
    var original=ctx.open(work+'branch-source.png'),source=ctx.open(root+'V4/master/assets/clean-text-background.png');
    var doc=ctx.duplicate(source,'Branches - contour integral');
    if(doc.activeLayer.isBackgroundLayer)doc.activeLayer.isBackgroundLayer=false;
    var polygons=[
        [[168,1348],[361,1348],[383,1369],[401,1369],[401,1393],[367,1393],[334,1364],[158,1364]],
        [[546,1369],[567,1369],[584,1348],[779,1348],[779,1365],[600,1365],[572,1393],[546,1393]]
    ];
    doc.selection.select(polygons[0],SelectionType.REPLACE,0,false);
    doc.selection.select(polygons[1],SelectionType.EXTEND,0,false);
    doc.selection.invert();doc.selection.clear();doc.selection.deselect();
    doc.resizeImage(undefined,undefined,original.resolution,ResampleMethod.NONE);
    doc.saveAs(new File(work+'branches-complete.png'),new PNGSaveOptions(),true);
    K.write(work+'component.json',{source:'V4/master/assets/clean-text-background.png',polygons:polygons,width:doc.width.as('px'),height:doc.height.as('px'),resolution:doc.resolution});
});
'Composant prepare';
