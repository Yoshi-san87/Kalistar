(function(root){
  'use strict';
  function create(dialog,onBusy){
    let timer=null,finish=null,revision=0,busy=false;
    const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
    function cancel(){
      revision++;clearTimeout(timer);timer=null;
      dialog.querySelectorAll('.is-shuffling').forEach(el=>el.classList.remove('is-shuffling'));
      busy=false;onBusy(false);finish?.(false);finish=null;
    }
    function shuffle(target,preview,settle){
      if(busy||!dialog.open)return Promise.resolve(false);
      const token=++revision;busy=true;onBusy(true);
      target.classList.add('is-shuffling');let step=0;
      return new Promise(resolve=>{
        finish=resolve;
        const tick=()=>{
          if(token!==revision||!dialog.open||!target.isConnected){cancel();return;}
          if(!reduced()&&step<6){preview(step++);timer=setTimeout(tick,70+step*22);return;}
          target.classList.remove('is-shuffling');timer=null;busy=false;finish=null;
          try{settle();}finally{onBusy(false);resolve(true);}
        };
        timer=setTimeout(tick,reduced()?60:20);
      });
    }
    dialog.addEventListener('close',cancel);
    dialog.addEventListener('cancel',cancel);
    return {shuffle,cancel,get busy(){return busy;},destroy(){cancel();dialog.removeEventListener('close',cancel);dialog.removeEventListener('cancel',cancel);}};
  }
  root.KalistarPreMatch={create};
})(globalThis);
