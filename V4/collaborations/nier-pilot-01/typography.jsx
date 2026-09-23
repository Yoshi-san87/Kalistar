var KT=(function(){
    function apply(layer,name){
        if(name!=='NOM'&&name!=='TITLE')return;
        var t=layer.textItem;
        t.font='TimesNewRomanPSMT';
        // The version layer already carries the calibrated lower-frame transform.
        if(name==='NOM')t.size=UnitValue(10,'pt');
        t.fauxBold=false;t.fauxItalic=false;t.tracking=0;
        t.capitalization=name==='TITLE'?TextCase.ALLCAPS:TextCase.NORMAL;
    }
    function snapshot(doc){
        var out={};
        for(var i=0;i<2;i++){
            var name=i?'TITLE':'NOM',t=K.need(doc,name).textItem;
            out[name]={font:t.font,sizePt:t.size.as('pt'),tracking:t.tracking,capitalization:String(t.capitalization),fauxBold:t.fauxBold,fauxItalic:t.fauxItalic};
        }
        return out;
    }
    return {apply:apply,snapshot:snapshot};
})();
