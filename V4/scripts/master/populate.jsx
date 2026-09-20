#target photoshop
(function(){
  var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/',base=root+'master/';
  var previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs,source=null,doc=null;
  app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
  function read(p){var f=new File(p);f.encoding='UTF8';f.open('r');var s=f.read();f.close();return eval('('+s+')');}
  function find(p,name){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.name===name)return l;if(l.typename==='LayerSet'){var f=find(l,name);if(f)return f;}}return null;}
  function b(l){var z=l.bounds;return[z[0].as('px'),z[1].as('px'),z[2].as('px'),z[3].as('px')];}
  function centre(l,x,y){var z=b(l);l.translate(x-(z[0]+z[2])/2,y-(z[1]+z[3])/2);}
  function replace(l,p){if(!l)throw Error('Calque absent du maitre');doc.activeLayer=l;var d=new ActionDescriptor();d.putPath(charIDToTypeID('null'),new File(root+p));executeAction(stringIDToTypeID('placedLayerReplaceContents'),d,DialogModes.NO);}
  function setText(l,value,size,width,x,y){if(!l)throw Error('Champ absent');l.visible=true;l.textItem.contents=value;l.textItem.size=UnitValue(size*72/300,'pt');l.textItem.position=[UnitValue(x,'px'),UnitValue(y,'px')];var n=0;while(b(l)[2]-b(l)[0]>width&&n++<50)l.textItem.size=UnitValue(l.textItem.size.as('pt')*.98,'pt');centre(l,x,y);}
  function wrap(l,value,width){var words=value.replace(/[\r\n]+/g,' ').split(/\s+/),lines=[],line='';for(var i=0;i<words.length;i++){var next=line?line+' '+words[i]:words[i];l.textItem.contents=next;if(b(l)[2]-b(l)[0]>width&&line){lines.push(line);line=words[i];}else line=next;}if(line)lines.push(line);return lines;}
  var job=read(base+'staging/job.json'),L=job.layout,C=job.card;
  try{
    var file=new File(root+L.masterPsd),opened=true;
    for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName===file.fsName){source=app.documents[i];opened=false;break;}}catch(e){}
    if(!source)source=app.open(file);
    if(source.width.as('px')!==L.canvas.width||source.height.as('px')!==L.canvas.height)throw Error('Dimensions du maitre modifiees : rendu interrompu.');
    doc=source.duplicate(C.name+' - declinaison du maitre');
    replace(find(doc,'ILLUSTRATION - canevas 950 x 1655'),job.assets.art);
    replace(find(doc,'TEINTE DU METAL'),job.assets.tint);find(doc,'25 FINITION - couleur de rarete').visible=!!C.frameColor;
    var identity=find(doc,'40 IDENTITE - objets dynamiques');
    var prefix={weapon:'ARME ',race:'RACE ',crystal:'CRISTAL ',branches:'BRANCHES ',flag:'DRAPEAU ',barcode:'CODE128 '};
    var identityLabels={weapon:C.weapon,race:C.race,crystal:C.element,branches:C.element,flag:C.faction,barcode:C.id};
    for(var key in prefix)for(var i=0;i<identity.layers.length;i++)if(identity.layers[i].name.indexOf(prefix[key])===0){replace(identity.layers[i],job.assets[key]);identity.layers[i].name=prefix[key]+identityLabels[key];break;}
    var stats=find(doc,'30 ATK ET DEF - un seul etat visible par capsule');
    for(var i=0;i<job.slots.length;i++){
      var s=job.slots[i],g=find(stats,(s.side==='atk'?'ATK':'DEF')+' D'+s.die);
      for(var mode in s.assets){var l=find(g,'ETAT '+mode);replace(l,s.assets[mode]);l.visible=mode===s.state;}
      var t=find(g,'VALEUR');setText(t,typeof s.value==='number'?String(s.value):'0',s.sizePx,s.die===6?136:83,s.cx,s.cy);t.visible=typeof s.value==='number';
      var ink=new SolidColor();ink.rgb.hexValue=s.side==='atk'&&C.attackNumberColor?C.attackNumberColor:'F4F3EB';t.textItem.color=ink;
    }
    var positions=find(doc,'50 POSITIONS - cinq emplacements fixes');
    for(var i=0;i<job.positions.length;i++){var p=job.positions[i],g=find(positions,'SLOT '+(i+1));setText(find(g,'POSITION'),String(p.value||i+1),L.positions.sizePx,35,p.x,p.y);g.visible=!!p.value;}
    var labels=find(doc,'60 TEXTES - editables');
    for(var key in L.texts){
      var spec=L.texts[key],value=C[key],l=find(labels,key==='text'?'DESCRIPTION':key.toUpperCase());
      if(key==='title')value=value.replace(/'/g,'\u2019');
      if(key==='text'){
        var size=spec.sizePx;l.textItem.size=UnitValue(size*72/300,'pt');var lines=C.textLines||wrap(l,value,spec.width);
        while(lines.length>4&&size>22){size-=.5;l.textItem.size=UnitValue(size*72/300,'pt');lines=wrap(l,value,spec.width);}
        if(lines.length>4)throw Error('Recit trop long pour une composition lisible');
        value=lines.join('\r');setText(l,value,size,spec.width,spec.center[0],spec.center[1]);
      }else setText(l,value,spec.sizePx,spec.width,spec.center[0],spec.center[1]);
    }
    find(doc,'00 REFERENCE VALIDEE - masquee').visible=false;
    find(doc,'25 FINITION - couleur de rarete').visible=!!C.frameColor;
    doc.info.title=C.name+' - '+C.title;
    doc.info.caption='Kalistar V4 | '+C.id+' | '+L.masterPsd+' | '+L.canvas.width+' x '+L.canvas.height+' px';
    var psd=new PhotoshopSaveOptions();psd.layers=true;psd.embedColorProfile=true;doc.saveAs(new File(root+job.outputPsd),psd,true);doc.saveAs(new File(root+job.outputPng),new PNGSaveOptions(),true);
    doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;if(opened)source.close(SaveOptions.DONOTSAVECHANGES);source=null;
    return 'Carte produite depuis une copie du maitre: '+job.outputPng;
  }finally{if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);if(source&&opened)source.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
