const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const OAUTH_VERIFIER_COOKIE='__Host-a90_oauth_verifier';
const OAUTH_RETURN_COOKIE='__Host-a90_oauth_return';
const OAUTH_PROVIDER_COOKIE='__Host-a90_oauth_provider';
const ACCESS_MAX_AGE=60*60;
const REFRESH_MAX_AGE=60*60*24*30;
const OAUTH_MAX_AGE=10*60;
const SOCIAL_PROVIDERS=new Set(['github','google','discord','facebook','x']);

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found',{status:404});

    if(!['GET','HEAD','POST'].includes(request.method)) return json({error:'Método no permitido.'},405);
    if(request.method==='POST'&&!isSameOriginRequest(request,url)) return json({error:'Solicitud rechazada.'},403);

    try{
      if(url.pathname==='/api/auth/session'&&request.method==='GET') return session(request,env);
      if(url.pathname==='/api/auth/providers'&&request.method==='GET') return providers(env);
      if(url.pathname==='/api/auth/oauth/start'&&request.method==='GET') return oauthStart(request,env,url);
      if(url.pathname==='/api/auth/oauth/callback'&&request.method==='GET') return oauthCallback(request,env,url);
      if(url.pathname==='/api/auth/login'&&request.method==='POST') return login(request,env);
      if(url.pathname==='/api/auth/signup'&&request.method==='POST') return signup(request,env,url);
      if(url.pathname==='/api/auth/logout'&&request.method==='POST') return logout(request,env);
      if(url.pathname==='/api/auth/profile'&&request.method==='POST') return updateProfile(request,env);
      return json({error:'Ruta no encontrada.'},404);
    }catch(error){
      console.error('A90 auth error',error?.message||error);
      return json({error:'No se pudo completar la operación.'},500);
    }
  }
};

function isSameOriginRequest(request,url){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin) return false;
  const site=request.headers.get('Sec-Fetch-Site');
  return !site||site==='same-origin'||site==='same-site'||site==='none';
}

function isSafeOAuthStart(request){
  const site=request.headers.get('Sec-Fetch-Site');
  return !site||site==='same-origin'||site==='same-site'||site==='none';
}

function json(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extraHeaders}});
}

function parseCookies(request){
  const out={};
  const raw=request.headers.get('Cookie')||'';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0) continue;
    const key=part.slice(0,i).trim();
    const value=part.slice(i+1).trim();
    if(!key) continue;
    try{out[key]=decodeURIComponent(value)}catch{out[key]=value}
  }
  return out;
}

