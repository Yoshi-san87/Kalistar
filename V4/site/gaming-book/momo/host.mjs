const channel='kalistar-gaming-book-v1',token=location.hash.slice(1);
const embedded=parent!==window&&/^[a-f0-9-]{36}$/.test(token);
export function notify(type,value){
  if(embedded)parent.postMessage({channel,token,type,value},location.origin);
}
export async function connect(){
  if(!embedded)return null;
  return new Promise(resolve=>{
    const receive=event=>{
      if(event.source!==parent||event.origin!==location.origin||event.data?.channel!==channel||event.data.token!==token||event.data.type!=='init')return;
      clearTimeout(timer);removeEventListener('message',receive);resolve(event.data.value);
    };
    const timer=setTimeout(()=>{removeEventListener('message',receive);resolve(null);},10000);
    addEventListener('message',receive);notify('ready');
  });
}
export {embedded};
