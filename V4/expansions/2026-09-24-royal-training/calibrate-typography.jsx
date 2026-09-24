#target photoshop
#include "../../scripts/stable/elements-common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/';
var request=K.read(home+'typography-calibration-request.json'),results=[],descriptions=[];
K.lifecycle(function(life){
    var source=life.open(root+request.source),doc=life.track(app.documents.add(897,1497,300,'Native name calibration',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
    for(var i=0;i<request.names.length;i++){
        var value=request.names[i],layer=K.transplant(source,K.need(source,'NOM'),doc,doc.layers[0],'NOM');
        layer.visible=true;layer.textItem.contents=value;KT.apply(layer,'NOM');
        var ink=K.ink(layer),span=ink[2]-ink[0];if(span>470)layer.resize(470/span*100,470/span*100,AnchorPosition.MIDDLECENTER);
        K.text(layer,value,449.5,129.5,471);ink=K.ink(layer);
        results.push({name:value,ink:ink,width:ink[2]-ink[0],height:ink[3]-ink[1],font:layer.textItem.font,sizePt:layer.textItem.size.as('pt')});
        layer.remove();
    }
    for(i=0;i<request.descriptions.length;i++){
        var item=request.descriptions[i],desc=K.transplant(source,K.need(source,'DESCRIPTION'),doc,doc.layers[0],'DESCRIPTION');desc.visible=true;
        var result={key:item.key,description:item.description};
        try{E.setDescription(doc,item.description);result.passed=true;result.ink=K.ink(desc);result.lines=desc.textItem.contents.split('\r').length;}
        catch(e){result.passed=false;result.error=e.message;result.ink=K.ink(desc);result.lines=desc.textItem.contents.split('\r').length;}
        descriptions.push(result);desc.remove();
    }
    K.write(home+'typography-calibration-native.json',{photoshop:app.version,names:results,descriptions:descriptions});
});
'Native glyph calibration complete';
