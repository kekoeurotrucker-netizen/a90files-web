const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const OAUTH_VERIFIER_COOKIE='__Host-a90_oauth_verifier';
const OAUTH_RETURN_COOKIE='__Host-a90_oauth_return';
const OAUTH_PROVIDER_COOKIE='__Host-a90_oauth_provider';
const REFRESH_MAX_AGE=60*60*24*30;
const OAUTH_MAX_AGE=10*60;

export async function handleExtraAuth(request,env,url){
  if(url.pathname==='/api/auth/extra-providers'&&request.method==='GET') return extraProviders(env);

  if(url.pathname==='/api/auth/oauth/start'&&request.method==='GET'&&String(url.searchParams.get('provider')||'').toLowerCase()==='apple'){
    return appleStart(request,env,url);
  }

  if(url.pathname==='/api/auth/oauth/callback'&&request.method==='GET'){
    const cookies=parseCookies(request);
    if(cookies[OAUTH_PROVIDER_COOKIE]==='apple') return appleCallback(request,env,url,cookies);
  }

  return null;
}

async function extraProviders(env){
  const settings=await getProviderSettings(env);
  return json({
    available:Boolean(settings),
    providers:{apple:Boolean(settings?.external?.apple)},
    instagram:{supported_for_general_login:false,professional_accounts_only:true}
  });
}

async function appleStart(request,env,url){
  const returnPath=safeReturnPath(url.searchParams.get('return')||'/');
  if(!isSafeOAuthStart(request)) return redirect(addQuery(returnPath,{auth_error:'request_rejected',provider:'apple'}));

  const settings=await getProviderSettings(env);
  if(!settings) return redirect(addQuery(returnPath,{auth_error:'provider_check_failed',provider:'apple'}));
  if(!settings?.external?.apple) return redirect(addQuery(returnPath,{auth_error:'provider_disabled',provider:'apple'}));

  const verifier=randomBase64Url(48);
  const challenge=await sha256Base64Url(verifier);
  const callback=`${url.origin}/api/auth/oauth/callback`;
  const authorize=new URL(env.SUPABASE_URL+'/auth/v1/authorize');
  authorize.searchParams.set('provider','apple');
  authorize.searchParams.set('redirect_to',callback);
  authorize.searchParams.set('code_challenge',challenge);
  authorize.searchParams.set('code_challenge_method','s256');

  const headers=new Headers({
    Location:authorize.toString(),
    'Cache-Control':'private, no-store',
    Pragma:'no-cache',
    'Referrer-Policy':'no-referrer'
  });
  headers.append('Set-Cookie',cookie(OAUTH_VERIFIER_COOKIE,verifier,OAUTH_MAX_AGE));
  headers.append('Set-Cookie',cookie(OAUTH_RETURN_COOKIE,returnPath,OAUTH_MAX_AGE));
  headers.append('Set-Cookie',cookie(OAUTH_PROVIDER_COOKIE,'apple',OAUTH_MAX_AGE));
  return new Response(null,{status:302,headers});
}

async function appleCallback(request,env,url,cookies){
  const verifier=cookies[OAUTH_VERIFIER_COOKIE]||'';
  const returnPath=safeReturnPath(cookies[OAUTH_RETURN_COOKIE]||'/');

  if(url.searchParams.get('error')) return oauthError(returnPath,'oauth_denied');

  const code=String(url.searchParams.get('code')||'');
  if(!code||!verifier) return oauthError(returnPath,'oauth_state_invalid');

  const {res,body}=await supabase(env,'/auth/v1/token?grant_type=pkce',{
    method:'POST',
    headers:authHeaders(env),
    body:JSON.stringify({auth_code:code,code_verifier:verifier})
  });

  if(!res.ok||!body?.access_token||!body?.refresh_token) return oauthError(returnPath,'oauth_exchange_failed');

  const headers=new Headers({
    Location:returnPath,
    'Cache-Control':'private, no-store',
    Pragma:'no-cache',
    'X-Content-Type-Options':'nosniff'
  });
  headers.append('Set-Cookie',cookie(ACCESS_COOKIE,body.access_token,Math.max(60,Number(body.expires_in)||3600)));
  headers.append('Set-Cookie',cookie(REFRESH_COOKIE,body.refresh_token,REFRESH_MAX_AGE));
  clearOAuthCookies(headers);
  return new Response(null,{status:303,headers});
}

function oauthError(returnPath,error){
  const headers=new Headers({
    Location:addQuery(returnPath,{auth_error:error,provider:'apple'}),
    'Cache-Control':'private, no-store',
    Pragma:'no-cache'
  });
  clearOAuthCookies(headers);
  return new Response(null,{status:303,headers});
}

async function getProviderSettings(env){
  const {res,body}=await supabase(env,'/auth/v1/settings',{headers:authHeaders(env)});
  if(!res.ok||!body||typeof body!=='object') return null;
  return body;
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

function parseCookies(request){
  const out={};
  const raw=request.headers.get('Cookie')||'';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    const key=part.slice(0,i).trim();
    const value=part.slice(i+1).trim();
    if(!key)continue;
    try{out[key]=decodeURIComponent(value)}catch{out[key]=value}
  }
  return out;
}

function cookie(name,value,maxAge){
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function clearOAuthCookies(headers){
  for(const name of [OAUTH_VERIFIER_COOKIE,OAUTH_RETURN_COOKIE,OAUTH_PROVIDER_COOKIE]){
    headers.append('Set-Cookie',`${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  }
}

function isSafeOAuthStart(request){
  const site=request.headers.get('Sec-Fetch-Site');
  return !site||site==='same-origin'||site==='same-site'||site==='none';
}

function safeReturnPath(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/';
  try{
    const parsed=new URL(value,'https://a90.invalid');
    if(parsed.origin!=='https://a90.invalid')return '/';
    return parsed.pathname+parsed.search;
  }catch{return '/'}
}

function addQuery(path,params){
  const u=new URL(safeReturnPath(path),'https://a90.invalid');
  for(const [key,value] of Object.entries(params))if(value)u.searchParams.set(key,String(value));
  return u.pathname+u.search;
}

function redirect(location,status=303){
  return new Response(null,{status,headers:{Location:location,'Cache-Control':'private, no-store',Pragma:'no-cache'}});
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}

function randomBase64Url(size=32){
  const bytes=new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function sha256Base64Url(value){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  const bytes=new Uint8Array(hash);
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
