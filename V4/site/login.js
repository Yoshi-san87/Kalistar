(() => {
  'use strict';
  const entry=document.querySelector('.login-entry'),status=document.querySelector('#login-status'),error=document.querySelector('#login-error'),title=document.querySelector('#login-title');
  let busy=false,mode='login',session=null;
  const icons=()=>window.lucide?.createIcons();
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  function form(next){
    mode=next;entry.querySelector('form')?.remove();entry.querySelector('.login-forgot')?.remove();status.textContent='';error.textContent='';
    const form=document.createElement('form');form.id='login-form';
    if(mode==='password'){
      title.textContent='Nouveau mot de passe';form.innerHTML=`<label>Mot de passe<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="1024" required></label><label>Confirmer le mot de passe<input name="confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="1024" required></label><button class="login-submit" type="submit">${icon('key-round')}Enregistrer</button>`;
    }else if(mode==='forgot'){
      title.textContent='Retrouver mon acces';form.innerHTML=`<label>Adresse email<input name="email" type="email" autocomplete="username" maxlength="254" required></label><button class="login-submit" type="submit">${icon('mail')}Recevoir le lien</button><button type="button" class="login-forgot" data-login-action="back">Retour a la connexion</button>`;
    }
    entry.insertBefore(form,status);icons();form.querySelector('input')?.focus();
  }
  const go=()=>{const p=new URL(location.href).searchParams;let next=KalistarCloudSession.target(p.get('next'),location.origin);if(!next.includes('#')&&/^#(?:home|collection|decks|weapons|arena|statistics|story|map|guide|library|journeys)$/.test(location.hash))next+=location.hash;location.replace(next);};
  async function run(fn){
    if(busy)return;busy=true;entry.setAttribute('aria-busy','true');error.textContent='';status.textContent='Connexion…';
    entry.querySelectorAll('input,button').forEach(n=>n.disabled=true);
    try{session??=await KalistarCloudSession.get();await fn();}
    catch(e){status.textContent='';error.textContent=e?.message||'Connexion indisponible.';}
    finally{busy=false;entry.setAttribute('aria-busy','false');entry.querySelectorAll('input,button').forEach(n=>n.disabled=false);entry.querySelectorAll('input[name=password],input[name=confirmation]').forEach(n=>n.value='');}
  }
  entry.addEventListener('submit',event=>{
    if(event.target.id!=='login-form')return;event.preventDefault();if(busy||!event.target.reportValidity())return;
    const values=new FormData(event.target);
    if(mode==='forgot')return run(async()=>{await session.forgot(String(values.get('email')).trim());status.textContent='Si ton compte est autorise, un lien de recuperation te sera envoye.';});
    if(mode==='password')return run(async()=>{const s=await session.password(values.get('password'),values.get('confirmation'));if(s.user)go();});
    return run(async()=>{
      const s=await session.login(String(values.get('email')).trim(),values.get('password'));
      values.delete('password');entry.querySelectorAll('input[name=password]').forEach(n=>n.value='');
      if(s.user){
        const intro=window.KalistarLoginIntro;
        try{if(!intro?.prepare())await intro?.play();}catch{}
        go();
      }
    });
  });
  entry.addEventListener('click',event=>{
    const action=event.target.closest('[data-login-action]')?.dataset.loginAction;if(!action||busy)return;
    if(action==='forgot')return form('forgot');
    if(action==='back')return location.replace('/jeu/login.html');
    if(action==='reveal'){
      const input=document.querySelector('#login-password'),show=input.type==='password';input.type=show?'text':'password';
      const button=event.target.closest('button');button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe');button.innerHTML=icon(show?'eye-off':'eye');icons();
    }
  });
  icons();
  void run(async()=>{
    const s=await session.check();
    if(s.recovery){status.textContent='';form('password');}
    else if(s.user)go();else status.textContent='';
  });
})();
