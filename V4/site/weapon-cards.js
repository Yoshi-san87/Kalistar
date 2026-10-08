(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./weapons.js'):root.KalistarWeapons,node?require('./weapon-art.js'):root.KalistarWeaponArt,node?require('./base-weapons.js'):root.KalistarBaseWeapons);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarWeaponCards=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(catalogue,artwork,baseWeapons){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // All anchors refer to the supplied raster, before its outer margin is cropped.
  const layout={version:3,width:1482,height:1061,crop:{x:28,y:64,width:1425,height:916},ratio:[7,5],
    frame:'blue-copper-template-v1.webp',
    zones:{title:[330,123,915,102],family:[1255,128,88,88],art:[67,244,738,670],lore:[858,259,512,168],
      activationTitle:[949,422,340,46],activation:[863,477,498,265],bearers:[858,846,512,92],
      bonus:[390,884,238,66],medallion:[32.5,62.92,275,275],holder:[90,746,131,204]},
    artPolygon:[[0,0],[97.5,0],[100,4],[100,86],[90,99],[81,99],[76,94],[37,94],[31,99],[10,99],[0,89]]};
  const faces={
    'fallen-king-axe':{number:'ARM-001',illustration:'fallen-king-axe-scene-v1.webp',
      flavour:'Sa lame porte le poids d\u2019un royaume.',
      alt:'La Hache du Roi D\u00e9chu, grav\u00e9e d\u2019une couronne bris\u00e9e, contre les vestiges d\u2019un tr\u00f4ne de pierre.'},
    'little-joys-flute':{number:'ARM-002',illustration:'little-joys-flute-scene-v1.webp',
      flavour:'M\u00eame les choses cass\u00e9es sourient.',
      alt:'La fl\u00fbte traversi\u00e8re de Momo, illumin\u00e9e de filaments \u00e9lectriques, sur un \u00e9tabli de Chroma.'}
  };
  for(const weapon of catalogue.weapons)if(weapon.collectible){
    const art=artwork?.get(weapon);
    faces[weapon.id]={...weapon.collectible,...(art?{illustration:art.scene,cutout:false,alt:weapon.name+", peinture de l'arme en situation."}: {})};
  }
  const backgrounds={
    'white-oath-rapier':'white-courtyard-v1.webp',brotherhood:'besaid-shore-v1.webp',
    'virtuous-contract':'city-ruins-v1.webp','virtuous-treaty':'city-ruins-v1.webp',
    socom:'shadow-moses-v1.webp','lulu-mog':'besaid-shore-v1.webp',
    'leopard-lightning':'chroma-v1.webp','mythic-iron-gauntlet':'durane-v1.webp',
    'post-bow':'postal-relay-v1.webp','grimoire-weiss':'replicant-village-v1.webp',
    'gen-mechanical-arm':'mechanic-workshop-v1.webp','violet-reaping':'violet-sanctum-v1.webp',
    'mantis-mask':'psychic-study-v1.webp','revolver-gunblade':'balamb-v1.webp',
    'wolf-steel':'wolf-keep-v1.webp','wolf-silver':'wolf-keep-v1.webp',
    'kaine-saw':'replicant-village-v1.webp','buster-sword':'midgar-v1.webp',
    psg1:'shadow-moses-v1.webp','single-action-army':'shadow-moses-v1.webp',
    'wardens-spear':'wolf-keep-v1.webp','soldiers-blade':'durane-v1.webp',
    'commanders-sabre':'white-courtyard-v1.webp'
  };
  function deepFreeze(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')deepFreeze(v);});return Object.freeze(value);}
  deepFreeze(layout);deepFreeze(faces);deepFreeze(backgrounds);
  function activation(w){
    const e=w.effect,bonus=`+${e.value} ${e.stat}`;
    if(e.trigger==='ONCE_DEFENSE')return {condition:w.condition,effect:bonus+(e.recipient==='self'?' à sa prochaine défense.':e.recipient==='ally'?' à un allié au choix.':e.recipient==='deployed'?' au renfort.':' au bénéficiaire.'),duration:'1 défense · 1 fois par partie.'};
    if(e.trigger==='FIRST_DEFENSE')return {condition:'Premi\u00e8re d\u00e9fense.',effect:bonus+' pour ce duel.',duration:'Une fois par partie.'};
    if(e.trigger==='AFTER_BLOCK')return {condition:'Apr\u00e8s un Block r\u00e9ussi.',effect:bonus+' \u00e0 sa prochaine d\u00e9fense.',duration:'Une fois par partie.'};
    if(e.trigger==='LAST_STANDING')return {condition:'Dernier combattant actif de son \u00e9quipe.',effect:bonus+'.',duration:'Tant qu\u2019il reste seul.'};
    if(e.trigger==='TEAM_STATE'){
      const q=e.when,condition=q.outnumbered?'En inf\u00e9riorit\u00e9 num\u00e9rique.':q.activeAtMost===1?'Seul combattant actif.':q.activeAtMost===2?'Deux combattants actifs ou moins.':'R\u00e9serve vide.';
      return {condition,effect:bonus+'.',duration:'Condition maintenue.'};
    }
    if(e.trigger==='AFTER_SUPPORT'){
      const supports=e.supports.map(s=>({luck:'nouveau tr\u00e8fle',mana:'nouvelle potion'}[s]||s)).join(' ou ');
      return {condition:supports.charAt(0).toUpperCase()+supports.slice(1)+'.',effect:`${bonus} au b\u00e9n\u00e9ficiaire.`,duration:'Prochain duel \u00b7 1 charge.'};
    }
    return {condition:w.condition,effect:bonus+'.',duration:''};
  }
  function zone(name){
    const [x,y,w,h]=layout.zones[name],c=layout.crop;
    return `left:${(x-c.x)/c.width*100}%;top:${(y-c.y)/c.height*100}%;width:${w/c.width*100}%;height:${h/c.height*100}%;`;
  }
  function bearers(w,cards){
    return Object.entries(w.restrictions).map(([key,values])=>({label:{characterIds:'Porteur',jobs:'Job',families:'Arme de base',factions:'Faction',races:'Race'}[key]||key,
      names:values.map(id=>key==='characterIds'?cards.find(c=>c.characterId===id)?.name||id:id).join(' / ')}));
  }
  function compactBearers(w,cards){
    const groups=bearers(w,cards).filter(g=>g.label!=='Arme de base'),names=groups.find(g=>g.label==='Porteur')?.names;
    if(names)return names;
    const jobs=w.restrictions.jobs||[];
    if(w.restrictions.factions)return groups.map(g=>g.names).join(' \u00b7 ');
    if(jobs.length===2&&jobs.includes('GARDIEN')&&jobs.includes('GARDIENNE'))return 'GARDIEN(NE)';
    if(jobs.length===2&&jobs.includes('COMMANDANT')&&jobs.includes('COMMANDANTE'))return 'CMDT / CMDTE';
    return groups.map(g=>g.names).join(' / ');
  }
  function markup(w,{cards=[],medallion=()=>'',url=p=>p,carrier=null,cardImage=c=>c.pngUrl}={}){
    const face=faces[w.id]||{number:w.id,flavour:w.lore,alt:w.name},c=layout.crop,rule=activation(w);
    const src=face.illustration?url('assets/weapon-cards/'+face.illustration):null;
    const background=face.cutout&&backgrounds[w.id]?url('assets/weapon-cards/backgrounds/'+backgrounds[w.id]):null;
    const frame=url('assets/weapon-cards/'+layout.frame),polygon=layout.artPolygon.map(p=>p.join('% ')+'%').join(',');
    const kind=catalogue.kind(w),category=catalogue.categories[kind];
    return `<span class="wc-surface" data-kind="${kind}" data-weapon-card="${esc(w.id)}" style="aspect-ratio:${layout.ratio.join('/')}">
      <span class="wc-frame-clip" aria-hidden="true"><img class="wc-frame" src="${esc(frame)}" alt="" draggable="false" style="left:${-c.x/c.width*100}%;top:${-c.y/c.height*100}%;width:${layout.width/c.width*100}%;height:${layout.height/c.height*100}%"></span>
      ${src?`<span class="wc-art${face.cutout?' wc-art-cutout':''}${background?' wc-art-scenic':''}" style="${zone('art')}clip-path:polygon(${polygon})">${background?`<img class="wc-art-background" src="${esc(background)}" alt="" aria-hidden="true" draggable="false">`:''}<img class="wc-art-main" src="${esc(src)}" alt="${esc(face.alt)}" draggable="false"></span>`:''}
      <span class="wc-title" style="${zone('title')}"><strong>${esc(w.name)}</strong></span>
      <span class="wc-family" style="${zone('family')}" title="${esc(w.family)}" ${kind!=='weapon'?`role="img" aria-label="${esc(category.singular)}"`:''}>${kind==='weapon'?`<img src="${esc(url(baseWeapons.asset(baseWeapons.code(w.family))))}" alt="Famille : ${esc(w.family)}" draggable="false">`:`<i data-lucide="${category.icon}" aria-hidden="true"></i>`}</span>
      <span class="wc-medallion" style="${zone('medallion')}">${medallion(w,{bonus:false})}</span>
      <span class="wc-flavour" style="${zone('lore')}">${esc(face.flavour)}</span>
      <span class="wc-activation-title" style="${zone('activationTitle')}">Activation</span>
      <span class="wc-activation" style="${zone('activation')}">
        <span class="wc-rule wc-rule-condition" aria-label="Condition : ${esc(rule.condition)}"><i data-lucide="key-round" aria-hidden="true"></i><span>${esc(rule.condition)}</span></span>
        <span class="wc-rule wc-rule-effect" aria-label="Effet : ${esc(rule.effect+' '+rule.duration)}"><i data-lucide="${w.effect.stat==='DEF'?'shield-plus':'sword'}" aria-hidden="true"></i><span>${esc(rule.effect)}${rule.duration?`<span class="wc-rule-note">${esc(rule.duration)}</span>`:''}</span></span>
      </span>
      <span class="wc-power" style="${zone('bonus')}"><b>+${esc(w.effect.value)}</b> <span>${esc(w.effect.stat)}</span></span>
      <span class="wc-bearers" style="${zone('bearers')}" title="${esc(bearers(w,cards).map(b=>b.label+' : '+b.names).join(' ; '))}"><span><b>${esc(compactBearers(w,cards))}</b></span></span>
      <span class="wc-holder ${carrier?'is-filled':'is-empty'}" style="${zone('holder')}">${carrier?`<img src="${esc(cardImage(carrier))}" alt="${esc(carrier.name)}" draggable="false">`:'<i data-lucide="plus" aria-hidden="true"></i>'}</span>
    </span>`;
  }
  return Object.freeze({layout,faces,backgrounds,activation,bearers,markup,zone});
});
