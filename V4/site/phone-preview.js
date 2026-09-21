(() => {
  'use strict';
  const url=new URL(location.href),isHost=window===window.parent&&url.searchParams.get('phone')==='razr50';
  const inPreview=window!==window.parent&&url.searchParams.get('phone-frame')==='1';
  function enter(){
    if(inPreview){parent.postMessage({type:'kalistar:toggle-phone'},location.origin);return false;}
    const target=new URL(location.href);target.searchParams.set('phone','razr50');location.assign(target.href);
    return true;
  }
  if(inPreview)window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='kalistar:phone-mode')return;
    const button=document.querySelector('[data-action=phone-preview]');
    button?.setAttribute('aria-pressed',String(!!event.data.enabled));
  });
  function mountHost(){
    // 412 CSS px with the opened Razr 50's 1080:2640 display ratio.
    const width=412,height=1007;
    let enabled=true;
    document.body.className='phone-preview-host';
    document.body.innerHTML='<header class="phone-preview-toolbar"><span>Motorola Razr 50</span><button id="phone-preview-toggle" aria-label="Mode téléphone" title="Activer ou désactiver le format téléphone" aria-pressed="true"><i data-lucide="smartphone"></i><span>Mode téléphone</span></button></header><main class="phone-preview-stage"><div class="phone-preview-device"><iframe id="phone-preview-frame" title="Kalistar · aperçu Motorola Razr 50" allow="fullscreen"></iframe></div></main>';
    const stage=document.querySelector('.phone-preview-stage'),device=document.querySelector('.phone-preview-device');
    const frame=document.getElementById('phone-preview-frame'),toggle=document.getElementById('phone-preview-toggle');
    const child=new URL(location.href);child.searchParams.delete('phone');child.searchParams.set('phone-frame','1');
    const announce=()=>frame.contentWindow?.postMessage({type:'kalistar:phone-mode',enabled},location.origin);
    function fit(){
      const scale=Math.max(.1,Math.min(1,(stage.clientWidth-24)/width,(stage.clientHeight-24)/height));
      device.style.width=enabled?width*scale+'px':'100%';
      device.style.height=enabled?height*scale+'px':'100%';
      frame.style.width=enabled?width+'px':'100%';frame.style.height=enabled?height+'px':'100%';
      frame.style.transform=enabled?'scale('+scale+')':'none';
    }
    function switchMode(){
      enabled=!enabled;document.body.classList.toggle('phone-preview-desktop',!enabled);
      toggle.setAttribute('aria-pressed',String(enabled));
      fit();announce();
      if(!enabled)frame.contentWindow?.focus();
    }
    toggle.addEventListener('click',switchMode);
    window.addEventListener('message',event=>{
      if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='kalistar:toggle-phone')switchMode();
    });
    frame.addEventListener('load',announce);
    new ResizeObserver(fit).observe(stage);
    frame.src=child.href;fit();window.lucide?.createIcons();
    window.KALISTAR_PREVIEW_READY=true;
  }
  window.KalistarPhonePreview={isHost,enter,mountHost};
})();
