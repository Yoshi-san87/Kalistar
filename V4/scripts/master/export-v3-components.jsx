#target photoshop
(function(){
 var root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/',out=root+'V4/master/components/v3/';
 var previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs,source=null,temp=null,opened=false;
 app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;new Folder(out).create();
 function find(p,id){for(var i=0;i<p.layers.length;i++){var l=p.layers[i];if(l.id===id)return l;if(l.typename==='LayerSet'){var f=find(l,id);if(f)return f;}}return null;}
 try{
  var file=new File(root+'V3/templates/13_ELECTRO_TAULIO.psd');
  for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName===file.fsName){source=app.documents[i];break;}}catch(e){}
  if(!source){source=app.open(file);opened=true;}
  var jobs=[['atk-small',[438]],['atk-large',[78,1078]],['def-small',[152]],['def-large',[79]],['role-atk',[421]],['role-def',[455,448,449,450]],['position',[1076]]];
  for(var i=0;i<jobs.length;i++){
   temp=source.duplicate(jobs[i][0]);
   var wanted=jobs[i][1];
   function wantedId(id){for(var k=0;k<wanted.length;k++)if(wanted[k]===id)return true;return false;}
   function isolate(p){var any=false;for(var k=0;k<p.layers.length;k++){var l=p.layers[k],show=l.typename==='LayerSet'?isolate(l):wantedId(l.id);l.visible=show;if(show&&l.typename==='ArtLayer')try{l.grouped=false;}catch(e){}any=any||show;}return any;}
   if(!isolate(temp))throw Error('Composant V3 absent: '+jobs[i][0]);
   app.activeDocument=temp;
   temp.changeMode(ChangeMode.RGB);temp.convertProfile('sRGB IEC61966-2.1',Intent.RELATIVECOLORIMETRIC,true,true);
   temp.saveAs(new File(out+jobs[i][0]+'.png'),new PNGSaveOptions(),true);temp.close(SaveOptions.DONOTSAVECHANGES);temp=null;
  }
  return '7 composants exportes depuis les calques V3, source intacte.';
 }finally{if(temp)temp.close(SaveOptions.DONOTSAVECHANGES);if(source&&opened)source.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
