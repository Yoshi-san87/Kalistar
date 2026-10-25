import { BALLS, ARENAS, getBall, getArena, normalizeAppearance } from './appearance.mjs';
import { POSITIONS } from './roster.mjs';
import { TEAMS, ROLE_STATS } from '../data/teams.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>'<i data-lucide="'+name+'"></i>';
export const spriteBadge=c=>'<span class="sprite-badge" aria-hidden="true" style="--sprite:url(&quot;'+esc(c.url)+'&quot;)"></span>';

export function renderLocker({host,roster,options,lineups,initial,icons,onSubmit}) {
  let draft={...options,...normalizeAppearance(options),lineups:roster.normalize(lineups)},team=0,role='meneur',tab='teams',loading=false;
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
    '<section id="locker-panel-arena" role="tabpanel" aria-labelledby="locker-tab-arena" hidden><div class="arena-showcase"><img id="arena-preview" src="'+getArena(draft.arena).horizontal+'" alt=""><div><span id="arena-region" class="eyebrow"></span><h3 id="arena-name"></h3><p id="arena-surface"></p></div></div><fieldset class="arena-options"><legend>Lieu de la rencontre</legend>',
    ...ARENAS.map(a=>'<label class="arena-choice"><input type="radio" name="arena" value="'+a.id+'" '+(a.id===draft.arena?'checked':'')+'><img src="'+a.horizontal+'" alt="" loading="lazy"><span>'+esc(a.name)+'<small>'+esc(a.region)+'</small></span>'+icon('check')+'</label>'),
    '</fieldset><div class="locker-view" role="group" aria-label="Vue du terrain"><button data-view="horizontal" aria-pressed="'+(draft.view==='horizontal')+'">'+icon('grid-2x2')+' HD-2D</button><button data-view="isometric" aria-pressed="'+(draft.view==='isometric')+'">'+icon('layers')+' Isom\u00e9trique</button></div></section>',
    '<div class="locker-bottom"><div class="locker-options"><label>Rencontre<select id="match-mode"><option value="solo" '+(draft.mode==='solo'?'selected':'')+'>Solo contre l\u2019IA</option><option value="hotseat" '+(draft.mode==='hotseat'?'selected':'')+'>Deux joueurs, m\u00eame \u00e9cran</option></select></label><div class="locker-toggles"><label>Sons<input type="checkbox" id="sound-option" '+(draft.sound?'checked':'')+'></label><label>Animations<input type="checkbox" id="motion-option" '+(draft.motion?'checked':'')+' '+(matchMedia('(prefers-reduced-motion: reduce)').matches?'disabled':'')+'></label></div></div><div class="locker-summary" aria-live="polite"></div>',
    initial?'':'<p class="replace-warning">Les compositions sont appliqu\u00e9es au nouveau match, qui remplace la rencontre enregistr\u00e9e.</p>',
    '<p id="locker-error" role="alert" hidden></p><div class="dialog-actions">',
    initial?'':'<button id="apply-options">Reprendre</button>',
    '<button id="new-match" class="primary">'+icon('play')+'<span>'+(initial?'Entrer sur le terrain':'Nouveau match')+'</span></button></div></div>',
  ].join('');
  function summarize(){$('.locker-summary').textContent='Chroma 5/5  \u00b7  Obsidienne 5/5  \u00b7  '+getBall(draft.ball).name+'  \u00b7  '+getArena(draft.arena).name;}
  function showBall(){const b=getBall(draft.ball);$('#ball-preview').src=b.url;$('#ball-preview').alt=b.name;$('#ball-name').textContent=b.name;$('#ball-material').textContent=b.material;summarize();}
  function showArena(){const a=getArena(draft.arena);$('#arena-preview').src=a[draft.view];$('#arena-preview').alt=a.name;$('#arena-region').textContent=a.region;$('#arena-name').textContent=a.name;$('#arena-surface').textContent=a.surface;summarize();}
  function lineup(){
    $('.squad-lineup').innerHTML=POSITIONS.map(p=>{
      const c=roster.get(draft.lineups[team][p.id]);
      return '<button class="lineup-slot" data-position="'+p.id+'" aria-pressed="'+(role===p.id)+'" style="--team:'+TEAMS[team].color+'">'+icon(p.icon)+spriteBadge(c)+'<span><small>'+p.name+'</small><b>'+esc(c.name)+'</b></span>'+icon('chevron-right')+'</button>';
    }).join('');
    for(const button of host.querySelectorAll('[data-position]'))button.onclick=()=>{role=button.dataset.position;lineup();characters();};
    $('#chosen-position').textContent=POSITIONS.find(p=>p.id===role).name;
    $('#position-stats').innerHTML=Object.entries(ROLE_STATS[role]).map(([k,v])=>'<span>'+k+' <b>'+v+'</b></span>').join('');icons();
  }
  function characters(){
    const query=$('#character-search').value.toLocaleLowerCase('fr').trim(),rows=roster.entries.filter(c=>(c.name+' '+c.faction).toLocaleLowerCase('fr').includes(query));
    $('#character-grid').innerHTML=rows.map(c=>{
      const assigned=POSITIONS.find(p=>roster.get(draft.lineups[team][p.id]).characterId===c.characterId);
      return '<button class="character-choice" data-character="'+esc(c.id)+'" aria-label="'+esc(c.name)+'" aria-pressed="'+(draft.lineups[team][role]===c.id)+'" title="'+esc(c.name+' \u00b7 '+c.faction)+'">'+spriteBadge(c)+'<b>'+esc(c.name)+'</b>'+(assigned?icon(assigned.icon):'')+'</button>';
    }).join('');$('#roster-empty').hidden=rows.length!==0;
    for(const button of host.querySelectorAll('[data-character]'))button.onclick=()=>{draft.lineups=roster.select(draft.lineups,team,role,button.dataset.character);lineup();characters();};icons();
  }
  function setTab(id){
    tab=id;for(const button of host.querySelectorAll('[data-locker-tab]')){const selected=button.dataset.lockerTab===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
    for(const [key] of tabs)$('#locker-panel-'+key).hidden=key!==id;
  }
  for(const button of host.querySelectorAll('[data-locker-tab]')){
    button.onclick=()=>setTab(button.dataset.lockerTab);
    button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=tabs.findIndex(([id])=>id===tab),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setTab(tabs[next][0]);$('#locker-tab-'+tab).focus();};
  }
  for(const button of host.querySelectorAll('[data-team]'))button.onclick=()=>{team=Number(button.dataset.team);for(const b of host.querySelectorAll('[data-team]'))b.setAttribute('aria-pressed',String(Number(b.dataset.team)===team));lineup();characters();};
  $('#character-search').oninput=characters;
  $('#shuffle-team').onclick=()=>{
    const unique=[...new Map(roster.entries.map(c=>[c.characterId,c])).values()];
    for(let i=unique.length-1;i>0;i--){const j=Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]];}
    draft.lineups[team]=Object.fromEntries(POSITIONS.map((p,i)=>[p.id,unique[i].id]));lineup();characters();
  };
  $('#reset-team').onclick=()=>{draft.lineups[team]=roster.defaults()[team];lineup();characters();};
  for(const radio of host.querySelectorAll('[name="ball"]'))radio.onchange=()=>{draft.ball=radio.value;showBall();};
  for(const radio of host.querySelectorAll('[name="arena"]'))radio.onchange=()=>{draft.arena=radio.value;showArena();};
  for(const button of host.querySelectorAll('[data-view]'))button.onclick=()=>{draft.view=button.dataset.view;for(const b of host.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===draft.view));showArena();};
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
  lineup();characters();showBall();showArena();icons();
}
