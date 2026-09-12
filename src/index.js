const ACCESS_COOKIE='a90_access';
const REFRESH_COOKIE='a90_refresh';
const ACCESS_MAX_AGE=60*60;
const REFRESH_MAX_AGE=60*60*24*30;

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found',{status:404});

    if(!['GET','HEAD','POST'].includes(request.method)) return json({error:'Método no permitido.'},405);
    if(request.method==='POST'&&!isSameOriginRequest(request,url)) return json({error:'Solicitud rechazada.'},403);

    try{
      if(url.pathname==='/api/auth/session'&&request.method==='GET') return session(request,env);
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

function json(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extraHeaders}});
}

function parseCookies(request){
  const out={};
  const raw=request.headers.get('Cookie')||'';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0) continue;
    const key=part.slice(0,i).trim();
    const value=part.slice(i+1).trim();
    if(key) out[key]=decodeURIComponent(value);
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
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(tokens?.access_token) headers.append('Set-Cookie',cookie(ACCESS_COOKIE,tokens.access_token,Math.max(60,Number(tokens.expires_in)||ACCESS_MAX_AGE)));
  if(tokens?.refresh_token) headers.append('Set-Cookie',cookie(REFRESH_COOKIE,tokens.refresh_token,REFRESH_MAX_AGE));
  return headers;
}

function clearCookieHeaders(){
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  headers.append('Set-Cookie',clearCookie(ACCESS_COOKIE));
  headers.append('Set-Cookie',clearCookie(REFRESH_COOKIE));
  return headers;
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
  const headers=s.refreshed?headersWithCookies(s.refreshed):new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
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
  const headers=s.refreshed?headersWithCookies(s.refreshed):{'Cache-Control':'no-store'};
  return json({ok:true,profile},200,headers instanceof Headers?Object.fromEntries(headers):headers);
}

async function logout(request,env){
  const cookies=parseCookies(request);
  const access=cookies[ACCESS_COOKIE];
  if(access){
    try{await supabase(env,'/auth/v1/logout',{method:'POST',headers:authHeaders(env,access)})}catch{}
  }
  return new Response(JSON.stringify({ok:true}),{status:200,headers:clearCookieHeaders()});
}
