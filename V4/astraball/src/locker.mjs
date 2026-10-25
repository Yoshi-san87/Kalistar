import { BALLS, ARENAS, getBall, getArena, normalizeAppearance } from './appearance.mjs';
import { POSITIONS } from './roster.mjs';
import { TEAMS } from '../data/teams.mjs';
import { canPlayPosition } from '../data/athletes.mjs';
import { renderAthlete } from './athlete-view.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>'<i data-lucide="'+name+'"></i>';
export const spriteBadge=c=>'<span class="sprite-badge" aria-hidden="true" style="--sprite:url(&quot;'+esc(c.url)+'&quot;)"></span>';

export function renderLocker({host,roster,options,lineups,initial,icons,onSubmit}) {
  let draft={...options,...normalizeAppearance(options),lineups:roster.normalize(lineups)},team=0,role='meneur',tab='teams',loading=false,page=0;
  const pageSize=30;
  const arenaKinds=[['','Tous'],['street','Street'],['official','Officiel'],['legendary','L\u00e9gendaire'],['classic','Classiques']];
  const arenaCity=a=>a.cityId||'astralia',arenaKind=a=>a.kind||'classic';
  const arenaPreview=(a,view='horizontal')=>a.preview||a[view];
  const kindName=a=>arenaKinds.find(([id])=>id===arenaKind(a))?.[1]||arenaKind(a);
  const cities=[...new Map(ARENAS.map(a=>[arenaCity(a),a.city||'Astralia']))].sort((a,b)=>a[1].localeCompare(b[1],'fr'));
  const $=selector=>host.querySelector(selector),tabs=[['teams','users','\u00c9quipes'],['ball','circle-dot','Ballon'],['arena','mountain','Ar\u00e8ne']];
  host.innerHTML=[
    '<nav class="locker-tabs" role="tablist" aria-label="Pr\u00e9paration du match">',
    ...tabs.map(([id,i,label])=>'<button role="tab" id="locker-tab-'+id+'" data-locker-tab="'+id+'" aria-controls="locker-panel-'+id+'" aria-selected="'+(id===tab)+'" tabindex="'+(id===tab?0:-1)+'">'+icon(i)+label+'</button>'),
    '</nav><section id="locker-panel-teams" role="tabpanel" aria-labelledby="locker-tab-teams">',
    '<div class="squad-top"><div class="squad-switch" role="group" aria-label="\u00c9quipe \u00e0 composer">',
    ...TEAMS.map(t=>'<button data-team="'+t.id+'" style="--team:'+t.color+'" aria-pressed="'+(t.id===team)+'">'+esc(t.name)+'<small>'+(t.id===0?'Votre \u00e9quipe':'Adversaire')+'</small></button>'),
    '</div><button id="shuffle-team" class="icon" title="\u00c9quipe au hasard" aria-label="\u00c9quipe au hasard">'+icon('shuffle')+'</button><button id="reset-team" class="icon" title="Composition d\u2019origine" aria-label="Composition d\u2019origine">'+icon('rotate-ccw')+'</button></div>',
    '<div class="squad-layout"><div class="squad-lineup" aria-label="Cinq postes"></div><div class="squad-roster"><div class="roster-heading"><h3 id="chosen-position"></h3><label class="roster-search">'+icon('search')+'<input id="character-search" type="search" placeholder="Personnage" aria-label="Rechercher un personnage" autocomplete="off"></label></div><div id="position-stats"></div><div id="character-grid"></div><p id="roster-empty" hidden>Aucun personnage.</p></div></div></section>',
    '<section id="locker-panel-ball" role="tabpanel" aria-labelledby="locker-tab-ball" hidden><div class="ball-selection"><div class="ball-showcase"><span class="eyebrow">ASTRABALL</span><img id="ball-preview" src="'+getBall(draft.ball).url+'" alt=""><h3 id="ball-name"></h3><p id="ball-material"></p></div><fieldset class="ball-options"><legend>Ballon de la rencontre</legend><div class="ball-grid">',
    ...BALLS.map(b=>'<label class="ball-choice"><input type="radio" name="ball" value="'+b.id+'" '+(b.id===draft.ball?'checked':'')+'><img src="'+b.url+'" alt=""><span>'+esc(b.name)+'</span>'+icon('check')+'</label>'),
    '</div></fieldset></div></section>',
    '<section id="locker-panel-arena" role="tabpanel" aria-labelledby="locker-tab-arena" hidden><div class="arena-filters"><label for="arena-city-filter">Ville<select id="arena-city-filter"><option value="">Toutes les villes</option>',
    ...cities.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>'),
    '</select></label><div class="arena-kind-filter"><span id="arena-kind-label">Type de terrain</span><div class="arena-kind-segments" role="group" aria-labelledby="arena-kind-label">',
    ...arenaKinds.map(([id,name])=>'<button type="button" data-arena-kind="'+id+'" aria-pressed="'+(id==='')+'">'+name+'</button>'),
    '</div><select id="arena-kind-filter" aria-labelledby="arena-kind-label">',
    ...arenaKinds.map(([id,name])=>'<option value="'+id+'">'+name+'</option>'),
    '</select></div><button type="button" id="arena-filter-reset" class="icon" title="Effacer les filtres" aria-label="Effacer les filtres" disabled>'+icon('filter-x')+'</button></div>',
    '<div class="arena-selection"><div class="arena-showcase"><img id="arena-preview" src="'+esc(arenaPreview(getArena(draft.arena),draft.view))+'" alt="" decoding="async"><div class="arena-caption"><div class="arena-details" aria-live="polite"><div class="arena-location">'+icon('map-pin')+'<span id="arena-region"></span><span id="arena-kind" class="arena-kind"></span></div><h3 id="arena-name"></h3><p id="arena-surface"></p></div><div class="locker-view" role="group" aria-label="Vue du terrain"><button type="button" data-view="horizontal" title="Vue HD-2D" aria-label="Vue HD-2D" aria-pressed="'+(draft.view==='horizontal')+'">'+icon('grid-2x2')+'</button><button type="button" data-view="isometric" title="Vue isom\u00e9trique" aria-label="Vue isom\u00e9trique" aria-pressed="'+(draft.view==='isometric')+'">'+icon('layers')+'</button></div></div></div>',
    '<div class="arena-catalog"><div class="arena-list-heading"><h3 id="arena-list-title">Lieu de la rencontre</h3><span id="arena-count" role="status"></span></div><fieldset class="arena-options" aria-labelledby="arena-list-title">',
    ...ARENAS.map(a=>'<label class="arena-choice" data-arena-city="'+esc(arenaCity(a))+'" data-arena-type="'+esc(arenaKind(a))+'"><input type="radio" name="arena" value="'+esc(a.id)+'" '+(a.id===draft.arena?'checked':'')+'><img src="'+esc(arenaPreview(a))+'" alt="" loading="lazy" decoding="async" data-pixel="'+Boolean(a.pixel)+'"><span class="arena-choice-name">'+esc(a.name)+'<small>'+esc(a.city||'Astralia')+'</small><small class="arena-kind" data-kind="'+esc(arenaKind(a))+'">'+esc(kindName(a))+'</small></span>'+icon('check')+'</label>'),
    '</fieldset><p id="arena-empty" role="status" hidden>Aucun terrain pour ces filtres.</p></div></div></section>',
    '<div class="locker-bottom"><div class="locker-options"><label>Rencontre<select id="match-mode"><option value="solo" '+(draft.mode==='solo'?'selected':'')+'>Solo contre l\u2019IA</option><option value="hotseat" '+(draft.mode==='hotseat'?'selected':'')+'>Deux joueurs, m\u00eame \u00e9cran</option></select></label><div class="locker-toggles"><label>Sons<input type="checkbox" id="sound-option" '+(draft.sound?'checked':'')+'></label><label>Animations<input type="checkbox" id="motion-option" '+(draft.motion?'checked':'')+' '+(matchMedia('(prefers-reduced-motion: reduce)').matches?'disabled':'')+'></label></div></div><div class="locker-summary" aria-live="polite"></div>',
    initial?'':'<p class="replace-warning">Les compositions sont appliqu\u00e9es au nouveau match, qui remplace la rencontre enregistr\u00e9e.</p>',
    '<p id="locker-error" role="alert" hidden></p><div class="dialog-actions">',
    initial?'':'<button id="apply-options">Reprendre</button>',
    '<button id="new-match" class="primary">'+icon('play')+'<span>'+(initial?'Entrer sur le terrain':'Nouveau match')+'</span></button></div></div>',
  ].join('');
  function summarize(){$('.locker-summary').textContent='Chroma 5/5  \u00b7  Obsidienne 5/5  \u00b7  '+getBall(draft.ball).name+'  \u00b7  '+getArena(draft.arena).name;}
  function showBall(){const b=getBall(draft.ball);$('#ball-preview').src=b.url;$('#ball-preview').alt=b.name;$('#ball-name').textContent=b.name;$('#ball-material').textContent=b.material;summarize();}
  function showArena(){
    const a=getArena(draft.arena),preview=$('#arena-preview');
    preview.src=arenaPreview(a,draft.view);preview.alt=a.name;preview.dataset.pixel=String(Boolean(a.pixel));
    $('#arena-region').textContent=a.city||'Astralia';$('#arena-region').title=a.region||'';
    $('#arena-kind').textContent=kindName(a);$('#arena-kind').dataset.kind=arenaKind(a);
    $('#arena-name').textContent=a.name;$('#arena-surface').textContent=a.surface||'';
    for(const button of host.querySelectorAll('[data-view]')){
      const view=button.dataset.view,available=(a.views||['horizontal','isometric']).includes(view)&&Boolean(a[view]);
      button.disabled=!available;button.setAttribute('aria-pressed',String(available&&view===draft.view));
      button.title=(view==='horizontal'?'Vue HD-2D':'Vue isom\u00e9trique')+(available?'':' indisponible pour ce terrain');
      button.setAttribute('aria-label',button.title);
    }
    summarize();
  }
  function filterArenas(){
    const city=$('#arena-city-filter').value,kind=$('#arena-kind-filter').value;
    let count=0;
    for(const choice of host.querySelectorAll('.arena-choice')){
      choice.hidden=Boolean((city&&choice.dataset.arenaCity!==city)||(kind&&choice.dataset.arenaType!==kind));
      if(!choice.hidden)count++;
    }
    for(const button of host.querySelectorAll('[data-arena-kind]'))button.setAttribute('aria-pressed',String(button.dataset.arenaKind===kind));
    $('#arena-count').textContent=count+' terrain'+(count===1?'':'s');$('#arena-empty').hidden=count!==0;
    $('.arena-options').hidden=count===0;$('.arena-options').scrollTop=0;
    $('#arena-filter-reset').disabled=!city&&!kind;
  }
  function lineup(){
    $('.squad-lineup').innerHTML=POSITIONS.map(p=>{
      const c=roster.get(draft.lineups[team][p.id]);
      return '<button class="lineup-slot" data-position="'+p.id+'" aria-pressed="'+(role===p.id)+'" style="--team:'+TEAMS[team].color+'">'+icon(p.icon)+spriteBadge(c)+'<span><small>'+p.name+'</small><b>'+esc(c.name)+'</b></span>'+icon('chevron-right')+'</button>';
    }).join('');
    for(const button of host.querySelectorAll('[data-position]'))button.onclick=()=>{role=button.dataset.position;page=0;lineup();characters();};
    $('#chosen-position').textContent=POSITIONS.find(p=>p.id===role).name;
    $('#position-stats').innerHTML=renderAthlete(roster.get(draft.lineups[team][role]));icons();
  }
  const pager=document.createElement('nav');pager.className='roster-pages';pager.setAttribute('aria-label','Pages des personnages');
  pager.innerHTML='<button type="button" id="roster-prev" class="icon" aria-label="Page pr\u00e9c\u00e9dente" title="Page pr\u00e9c\u00e9dente">'+icon('chevron-left')+'</button><span id="roster-page" role="status"></span><button type="button" id="roster-next" class="icon" aria-label="Page suivante" title="Page suivante">'+icon('chevron-right')+'</button>';
  $('#character-grid').after(pager);
  function characters(){
    const query=$('#character-search').value.toLocaleLowerCase('fr').trim(),rows=roster.entries.filter(c=>canPlayPosition(c.athlete,role)&&(c.name+' '+c.faction).toLocaleLowerCase('fr').includes(query));
    const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages-1);
    pager.hidden=pages===1;$('#roster-prev').disabled=page===0;$('#roster-next').disabled=page===pages-1;
    $('#roster-page').textContent=(page+1)+' / '+pages+' \u00b7 '+rows.length+' personnages';
    $('#character-grid').innerHTML=rows.slice(page*pageSize,(page+1)*pageSize).map(c=>{
      const assigned=POSITIONS.find(p=>roster.get(draft.lineups[team][p.id]).characterId===c.characterId);
      const allowed=roster.canSelect(draft.lineups,team,role,c.id),position=POSITIONS.find(p=>p.id===c.athlete.primary);
      return '<button class="character-choice" data-character="'+esc(c.id)+'" aria-label="'+esc(c.name)+'" aria-pressed="'+(draft.lineups[team][role]===c.id)+'" '+(allowed?'':'disabled ')+'title="'+esc(c.name+' \u00b7 '+c.faction+(allowed?'': ' \u00b7 Lib\u00e8re d\u2019abord son poste de '+assigned?.name))+'">'+spriteBadge(c)+'<b>'+esc(c.name)+'</b><small>'+esc(position.name)+'</small>'+(assigned?icon(assigned.icon):'')+'</button>';
    }).join('');$('#roster-empty').hidden=rows.length!==0;
    for(const button of host.querySelectorAll('[data-character]'))button.onclick=()=>{draft.lineups=roster.select(draft.lineups,team,role,button.dataset.character);lineup();characters();$('#position-stats').scrollIntoView({block:'nearest'});};icons();
  }
  function setTab(id){
    tab=id;for(const button of host.querySelectorAll('[data-locker-tab]')){const selected=button.dataset.lockerTab===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
    for(const [key] of tabs)$('#locker-panel-'+key).hidden=key!==id;
    $('#locker-panel-'+id).scrollTop=0;
  }
  for(const button of host.querySelectorAll('[data-locker-tab]')){
    button.onclick=()=>setTab(button.dataset.lockerTab);
    button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=tabs.findIndex(([id])=>id===tab),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setTab(tabs[next][0]);$('#locker-tab-'+tab).focus();};
  }
  for(const button of host.querySelectorAll('[data-team]'))button.onclick=()=>{team=Number(button.dataset.team);for(const b of host.querySelectorAll('[data-team]'))b.setAttribute('aria-pressed',String(Number(b.dataset.team)===team));lineup();characters();};
  $('#character-search').oninput=()=>{page=0;characters();};
  $('#roster-prev').onclick=()=>{page=Math.max(0,page-1);characters();$('#character-grid').scrollIntoView({block:'start'});};
  $('#roster-next').onclick=()=>{page++;characters();$('#character-grid').scrollIntoView({block:'start'});};
  $('#shuffle-team').onclick=()=>{
    draft.lineups[team]=roster.shuffle(()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296);lineup();characters();
  };
  $('#reset-team').onclick=()=>{draft.lineups[team]=roster.defaults()[team];lineup();characters();};
  for(const radio of host.querySelectorAll('[name="ball"]'))radio.onchange=()=>{draft.ball=radio.value;showBall();};
  $('#arena-city-filter').onchange=filterArenas;$('#arena-kind-filter').onchange=filterArenas;
  for(const button of host.querySelectorAll('[data-arena-kind]'))button.onclick=()=>{$('#arena-kind-filter').value=button.dataset.arenaKind;filterArenas();};
  $('#arena-filter-reset').onclick=()=>{$('#arena-city-filter').value='';$('#arena-kind-filter').value='';filterArenas();};
  for(const radio of host.querySelectorAll('[name="arena"]'))radio.onchange=()=>{draft={...draft,...normalizeAppearance({...draft,arena:radio.value})};showArena();};
  for(const button of host.querySelectorAll('[data-view]'))button.onclick=()=>{if(button.disabled)return;draft={...draft,...normalizeAppearance({...draft,view:button.dataset.view})};showArena();};
  async function submit(newMatch){
    if(loading)return;loading=true;draft={...draft,mode:$('#match-mode').value,sound:$('#sound-option').checked,motion:$('#motion-option').checked};
    $('#locker-error').hidden=true;
    const controls=[...host.querySelectorAll('button,input,select')],previous=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);
    const modal=host.closest('dialog'),close=modal.querySelector('#close-dialog'),cancel=e=>e.preventDefault();
    close.disabled=true;modal.addEventListener('cancel',cancel);$('#new-match span').textContent='Pr\u00e9paration\u2026';
    try{await onSubmit(draft,newMatch);}
    catch{$('#locker-error').textContent='Le terrain n\u2019a pas pu \u00eatre charg\u00e9. Ta rencontre est conserv\u00e9e. R\u00e9essaie.';$('#locker-error').hidden=false;}
    finally{loading=false;controls.forEach((c,i)=>c.disabled=previous[i]);close.disabled=false;modal.removeEventListener('cancel',cancel);$('#new-match span').textContent=initial?'Entrer sur le terrain':'Nouveau match';}
  }
  $('#new-match').onclick=()=>void submit(true);if($('#apply-options'))$('#apply-options').onclick=()=>void submit(false);
  lineup();characters();showBall();showArena();filterArenas();icons();
}
