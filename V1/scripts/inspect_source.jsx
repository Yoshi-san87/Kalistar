#target photoshop
(function () {
    var root = 'C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/';
    new Folder(root + 'V1/verification').create();
    var oldDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    var src = app.open(new File(root + 'Templates/Template_Kalistar_Card_TENEBRE.psd'));
    var out = {name:src.name,width:src.width.as('px'),height:src.height.as('px'),resolution:src.resolution,profile:src.colorProfileName,guides:[],layers:[]};
    for (var g=0;g<src.guides.length;g++) out.guides.push({direction:String(src.guides[g].direction),position:src.guides[g].coordinate.as('px')});
    function walk(parent, dest, effective) {
        for(var i=0;i<parent.layers.length;i++) {
            var l=parent.layers[i], b=l.bounds;
            var r={id:l.id,name:l.name,type:l.typename,visible:l.visible,effective:effective&&l.visible,opacity:l.opacity,blend:String(l.blendMode),bounds:[b[0].as('px'),b[1].as('px'),b[2].as('px'),b[3].as('px')]};
            if(l.typename=='LayerSet') {r.children=[];walk(l,r.children,r.effective);}
            else {try{r.kind=String(l.kind);}catch(e){}if(r.kind=='LayerKind.TEXT') {var t=l.textItem;try{r.text=t.contents;}catch(e){}try{r.font=t.font;}catch(e){}try{r.size=t.size.as('pt');}catch(e){}try{r.position=[t.position[0].as('px'),t.position[1].as('px')];}catch(e){}try{r.textKind=String(t.kind);}catch(e){}try{r.justification=String(t.justification);}catch(e){}try{r.color=t.color.rgb.hexValue;}catch(e){}try{r.textBox=[t.width.as('px'),t.height.as('px')];}catch(e){}}}
            dest.push(r);
        }
    }
    walk(src,out.layers,true);
    var f=new File(root+'V1/verification/source_layers.json');f.encoding='UTF8';f.open('w');f.write(out.toSource());f.close();
    var flat=src.duplicate('SOURCE_APERCU',true);flat.changeMode(ChangeMode.RGB);flat.saveAs(new File(root+'V1/verification/source_live.png'),new PNGSaveOptions(),true);flat.close(SaveOptions.DONOTSAVECHANGES);
    app.displayDialogs=oldDialogs;
    return 'Source inspected: '+out.layers.length+' root layers';
})();
