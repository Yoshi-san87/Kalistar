export function createFilm({sound,finish,returnToScene}) {
  const dialog=document.getElementById('film');
  const video=document.getElementById('momo-film');
  const play=document.getElementById('film-play');
  const status=document.getElementById('film-status');
  let active=false, timer=0, waiting=false, previousFocus;
  function prepare() {
    if(video.getAttribute('src')) return;
    const variant=innerHeight>innerWidth?'momo-portrait':'momo';
    video.poster=`../../assets/gaming-book/momo/cinematic/${variant}.jpg`;
    video.src=`../../assets/gaming-book/momo/cinematic/${variant}-r3.mp4`;
    video.load();
  }
  function fallback(message) {
    if(!active) return;
    clearTimeout(timer);waiting=true;
    status.textContent=message;play.hidden=false;play.focus();
  }
  async function start() {
    if(!active) return;
    waiting=false;play.hidden=true;status.textContent='';video.muted=!sound();
    if(video.error) video.load();
    clearTimeout(timer);timer=setTimeout(()=>fallback('Le film attend de pouvoir démarrer.'),10000);
    try {await video.play();} catch {fallback('La mélodie vous attend.');}
  }
  function close() {
    active=false;waiting=false;clearTimeout(timer);video.pause();dialog.close();
    previousFocus?.focus({preventScroll:true});
  }
  play.addEventListener('click',start);
  video.addEventListener('playing',()=>{clearTimeout(timer);waiting=false;play.hidden=true;status.textContent='';});
  video.addEventListener('ended',()=>{if(active){close();finish();}});
  video.addEventListener('error',()=>fallback('Le film n’a pas pu être lu. Tu peux réessayer ou retrouver Momo.'));
  document.getElementById('film-skip').addEventListener('click',()=>{close();finish();});
  document.getElementById('film-back').addEventListener('click',()=>{close();returnToScene();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();returnToScene();});
  return {
    prepare,
    open() {prepare();previousFocus=document.activeElement;active=true;dialog.showModal();video.currentTime=0;start();},
    suspend() {if(active){video.pause();fallback('La mélodie est en pause.');}},
    close,
    snapshot:()=>({active,waiting,currentTime:video.currentTime,paused:video.paused,readyState:video.readyState,error:video.error?.code||null}),
  };
}
