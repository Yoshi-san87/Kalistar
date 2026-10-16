(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarCloudSyncUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  let nextId=0;
  const labels={idle:'En attente',starting:'En attente',syncing:'En attente',pending:'En attente',synced:'Synchronis\u00e9',
    offline:'Hors ligne',busy:'Sur un autre appareil',conflict:'Choix de sauvegarde',unauthorized:'Connexion requise',error:'Synchro interrompue',paused:'Synchro en pause',destroyed:'Synchro en pause'};
  const icons={synced:'cloud-check',offline:'cloud-off',busy:'monitor-smartphone',conflict:'git-compare-arrows',unauthorized:'lock-keyhole',error:'cloud-alert',paused:'pause',syncing:'refresh-cw',starting:'refresh-cw'};
  const messages={authorization:'Reconnecte-toi pour retrouver tes sauvegardes.',storage:'La copie locale ne peut pas \u00eatre enregistr\u00e9e. Lib\u00e8re de la place dans ce navigateur avant de r\u00e9essayer.',
    payload:'Cette sauvegarde ne peut pas \u00eatre synchronis\u00e9e.', 'payload-size':'Cette sauvegarde d\u00e9passe la taille autoris\u00e9e.',
    protocol:'La sauvegarde du compte ne peut pas \u00eatre lue. La copie locale est conserv\u00e9e.',server:'Le compte est temporairement indisponible. La copie locale est conserv\u00e9e.',host:'La sauvegarde locale ne peut pas \u00eatre appliqu\u00e9e.'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const glyph=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  function create({sync,mount,modal,toast,document:doc=root.document,autoOpen=true}){
    if(!sync?.snapshot||!sync?.subscribe||!doc)throw TypeError('Invalid cloud sync UI host contract');
    const button=doc.createElement('button'),dialog=doc.createElement('dialog'),listeners=new AbortController();
    const id='kalistar-sync-dialog-'+(++nextId);
    button.type='button';button.className='cloud-sync-indicator';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',id);
    dialog.id=id;dialog.className='cloud-sync-dialog';dialog.setAttribute('aria-labelledby',id+'-title');
    doc.body.append(dialog);mount?.append(button);
    let disposed=false,working=false,previous=null,lastAlert=null;
    const date=value=>{
      if(!value||!Number.isFinite(Date.parse(value)))return 'Pas encore enregistr\u00e9e';
      return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
    };
    const command=(action,text,icon,primary=false)=>`<button type="button" data-sync-action="${action}" data-kui="command" ${working?'disabled':''} ${primary?'class="primary"':''}>${glyph(icon)}<span>${esc(text)}</span></button>`;
    function markup(s){
      let body='';
      if(s.status==='conflict'){
        body=`<p>Deux sauvegardes diff\u00e9rentes. La copie de cet appareil sera sauvegard\u00e9e avant ton choix.</p><dl class="cloud-sync-versions"><div><dt>${glyph('smartphone')}Cet appareil</dt><dd>${esc(date(s.localUpdatedAt))}</dd></div><div><dt>${glyph('cloud')}Compte Kalistar</dt><dd>${esc(date(s.cloudUpdatedAt))}</dd></div></dl><div class="cloud-sync-choices">${command('cloud','Utiliser celle du compte','cloud-download',true)}${command('local','Conserver celle de cet appareil','hard-drive-upload')}</div>`;
      }else if(s.status==='busy'){
        body=`<p>Kalistar est ouvert sur un autre appareil.</p>${s.pending?'<p class="cloud-sync-note">Tes modifications restent en attente ici.</p>':''}<div class="cloud-sync-choices">${command('takeover','Reprendre ici','monitor-smartphone',true)}${command('retry','Actualiser','refresh-cw')}</div>`;
      }else if(s.status==='offline'){
        body=`<p>La copie locale est conserv\u00e9e${s.pending?' ; tes modifications attendent la connexion':''}.</p><div class="cloud-sync-choices">${command('retry','R\u00e9essayer','refresh-cw',true)}</div>`;
      }else if(s.status==='unauthorized'){
        body=`<p>${esc(messages.authorization)}</p>`;
      }else if(s.status==='error'){
        body=`<p role="alert">${esc(messages[s.error]||messages.server)}</p><div class="cloud-sync-choices">${command('retry','R\u00e9essayer','refresh-cw',true)}</div>`;
      }else if(s.status==='paused'){
        body=`<div class="cloud-sync-choices">${command('retry','Reprendre la synchro','play',true)}</div>`;
      }else{
        body=`<p class="cloud-sync-note">${s.status==='synced'?'Derni\u00e8re sauvegarde : '+esc(date(s.updatedAt)):'Enregistrement en cours\u2026'}</p>`;
      }
      return `<div class="dialog-head"><h2 id="${id}-title">${glyph(icons[s.status]||'cloud-upload')}${esc(labels[s.status]||labels.error)}</h2><button type="button" class="icon-button" data-sync-action="close" aria-label="Fermer">${glyph('x')}</button></div><div class="cloud-sync-content" aria-busy="${working}">${body}</div>`;
    }
    function decorate(){root.KalistarUI?.icons(dialog);root.KalistarUI?.icons(button);}
    function render(s){
      if(disposed)return;
      button.dataset.state=s.status;
      button.setAttribute('aria-label',labels[s.status]||labels.error);
      button.title=labels[s.status]||labels.error;
      if(previous!==s.status){button.innerHTML=`${glyph(icons[s.status]||'cloud-upload')}<span role="status" aria-live="polite">${esc(labels[s.status]||labels.error)}</span>`;previous=s.status;}
      if(dialog.open){
        const action=doc.activeElement?.dataset.syncAction;
        dialog.innerHTML=markup(s);
        if(action)dialog.querySelector(`[data-sync-action="${action}"]`)?.focus();
      }
      decorate();
      if(!['conflict','busy'].includes(s.status)){lastAlert=null;return;}
      const alert=s.status+':'+s.revision+':'+s.cloudUpdatedAt;
      if(autoOpen&&!working&&lastAlert!==alert){lastAlert=alert;open();}
    }
    function open(){
      if(disposed)return;
      const html=markup(sync.snapshot());
      if(dialog.open)dialog.innerHTML=html;
      else if(modal)modal(id,html);
      else{
        dialog.innerHTML=html;
        if(root.KalistarDialogHistory)root.KalistarDialogHistory.open(dialog);
        else dialog.showModal();
      }
      decorate();
    }
    button.addEventListener('click',open,{signal:listeners.signal});
    dialog.addEventListener('click',async event=>{
      const action=event.target.closest('[data-sync-action]')?.dataset.syncAction;
      if(action==='close'){dialog.close();return;}
      if(!action||working)return;
      working=true;render(sync.snapshot());
      try{
        const result=action==='retry'?await sync.retry():await sync.resolve(action);
        if(!disposed&&result.status==='synced'){dialog.close();toast?.('Sauvegarde synchronis\u00e9e.');}
      }catch{if(!disposed)toast?.('Synchro indisponible. La copie locale est conserv\u00e9e.');}
      finally{working=false;if(!disposed)render(sync.snapshot());}
    },{signal:listeners.signal});
    const unsubscribe=sync.subscribe(render);
    render(sync.snapshot());
    return {element:button,dialog,open,destroy:()=>{if(disposed)return;disposed=true;unsubscribe();listeners.abort();if(dialog.open)dialog.close();dialog.remove();button.remove();}};
  }
  return {create};
});
