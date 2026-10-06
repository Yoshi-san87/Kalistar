(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarWeaponArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Presentation revisions never alter equipment snapshots or their stable art keys.
  const entries={
    'cryptown-oath-sword':Object.freeze({key:'cryptown-oath-sword-v1',scene:'cryptown-oath-sword-scene-v2.webp',rim:'cryptown-oath-sword-ring-v1.webp',body:'cryptown-oath-sword-v1.webp',color:'#c5a0f8'}),
    'cryptown-vigil-rifle':Object.freeze({key:'cryptown-vigil-rifle-v1',scene:'cryptown-vigil-rifle-scene-v1.webp',rim:'cryptown-vigil-rifle-ring-v1.webp',body:'cryptown-vigil-rifle-v1.webp',color:'#ba92f0'}),
    'cryptown-watch-flail':Object.freeze({key:'cryptown-watch-flail-v1',scene:'cryptown-watch-flail-scene-v1.webp',rim:'cryptown-watch-flail-ring-v1.webp',body:'cryptown-watch-flail-v1.webp',color:'#d1a4ff'}),
    'draevenheim-wing-spear':Object.freeze({key:'draevenheim-wing-spear-v1',scene:'draevenheim-wing-spear-scene-v2.webp',rim:'draevenheim-wing-spear-ring-v1.webp',body:'draevenheim-wing-spear-v1.webp',color:'#f49191'}),
    'draevenheim-crimson-crossbow':Object.freeze({key:'draevenheim-crimson-crossbow-v1',scene:'draevenheim-crimson-crossbow-scene-v1.webp',rim:'draevenheim-crimson-crossbow-ring-v1.webp',body:'draevenheim-crimson-crossbow-v1.webp',color:'#ef879c'}),
    'arborium-twinstring-bow':Object.freeze({key:'arborium-twinstring-bow-v1',scene:'arborium-twinstring-bow-scene-v1.webp',rim:'arborium-twinstring-bow-ring-v1.webp',body:'arborium-twinstring-bow-v1.webp',color:'#99f6aa'}),
    'arborium-thorn-dagger':Object.freeze({key:'arborium-thorn-dagger-v1',scene:'arborium-thorn-dagger-scene-v1.webp',rim:'arborium-thorn-dagger-ring-v1.webp',body:'arborium-thorn-dagger-v1.webp',color:'#c2ef89'}),
    'white-oath-rapier':Object.freeze({key:'white-oath-rapier-v1',scene:'white-oath-rapier-scene-v3.webp',rim:'white-oath-rapier-ring-v2.webp',body:'white-oath-rapier-v1.webp',color:'#e5c8ff'}),
    'brotherhood':Object.freeze({key:'brotherhood-v1',scene:'brotherhood-scene-v3.webp',rim:'brotherhood-ring-v2.webp',body:'brotherhood-v1.webp',color:'#85e6fa'}),
    'virtuous-contract':Object.freeze({key:'virtuous-contract-v1',scene:'virtuous-contract-scene-v3.webp',rim:'virtuous-contract-ring-v2.webp',body:'virtuous-contract-v1.webp',color:'#e8efff'}),
    'virtuous-treaty':Object.freeze({key:'virtuous-treaty-v1',scene:'virtuous-treaty-scene-v3.webp',rim:'virtuous-treaty-ring-v2.webp',body:'virtuous-treaty-v1.webp',color:'#bdc8e7'}),
    'socom':Object.freeze({key:'socom-v1',scene:'socom-scene-v3.webp',rim:'socom-ring-v2.webp',body:'socom-v1.webp',color:'#da7676'}),
    'lulu-mog':Object.freeze({key:'lulu-mog-v1',scene:'lulu-mog-scene-v4.webp',rim:'lulu-mog-ring-v2.webp',body:'lulu-mog-v1.webp',color:'#dcafec'}),
    'leopard-lightning':Object.freeze({key:'leopard-lightning-v1',scene:'leopard-lightning-scene-v3.webp',rim:'leopard-lightning-ring-v2.webp',body:'leopard-lightning-v1.webp',color:'#81cfff'}),
    'mythic-iron-gauntlet':Object.freeze({key:'mythic-iron-gauntlet-v1',scene:'mythic-iron-gauntlet-scene-v3.webp',rim:'mythic-iron-gauntlet-ring-v2.webp',body:'mythic-iron-gauntlet-v1.webp',color:'#ddb781'}),
    'post-bow':Object.freeze({key:'post-bow-v1',scene:'post-bow-scene-v3.webp',rim:'post-bow-ring-v2.webp',body:'post-bow-v1.webp',color:'#a8d8b2'}),
    'grimoire-weiss':Object.freeze({key:'grimoire-weiss-v1',scene:'grimoire-weiss-scene-v3.webp',rim:'grimoire-weiss-ring-v2.webp',body:'grimoire-weiss-v1.webp',color:'#e4d7ad'}),
    'gen-mechanical-arm':Object.freeze({key:'gen-mechanical-arm-v1',scene:'gen-mechanical-arm-scene-v3.webp',rim:'gen-mechanical-arm-ring-v2.webp',body:'gen-mechanical-arm-v1.webp',color:'#9ee0db'}),
    'violet-reaping':Object.freeze({key:'violet-reaping-v1',scene:'violet-reaping-scene-v3.webp',rim:'violet-reaping-ring-v2.webp',body:'violet-reaping-v1.webp',color:'#c496f6'}),
    'mantis-mask':Object.freeze({key:'mantis-mask-v1',scene:'mantis-mask-scene-v3.webp',rim:'mantis-mask-ring-v2.webp',body:'mantis-mask-v1.webp',color:'#b1d2a1'}),
    'revolver-gunblade':Object.freeze({key:'revolver-gunblade-v1',scene:'revolver-gunblade-scene-v3.webp',rim:'revolver-gunblade-ring-v2.webp',body:'revolver-gunblade-v1.webp',color:'#a9cde6'}),
    'wolf-steel':Object.freeze({key:'wolf-steel-v1',scene:'wolf-steel-scene-v3.webp',rim:'wolf-steel-ring-v2.webp',body:'wolf-steel-v1.webp',color:'#dcc297'}),
    'wolf-silver':Object.freeze({key:'wolf-silver-v1',scene:'wolf-silver-scene-v3.webp',rim:'wolf-silver-ring-v2.webp',body:'wolf-silver-v1.webp',color:'#c2dced'}),
    'kaine-saw':Object.freeze({key:'kaine-saw-v1',scene:'kaine-saw-scene-v3.webp',rim:'kaine-saw-ring-v2.webp',body:'kaine-saw-v2.webp',color:'#b6deef'}),
    'buster-sword':Object.freeze({key:'buster-sword-v1',scene:'buster-sword-scene-v3.webp',rim:'buster-sword-ring-v2.webp',body:'buster-sword-v1.webp',color:'#9ddbaf'}),
    'psg1':Object.freeze({key:'psg1-v1',scene:'psg1-scene-v3.webp',rim:'psg1-ring-v2.webp',body:'psg1-v1.webp',color:'#bdcedd'}),
    'single-action-army':Object.freeze({key:'single-action-army-v1',scene:'single-action-army-scene-v3.webp',rim:'single-action-army-ring-v2.webp',body:'single-action-army-v1.webp',color:'#f0b2a0'}),
    'wardens-spear':Object.freeze({key:'wardens-spear-v1',scene:'wardens-spear-scene-v3.webp',rim:'wardens-spear-ring-v2.webp',body:'wardens-spear-v1.webp',color:'#a4d6b8'}),
    'soldiers-blade':Object.freeze({key:'soldiers-blade-v1',scene:'soldiers-blade-scene-v3.webp',rim:'soldiers-blade-ring-v2.webp',body:'soldiers-blade-v1.webp',color:'#abcfe8'}),
    'commanders-sabre':Object.freeze({key:'commanders-sabre-v1',scene:'commanders-sabre-scene-v3.webp',rim:'commanders-sabre-ring-v2.webp',body:'commanders-sabre-v1.webp',color:'#ecc597'}),
  };
  Object.freeze(entries);
  const get=weapon=>entries[weapon.id]?.key===weapon.art?entries[weapon.id]:null;
  return Object.freeze({entries,get});
});
