#target photoshop
(function(){
 var root=File($.fileName).parent.parent.parent.parent.fsName.replace(/\\/g,'/')+'/',previous=app.documents.length?app.activeDocument:null,units=app.preferences.rulerUnits,doc=null,opened=false;
 function json(v){if(v===null)return 'null';if(typeof v==='string')return '"'+v.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')+'"';if(typeof v!=='object')return String(v);var a=[];if(v instanceof Array){for(var i=0;i<v.length;i++)a.push(json(v[i]));return '['+a.join(',')+']';}for(var k in v)a.push(json(k)+':'+json(v[k]));return '{'+a.join(',')+'}';}
 app.preferences.rulerUnits=Units.PIXELS;
 try{
  var file=new File(root+'V3/templates/13_ELECTRO_TAULIO.psd');
  for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName===file.fsName){doc=app.documents[i];break;}}catch(e){}
  if(!doc){doc=app.open(file);opened=true;}
  var report={width:doc.width.as('px'),height:doc.height.as('px'),ppi:doc.resolution,profile:doc.colorProfileName,layers:[]};
  function walk(p,prefix){for(var i=0;i<p.layers.length;i++){var l=p.layers[i],b=l.bounds,item={id:l.id,name:l.name,path:prefix+l.name,visible:l.visible,type:l.typename,opacity:l.opacity,blend:String(l.blendMode),bounds:[b[0].as('px'),b[1].as('px'),b[2].as('px'),b[3].as('px')]};if(l.typename==='ArtLayer'){item.kind=String(l.kind);item.fillOpacity=l.fillOpacity;item.grouped=l.grouped;}report.layers.push(item);if(l.typename==='LayerSet')walk(l,prefix+l.name+'/');}}
  walk(doc,'');var f=new File(root+'V4/master/components/v3-audit.json');f.encoding='UTF8';f.open('w');f.write(json(report));f.close();return report.layers.length+' calques V3 inventories.';
 }finally{if(doc&&opened)doc.close(SaveOptions.DONOTSAVECHANGES);app.preferences.rulerUnits=units;if(previous)try{app.activeDocument=previous;}catch(e){}}
})();
