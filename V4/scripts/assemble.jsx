#target photoshop
(function(){
 var ROOT='C:/Users/guill/Documents/Doc/GP-2 inside/Cartes/Kalistar/',V4=ROOT+'V4/',V3=ROOT+'V3/';
 var units=app.preferences.rulerUnits,dialogs=app.displayDialogs,previous=app.documents.length?app.activeDocument:null;
 var source=null,doc=null,temp=null,map={};app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
 function write(p,s){var f=new File(p);f.encoding='UTF8';f.open('w');f.write(s);f.close();}
 function read(p){var f=new File(p);f.encoding='UTF8';f.open('r');var s=f.read();f.close();return eval('('+s+')');}
 function index(p,m){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];m[l.id]=l;if(l.typename=='LayerSet')index(l,m);}}
 function b(l){var z=l.bounds;return[z[0].as('px'),z[1].as('px'),z[2].as('px'),z[3].as('px')];}
 function color(hex){var c=new SolidColor();c.rgb.hexValue=hex;return c;}
 function centre(l,x,y){var z=b(l);l.translate(x-(z[0]+z[2])/2,y-(z[1]+z[3])/2);return l;}
 function hide(id){if(map[id])map[id].visible=false;}
 function group(name){var anchor=doc.layers[0],g=doc.layerSets.add();g.name=name;g.move(anchor,ElementPlacement.PLACEBEFORE);return g;}
 function findDoc(path){for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName.replace(/\\/g,'/')==path)return app.documents[i];}catch(e){}return null;}
 function ellipse(x,y,r){var a=new ActionDescriptor(),ref=new ActionReference(),z=new ActionDescriptor();ref.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));a.putReference(charIDToTypeID('null'),ref);z.putUnitDouble(charIDToTypeID('Top '),charIDToTypeID('#Pxl'),y-r);z.putUnitDouble(charIDToTypeID('Left'),charIDToTypeID('#Pxl'),x-r);z.putUnitDouble(charIDToTypeID('Btom'),charIDToTypeID('#Pxl'),y+r);z.putUnitDouble(charIDToTypeID('Rght'),charIDToTypeID('#Pxl'),x+r);a.putObject(charIDToTypeID('T   '),charIDToTypeID('Elps'),z);executeAction(charIDToTypeID('setd'),a,DialogModes.NO);}
 function alpha(id){var a=new ActionDescriptor(),target=new ActionReference(),source=new ActionReference();target.putProperty(charIDToTypeID('Chnl'),charIDToTypeID('fsel'));a.putReference(charIDToTypeID('null'),target);source.putEnumerated(charIDToTypeID('Chnl'),charIDToTypeID('Chnl'),charIDToTypeID('Trsp'));source.putIdentifier(charIDToTypeID('Lyr '),id);a.putReference(charIDToTypeID('T   '),source);executeAction(charIDToTypeID('setd'),a,DialogModes.NO);}
 function originalCutout(parent){var l=map[17].duplicate(parent,ElementPlacement.INSIDE);l.visible=true;l.grouped=false;doc.activeLayer=l;l.rasterize(RasterizeType.ENTIRELAYER);alpha(l.id);var z=doc.selection.bounds;if(Math.abs(z[0].as('px')-65)>1||Math.abs(z[2].as('px')-830)>1)throw new Error('Invalid cutout');l.remove();}
 function place(file,name,box,parent,contain){
  var a=new ActionDescriptor();a.putPath(charIDToTypeID('null'),new File(file));a.putEnumerated(charIDToTypeID('FTcs'),charIDToTypeID('QCSt'),charIDToTypeID('Qcsa'));executeAction(charIDToTypeID('Plc '),a,DialogModes.NO);
  var l=doc.activeLayer,z=b(l),sx=100*(box[2]-box[0])/(z[2]-z[0]),sy=100*(box[3]-box[1])/(z[3]-z[1]);l.name=name;if(contain)sx=sy=Math.min(sx,sy);l.resize(sx,sy,AnchorPosition.MIDDLECENTER);centre(l,(box[0]+box[2])/2,(box[1]+box[3])/2);if(parent)l.move(parent,ElementPlacement.INSIDE);return l;
 }
 function fit(l,w){for(var i=0;i<30&&b(l)[2]-b(l)[0]>w;i++)l.textItem.size=UnitValue(l.textItem.size.as('pt')*.97,'pt');}
 function text(name,value,font,size,x,y,hex,parent,w){var l=doc.artLayers.add();l.kind=LayerKind.TEXT;l.name=name;var t=l.textItem;t.font=font;t.size=UnitValue(size,'pt');t.contents=value;t.color=color(hex);t.justification=Justification.CENTER;t.position=[UnitValue(x,'px'),UnitValue(y,'px')];if(w)fit(l,w);centre(l,x,y);l.move(parent,ElementPlacement.INSIDE);return l;}
 function exportCrop(flat,box,path){var d=flat.duplicate('V4 detail temporaire',true);d.crop(box);d.saveAs(new File(path),new PNGSaveOptions(),true);d.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=doc;}
 function prepareFlag(){
  var path=V3+'assets/factions/Chroma.png',f=findDoc(path),opened=!f;if(!f)f=app.open(new File(path));temp=f.duplicate('V4 tissu Chroma');
  temp.selection.select([[30,48],[134,48],[134,188],[86,324],[78,324],[30,188]],SelectionType.REPLACE,0,true);temp.selection.invert();temp.selection.clear();temp.selection.deselect();temp.trim(TrimType.TRANSPARENT,true,true,true,true);
  temp.saveAs(new File(V4+'assets/chroma-tissu.png'),new PNGSaveOptions(),true);temp.close(SaveOptions.DONOTSAVECHANGES);temp=null;if(opened)f.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=doc;
 }
 try{
  write(V4+'verification/build-status.txt','Assembly in progress - generated structure, original V3 sources.');
  source=findDoc(V3+'templates/01_ELECTRO_MOMO.psd');if(!source)source=app.open(new File(V3+'templates/01_ELECTRO_MOMO.psd'));
  doc=source.duplicate('MOMO V4 - reprise artistique');index(doc,map);
  var card=read(V4+'donnees/momo.json'),metrics=read(V4+'donnees/metriques.json'),artBefore=b(map[1065]);
  prepareFlag();
  var old=[1039,1059,1071,863,128,124,131,61,72,141,298,1074,1068,1069,1070];for(var i=0;i<old.length;i++)hide(old[i]);
  // Assembly only: structure-basse.png is generated artwork, not drawn here.
  var margin=group('V4 - MARGE PHYSIQUE ORIGINALE'),matte=doc.artLayers.add();matte.name='Marge noire';matte.move(margin,ElementPlacement.INSIDE);originalCutout(margin);doc.activeLayer=matte;doc.selection.invert();doc.selection.fill(color('000000'));doc.selection.deselect();margin.allLocked=true;
  var structure=group('V4 - STRUCTURE ILLUSTREE - image generee');
  var panel=place(V4+'assets/structure-basse.png','Bas de carte - metal patine et cuir bleu',[65,1068,830,1438],structure,false);
  doc.activeLayer=panel;panel.rasterize(RasterizeType.ENTIRELAYER);originalCutout(structure);doc.activeLayer=panel;doc.selection.invert();doc.selection.clear();doc.selection.deselect();structure.allLocked=true;
  var content=group('V4 - CONTENU EDITABLE');
  text('VERSION',card.title,'Augustus',5.9,447.5,1098,'F3E7D8',content,555);
  text('METIER',card.job,'Augustus',5,291,1176,'ECDB74',content,174);
  text('RACE',card.race,'Augustus',5,604,1176,'ECDB74',content,148);
  var weapon=map[1066].duplicate(content,ElementPlacement.INSIDE);weapon.visible=true;weapon.resize(102,102,AnchorPosition.MIDDLECENTER);centre(weapon,135,1161);weapon.name='ARME Instrument - guitare';
  var race=map[1067].duplicate(content,ElementPlacement.INSIDE);race.visible=true;centre(race,760,1161);race.name='RACE Robot';
  var crystal=map[1073].duplicate(content,ElementPlacement.INSIDE);crystal.visible=true;crystal.resize(110,110,AnchorPosition.MIDDLECENTER);centre(crystal,447.5,1197);crystal.name='CRISTAL ELECTRO';
  var recit=text('RECIT',"Au milieu des rebuts de Chroma, Momo joue pour ceux\rque l'on a oubli\u00e9s. Sa fl\u00fbte \u00e9veille une lumi\u00e8re dans la\rferraille. Il ne sait pas encore si quelqu'un l'\u00e9coute.\rAlors il continue.",'MyriadPro-Regular',5.3,447.5,1324,'E5E8EB',content,600);
  recit.textItem.useAutoLeading=false;recit.textItem.leading=UnitValue(6.2,'pt');centre(recit,447.5,1324);
  var signs=group('V4 - FACTION IDENTIFIANT POSITIONS');
  var barcode=place(V4+'assets/barcode.png','CODE128 '+card.id+' - degrade couleur',[132,848,154,1058],signs,false);
  var flag=place(V4+'assets/chroma-tissu.png','CHROMA - tissu contenu sous la fixation',[691,833,773,1052],signs,true);
  var fb=b(flag);if(fb[0]<690||fb[2]>774||fb[1]<831||fb[3]>1054)throw new Error('Flag exceeds its inner mounting envelope');
  var positionBounds=[],positions=card.positions.slice(0).sort(function(a,b){return a-b;});
  if(positions.length>5)throw new Error('Maximum five position badges');
  // Five positions use this same row, in ascending order, without changing size.
  for(i=0;i<positions.length;i++){
   var cx=201+i*59,cy=1025,g=signs.layerSets.add();g.name='POSITION P'+positions[i];
   var housing=map[1076].duplicate(g,ElementPlacement.INSIDE);housing.visible=true;housing.resize(108,108,AnchorPosition.MIDDLECENTER);centre(housing,cx,cy);
   var value=map[1077].duplicate(g,ElementPlacement.INSIDE);value.visible=true;value.textItem.contents=String(positions[i]);value.textItem.size=UnitValue(8,'pt');centre(value,cx,cy);positionBounds.push(b(housing));
  }
  var stats=group('V4 - ENERGIES ET VALEURS EDITABLES');
  var attacks=[{die:6,value:82,base:78,x:141.5,y:147,size:187},{die:5,value:440,base:438,x:155.5,y:371.5,size:132},{die:3,value:430,base:428,x:155.5,y:576.5,size:132},{die:1,value:190,base:205,x:155.5,y:773.5,size:132}];
  for(i=0;i<attacks.length;i++){
   var a=attacks[i],ab=b(map[a.base]);hide(a.base);hide(a.value);doc.activeLayer=map[221];ellipse(a.x,a.y,(ab[2]-ab[0])/2+3);doc.selection.clear();doc.selection.deselect();
   var energy=place(V4+'assets/electricite.png','ATK D'+a.die+' - energie electrique',[a.x-a.size/2,a.y-a.size/2,a.x+a.size/2,a.y+a.size/2],stats,true);
   var em=metrics['electricite.png'];energy.translate((.5-em.centre[0])*a.size,(.5-em.centre[1])*a.size);
   var number=map[a.value].duplicate(stats,ElementPlacement.INSIDE);number.visible=true;fit(number,a.size*.63);centre(number,a.x,a.y);number.name='ATK D'+a.die+' - valeur';
  }
  var effectsOld=[1080,1081,1083,1087,1090,1082,1084,1089];for(i=0;i<effectsOld.length;i++)hide(effectsOld[i]);
  var defs=[{die:6,value:81,base:79,size:168},{die:5,value:118,base:115,size:120},{die:2,value:160,base:158,size:120}];
  for(i=0;i<defs.length;i++){
   var d=defs[i],db=b(map[d.base]),dx=(db[0]+db[2])/2,dy=(db[1]+db[3])/2;
   place(V3+'assets/effets/barrier.png','DEF D'+d.die+' - barriere recentree',[dx-d.size/2,dy-d.size/2,dx+d.size/2,dy+d.size/2],stats,true);
   var dn=map[d.value].duplicate(stats,ElementPlacement.INSIDE);dn.visible=true;hide(d.value);centre(dn,dx,dy);dn.name='DEF D'+d.die+' - valeur';
  }
  var symbols=[{id:1085,key:'retry',x:155.5,y:475.5,size:60},{id:1086,key:'retry',x:734.5,y:475.5,size:60},{id:1088,key:'mana',x:155.5,y:676.5,size:60}];
  for(i=0;i<symbols.length;i++){
   var s=symbols[i];hide(s.id);var icon=place(V3+'assets/effets/'+s.key+'.png','EFFET '+s.key+' - centre visuel',[s.x-s.size/2,s.y-s.size/2,s.x+s.size/2,s.y+s.size/2],stats,true),ib=b(icon),im=metrics[s.key];icon.translate((.5-im.centre[0])*(ib[2]-ib[0]),(.5-im.centre[1])*(ib[3]-ib[1]));
  }
  for(i=0;i<old.length;i++)hide(old[i]);
  for(i=0;i<map[135].layers.length;i++){var fl=map[135].layers[i];if(fl.typename=='ArtLayer'&&fl.id!=17&&fl.id!=11&&fl.id!=442&&fl.id!=234)fl.grouped=true;}
  map[1065].allLocked=true;map[1065].name='ILLUSTRATION MOMO V3 - INCHANGEE';
  app.refresh();var psd=new PhotoshopSaveOptions();psd.layers=true;psd.embedColorProfile=true;doc.saveAs(new File(V4+'templates/01_ELECTRO_MOMO.psd'),psd,true);
  temp=doc.duplicate('V4 export',true);var tif=new TiffSaveOptions();tif.embedColorProfile=true;tif.imageCompression=TIFFEncoding.TIFFLZW;tif.layers=false;temp.saveAs(new File(V4+'impression/01_ELECTRO_MOMO.tif'),tif,true);
  temp.changeMode(ChangeMode.RGB);temp.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);temp.saveAs(new File(V4+'cartes/01_ELECTRO_MOMO.png'),new PNGSaveOptions(),true);
  exportCrop(temp,[50,50,847,1438],V4+'apercus/MOMO-V4-reprise.png');exportCrop(temp,[65,1068,830,1438],V4+'verification/bas-assemble.png');exportCrop(temp,[670,798,805,1068],V4+'verification/drapeau-assemble.png');exportCrop(temp,[110,985,490,1068],V4+'verification/positions.png');
  temp.close(SaveOptions.DONOTSAVECHANGES);temp=null;app.activeDocument=doc;
  write(V4+'verification/assemblage.txt',({width:doc.width.as('px'),height:doc.height.as('px'),ppi:doc.resolution,artBefore:artBefore,artAfter:b(map[1065]),flag:fb,positions:positionBounds,description:b(recit)}).toSource());
  write(V4+'verification/build-status.txt','OK - structure generated, V3 illustration preserved.');doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;return 'Momo V4 exported.';
 }catch(e){write(V4+'verification/build-status.txt','ERROR line '+e.line+': '+e.message);throw e;}
 finally{try{if(temp)temp.close(SaveOptions.DONOTSAVECHANGES);}catch(e){}try{if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);}catch(e){}app.preferences.rulerUnits=units;app.displayDialogs=dialogs;try{if(previous)app.activeDocument=previous;}catch(e){}}
})();
