'use strict';
const assert=require('node:assert/strict');
function verify(native){
 for(const [name,size,caps]of [['NOM',10,'TextCase.NORMAL'],['TITLE',7.68,'TextCase.ALLCAPS']]){
  const style=native.typography?.[name],layer=native.layers.find(l=>l.name===name);
  assert(style&&layer);assert.equal(layer.kind,'LayerKind.TEXT');
  assert.equal(style.font,'TimesNewRomanPSMT');assert.equal(layer.font,style.font);
  assert(Math.abs(style.sizePt-size)<.001&&Math.abs(layer.sizePt-size)<.001);
  assert.equal(style.capitalization,caps);assert.equal(style.tracking,0);
  assert.equal(style.fauxBold,false);assert.equal(style.fauxItalic,false);
 }
 const name=native.layers.find(l=>l.name==='NOM'),[left,top,right,bottom]=name.ink;
 const accented=/[\u0300-\u036f]/.test(name.text.normalize('NFD'));
 // At native 300 dpi, Times 10 pt capitals are 28-30 px; the acute adds 9 px.
 // Keep the exact font size and require the complete ink inside the title inset.
 assert(bottom-top>=25&&bottom-top<=(accented?42:35));
 assert(left>=214&&right<=685&&top>=106&&bottom<=153);
 assert(Math.abs((left+right)/2-449.5)<=1&&Math.abs((top+bottom)/2-129.5)<=1);
 return {styles:native.typography,accented,nameInk:name.ink};
}
module.exports={verify};
