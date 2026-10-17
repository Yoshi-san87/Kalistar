import {journeyRequest} from './journey-worker.mjs';
const COOKIE='__Host-kalistar',TTL=900,encoder=new TextEncoder(),decoder=new TextDecoder();
const PUBLIC=new Set(['/jeu/login','/jeu/login.html','/jeu/login.js','/jeu/login.css','/jeu/login-intro.js','/jeu/login-intro.css','/jeu/cloud-session.js','/jeu/cloud-config.js',
  '/jeu/assets/supabase/supabase-2.118.0.js','/jeu/assets/logo-rainbow-v2.webp','/jeu/assets/navigation/kalistel-rainbow-v2.webp',
  '/jeu/assets/home/sanctum-v1.webp','/jeu/assets/home/sanctum-phone-v1.webp','/jeu/assets/fonts/cinzel-v26-latin.woff2',
  '/jeu/assets/lucide.min.js','/jeu/manifest.webmanifest','/jeu/assets/pwa-192.png','/jeu/assets/pwa-512.png','/jeu/assets/favicon.svg']);
const PROJECT='https://fkskjhlaaagqlfcsojjp.supabase.co',PUBLISHABLE='sb_publishable_TwMp0VMZvhlJ0-ojTtaIcw_eU4AQpE4';
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const cookie=(value,age=TTL)=>`${COOKIE}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
async function key(secret){
  if(typeof secret!=='string'||secret.length<43)throw Error('Private session configuration missing');
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function signSession(claims,secret){
  const value=b64(encoder.encode(JSON.stringify(claims))),signature=await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(value));
  return value+'.'+b64(new Uint8Array(signature));
}
export async function verifySession(value,secret,now=Math.floor(Date.now()/1000)){
  try{
    if(typeof value!=='string'||value.length>1024||!/^[-\w]+\.[-\w]{43}$/.test(value))return null;
    const [body,signature]=value.split('.');
    if(!await crypto.subtle.verify('HMAC',await key(secret),unb64(signature),encoder.encode(body)))return null;
    const c=JSON.parse(decoder.decode(unb64(body)));
    if(c.v!==1||!/^[a-f0-9-]{36}$/.test(c.sub)||!['user-paris','user-tokyo'].includes(c.profile)
      ||!Number.isInteger(c.iat)||!Number.isInteger(c.exp)||c.iat>now+30||c.exp<=now||c.exp-c.iat>TTL||c.exp-c.iat<=0)return null;
    return c;
  }catch{return null;}
}
function loginRedirect(request){
  const source=new URL(request.url),target=new URL('/jeu/login.html',source.origin);
  if(source.searchParams.has('code'))target.searchParams.set('code',source.searchParams.get('code').slice(0,2048));
  if(source.searchParams.has('error'))target.searchParams.set('error','access_denied');
  if(!source.searchParams.has('code')&&source.pathname.startsWith('/jeu/'))target.searchParams.set('next',source.pathname+source.search);
  return new Response(null,{status:302,headers:{Location:target.href,'Cache-Control':'no-store','Vary':'Cookie'}});
}
export async function handle(request,env,fetcher=fetch){
  const url=new URL(request.url),path=url.pathname;
  if(url.protocol!=='https:'){url.protocol='https:';return new Response(null,{status:308,headers:{Location:url.href,'Cache-Control':'no-store'}});}
  if(path==='/auth/session'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Acces refuse.'},403);
    if(request.method==='DELETE')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
    if(request.method!=='POST')return json({error:'Methode refusee.'},405,{Allow:'POST, DELETE'});
    if(!request.headers.get('Content-Type')?.startsWith('application/json')||Number(request.headers.get('Content-Length')||0)>8192)return json({error:'Requete invalide.'},400);
    try{
      const reader=request.body?.getReader();if(!reader)return json({error:'Requete invalide.'},400);
      let size=0,raw='';const decode=new TextDecoder();
      while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return json({error:'Requete invalide.'},400);}raw+=decode.decode(value,{stream:true});}raw+=decode.decode();
      const {accessToken}=JSON.parse(raw);
      if(typeof accessToken!=='string'||accessToken.length>7000)return json({error:'Session invalide.'},401);
      const headers={apikey:PUBLISHABLE,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},signal=AbortSignal.timeout(10000);
      const userResponse=await fetcher(PROJECT+'/auth/v1/user',{headers,signal});
      if(!userResponse.ok)return json({error:'Session invalide.'},401,{'Set-Cookie':cookie('',0)});
      const user=await userResponse.json();
      if(!user.email_confirmed_at||!user.id)return json({error:'Acces refuse.'},403,{'Set-Cookie':cookie('',0)});
      const permission=await fetcher(PROJECT+'/rest/v1/rpc/kalistar_access',{method:'POST',headers,body:'{}',signal});
      if(!permission.ok)return json({error:'Acces refuse.'},403,{'Set-Cookie':cookie('',0)});
      const access=await permission.json();
      if(!['user-paris','user-tokyo'].includes(access?.localProfile))return json({error:'Acces refuse.'},403,{'Set-Cookie':cookie('',0)});
      const now=Math.floor(Date.now()/1000),value=await signSession({v:1,sub:user.id,profile:access.localProfile,iat:now,exp:now+TTL},env.KALISTAR_SESSION_KEY);
      return json({ok:true},200,{'Set-Cookie':cookie(value)});
    }catch{return json({error:'Connexion temporairement indisponible.'},503);}
  }
  if(path.startsWith('/api/journeys/'))return journeyRequest(request,env,fetcher);
  if(!['GET','HEAD'].includes(request.method))return json({error:'Methode refusee.'},405);
  if(PUBLIC.has(path)){
    const isLogin=path==='/jeu/login'||path==='/jeu/login.html';
    // Pages canonicalizes HTML to extensionless URLs; resolve both login aliases without a redirect loop.
    if(isLogin)url.pathname='/jeu/login';
    const response=await env.ASSETS.fetch(isLogin?new Request(url,request):request),publicResponse=new Response(response.body,response);
    if(isLogin){publicResponse.headers.set('Cache-Control','no-store');publicResponse.headers.set('X-Frame-Options','DENY');}
    publicResponse.headers.set('X-Content-Type-Options','nosniff');return publicResponse;
  }
  const raw=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const session=await verifySession(raw,env.KALISTAR_SESSION_KEY);
  if(!session){
    if(path==='/'||path==='/jeu'||path.endsWith('/')||path.endsWith('.html'))return loginRedirect(request);
    return json({error:'Connexion requise.'},401);
  }
  const response=await env.ASSETS.fetch(request),secured=new Response(response.body,response);
  secured.headers.set('Cache-Control','private, max-age=300');secured.headers.set('Vary','Cookie');
  secured.headers.set('X-Content-Type-Options','nosniff');secured.headers.set('Referrer-Policy','same-origin');
  secured.headers.set('X-Frame-Options','SAMEORIGIN');
  return secured;
}
export default {fetch:(request,env)=>handle(request,env)};