function cookie(name,value,maxAge){
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie(name){
  return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function headersWithCookies(tokens){
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  if(tokens?.access_token) headers.append('Set-Cookie',cookie(ACCESS_COOKIE,tokens.access_token,Math.max(60,Number(tokens.expires_in)||ACCESS_MAX_AGE)));
  if(tokens?.refresh_token) headers.append('Set-Cookie',cookie(REFRESH_COOKIE,tokens.refresh_token,REFRESH_MAX_AGE));
  return headers;
}

function clearCookieHeaders(){
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  headers.append('Set-Cookie',clearCookie(ACCESS_COOKIE));
  headers.append('Set-Cookie',clearCookie(REFRESH_COOKIE));
  return headers;
}

function appendOAuthHelperCookies(headers,verifier,returnPath,provider){
  headers.append('Set-Cookie',cookie(OAUTH_VERIFIER_COOKIE,verifier,OAUTH_MAX_AGE));
  headers.append('Set-Cookie',cookie(OAUTH_RETURN_COOKIE,returnPath,OAUTH_MAX_AGE));
  headers.append('Set-Cookie',cookie(OAUTH_PROVIDER_COOKIE,provider,OAUTH_MAX_AGE));
}

function clearOAuthHelperCookies(headers){
  headers.append('Set-Cookie',clearCookie(OAUTH_VERIFIER_COOKIE));
  headers.append('Set-Cookie',clearCookie(OAUTH_RETURN_COOKIE));
  headers.append('Set-Cookie',clearCookie(OAUTH_PROVIDER_COOKIE));
}

async function readBody(request){
  const length=Number(request.headers.get('Content-Length')||0);
  if(length>16384) throw new Error('request too large');
  if(!(request.headers.get('Content-Type')||'').toLowerCase().includes('application/json')) throw new Error('invalid content type');
  return request.json();
}

function authHeaders(env,accessToken){
  const h={'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
  h.Authorization=`Bearer ${accessToken||env.SUPABASE_PUBLISHABLE_KEY}`;
  return h;
}

async function supabase(env,path,options={}){
  const res=await fetch(env.SUPABASE_URL+path,options);
  const text=await res.text();
  let body=null;
  if(text){try{body=JSON.parse(text)}catch{body=text}}
  return {res,body};
}

function authError(body,status){
  const raw=String(body?.msg||body?.message||body?.error_description||body?.error||'').toLowerCase();
  if(status===429) return 'Demasiados intentos. Espera un poco y vuelve a probar.';
  if(raw.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if(raw.includes('email not confirmed')) return 'Confirma primero el correo desde el mensaje de Supabase.';
  if(raw.includes('already registered')||raw.includes('user already registered')) return 'Ese correo ya tiene una cuenta.';
  if(raw.includes('email address not authorized')) return 'Supabase no puede enviar todavía correos a esa dirección. Para abrir el registro al público habrá que configurar SMTP propio.';
  if(raw.includes('password')) return 'La contraseña no cumple los requisitos de seguridad.';
  return 'No se pudo completar la autenticación.';
}

function validEmail(value){return typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
function validPassword(value){return typeof value==='string'&&value.length>=10&&value.length<=128}
function cleanName(value){if(typeof value!=='string')return '';return value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,80)}
function validAlias(value){return typeof value==='string'&&/^[A-Za-z0-9_.-]{3,32}$/.test(value)}

function safeReturnPath(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')) return '/';
  try{
    const parsed=new URL(value,'https://a90.invalid');
    if(parsed.origin!=='https://a90.invalid') return '/';
    return parsed.pathname+parsed.search;
  }catch{return '/'}
}

function addQuery(path,params){
  const u=new URL(safeReturnPath(path),'https://a90.invalid');
  for(const [key,value] of Object.entries(params)) if(value) u.searchParams.set(key,String(value));
  return u.pathname+u.search;
}

function providerEnabled(settings,provider){
  const external=settings?.external||{};
  if(provider==='x') return Boolean(external.x||external.twitter);
  return Boolean(external[provider]);
}

async function getProviderSettings(env){
  const {res,body}=await supabase(env,'/auth/v1/settings',{headers:authHeaders(env)});
  if(!res.ok||!body||typeof body!=='object') return null;
  return body;
}

async function providers(env){
  const settings=await getProviderSettings(env);
  const result={};
  for(const provider of SOCIAL_PROVIDERS) result[provider]=settings?providerEnabled(settings,provider):false;
  return json({email:true,providers:result,available:Boolean(settings)});
}

function randomBase64Url(size=32){
  const bytes=new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let binary='';
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function sha256Base64Url(value){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  const bytes=new Uint8Array(hash);
  let binary='';
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function oauthStart(request,env,url){
  const provider=String(url.searchParams.get('provider')||'').toLowerCase();
  const returnPath=safeReturnPath(url.searchParams.get('return')||'/');
  if(!SOCIAL_PROVIDERS.has(provider)) return redirect(addQuery(returnPath,{auth_error:'provider_invalid'}));
  if(!isSafeOAuthStart(request)) return redirect(addQuery(returnPath,{auth_error:'request_rejected',provider}));

  const settings=await getProviderSettings(env);
  if(!settings) return redirect(addQuery(returnPath,{auth_error:'provider_check_failed',provider}));
  if(!providerEnabled(settings,provider)) return redirect(addQuery(returnPath,{auth_error:'provider_disabled',provider}));

  const verifier=randomBase64Url(48);
  const challenge=await sha256Base64Url(verifier);
  const callback=`${url.origin}/api/auth/oauth/callback`;
  const authorize=new URL(env.SUPABASE_URL+'/auth/v1/authorize');
  authorize.searchParams.set('provider',provider);
  authorize.searchParams.set('redirect_to',callback);
  authorize.searchParams.set('code_challenge',challenge);
  authorize.searchParams.set('code_challenge_method','s256');

  const headers=new Headers({'Location':authorize.toString(),'Cache-Control':'private, no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer'});
  appendOAuthHelperCookies(headers,verifier,returnPath,provider);
  return new Response(null,{status:302,headers});
}

async function oauthCallback(request,env,url){
  const cookies=parseCookies(request);
  const verifier=cookies[OAUTH_VERIFIER_COOKIE]||'';
  const returnPath=safeReturnPath(cookies[OAUTH_RETURN_COOKIE]||'/');
  const provider=SOCIAL_PROVIDERS.has(cookies[OAUTH_PROVIDER_COOKIE])?cookies[OAUTH_PROVIDER_COOKIE]:'';

  if(url.searchParams.get('error')){
    const headers=new Headers({'Location':addQuery(returnPath,{auth_error:'oauth_denied',provider}),'Cache-Control':'private, no-store','Pragma':'no-cache'});
    clearOAuthHelperCookies(headers);
    return new Response(null,{status:303,headers});
  }

  const code=String(url.searchParams.get('code')||'');
  if(!code||!verifier){
    const headers=new Headers({'Location':addQuery(returnPath,{auth_error:'oauth_state_invalid',provider}),'Cache-Control':'private, no-store','Pragma':'no-cache'});
    clearOAuthHelperCookies(headers);
    return new Response(null,{status:303,headers});
  }

  const {res,body}=await supabase(env,'/auth/v1/token?grant_type=pkce',{method:'POST',headers:authHeaders(env),body:JSON.stringify({auth_code:code,code_verifier:verifier})});
  if(!res.ok||!body?.access_token||!body?.refresh_token){
    const headers=new Headers({'Location':addQuery(returnPath,{auth_error:'oauth_exchange_failed',provider}),'Cache-Control':'private, no-store','Pragma':'no-cache'});
    clearOAuthHelperCookies(headers);
    return new Response(null,{status:303,headers});
  }

  const headers=headersWithCookies(body);
  headers.set('Location',returnPath);
  headers.set('Pragma','no-cache');
  clearOAuthHelperCookies(headers);
  return new Response(null,{status:303,headers});
}

function redirect(location,status=303){
  return new Response(null,{status,headers:{Location:location,'Cache-Control':'private, no-store','Pragma':'no-cache'}});
}

async function login(request,env){
  let data; try{data=await readBody(request)}catch{return json({error:'Datos de acceso no válidos.'},400)}
  const email=String(data?.email||'').trim().toLowerCase();
  const password=data?.password;
  if(!validEmail(email)||!validPassword(password)) return json({error:'Introduce un correo válido y una contraseña de al menos 10 caracteres.'},400);
  const {res,body}=await supabase(env,'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders(env),body:JSON.stringify({email,password})});
  if(!res.ok) return json({error:authError(body,res.status)},res.status===400?401:res.status);
  return new Response(JSON.stringify({ok:true}),{status:200,headers:headersWithCookies(body)});
}

async function signup(request,env,url){
  let data; try{data=await readBody(request)}catch{return json({error:'Datos de registro no válidos.'},400)}
  const email=String(data?.email||'').trim().toLowerCase();
  const password=data?.password;
  const displayName=cleanName(data?.display_name)||'Usuario';
  if(!validEmail(email)||!validPassword(password)) return json({error:'Usa un correo válido y una contraseña de entre 10 y 128 caracteres.'},400);
  const redirectTo=`${url.origin}/`;
  const path='/auth/v1/signup?redirect_to='+encodeURIComponent(redirectTo);
  const {res,body}=await supabase(env,path,{method:'POST',headers:authHeaders(env),body:JSON.stringify({email,password,data:{full_name:displayName}})});
  if(!res.ok) return json({error:authError(body,res.status)},res.status);
  if(body?.access_token) return new Response(JSON.stringify({ok:true,requires_confirmation:false}),{status:200,headers:headersWithCookies(body)});
  return json({ok:true,requires_confirmation:true},200);
}

async function getUser(env,accessToken){
  const {res,body}=await supabase(env,'/auth/v1/user',{headers:authHeaders(env,accessToken)});
  if(!res.ok) return null;
  return body;
}

async function refresh(env,refreshToken){
  if(!refreshToken) return null;
  const {res,body}=await supabase(env,'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:authHeaders(env),body:JSON.stringify({refresh_token:refreshToken})});
  return res.ok?body:null;
}

async function resolveSession(request,env){
  const cookies=parseCookies(request);
  let access=cookies[ACCESS_COOKIE]||'';
  let refreshToken=cookies[REFRESH_COOKIE]||'';
  let user=access?await getUser(env,access):null;
  let refreshed=null;
  if(!user&&refreshToken){
    refreshed=await refresh(env,refreshToken);
    if(refreshed?.access_token){
      access=refreshed.access_token;
      refreshToken=refreshed.refresh_token||refreshToken;
      user=await getUser(env,access);
    }
  }
  return {user,access,refreshToken,refreshed};
}

async function profileData(env,access,user){
  const h=authHeaders(env,access); h.Accept='application/json';
  const id=encodeURIComponent(user.id);
  const [p,r]=await Promise.all([
    supabase(env,`/rest/v1/profiles?id=eq.${id}&select=id,username,display_name,avatar_url`,{headers:h}),
    supabase(env,`/rest/v1/user_roles?user_id=eq.${id}&select=role`,{headers:h})
  ]);
  const profile=p.res.ok&&Array.isArray(p.body)?p.body[0]||null:null;
  const role=r.res.ok&&Array.isArray(r.body)&&r.body[0]?.role?r.body[0].role:'user';
  return {profile,role};
}

async function session(request,env){
  const s=await resolveSession(request,env);
  if(!s.user){
    const headers=clearCookieHeaders();
    return new Response(JSON.stringify({authenticated:false}),{status:200,headers});
  }
  const {profile,role}=await profileData(env,s.access,s.user);
  const response={authenticated:true,user:{id:s.user.id,provider:s.user.app_metadata?.provider||'email',network_name:s.user.user_metadata?.full_name||s.user.user_metadata?.name||'Usuario'},profile,role};
  const headers=s.refreshed?headersWithCookies(s.refreshed):new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  return new Response(JSON.stringify(response),{status:200,headers});
}

async function updateProfile(request,env){
  const s=await resolveSession(request,env);
  if(!s.user) return json({error:'Inicia sesión primero.'},401);
  let data; try{data=await readBody(request)}catch{return json({error:'Datos de perfil no válidos.'},400)}
  const patch={};
  if(data?.mode==='network'){
    patch.username=null;
    patch.display_name=cleanName(s.user.user_metadata?.full_name||s.user.user_metadata?.name)||'Usuario';
  }else{
    const alias=String(data?.alias||'').trim();
    if(!validAlias(alias)) return json({error:'El alias debe tener 3-32 caracteres: letras, números, punto, guion o _.'},400);
    patch.username=alias;
  }
  const h=authHeaders(env,s.access); h.Prefer='return=representation';
  const {res,body}=await supabase(env,`/rest/v1/profiles?id=eq.${encodeURIComponent(s.user.id)}`,{method:'PATCH',headers:h,body:JSON.stringify(patch)});
  if(!res.ok){
    const raw=String(body?.message||'').toLowerCase();
    if(raw.includes('duplicate')||raw.includes('unique')) return json({error:'Ese alias ya está ocupado.'},409);
    return json({error:'No se pudo guardar el perfil.'},400);
  }
  const profile=Array.isArray(body)?body[0]||null:null;
  if(s.refreshed){
    const headers=headersWithCookies(s.refreshed);
    return new Response(JSON.stringify({ok:true,profile}),{status:200,headers});
  }
  return json({ok:true,profile});
}

async function logout(request,env){
  const cookies=parseCookies(request);
  const access=cookies[ACCESS_COOKIE];
  if(access){
    try{await supabase(env,'/auth/v1/logout',{method:'POST',headers:authHeaders(env,access)})}catch{}
  }
  return new Response(JSON.stringify({ok:true}),{status:200,headers:clearCookieHeaders()});
}
