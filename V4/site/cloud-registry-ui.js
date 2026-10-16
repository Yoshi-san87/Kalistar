(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  function create({data,modal,onLocal,onChanged}){
    const config=window.KalistarCloudConfig,controller=new AbortController();
    const dialog=document.createElement('dialog');dialog.id='cloud-dialog';dialog.className='registry-dialog cloud-registry';dialog.setAttribute('aria-label','Registre Kalistar en ligne');document.body.append(dialog);
    let api=null,busy=false,tab='cards',note='',error='',issued=null,certificate=null,selected=null,viewEpoch=0,cardPage=0;
    const state=()=>api?.snapshot()||{user:null,profile:null,isAdmin:false,cards:[],transfers:[],models:[]};
    const command=(action,label,symbol,attrs='',cls='')=>`<button type="button" data-cloud-action="${action}" ${attrs} class="${cls}">${icon(symbol)}${label?`<span>${esc(label)}</span>`:''}</button>`;
    const model=id=>data.cards.find(c=>c.id===id);
    function cardPages(){
      const total=state().cards.length,pages=Math.max(1,Math.ceil(total/12));cardPage=Math.min(cardPage,pages-1);
      return total>12?`<nav class="cloud-card-pages" aria-label="Pages des exemplaires">${command('previous','','chevron-left',`aria-label="Exemplaires precedents" ${cardPage===0?'disabled':''}`,'icon-button')}<span>${cardPage+1} / ${pages} · ${total} exemplaires</span>${command('next','','chevron-right',`aria-label="Exemplaires suivants" ${cardPage===pages-1?'disabled':''}`,'icon-button')}</nav>`:'';
    }
    const publicLink=item=>{const url=new URL(config.redirectTo);url.searchParams.set('specimen',item.id);return url.href;};
    const image=item=>{const card=model(item.modelId);return card?KalistarCardMedia.image(card):'assets/back.webp';};
    const card=item=>`<article class="cloud-specimen"><img src="${esc(image(item))}" alt="${esc(item.name)}" width="797" height="1388" loading="lazy" decoding="async"><div><span class="eyebrow">${item.pilot?'Preparation · ':''}N° ${esc(item.serial)}</span><h3>${esc(item.name)}</h3><p>${esc(item.title)}</p><code>${esc(item.barcode||item.id)}</code><p class="cloud-owner">${icon('fingerprint')}${esc(item.status==='unclaimed'?'Non attribuee':item.status==='revoked'?'Exemplaire revoque':item.owner?item.owner.displayName+' · @'+item.owner.handle:'Proprietaire prive')}</p></div></article>`;
    const profileForm=()=>{const p=state().profile;return `<form data-cloud-form="profile" class="registry-form"><h3>${p?'Mon profil':'Creer mon profil Kalistar'}</h3><label>Pseudo<input name="handle" value="${esc(p?.handle||'')}" pattern="[a-z0-9_]{3,24}" minlength="3" maxlength="24" autocomplete="nickname" required></label><label>Nom affiche<input name="displayName" value="${esc(p?.displayName||'')}" maxlength="40" required></label><label class="check-label"><input name="publish" type="checkbox" ${p?.publishOwner?'checked':''}>Afficher mon pseudo comme proprietaire de mes cartes</label><button class="primary" type="submit">${icon('save')}Enregistrer</button></form>`;};
    function content(){
      const s=state();
      if(tab==='lookup')return `<form data-cloud-form="lookup" class="registry-form"><label>Identifiant public<input name="id" placeholder="00000001 ou KC-…" value="${esc(certificate?.barcode||'')}" maxlength="35" required autocomplete="off" spellcheck="false"></label><button type="submit">${icon('scan-line')}Consulter le registre</button></form>${certificate?card(certificate)+`<a class="cloud-public-link" href="${esc(publicLink(certificate))}" target="_blank" rel="noopener">${icon('link')}Lien de cet exemplaire</a>`:''}`;
      if(!s.user)return `<section class="cloud-auth"><img src="assets/navigation/kalistel-rainbow-v1.webp" alt="" width="52" height="72"><h3>Ton compte Kalistar</h3><a class="cloud-public-link" href="https://kalistar.pages.dev/jeu/login.html">${icon('log-in')}Se connecter</a></section>`;
      if(!s.profile||tab==='profile')return profileForm();
      if(tab==='activate')return `<form data-cloud-form="activate" class="registry-form"><h3>Enregistrer ma carte</h3><label>Identifiant de l'exemplaire<input name="id" placeholder="00000001 ou KC-…" maxlength="35" required autocomplete="off" spellcheck="false"></label><label>Secret d'activation<input name="secret" type="password" maxlength="64" minlength="64" required autocomplete="off" spellcheck="false"></label><button class="primary" type="submit">${icon('key-round')}Attribuer a @${esc(s.profile.handle)}</button></form>`;
      if(tab==='offer'&&selected)return `${card(selected)}<form data-cloud-form="offer" class="registry-form"><label>Pseudo du destinataire<input name="handle" pattern="[a-z0-9_]{3,24}" maxlength="24" required autocomplete="off"></label><label class="check-label"><input type="checkbox" required>Je confirme proposer cet exemplaire au destinataire indique.</label><button class="primary" type="submit">${icon('arrow-right-left')}Proposer le transfert</button></form>`;
      if(tab==='transfers')return `<div class="cloud-transfers">${s.transfers.map(t=>`<article class="cloud-transfer">${card(t.card)}<div class="cloud-transfer-meta"><span>@${esc(t.sender)} ${icon('arrow-right')} @${esc(t.recipient)}</span><b>${esc({pending:'En attente',accepted:'Accepte',cancelled:'Annule',rejected:'Refuse'}[t.status])}</b></div>${t.status==='pending'?(t.incoming?`<form data-cloud-form="accept" data-id="${esc(t.id)}" class="registry-form"><label class="check-label"><input type="checkbox" required>Je confirme recevoir cet exemplaire sur mon compte.</label><button type="submit" class="primary">${icon('check')}Accepter</button></form>${command('settle','Refuser','x',`data-id="${esc(t.id)}" data-state="rejected"`)}`:command('settle','Annuler la demande','x',`data-id="${esc(t.id)}" data-state="cancelled"`)):''}</article>`).join('')||'<p class="cloud-empty">Aucun transfert.</p>'}</div>`;
      if(tab==='issue'&&s.isAdmin){
        if(issued)return `<section class="registry-voucher"><h3>Exemplaire de preparation cree</h3>${card(issued.card)}<p class="registry-warning">Secret affiche une seule fois. A conserver separement de l'image publique.</p><label>Secret d'activation<code class="cloud-issued-secret">${esc(issued.secret)}</code></label>${command('voucher','Bon d activation','download','','primary')}${command('new-issue','Autre exemplaire','plus')}</section>`;
        return `<form data-cloud-form="issue" class="registry-form"><h3>Emission · Preparation</h3><label>Modele<select name="model">${s.models.map(m=>`<option value="${esc(m.id)}">${esc(m.name+' · '+m.title)}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" required>Creer un nouvel exemplaire de preparation non attribue.</label><button type="submit" class="primary">${icon('stamp')}Emettre</button></form>`;
      }
      return `${cardPages()}<div class="cloud-card-list">${s.cards.slice(cardPage*12,(cardPage+1)*12).map(item=>`<section>${card(item)}<div class="cloud-card-commands">${command('certificate','Fiche exemplaire','scan-eye',`data-id="${esc(item.id)}"`)}${item.status==='owned'?command('offer','Transferer','arrow-right-left',`data-id="${esc(item.id)}"`):''}</div></section>`).join('')||`<div class="cloud-empty">${icon('layers-3')}<h3>Aucun exemplaire enregistre</h3>${command('tab','Enregistrer une carte','key-round','data-tab="activate"')}</div>`}</div>`;
    }
    function markup(){
      const s=state();
      return `<div class="dialog-head"><div><span class="eyebrow">Mon compte</span><h2>Kalistar</h2></div>${command('close','','x','aria-label="Fermer" title="Fermer"','icon-button')}</div><div class="registry-shell cloud-shell"><div class="cloud-account-bar"><span>${s.user?esc(s.profile?'@'+s.profile.handle:s.user.email):'Non connecte'}</span>${s.user?command('logout','Deconnexion','log-out'):''}${command('local','Sauvegardes de cet appareil','hard-drive')}</div><nav class="registry-tabs" aria-label="Registre en ligne">${[['cards',s.user?'Mes cartes':'Connexion','layers-3'],['lookup','Consulter','scan-line'],...(s.user&&s.profile?[['activate','Enregistrer','key-round'],['transfers','Transferts','arrow-right-left'],['profile','Profil','user-round'],...(s.isAdmin?[['issue','Emission','stamp']]:[])]:[])].map(([id,label,symbol])=>command('tab',label,symbol,`data-tab="${id}" aria-pressed="${tab===id}"`)).join('')}</nav><div class="cloud-status" role="status">${busy?'Connexion au registre…':esc(note)}</div><p class="registry-feedback" role="alert">${esc(error)}</p><div class="registry-content">${config?.enabled?content():'<p>Le registre en ligne est en preparation. Tes archives locales restent disponibles.</p>'}</div></div>`;
    }
    function icons(){window.KalistarUI?.icons(dialog);}
    function render(){if(!dialog.open)return;dialog.innerHTML=markup();dialog.setAttribute('aria-busy',String(busy));if(busy)dialog.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);icons();}
    async function ready(){
      if(api)return api;
      if(!config?.enabled)throw Error('Registre en preparation.');
      if(!api){
        const client=await KalistarCloudSession.getClient();
        api=KalistarCloudRegistry.create({client});
        api.subscribe(s=>{
          if(!s.user){issued=null;selected=null;certificate=null;if(tab!=='lookup')tab='cards';render();}
        });
      }
      return api;
    }
    async function run(fn){
      if(busy)return;const epoch=viewEpoch;busy=true;error='';note='';render();
      try{await ready();await fn();if(onChanged&&api.snapshot().user)await onChanged();}
      catch(e){if(epoch===viewEpoch)error=e?.code==='23505'?'Pseudo deja utilise ou transfert deja en attente.':e?.name==='TimeoutError'?'Connexion trop lente. Reessaie.':e?.message||'Registre indisponible.';}
      finally{busy=false;if(epoch===viewEpoch)render();else{issued=null;selected=null;certificate=null;}}
    }
    dialog.addEventListener('click',event=>{
      if(event.target===dialog&&!busy){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();return;}
      const button=event.target.closest('[data-cloud-action]');if(!button||busy)return;
      const action=button.dataset.cloudAction;
      if(action==='close'){dialog.close();return;}
      if(action==='previous'||action==='next'){cardPage=Math.max(0,Math.min(Math.ceil(state().cards.length/12)-1,cardPage+(action==='next'?1:-1)));render();return;}
      if(action==='local'){dialog.close();onLocal();return;}
      if(action==='tab'){tab=button.dataset.tab;issued=null;selected=null;certificate=null;note='';error='';render();return;}
      if(action==='new-issue'){issued=null;render();return;}
      if(action==='logout')return run(async()=>{issued=null;certificate=null;selected=null;if(KalistarCloudSession.required())await KalistarCloudSession.logout();else{await api.logout();tab='cards';}});
      if(action==='offer'){selected=state().cards.find(c=>c.id===button.dataset.id);tab='offer';render();return;}
      if(action==='settle')return run(async()=>{await api.settle(button.dataset.id,button.dataset.state);note='Transfert mis a jour.';});
      if(action==='certificate')return run(async()=>{certificate=await api.certificate(button.dataset.id);tab='lookup';});
      if(action==='voucher'&&issued){
        const url=URL.createObjectURL(new Blob([JSON.stringify({format:'kalistar-activation-v1',id:issued.card.id,serial:issued.card.serial,barcode:issued.card.barcode,modelId:issued.card.modelId,pilot:true,secret:issued.secret},null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='Kalistar-activation-'+issued.card.serial+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    },{signal:controller.signal});
    dialog.addEventListener('submit',event=>{
      const form=event.target.closest('[data-cloud-form]');if(!form)return;event.preventDefault();if(busy||!form.reportValidity())return;
      const values=new FormData(form),kind=form.dataset.cloudForm;
      if(kind==='profile')return run(async()=>{await api.profile({handle:values.get('handle'),displayName:values.get('displayName'),publishOwner:values.get('publish')==='on'});tab='cards';note='Profil enregistre.';});
      if(kind==='lookup')return run(async()=>{certificate=await api.certificate(String(values.get('id')).trim());if(!certificate)throw Error('Exemplaire introuvable.');});
      if(kind==='activate')return run(async()=>{await api.activate(String(values.get('id')).trim(),String(values.get('secret')).trim());tab='cards';note='Exemplaire attribue a ton compte.';});
      if(kind==='offer')return run(async()=>{await api.offer(selected.id,values.get('handle'));selected=null;tab='transfers';note='Demande envoyee. Le destinataire doit l accepter.';});
      if(kind==='accept')return run(async()=>{await api.settle(form.dataset.id,'accepted');note='Exemplaire recu.';});
      if(kind==='issue')return run(async()=>{issued=await api.issue(values.get('model'));});
    },{signal:controller.signal});
    dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();},{signal:controller.signal});
    dialog.addEventListener('close',()=>{viewEpoch++;issued=null;certificate=null;selected=null;note='';error='';dialog.replaceChildren();},{signal:controller.signal});
    return {
      open:async({id=null}={})=>{
        if(busy)return;viewEpoch++;tab=id?'lookup':'cards';cardPage=0;note='';error='';issued=null;certificate=null;selected=null;
        modal('cloud-dialog',markup());icons();if(!config?.enabled)return;
        await run(async()=>{await api.refresh();if(id){certificate=await api.certificate(id);if(!certificate)throw Error('Exemplaire introuvable.');}});
      },
      destroy:()=>{viewEpoch++;controller.abort();api?.destroy();dialog.remove();}
    };
  }
  window.KalistarCloudRegistryUI={create};
})();
