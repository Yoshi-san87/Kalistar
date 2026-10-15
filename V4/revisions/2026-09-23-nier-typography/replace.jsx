#target photoshop
#include "../../scripts/stable/common.jsx"
#include "../../collaborations/nier-pilot-01/typography.jsx"
var home=File($.fileName).parent.fsName.replace(/\\/g,'/')+'/',request=K.read(home+'request.json');
for(var k=0;k<request.cards.length;k++)(function(c){
    K.lifecycle(function(life){
        var source=life.open(c.psd),doc=life.duplicate(source,'NieR typography - '+c.key),out=c.output.replace(/\\/g,'/')+'/';
        var before=K.state(doc,[],''),nom=K.need(doc,'NOM'),title=K.need(doc,'TITLE');
        doc.saveAs(new File(out+'before.png'),new PNGSaveOptions(),true);
        nom.visible=false;title.visible=false;doc.saveAs(new File(out+'before-without-labels.png'),new PNGSaveOptions(),true);nom.visible=true;title.visible=true;
        KT.apply(nom,'NOM');KT.apply(title,'TITLE');
        K.center(nom,449.5,129.5);K.center(title,448.5,1100);
        var after=K.state(doc,[],'');
        nom.visible=false;title.visible=false;doc.saveAs(new File(out+'after-without-labels.png'),new PNGSaveOptions(),true);nom.visible=true;title.visible=true;
        K.save(doc,out+'card.psd',out+'card.png');doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened=life.open(out+'card.psd');reopened.saveAs(new File(out+'render/reopened.png'),new PNGSaveOptions(),true);
        var layers=K.state(reopened,[],''),n=K.read(c.native);n.layers=layers;n.typography=KT.snapshot(reopened);
        K.write(out+'render/native.json',n);K.write(out+'audit.json',{before:before,after:after,reopened:layers});
    });
})(request.cards[k]);
'NieR typography complete';
