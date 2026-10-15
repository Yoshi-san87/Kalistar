// FF8 native composition pattern, isolated so its frozen preparation stays valid.
function composeNieR(home,root){
    var folder=home+'render/',plan=K.read(folder+'composition.json'),card=K.read(home+'profile.json');
    return K.lifecycle(function(life){
        var source=life.open(root+plan.textSource);
        if(!source.saved)throw Error('Reference PSD has unsaved changes.');
        var doc=life.track(app.documents.add(897,1497,300,'Kalistar NieR - '+card.name,NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1'));
        doc.activeLayer.name='FOND - noir';var black=new SolidColor();black.rgb.hexValue='000000';
        doc.selection.selectAll();doc.selection.fill(black);doc.selection.deselect();
        for(var i=0;i<plan.layers.length;i++){
            var spec=plan.layers[i],layer,b;
            if(!/^[a-z0-9-]+\.png$/.test(spec.file))throw Error('Invalid component.');
            if(spec.name==='FACTION - NieR'){
                var flag=life.open(folder+spec.file);layer=K.transplant(flag,flag.activeLayer,doc,doc.layers[0],spec.name);layer=K.smart(doc,layer);b=K.bounds(layer);
                if(b[2]-b[0]!==spec.width||b[3]-b[1]!==spec.height)throw Error('Flag pixel bounds changed.');
            }else{
                layer=E.place(doc,folder+spec.file,doc.layers[0],spec.name);b=K.bounds(layer);
                layer.resize(spec.width/(b[2]-b[0])*100,spec.height/(b[3]-b[1])*100,AnchorPosition.TOPLEFT);b=K.bounds(layer);
            }
            layer.translate(spec.left-b[0],spec.top-b[1]);
        }
        doc.saveAs(new File(folder+'without-text.png'),new PNGSaveOptions(),true);
        var expected=[];
        function text(name,value,x,y,max,hex){
            var layer=K.transplant(source,K.need(source,name),doc,doc.layers[0],name);layer.visible=!!value;
            if(!value)return;
            layer.textItem.contents=String(value);var ink=K.ink(layer),span=ink[2]-ink[0];
            if(span>max)layer.resize(max/span*100,max/span*100,AnchorPosition.MIDDLECENTER);
            K.text(layer,value,x,y,max+1);
            if(hex){var color=new SolidColor();color.rgb.hexValue=hex;layer.textItem.color=color;}
            expected.push({name:name,value:String(value),center:[x,y],maxWidth:max});
        }
        text('NOM',card.name,449.5,129.5,470);text('TITLE',card.title,448.5,1100,590);
        text('JOB',card.job,292,1172.5,170,card.color);text('RACE',card.race,599,1172.5,170,card.color);
        var desc=K.transplant(source,K.need(source,'DESCRIPTION'),doc,doc.layers[0],'DESCRIPTION');desc.visible=!!card.description;
        if(card.description)E.setDescription(doc,card.description);
        var ys={6:150,5:371.5,4:475.5,3:576.5,2:676.5,1:773.5};
        for(var side=0;side<2;side++)for(var die=6;die>=1;die--){
            var value=(side?card.defense:card.atk)[6-die];
            if(typeof value==='number')text((side?'DEF':'ATK')+' D'+die+' - valeur',String(value),side?(die===6?756:734):(die===6?142:155.5),ys[die],die===6?104:66);
        }
        for(i=0;i<card.positions.length;i++)text('POSITION SLOT '+(i+1),String(card.positions[i]),224+i*58,1020.5,34);
        doc.info.title=card.name+' - '+card.title;doc.info.caption='Kalistar V4 | NieR private fan crossover | '+card.id+' | Native text and embedded objects';
        K.save(doc,home+'card.psd',home+'card.png');
        doc.close(SaveOptions.DONOTSAVECHANGES);
        var reopened=life.open(home+'card.psd');reopened.saveAs(new File(folder+'reopened.png'),new PNGSaveOptions(),true);
        K.write(folder+'native.json',{photoshop:app.version,width:reopened.width.as('px'),height:reopened.height.as('px'),resolution:reopened.resolution,expected:expected,layers:K.state(reopened,[],''),components:plan.layers});
    });
}
