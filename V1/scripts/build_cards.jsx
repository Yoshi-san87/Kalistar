#target photoshop
(function () {
 var ROOT='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/V1/';
 var dialogs=app.displayDialogs, units=app.preferences.rulerUnits;
 app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;
 var source=app.open(new File(ROOT+'../Templates/Template_Kalistar_Card_TENEBRE.psd'));
 function read(path){var f=new File(path);f.encoding='UTF8';f.open('r');var s=f.read();f.close();return eval('('+s+')');}
 function write(path,s){var f=new File(path);f.encoding='UTF8';f.open('w');f.write(s);f.close();}
 var cards=read(ROOT+'donnees/cartes.json'),elements=read(ROOT+'donnees/elements.json');
 var config=read(ROOT+'donnees/build_config.json'),results=[];
 var doc,map;
 function index(p){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];map[l.id]=l;if(l.typename=='LayerSet')index(l);}}
 function hide(id){if(map[id])map[id].visible=false;}
 function rgb(hex){var s=new SolidColor();s.rgb.hexValue=hex;return s;}
 function fitText(layer,maxWidth){var t=layer.textItem;for(var i=0;i<30 && layer.bounds[2].as('px')-layer.bounds[0].as('px')>maxWidth;i++)t.size=UnitValue(t.size.as('pt')*.96,'pt');}
 function contents(id,value,name,maxWidth){var l=map[id];l.visible=true;l.textItem.contents=String(value);l.name=name;if(maxWidth)fitText(l,maxWidth);return l;}
 function text(name,value,font,size,x,y,color,align,maxWidth,parent){
  var l=doc.artLayers.add();l.kind=LayerKind.TEXT;l.name=name;var t=l.textItem;
  t.font=font;t.size=UnitValue(size,'pt');t.contents=String(value);t.color=rgb(color||'FFFFFF');
  t.justification=align||Justification.CENTER;t.position=[UnitValue(x,'px'),UnitValue(y,'px')];
  if(maxWidth)fitText(l,maxWidth);if(parent)l.move(parent,ElementPlacement.INSIDE);return l;
 }
 function place(file,name,box,parent,before){
  var a=new ActionDescriptor();a.putPath(charIDToTypeID('null'),new File(file));a.putEnumerated(charIDToTypeID('FTcs'),charIDToTypeID('QCSt'),charIDToTypeID('Qcsa'));executeAction(charIDToTypeID('Plc '),a,DialogModes.NO);
  var l=doc.activeLayer;l.name=name;var b=l.bounds,w=b[2].as('px')-b[0].as('px'),h=b[3].as('px')-b[1].as('px');
  l.resize((box[2]-box[0])/w*100,(box[3]-box[1])/h*100,AnchorPosition.MIDDLECENTER);
  b=l.bounds;l.translate(box[0]-b[0].as('px'),box[1]-b[1].as('px'));
  if(before)l.move(before,ElementPlacement.PLACEBEFORE);else if(parent)l.move(parent,ElementPlacement.INSIDE);
  if(l.parent.typename=='LayerSet' && l.parent.id==135)l.grouped=true;
  return l;
 }
 function ellipseSelection(x,y,w,h){
  var a=new ActionDescriptor(),r=new ActionReference(),b=new ActionDescriptor();
  r.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));a.putReference(charIDToTypeID('null'),r);
  b.putUnitDouble(charIDToTypeID('Top '),charIDToTypeID('#Pxl'),y);b.putUnitDouble(charIDToTypeID('Left'),charIDToTypeID('#Pxl'),x);
  b.putUnitDouble(charIDToTypeID('Btom'),charIDToTypeID('#Pxl'),y+h);b.putUnitDouble(charIDToTypeID('Rght'),charIDToTypeID('#Pxl'),x+w);
  a.putObject(charIDToTypeID('T   '),charIDToTypeID('Elps'),b);executeAction(charIDToTypeID('setd'),a,DialogModes.NO);
 }
 function colorize(layer,hue,box){
  doc.activeLayer=layer;try{layer.rasterize(RasterizeType.ENTIRELAYER);}catch(e){}
  if(box)ellipseSelection(box[0],box[1],box[2],box[3]);
  var a=new ActionDescriptor(),b=new ActionDescriptor(),list=new ActionList();
  a.putBoolean(charIDToTypeID('Clrz'),true);b.putInteger(charIDToTypeID('H   '),hue);b.putInteger(charIDToTypeID('Strt'),60);b.putInteger(charIDToTypeID('Lght'),0);
  list.putObject(charIDToTypeID('Hst2'),b);a.putList(charIDToTypeID('Adjs'),list);executeAction(charIDToTypeID('HStr'),a,DialogModes.NO);doc.selection.deselect();
 }
 function has(list,n){for(var i=0;i<list.length;i++)if(list[i]==n)return true;return false;}
 function group(name){var g=doc.layerSets.add();g.name=name;return g;}
 function cleanHidden(p){for(var i=p.layers.length-1;i>=0;i--){var l=p.layers[i];if(!l.visible)l.remove();else if(l.typename=='LayerSet')cleanHidden(l);}}
 function build(c){
  doc=source.duplicate(c.slug);map={};index(doc);
  var removed=[873,860,853,791,790,19,50,52,132];
  for(var j=0;j<removed.length;j++)hide(removed[j]);
  hide(734);hide(146);hide(451);hide(859);hide(789);hide(418);hide(84);hide(568);hide(856);
  var dynamic=group('01 CONTENU - nom, titre, metier, race, recit');
  contents(134,c.name,'NOM',420);
  contents(351,c.title,'TITRE DE VERSION',570);
  hide(75);hide(74);
  text('METIER',c.job,'Augustus',5,220,1175,c.color,Justification.LEFT,182,dynamic);
  text('RACE - '+c.race,c.race,'Augustus',5,684,1176,c.color,Justification.RIGHT,169,dynamic);
  contents(862,c.text,'DESCRIPTION NARRATIVE');
  var title=map[351];title.translate(449-(title.bounds[0].as('px')+title.bounds[2].as('px'))/2,0);
  var art=place(c.reference||c.art,'ILLUSTRATION - remplacer le contenu',c.reference?[0,0,897,1497]:[80,160,817,1073],null,map[873]);
  var weapon=place(ROOT+'assets/armes/'+('0'+c.weapon_index).slice(-2)+'.jpg','ARME - '+c.weapon,[113,1126,169,1182],dynamic);
  var raceBase=doc.artLayers.add();raceBase.name='RACE - fond fixe';ellipseSelection(724,1123,64,64);doc.selection.fill(rgb('102030'));doc.selection.deselect();raceBase.move(dynamic,ElementPlacement.INSIDE);
  var race=place(ROOT+'assets/races/'+c.race+'.png','PICTOGRAMME RACE - '+c.race,[733,1132,779,1178],dynamic);
  var faction=place(ROOT+'assets/factions/'+c.faction+'.png','FACTION - '+c.faction,[694,832,776,997],null,map[734]);
  var barcode=place(ROOT+'assets/barcodes/'+c.id+'.png','ID CODE128 - '+c.id,[132,848,154,1058],null,map[146]);
  var crystalGroup=group('02 ELEMENT - cristal et accents');
  var crystal=place(ROOT+'assets/cristaux/'+c.element+'.png','CRISTAL '+c.element+' - masquer pour sans cristal',[390,1130,508,1263],crystalGroup);
  colorize(map[298],c.hue,null);map[298].name='ACCENT ELEMENTAIRE - independant du cadre';
  map[298].move(crystalGroup,ElementPlacement.PLACEATEND);
  var el=elements[c.element];
  contents(128,c.element=='RAINBOW'?'+40 CLASSIQUES':'+30 '+elements[el.strong_against].label,'AVANTAGE ELEMENTAIRE',240);
  contents(124,c.element=='RAINBOW'?'NEUTRE RAINBOW':'-30 '+elements[el.weak_against].label,'FAIBLESSE ELEMENTAIRE',240);
  hide(871);hide(867);
  var positions=group('03 POSITIONS AUTORISEES - P1 a P5');
  for(j=0;j<c.positions.length;j++){
   var shift=-50*(c.positions.length-1-j),housing=map[865].duplicate(positions,ElementPlacement.INSIDE);housing.visible=true;housing.translate(shift,0);housing.name='P'+c.positions[j]+' - support';
   var value=map[872].duplicate(positions,ElementPlacement.INSIDE);value.visible=true;value.textItem.contents=String(c.positions[j]);value.translate(shift,0);value.name='P'+c.positions[j];
  }
  var atkIds=[82,440,435,430,425,190],defIds=[81,118,149,153,160,165],baseIds=[78,438,433,428,423,205];
  var ys=[150,372,476,577,677,774],xs=[142,156,156,156,156,156],dx=[756,733,734,734,734,734];
  for(j=0;j<6;j++){
   var die=6-j,cx=xs[j],cy=ys[j],rr=j==0?52:35;
   colorize(map[baseIds[j]],c.hue,[cx-rr,cy-rr,rr*2,rr*2]);
   map[baseIds[j]].name='ATK D'+die+' - fond';
   var l=map[atkIds[j]],v=c.atk[j];l.name='ATK D'+die+' - valeur';
   if(typeof v=='number'){contents(atkIds[j],v,l.name,j==0?114:82);}
   else {l.visible=false;var sz=j==0?75:58;place(ROOT+'assets/effets/'+v+'.png','ATK D'+die+' - effet '+v,[cx-sz/2,cy-sz/2,cx+sz/2,cy+sz/2],null,l);}
   if(j==0){var tint=doc.artLayers.add();tint.name='ATK D6 - teinte elementaire';ellipseSelection(cx-52,cy-52,104,104);doc.selection.fill(rgb(c.color));doc.selection.deselect();tint.blendMode=BlendMode.COLORBLEND;tint.move(l,ElementPlacement.PLACEAFTER);}
   if(has(c.magic,die)){
    var size=j==0?166:120;
    var aura=place(ROOT+'assets/effets/'+c.element+'.png','ATK D'+die+' - HALO MAGIQUE',[cx-size/2,cy-size/2,cx+size/2,cy+size/2]);
    aura.move(l,ElementPlacement.PLACEAFTER);
   }
   l=map[defIds[j]];v=c.defense[j];l.name='DEF D'+die+' - valeur';
   if(typeof v=='number')contents(defIds[j],v,l.name,j==0?112:78);
   else {l.visible=false;var sz=j==0?78:58;place(ROOT+'assets/effets/'+v+'.png','DEF D'+die+' - effet '+v,[dx[j]-sz/2,cy-sz/2,dx[j]+sz/2,cy+sz/2],null,l);}
   if(has(c.barriers,die)){
    var size=j==0?173:118;
    var barrier=place(ROOT+'assets/effets/barrier.png','DEF D'+die+' - BARRIERE',[dx[j]-size/2,cy-size/2,dx[j]+size/2,cy+size/2]);
    barrier.move(l,ElementPlacement.PLACEAFTER);
   }
  }
  map[192].name='04 ATK - D6 a D1';map[137].name='05 DEF - D6 a D1';map[135].name='06 CADRE FIXE ET ILLUSTRATION';
  map[48].name='CADRE GENERAL - couleur de rarete independante';
  if(c.frame_hue!==undefined && c.frame_hue!==null)colorize(map[48],c.frame_hue,null);
  cleanHidden(doc);
  var frame=map[135];
  for(j=frame.layers.length-1;j>=0;j--){var fl=frame.layers[j];if(fl.typename=='ArtLayer'&&fl.id!=17&&fl.id!=11&&fl.id!=442&&fl.id!=234)fl.grouped=true;}
  var state=doc.layerSets.add();state.name='ETAT SANS CRISTAL - voir guide';state.visible=false;
  var note=text('REGLE SANS CRISTAL','NEUTRE','Crystal',7,445,1265,'98CBE8',Justification.CENTER,200,state);
  var options=new PhotoshopSaveOptions();options.layers=true;options.embedColorProfile=true;
  doc.saveAs(new File(ROOT+'templates/'+c.slug+'.psd'),options,true);
  var flat=doc.duplicate(c.slug+'_PRINT',true);
  var tiff=new TiffSaveOptions();tiff.embedColorProfile=true;tiff.imageCompression=TIFFEncoding.TIFFLZW;tiff.layers=false;
  flat.saveAs(new File(ROOT+'impression/'+c.slug+'.tif'),tiff,true);
  flat.changeMode(ChangeMode.RGB);flat.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
  flat.saveAs(new File(ROOT+'cartes/'+c.slug+'.png'),new PNGSaveOptions(),true);flat.close(SaveOptions.DONOTSAVECHANGES);
  var values={};
  function collect(p){for(var k=0;k<p.layers.length;k++){var q=p.layers[k];if(q.typename=='LayerSet')collect(q);else if(q.kind==LayerKind.TEXT)values[q.name]=q.textItem.contents;}}
  collect(doc);
  write(ROOT+'verification/'+c.slug+'_layers.txt',values.toSource());
  results.push({slug:c.slug,width:doc.width.as('px'),height:doc.height.as('px'),resolution:doc.resolution,profile:doc.colorProfileName,descriptionBounds:map[862].bounds.toString()});
  doc.close(SaveOptions.DONOTSAVECHANGES);
 }
 try {
  for(var i=0;i<cards.length;i++)if(config.names.length==0||has(config.names,cards[i].name))build(cards[i]);
  write(ROOT+'verification/build_result.txt',results.toSource());
 } catch(e){write(ROOT+'verification/build_error.txt','line '+e.line+': '+e.message);throw e;}
 finally{app.displayDialogs=dialogs;app.preferences.rulerUnits=units;}
 return 'Exported '+results.length+' cards';
})();
