#target photoshop
#include "../scripts/stable/elements-common.jsx"
(function(){
    var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/',out=root+'V4/atelier/designer-assets/';
    var refs=K.read(root+'V4/atelier/data/references.json');
    function restore(doc){
        app.activeDocument=doc;var frame=K.need(doc,'06 CADRE FIXE ET ILLUSTRATION'),visibility=[];
        for(var vi=0;vi<frame.layers.length;vi++)visibility.push(frame.layers[vi].visible);
        for(var i=frame.layers.length-1;i>=0;i--){var l=frame.layers[i];if(l.typename==='ArtLayer'&&l.name!=='Rectangle 2'&&l.name!=='Rectangle 1'&&!l.grouped)l.grouped=true;}
        for(vi=0;vi<frame.layers.length;vi++)frame.layers[vi].visible=visibility[vi];
    }
    return K.lifecycle(function(ctx){
        for(var ci=0;ci<refs.cards.length;ci++){
            var entry=refs.cards[ci];if(entry.key!=='ruby'&&entry.key!=='rikka')continue;
            var source=ctx.open(root+entry.psd);if(!source.saved)throw Error('Unsaved source '+entry.psd);
            var doc=ctx.duplicate(source,'Designer isolated frame '+entry.key);app.activeDocument=doc;
            if(entry.key==='ruby'){
                var faction=K.need(doc,'15 FACTION - drapeau sous la barre DEF');
                var maskDoc=ctx.track(app.documents.add(897,1497,300,'Native faction group mask',NewDocumentMode.RGB,DocumentFill.TRANSPARENT));
                app.activeDocument=doc;var maskGroup=faction.duplicate(maskDoc,ElementPlacement.PLACEATBEGINNING);app.activeDocument=maskDoc;
                for(var mi=0;mi<maskGroup.layers.length;mi++)maskGroup.layers[mi].visible=false;
                var maskFill=maskDoc.artLayers.add();maskFill.move(maskGroup,ElementPlacement.INSIDE);maskDoc.activeLayer=maskFill;
                var white=new SolidColor();white.rgb.hexValue='FFFFFF';maskDoc.selection.selectAll();maskDoc.selection.fill(white);maskDoc.selection.deselect();
                maskDoc.saveAs(new File(out+'frame/faction-mask.png'),new PNGSaveOptions(),true);maskDoc.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=doc;
            }
            var audit={before:K.state(doc,[],'')};E.fixed(doc);
            for(var bi=0;bi<entry.registry.banks.length;bi++){
                var bank=entry.registry.banks[bi];for(var value in bank.variants)for(var j=0;j<bank.variants[value].length;j++){var b=K.find(doc,bank.variants[value][j]);if(b)b.visible=false;}
            }
            var state=K.state(doc,[],'');
            for(var i=0;i<state.length;i++){
                var s=state[i];if((s.kind==='LayerKind.TEXT'&&s.name!=='A T K'&&s.name!=='DEF')||s.name==='DEGRADE - cyan violet rose dore'||s.name==='OMBRE CONTACT - barre DEF sur le tissu'||/reflets prismatiques/.test(s.name))K.byId(doc,s.id).visible=false;
            }
            var plain=K.find(doc,'DEF D4 - fond physique');if(plain)plain.visible=true;
            var art=K.need(doc,entry.artworkLayer),fill=doc.artLayers.add();fill.move(art,ElementPlacement.PLACEBEFORE);fill.name='DESIGNER ART MATTE';
            var family=entry.key==='ruby'?'default':'electro';
            for(var pass=0;pass<2;pass++){
                app.activeDocument=doc;doc.activeLayer=fill;
                var color=new SolidColor();color.rgb.hexValue=pass?'FFFFFF':'000000';
                doc.selection.select([[80,156],[817,156],[817,1077],[80,1077]]);doc.selection.fill(color);doc.selection.deselect();
                restore(doc);doc.saveAs(new File(out+'frame/'+family+(pass?'-white.png':'-black.png')),new PNGSaveOptions(),true);
            }
            audit.after=K.state(doc,[],'');audit.restoreClipping=true;K.write(out+'state/'+entry.key+'-frame.json',audit);
            doc.close(SaveOptions.DONOTSAVECHANGES);
        }
        return 'Frames extracted from fresh copies with clipping restored. Photoshop released.';
    });
})();
