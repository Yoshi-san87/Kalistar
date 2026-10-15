#target photoshop
(function(){
  var root=File($.fileName).parent.parent.parent.fsName.replace(/\\/g,'/')+'/',base=root+'master/';
  var previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs,doc=null;
  app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
  function read(p){var f=new File(p);f.encoding='UTF8';f.open('r');var s=f.read();f.close();return eval('('+s+')');}
  function write(p,s){var f=new File(p);f.encoding='UTF8';f.open('w');f.write(s);f.close();}
  function json(v){if(v===null)return 'null';if(typeof v==='string')return '"'+v.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')+'"';if(typeof v!=='object')return String(v);var a=[];if(v instanceof Array){for(var i=0;i<v.length;i++)a.push(json(v[i]));return '['+a.join(',')+']';}for(var k in v)a.push(json(k)+':'+json(v[k]));return '{'+a.join(',')+'}';}
  function bounds(l){var b=l.bounds;return[b[0].as('px'),b[1].as('px'),b[2].as('px'),b[3].as('px')];}
  function color(hex){var c=new SolidColor();c.rgb.hexValue=hex;return c;}
  function group(name,parent){var anchor=doc.layers[0],g=parent.layerSets.add();g.name=name;if(parent===doc&&anchor)g.move(anchor,ElementPlacement.PLACEBEFORE);return g;}
  function transform(){var r=new ActionReference();r.putEnumerated(stringIDToTypeID('layer'),stringIDToTypeID('ordinal'),stringIDToTypeID('targetEnum'));var z=executeActionGet(r).getObjectValue(stringIDToTypeID('smartObjectMore')).getList(stringIDToTypeID('transform'));var a=[];for(var i=0;i<z.count;i++)a.push(z.getDouble(i));return a;}
  function place(p,name,parent){
    var a=new ActionDescriptor();a.putPath(charIDToTypeID('null'),new File(root+p));executeAction(charIDToTypeID('Plc '),a,DialogModes.NO);
    var l=doc.activeLayer;l.name=name;var t=transform();
    var scale=950/(t[2]-t[0]);if(Math.abs(scale-1)>.000001)l.resize(scale*100,scale*100,AnchorPosition.MIDDLECENTER);
    t=transform();l.translate(-t[0],-t[1]);t=transform();
    if(Math.abs(t[0])>.001||Math.abs(t[1])>.001||Math.abs(t[2]-950)>.001||Math.abs(t[5]-1655)>.001)throw Error('Objet dynamique mal aligne: '+name+' '+t.join(','));
    l.move(parent,ElementPlacement.INSIDE);l.positionLocked=true;return l;
  }
  function centre(l,x,y){var b=bounds(l);l.translate(x-(b[0]+b[2])/2,y-(b[1]+b[3])/2);}
  var measured=[];
  function text(name,value,font,size,x,y,hex,width,parent,leading){
    var l=doc.artLayers.add();l.kind=LayerKind.TEXT;l.name=name;var t=l.textItem;
    t.kind=TextType.POINTTEXT;t.font=font;t.size=UnitValue(size*72/300,'pt');t.contents=value;t.color=color(hex);t.justification=Justification.CENTER;t.antiAliasMethod=AntiAlias.SMOOTH;t.tracking=0;t.position=[UnitValue(x,'px'),UnitValue(y,'px')];
    if(name==='VALEUR'&&size<50)t.horizontalScale=90;
    if(leading){t.useAutoLeading=false;t.leading=UnitValue(leading*72/300,'pt');}
    var n=0;while(bounds(l)[2]-bounds(l)[0]>width&&n++<50)t.size=UnitValue(t.size.as('pt')*.98,'pt');
    centre(l,x,y);l.move(parent,ElementPlacement.INSIDE);measured.push({name:name,font:t.font,bounds:bounds(l),center:[x,y],sizePx:t.size.as('pt')*300/72});return l;
  }
  function wrap(value,font,size,width){
    var probe=doc.artLayers.add();probe.kind=LayerKind.TEXT;var t=probe.textItem;t.font=font;t.size=UnitValue(size*72/300,'pt');t.position=[50,50];var words=value.replace(/[\r\n]+/g,' ').split(/\s+/),lines=[],line='';
    for(var i=0;i<words.length;i++){var next=line?line+' '+words[i]:words[i];t.contents=next;if(bounds(probe)[2]-bounds(probe)[0]>width&&line){lines.push(line);line=words[i];}else line=next;}
    if(line)lines.push(line);probe.remove();return lines;
  }
  function save(){var p=new PhotoshopSaveOptions();p.layers=true;p.embedColorProfile=true;p.maximizeCompatibility=true;doc.saveAs(new File(root+job.outputPsd),p,true);doc.saveAs(new File(root+job.outputPng),new PNGSaveOptions(),true);}
  var job=read(base+'staging/job.json'),L=job.layout,C=job.card;
  if(C.id!=='30000001')throw Error('La construction du maitre est reservee au profil de reference Momo. Utiliser populate.jsx pour les variantes.');
  job.outputPsd='templates/KALISTAR_MASTER_V4.psd';
  try{
    new Folder(base+'exports').create();new Folder(base+'verification').create();
    doc=app.documents.add(L.canvas.width,L.canvas.height,L.canvas.ppi,'KALISTAR V4 - MAITRE',NewDocumentMode.RGB,DocumentFill.TRANSPARENT,1,BitsPerChannelType.EIGHT,L.canvas.profile);
    var empty=doc.activeLayer;
    var reference=group('00 REFERENCE VALIDEE - masquee',doc);var rl=place(L.reference,'MOMO valide - comparaison seulement',reference);reference.visible=false;reference.allLocked=true;
    var art=group('10 ILLUSTRATION - objet dynamique masque',doc);place(job.assets.art,'ILLUSTRATION - canevas 950 x 1655',art);
    var frame=group('20 CADRE FIXE - verrouille',doc);place(job.assets.frame,'CADRE MAITRE - ne pas redimensionner',frame);frame.allLocked=true;
    var finish=group('25 FINITION - couleur de rarete',doc);var tint=place(job.assets.tint,'TEINTE DU METAL',finish);tint.blendMode=BlendMode.COLORBLEND;tint.opacity=60;finish.visible=!!C.frameColor;
    var numbers=group('30 ATK ET DEF - un seul etat visible par capsule',doc);
    for(var i=0;i<job.slots.length;i++){
      var s=job.slots[i],g=group((s.side==='atk'?'ATK':'DEF')+' D'+s.die,numbers);
      for(var k in s.assets){var l=place(s.assets[k],'ETAT '+k,g);l.visible=k===s.state;}
      var val=text('VALEUR',typeof s.value==='number'?String(s.value):'0',L.statsFont,s.sizePx,s.cx,s.cy,'F4F3EB',s.die===6?136:83,g);
      val.visible=typeof s.value==='number';
    }
    var identity=group('40 IDENTITE - objets dynamiques',doc);
    place(job.assets.weapon,'ARME '+C.weapon,identity);place(job.assets.race,'RACE '+C.race,identity);place(job.assets.branches,'BRANCHES ELECTRO - couleur du cristal',identity);place(job.assets.crystal,'CRISTAL ELECTRO',identity);place(job.assets.flag,'DRAPEAU '+C.faction,identity);place(job.assets.barcode,'CODE128 '+C.id,identity);
    var positions=group('50 POSITIONS - cinq emplacements fixes',doc);
    for(i=0;i<job.positions.length;i++){
      var p=job.positions[i],g=group('SLOT '+(i+1),positions);place(p.path,'PLAQUE',g);text('POSITION',String(p.value||i+1),L.positions.font,L.positions.sizePx,p.x,p.y,'ECEFEA',35,g);g.visible=!!p.value;
    }
    var labels=group('60 TEXTES - editables',doc);
    for(var key in L.texts){
      var t=L.texts[key],value=C[key];
      if(key==='title')value=value.replace(/'/g,'\u2019');
      if(key==='text'){
        var size=t.sizePx,lines=wrap(value,t.font,size,t.width);
        if(C.textLines&&C.textLines.join(' ')===C.text)lines=C.textLines;
        while(lines.length>4&&size>22){size-=.5;lines=wrap(value,t.font,size,t.width);}
        if(lines.length>4)throw Error('Recit trop long: maximum quatre lignes lisibles.');
        text('DESCRIPTION',lines.join('\r'),t.font,size,t.center[0],t.center[1],t.color,t.width,labels,t.leadingPx);
      }else text(key.toUpperCase(),value,t.font,t.sizePx,t.center[0],t.center[1],t.color,t.width,labels);
    }
    empty.remove();doc.info.title='Kalistar V4 - Momo, maitre ELECTRO';doc.info.caption='Reference 950x1655 conservee. Donnees dans V4/donnees/momo.json. Textes natifs; objets dynamiques fixes. Pas un BAT imprimeur.';
    reference.visible=false;
    finish.visible=!!C.frameColor;
    save();write(base+'verification/typography.json',json(measured));write(base+'verification/build-status.txt','OK '+job.label+' | '+doc.width.as('px')+' x '+doc.height.as('px')+' | '+doc.resolution+' ppi');
    doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;return 'Maitre et Momo recomposes.';
  }catch(e){write(base+'verification/build-status.txt','ERROR ligne '+e.line+': '+e.message);throw e;}
  finally{if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
