#target photoshop
#include "../scripts/stable/common.jsx"
(function(){
    var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/',out=root+'V4/atelier/designer-assets/';
    var donors=K.read(out+'effect-donors.json'),result={};
    var refs=K.read(root+'V4/atelier/data/references.json');
    for(var ri=0;ri<refs.cards.length;ri++)if(refs.cards[ri].key==='rikka'){
        donors['def-retry']={entry:'rikka',psd:refs.cards[ri].psd,layer:'DEF D1 - effet retry',die:1};
        donors['def-dodge']={entry:'rikka',psd:refs.cards[ri].psd,layer:'DEF D6 - effet dodge',die:6};
    }
    for(ri=0;ri<refs.cards.length;ri++)if(refs.cards[ri].key==='ruby')for(var die=1;die<=6;die++)donors['atk-circle-'+die]={entry:'ruby',psd:refs.cards[ri].psd,layer:'ATK D'+die+' - fond',die:die};
    K.write(out+'effect-donors.json',donors);
    return K.lifecycle(function(ctx){
        var working={};
        function work(file){if(working[file])return working[file];var original=ctx.open(root+file);if(!original.saved)throw Error('Unsaved source '+file);return working[file]=ctx.duplicate(original,'Designer donor copy');}
        for(var key in donors){
            var donor=donors[key],source=work(donor.psd);
            app.activeDocument=source;var l=K.need(source,donor.layer);
            var doc=ctx.track(app.documents.add(897,1497,300,'Designer native effect',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
            app.activeDocument=source;var copy=l.duplicate(doc,ElementPlacement.PLACEATBEGINNING);
            app.activeDocument=doc;K.unclip(doc,copy);copy.visible=true;
            var b=K.bounds(copy),left=Math.max(0,Math.floor(b[0])),top=Math.max(0,Math.floor(b[1])),right=Math.min(897,Math.ceil(b[2])),bottom=Math.min(1497,Math.ceil(b[3]));
            doc.crop([UnitValue(left,'px'),UnitValue(top,'px'),UnitValue(right,'px'),UnitValue(bottom,'px')]);
            var file='effects/native-'+key+'.png';doc.saveAs(new File(out+file),new PNGSaveOptions(),true);
            result[key]={file:file,left:left,top:top,width:right-left,height:bottom-top,sourcePSD:donor.psd,sourceLayer:donor.layer,sourceCard:donor.entry,sourceDie:donor.die};
            K.write(out+'native-effects.json',result);doc.close(SaveOptions.DONOTSAVECHANGES);
        }
        for(ri=0;ri<refs.cards.length;ri++)if(refs.cards[ri].key==='kaylis'){
            var rainbow=work(refs.cards[ri].psd);
            var manifest=K.read(out+'manifest.raw.json'),spec=manifest.elements.RAINBOW.branch;
            var branch=K.need(rainbow,'BRANCHES RAINBOW - couleur du cristal'),adjustment=K.need(rainbow,'BRANCHES ELECTRO - couleur du cristal - reflets prismatiques');
            var target=ctx.track(app.documents.add(897,1497,300,'Native Rainbow branch',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
            app.activeDocument=rainbow;var branchCopy=branch.duplicate(target,ElementPlacement.PLACEATBEGINNING);app.activeDocument=target;K.unclip(target,branchCopy);branchCopy.visible=true;
            app.activeDocument=rainbow;var adjustmentCopy=adjustment.duplicate(target,ElementPlacement.PLACEATBEGINNING);app.activeDocument=target;adjustmentCopy.grouped=true;adjustmentCopy.visible=true;
            target.crop([UnitValue(spec.left,'px'),UnitValue(spec.top,'px'),UnitValue(spec.left+spec.width,'px'),UnitValue(spec.top+spec.height,'px')]);
            target.saveAs(new File(out+spec.file),new PNGSaveOptions(),true);target.close(SaveOptions.DONOTSAVECHANGES);
            spec.sourceLayers=[adjustment.name,branch.name];spec.nativeGradientMapPreserved=true;K.write(out+'manifest.raw.json',manifest);
        }
        return 'Native effect donors extracted and Photoshop released.';
    });
})();
