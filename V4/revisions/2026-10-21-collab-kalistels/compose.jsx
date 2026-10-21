#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(root+'work/collab-kalistels/render-request.json'),plan=K.read(home+'plan.json');
if(app.version!=='26.11.8')throw Error('Photoshop 26.11.8 required.');
function reviseCrystal(spec){
    var dir=home+'cards/'+spec.key+'/',folder=dir+'render/',composition=K.read(folder+'composition.json');
    var profile=K.read(dir+'profile.json'),prior=K.read(home+'originals/'+spec.id+'/render/native.json');
    if(File(dir+'card.psd').exists)throw Error('Preserve existing output: '+spec.key);
    K.lifecycle(function(life){
        var source=life.open(home+'originals/'+spec.id+'/card.psd');
        if(!source.saved)throw Error('Source PSD has unsaved changes.');
        var doc=life.track(source.duplicate('Kalistar - '+profile.name+' - Kalistel'));
        for(var i=0;i<composition.layers.length;i++){
            var item=composition.layers[i];
            if(!item.replaces)continue;
            var old=K.need(doc,item.replaces),layer=E.place(doc,folder+item.file,old,item.name),b=K.bounds(layer);
            layer.resize(item.width/(b[2]-b[0])*100,item.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);
            b=K.bounds(layer);layer.translate(item.left-b[0],item.top-b[1]);old.remove();
        }
        var color=new SolidColor();color.rgb.hexValue=profile.color;
        K.need(doc,'JOB').textItem.color=color;K.need(doc,'RACE').textItem.color=color;
        // Hide native text only for the independent component comparison.
        var texts=[];
        function hideText(parent){for(var j=0;j<parent.layers.length;j++){
            var l=parent.layers[j];if(l.typename==='LayerSet')hideText(l);
            else if(l.kind===LayerKind.TEXT){texts.push({layer:l,visible:l.visible});l.visible=false;}
        }}
        hideText(doc);doc.saveAs(new File(folder+'without-text.png'),new PNGSaveOptions(),true);
        for(i=0;i<texts.length;i++)texts[i].layer.visible=texts[i].visible;
        K.save(doc,dir+'card.psd',dir+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened=life.open(dir+'card.psd');reopened.saveAs(new File(folder+'reopened.png'),new PNGSaveOptions(),true);
        K.write(folder+'native.json',{photoshop:app.version,width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,expected:prior.expected,layers:K.state(reopened,[],''),components:composition.layers});
    });
}
for(var i=0;i<request.keys.length;i++){
    var found=null;for(var j=0;j<plan.cards.length;j++)if(plan.cards[j].key===request.keys[i])found=plan.cards[j];
    if(!found)throw Error('Unknown revision key');reviseCrystal(found);
}
'Collaboration Kalistels revised';
