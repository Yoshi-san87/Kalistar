(() => {
  'use strict';
  const data=window.KALISTAR_DATA;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<i data-lucide="${n}"></i>`,num=n=>Number(n||0).toLocaleString('fr-FR');
  const key=c=>c?.characterId||c?.id;
  const versions=id=>{const c=data.cards.find(c=>c.id===id);return data.cards.filter(v=>key(v)===key(c));};
  function groups(cards){const map=new Map();for(const c of cards){if(!map.has(key(c)))map.set(key(c),[]);map.get(key(c)).push(c);}return [...map.values()];}
  function item(group,{deck,favorites,covers,canAdd,db}){
    const c=group.find(c=>c.id===covers[key(c)])||group[0],n=deck.filter(id=>id===c.id).length,stats=db?.career(c.id),owned=db?.instances(c.id).length||0;
    return `<article class="collection-item character-item ${owned?'':'unowned'}" data-character="${esc(key(c))}" data-element="${c.element}" style="--character-color:#${data.elements[c.element]?.color||'93AAA5'}">
      <div class="character-stack">${group.filter(v=>v.id!==c.id).slice(0,2).map((v,i)=>`<img class="stack-behind layer-${i}" src="assets/cards/${v.slug}.webp" alt="" aria-hidden="true" loading="lazy">`).join('')}
      <button class="card-open" data-action="detail" data-id="${c.id}" aria-label="Consulter ${esc(c.name+' · '+c.title)}"><img src="assets/cards/${c.slug}.webp" alt="${esc(c.name+' · '+c.title)}" width="797" height="1388" loading="lazy"></button>
      <span class="owned-count">${owned?owned+' possedee'+(owned>1?'s':''):'Non possedee'}</span>${group.length>1?`<span class="version-count" title="${group.length} versions">${icon('layers-3')}${group.length}</span>`:''}</div>
      <div class="character-caption"><h2>${esc(c.name)}</h2><span>${esc(c.title)}</span></div>
      <div class="version-switch" aria-label="Versions de ${esc(c.name)}">${group.map(v=>`<button data-action="cover-version" data-id="${v.id}" aria-pressed="${v.id===c.id}" title="${esc(v.title)}">${v.element==='NONE'||!data.elements[v.element]?icon('circle-slash'):`<img src="../assets/cristaux/${encodeURIComponent(v.element)}.png" alt="${v.element}">`}</button>`).join('')}<span>${group.length} version${group.length>1?'s':''}</span></div>
      <div class="collection-career" data-career-card="${c.id}">${brief(stats)}</div>
      <div class="item-tools"><span class="card-id">#${c.id}</span><button class="fav ${favorites.has(c.id)?'active':''}" data-action="favorite" data-id="${c.id}" aria-pressed="${favorites.has(c.id)}" title="Favori : ${esc(c.name)}" aria-label="Favori : ${esc(c.name)}">${icon('star')}</button><button data-action="remove" data-id="${c.id}" ${n?'':'disabled'} title="Retirer du deck" aria-label="Retirer du deck">${icon('minus')}</button><span class="amount">${n}</span><button data-action="add" data-id="${c.id}" ${canAdd(c)?'':'disabled'} title="Ajouter au deck" aria-label="Ajouter au deck">${icon('plus')}</button></div>
    </article>`;
  }
  function brief(s){return `<span title="Victoires / défaites des exemplaires de cette version">${icon('trophy')}<b>${num(s?.wins)}</b> V · ${num(s?.losses)} D</span><span title="Éliminations">${icon('crosshair')}${num(s?.kills)}</span>`;}
  function versionStrip(id){return `<div class="detail-versions" aria-label="Versions du personnage">${versions(id).map(c=>`<button data-action="detail-version" data-id="${c.id}" aria-pressed="${id===c.id}" title="${esc(c.title)}"><img src="assets/cards/${c.slug}.webp" alt=""><span>${esc(c.title)}<small>${c.element} · #${c.id}</small></span></button>`).join('')}</div>`;}
  function career(id,db,selected='all'){
    if(!db)return '<section class="career-panel"><h3>Carrière</h3><p class="muted">Base locale indisponible.</p></section>';
    const instances=db.instances(id);if(selected!=='all'&&!instances.some(i=>i.id===selected))selected='all';
    const s=db.career(id,selected==='all'?null:selected),rate=s.games?Math.round(s.wins/s.games*100):0;
    const cell=(symbol,value,label,cls='')=>`<div class="career-stat ${cls}">${icon(symbol)}<b>${num(value)}</b><span>${label}</span></div>`;
    return `<section class="career-panel"><div class="career-heading"><h3>${icon('medal')}Carrière</h3><label>Exemplaire<select id="career-instance"><option value="all">Tous · ${instances.length} exemplaire${instances.length>1?'s':''}</option>${instances.map(i=>`<option value="${i.id}" ${selected===i.id?'selected':''}>${i.id}</option>`).join('')}</select></label></div>
      <div class="career-record"><strong>${rate}<small>% victoires</small></strong><div><b>${s.wins} V <span>· ${s.losses} D · ${s.draws} N</span></b><span>${s.games} participation${s.games>1?'s':''} · matchs terminés</span><div class="career-rate"><i style="width:${rate}%"></i></div></div></div>
      <div class="career-grid">${cell('trophy',s.mvp,'MVP','gold')}${cell('crosshair',s.kills,'Kills','rose')}${cell('shield-check',s.holds,'Stop','cyan')}${cell('hand-heart',s.support,'Buffer','jade')}${cell('shield-minus',s.debuff,'ATK retirée','rose')}${cell('heart-pulse',s.reraises,'Vies sauvées','gold')}</div>
      <div class="career-pressure"><span>ATK cumulée <b>${num(s.attack)}</b></span><span>DEF cumulée <b>${num(s.defense)}</b></span></div>
      <div class="career-history"><h4>Dernières rencontres</h4>${s.history.slice(0,6).map(r=>`<button data-action="history-match" data-id="${esc(r.matchId)}"><b class="${r.winner===r.side?'won':'lost'}">${r.winner==='draw'?'N':r.winner===r.side?'V':'D'}</b><span>${esc(r.seed)}<small>J${r.side+1} · ${esc(r.instanceId)} · ${new Date(r.finishedAt).toLocaleDateString('fr-FR')}</small></span><span>${r.kills} K<br>${r.holds} Stop</span>${icon('chevron-right')}</button>`).join('')||'<p class="muted">Aucune rencontre terminée.</p>'}</div></section>`;
  }
  function database(db,error){
    if(!db)return `<div class="dialog-body"><p class="validation">${esc(error||'Ouverture de la base locale…')}</p></div>`;
    const counts={...db.counts(),instances:db.ownedCount?db.ownedCount():db.counts().instances},matches=db.matches();
    return `<div class="dialog-body database-body"><div class="database-totals"><div><b>${counts.versions}</b>Versions</div><div><b>${counts.instances}</b>Exemplaires</div><div><b>${matches.filter(m=>m.finalized).length}</b>Matchs terminés</div></div><div class="database-actions"><button class="primary" data-action="export-library">${icon('download')}Sauvegarder la collection</button><button data-action="import-library">${icon('upload')}Importer une sauvegarde</button><input id="library-file" type="file" accept="application/json,.json" hidden></div><p class="database-notice">Stockage local à ce navigateur. Un effacement de ses données supprime la base : gardez une sauvegarde JSON. Base <code>kalistar-v3-cards</code> · parties schéma 6 · exemplaires K3-. Les imports V2 sont refusés ; les données V2 ne sont jamais modifiées.</p><h3>Rencontres enregistrées</h3><div class="database-matches">${matches.map(m=>`<button data-action="history-match" data-id="${esc(m.id)}">${icon(m.finalized?'trophy':'swords')}<span><b>${esc(m.state.seed)}</b><small>${new Date(m.updatedAt).toLocaleString('fr-FR')} · ${m.summary.exchanges} échanges</small></span><span>${m.finalized?m.state.winner==='draw'?'Nul':'J'+(m.state.winner+1)+' gagne':'En cours'}${m.summary.partial?' · partiel':''}</span>${icon('chevron-right')}</button>`).join('')||'<p class="muted">Aucune rencontre enregistrée.</p>'}</div><section class="database-inspector"><h3>Tables locales V3</h3>${['versions','instances','matches','results'].map(store=>`<details><summary>${store} · ${counts[store]}</summary><pre tabindex="0" aria-label="Table ${store}">${esc(JSON.stringify(db.inspect(store),null,2))}</pre></details>`).join('')}</section></div>`;
  }
  window.KalistarCatalogue={key,groups,item,brief,versionStrip,career,database};
})();
