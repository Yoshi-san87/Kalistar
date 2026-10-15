#target photoshop
#include "../../scripts/stable/elements-common.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var set=K.read(home+'set.json'),plan=K.read(home+'cards/julienne/render/composition.json'),results=[];
K.lifecycle(function(life){
    var source=life.open(root+plan.textSource);
    var doc=life.track(app.documents.add(897,1497,300,'Description diagnostic',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
    for(var i=0;i<set.cards.length;i++){
        var card=K.read(home+'cards/'+set.cards[i].key+'/profile.json');
        var layer=K.transplant(source,K.need(source,'DESCRIPTION'),doc,doc.layers[0],'DESCRIPTION'),error=null;
        try{E.setDescription(doc,card.description);}catch(e){error=String(e);}
        results.push({key:set.cards[i].key,error:error,ink:K.ink(layer),text:layer.textItem.contents,sizePt:layer.textItem.size.as('pt'),font:layer.textItem.font});
        layer.remove();
    }
    K.write(home+'description-diagnostic.json',results);
});
'Description diagnostic complete';
